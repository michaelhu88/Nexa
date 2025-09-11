import type { CodeChunk, EmbeddingServiceConfig } from '~/types/embeddings';
import { createScopedLogger } from '~/utils/logger';
import { CodeChunker } from './code-chunker';
import crypto from 'crypto';

const logger = createScopedLogger('EmbeddingService');

const DEFAULT_CONFIG: EmbeddingServiceConfig = {
  model: 'text-embedding-3-small',
  batchSize: 20,
  maxTokensPerChunk: 500,
  overlapTokens: 50,
};

export class EmbeddingService {
  private _config: EmbeddingServiceConfig;
  private _chunker: CodeChunker;

  constructor(config: EmbeddingServiceConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._chunker = new CodeChunker({
      maxChunkSize: this._config.maxTokensPerChunk ? this._config.maxTokensPerChunk * 4 : 2000, // Rough char estimate
      overlapSize: this._config.overlapTokens ? this._config.overlapTokens * 4 : 200,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = this._config.openaiApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key is required for generating embeddings');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this._config.model || 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = (await response.json()) as any;

      return data.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const apiKey = this._config.openaiApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key is required for generating embeddings');
    }

    const embeddings: number[][] = [];
    const batchSize = this._config.batchSize || 20;

    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: batch,
            model: this._config.model || 'text-embedding-3-small',
          }),
        });

        if (!response.ok) {
          const error = (await response.json()) as any;
          throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
        }

        const data = (await response.json()) as any;
        embeddings.push(...data.data.map((item: any) => item.embedding));

        // Rate limiting - wait a bit between batches
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(`Failed to generate embeddings for batch ${i / batchSize}:`, error);
        throw error;
      }
    }

    return embeddings;
  }

  async processFile(content: string | Uint8Array | Buffer | any, filePath: string, projectId: string) {
    const chunks = await this._chunker.chunkFile(content, filePath);
    const embeddingRecords = [];

    logger.info(`Processing ${chunks.length} chunks from ${filePath}`);

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map((chunk) => this._prepareChunkText(chunk, filePath));
    const embeddings = await this.generateEmbeddings(chunkTexts);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const chunkHash = this._generateHash(chunk.content);

      embeddingRecords.push({
        projectId,
        filePath,
        chunkIndex: i,
        chunkType: chunk.type,
        chunkName: chunk.name,
        chunkContent: chunk.content,
        chunkHash,
        embedding,
        tokenCount: this._estimateTokens(chunk.content),
        language: chunk.language,
        metadata: chunk.metadata || {},
      });
    }

    return embeddingRecords;
  }

  async searchSimilar(query: string, projectId: string, limit: number = 10) {
    const queryEmbedding = await this.generateEmbedding(query);

    // This will be handled by the Supabase function
    return {
      queryEmbedding,
      projectId,
      limit,
    };
  }

  private _prepareChunkText(chunk: CodeChunk, filePath: string): string {
    // Add context to the chunk for better embedding quality
    const contextParts = [`File: ${filePath}`, `Type: ${chunk.type}`];

    if (chunk.name) {
      contextParts.push(`Name: ${chunk.name}`);
    }

    if (chunk.metadata?.imports?.length) {
      contextParts.push(`Imports: ${chunk.metadata.imports.join(', ')}`);
    }

    const context = contextParts.join('\n');

    return `${context}\n\n${chunk.content}`;
  }

  private _generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private _estimateTokens(text: string): number {
    /*
     * Rough estimation: ~4 characters per token for English text
     * This is a simplified estimate - you might want to use tiktoken for accuracy
     */
    return Math.ceil(text.length / 4);
  }

  async processFiles(files: Map<string, string>, projectId: string, onProgress?: (progress: number) => void) {
    const totalFiles = files.size;
    let processedFiles = 0;
    const allRecords = [];

    for (const [filePath, content] of files.entries()) {
      try {
        // Skip non-processable files
        if (this._shouldSkipFile(filePath)) {
          logger.debug(`Skipping file: ${filePath}`);
          continue;
        }

        const records = await this.processFile(content, filePath, projectId);
        allRecords.push(...records);

        processedFiles++;

        if (onProgress) {
          onProgress((processedFiles / totalFiles) * 100);
        }
      } catch (error) {
        logger.error(`Failed to process file ${filePath}:`, error);

        // Continue with other files
      }
    }

    return allRecords;
  }

  private _shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      '.next/',
      'coverage/',
      '.env',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.DS_Store',
      '*.min.js',
      '*.min.css',
      '*.map',
      '*.ico',
      '*.png',
      '*.jpg',
      '*.jpeg',
      '*.gif',
      '*.svg',
      '*.woff',
      '*.woff2',
      '*.ttf',
      '*.eot',
    ];

    return skipPatterns.some((pattern) => {
      if (pattern.startsWith('*')) {
        return filePath.endsWith(pattern.slice(1));
      }

      return filePath.includes(pattern);
    });
  }
}

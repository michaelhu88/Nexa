import { type Message } from 'ai';
import type { IProviderSetting } from '~/types/model';
import type { FileMap } from './constants';
import type { SimilarChunk } from '~/types/embeddings';
import { EmbeddingService } from '~/lib/services/embedding-service';
import { createScopedLogger } from '~/utils/logger';
import { extractPropertiesFromMessage, simplifyBoltActions } from './utils';

const logger = createScopedLogger('vector-context');

interface VectorContextOptions {
  maxChunks?: number;
  similarityThreshold?: number;
  includeImports?: boolean;
  contextWindowSize?: number;
}

const DEFAULT_OPTIONS: VectorContextOptions = {
  maxChunks: 5,
  similarityThreshold: 0.8,
  includeImports: true,
  contextWindowSize: 3000, // Rough token estimate
};

export async function selectVectorContext(props: {
  messages: Message[];
  env?: Env;
  apiKeys?: Record<string, string>;
  files: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  projectId: string;
  summary?: string;
  supabaseClient?: any; // TODO: Type this properly
}): Promise<FileMap> {
  const { messages, apiKeys, projectId, summary, supabaseClient } = props;
  const options = { ...DEFAULT_OPTIONS };

  try {
    // Extract the user's query from the last message
    const lastUserMessage = messages.filter((msg) => msg.role === 'user').pop();

    if (!lastUserMessage) {
      logger.warn('No user message found, returning empty context');
      return {};
    }

    const { content: userQuery } = extractPropertiesFromMessage(lastUserMessage);

    // Combine query with summary for better context
    let searchQuery = userQuery;

    if (summary) {
      searchQuery = `${summary}\n\nCurrent query: ${userQuery}`;
    }

    // Initialize embedding service
    const embeddingService = new EmbeddingService({
      openaiApiKey: apiKeys?.openai,
      model: 'text-embedding-3-small',
    });

    // Generate embedding for the search query
    logger.info('Generating query embedding');

    const queryEmbedding = await embeddingService.generateEmbedding(searchQuery);

    // Search for similar chunks using Supabase
    const similarChunks = await searchSimilarChunks(supabaseClient, projectId, queryEmbedding, options);

    if (!similarChunks || similarChunks.length === 0) {
      logger.warn('No similar chunks found');
      return {};
    }

    logger.info(`Found ${similarChunks.length} similar chunks`);

    // Build context from similar chunks
    const contextFiles = buildContextFromChunks(similarChunks, options);

    // Add any explicitly mentioned files from the conversation
    const mentionedFiles = extractMentionedFiles(messages);

    for (const filePath of mentionedFiles) {
      if (!contextFiles[filePath] && props.files[filePath]) {
        contextFiles[filePath] = props.files[filePath];
      }
    }

    logger.info(`Selected ${Object.keys(contextFiles).length} files for context`);

    return contextFiles;
  } catch (error) {
    logger.error('Failed to select vector context:', error);

    // Fallback to empty context or basic selection
    return {};
  }
}

async function searchSimilarChunks(
  supabaseClient: any,
  projectId: string,
  queryEmbedding: number[],
  options: VectorContextOptions,
): Promise<SimilarChunk[]> {
  if (!supabaseClient) {
    logger.warn('Supabase client not available');
    return [];
  }

  try {
    // Call the Supabase function for similarity search
    const { data, error } = await supabaseClient.rpc('search_similar_chunks', {
      query_embedding: queryEmbedding,
      target_project_id: projectId,
      match_threshold: options.similarityThreshold,
      match_count: options.maxChunks,
    });

    if (error) {
      logger.error('Supabase search error:', error);
      return [];
    }

    return data as SimilarChunk[];
  } catch (error) {
    logger.error('Failed to search similar chunks:', error);
    return [];
  }
}

function buildContextFromChunks(chunks: SimilarChunk[], options: VectorContextOptions): FileMap {
  const contextFiles: FileMap = {};
  const fileChunks = new Map<string, SimilarChunk[]>();

  // Group chunks by file
  for (const chunk of chunks) {
    const filePath = chunk.filePath;

    if (!fileChunks.has(filePath)) {
      fileChunks.set(filePath, []);
    }

    fileChunks.get(filePath)!.push(chunk);
  }

  // Build context for each file
  let totalTokens = 0;
  const maxTokens = options.contextWindowSize || 8000;

  for (const [filePath, chunks] of fileChunks.entries()) {
    // Sort chunks by their position in the file (if available in metadata)
    const sortedChunks = chunks.sort((a, b) => {
      const aIndex = a.metadata?.chunkIndex || 0;
      const bIndex = b.metadata?.chunkIndex || 0;

      return aIndex - bIndex;
    });

    // Combine chunks into file content
    let fileContent = '';

    // Add file header
    fileContent += `// File: ${filePath}\n`;
    fileContent += `// Relevant sections (similarity scores: ${chunks.map((c) => c.similarity.toFixed(2)).join(', ')})\n\n`;

    // Add imports if available and requested
    if (options.includeImports) {
      const imports = chunks.find((c) => c.chunkType === 'import');

      if (imports) {
        fileContent += imports.chunkContent + '\n\n';
      }
    }

    // Add other chunks
    for (const chunk of sortedChunks) {
      if (chunk.chunkType === 'import' && options.includeImports) {
        continue; // Already added
      }

      // Add chunk with context
      if (chunk.chunkName) {
        fileContent += `// ${chunk.chunkType}: ${chunk.chunkName}\n`;
      }

      fileContent += chunk.chunkContent + '\n\n';

      // Estimate tokens (rough approximation)
      const chunkTokens = Math.ceil(chunk.chunkContent.length / 4);
      totalTokens += chunkTokens;

      if (totalTokens > maxTokens) {
        logger.info(`Reached token limit (${totalTokens}), stopping context building`);
        break;
      }
    }

    contextFiles[filePath] = {
      type: 'file',
      content: fileContent,
      isBinary: false,
    };

    if (totalTokens > maxTokens) {
      break;
    }
  }

  return contextFiles;
}

function extractMentionedFiles(messages: Message[]): string[] {
  const mentionedFiles = new Set<string>();

  // Simple regex patterns to find file paths
  const filePatterns = [/(?:file|path|in)\s+["`']([^"`']+\.[a-zA-Z]+)["`']/gi, /([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/g];

  for (const message of messages) {
    let content = message.content;

    if (typeof content !== 'string') {
      if (Array.isArray(content)) {
        const textItem = (content as any[]).find((item: any) => item?.type === 'text');
        content = textItem?.text || '';
      } else {
        content = '';
      }
    }

    content = simplifyBoltActions(content);

    for (const pattern of filePatterns) {
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        const filePath = match[1];

        if (isValidFilePath(filePath)) {
          mentionedFiles.add(filePath);
        }
      }
    }
  }

  return Array.from(mentionedFiles);
}

function isValidFilePath(path: string): boolean {
  // Basic validation to filter out false positives
  const invalidPatterns = [
    /^https?:\/\//,
    /^[0-9.]+$/, // Version numbers
    /\s/, // Spaces in path
  ];

  const validExtensions = [
    'ts',
    'tsx',
    'js',
    'jsx',
    'py',
    'java',
    'cpp',
    'c',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'swift',
    'kt',
    'scala',
    'r',
    'sql',
    'sh',
    'md',
    'json',
    'xml',
    'yaml',
    'yml',
    'css',
    'scss',
    'html',
  ];

  if (invalidPatterns.some((pattern) => pattern.test(path))) {
    return false;
  }

  const extension = path.split('.').pop()?.toLowerCase();

  return validExtensions.includes(extension || '');
}

// Export a function that maintains compatibility with the existing select-context
export async function selectContext(props: {
  messages: Message[];
  env?: Env;
  apiKeys?: Record<string, string>;
  files: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
  contextOptimization?: boolean;
  summary: string;
  onFinish?: (resp: any) => void;
}): Promise<FileMap> {
  // Check if we have vector embeddings available
  const projectId = 'default'; // TODO: Get actual project ID
  const hasEmbeddings = await checkEmbeddingsAvailable(projectId);

  if (hasEmbeddings && props.contextOptimization) {
    logger.info('Using vector-based context selection');
    return selectVectorContext({
      ...props,
      projectId,
    });
  } else {
    logger.info('Embeddings not available, falling back to text-based selection');

    // Fall back to the original select-context implementation
    const { selectContext: originalSelectContext } = await import('./select-context');

    return originalSelectContext(props);
  }
}

async function checkEmbeddingsAvailable(_projectId: string): Promise<boolean> {
  /*
   * TODO: Check if embeddings exist for this project in the database
   * For now, return false to use the fallback
   */
  return false;
}

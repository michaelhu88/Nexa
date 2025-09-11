export type ChunkType = 'function' | 'class' | 'module' | 'interface' | 'type' | 'comment' | 'import' | 'general';

export type IndexingStatus = 'idle' | 'indexing' | 'completed' | 'failed';

export interface CodeChunk {
  content: string;
  type: ChunkType;
  name?: string; // Function/class/interface name
  startLine: number;
  endLine: number;
  language: string;
  metadata?: {
    imports?: string[];
    exports?: string[];
    dependencies?: string[];
    parameters?: string[];
    returnType?: string;
    modifiers?: string[]; // async, static, etc.
  };
}

export interface EmbeddingRecord {
  id: string;
  projectId: string;
  filePath: string;
  chunkIndex: number;
  chunkType: ChunkType;
  chunkName?: string;
  chunkContent: string;
  chunkHash: string;
  embedding?: number[];
  tokenCount?: number;
  language: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndexingStatusRecord {
  id: string;
  projectId: string;
  totalFiles: number;
  indexedFiles: number;
  totalChunks: number;
  status: IndexingStatus;
  lastError?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimilarChunk {
  id: string;
  filePath: string;
  chunkType: ChunkType;
  chunkName?: string;
  chunkContent: string;
  metadata: Record<string, any>;
  similarity: number;
}

export interface ProjectStats {
  totalFiles: number;
  totalChunks: number;
  avgChunksPerFile: number;
  languages: Record<string, number>;
  chunkTypes: Record<ChunkType, number>;
}

export interface IndexingProgress {
  projectId: string;
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
  status: IndexingStatus;
  message?: string;
}

export interface EmbeddingServiceConfig {
  openaiApiKey?: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  batchSize?: number;
  maxTokensPerChunk?: number;
  overlapTokens?: number;
}

export interface ChunkingOptions {
  maxChunkSize?: number; // Max characters per chunk
  overlapSize?: number; // Overlap between chunks
  includeImports?: boolean;
  includeComments?: boolean;
  minChunkSize?: number; // Min characters to create a chunk
}

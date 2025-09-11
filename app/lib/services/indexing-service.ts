import { EmbeddingService } from './embedding-service';
import type { IndexingProgress, IndexingStatus } from '~/types/embeddings';
import { createScopedLogger } from '~/utils/logger';
import type { FileMap } from '~/lib/.server/llm/constants';
import { atom } from 'nanostores';

const logger = createScopedLogger('IndexingService');

export const indexingProgressStore = atom<IndexingProgress | null>(null);
export const indexingQueueStore = atom<string[]>([]);

interface IndexingTask {
  projectId: string;
  files: FileMap;
  onProgress?: (progress: IndexingProgress) => void;
}

export class IndexingService {
  private _embeddingService: EmbeddingService;
  private _indexingQueue: IndexingTask[] = [];
  private _isProcessing = false;
  private _currentTask: IndexingTask | null = null;
  private _fileHashes: Map<string, string> = new Map();

  constructor(embeddingService: EmbeddingService) {
    this._embeddingService = embeddingService;
  }

  async indexProject(projectId: string, files: FileMap, _forceReindex = false): Promise<void> {
    logger.info(`Starting indexing for project ${projectId}`);

    const task: IndexingTask = {
      projectId,
      files,
      onProgress: (progress) => {
        indexingProgressStore.set(progress);
      },
    };

    this._indexingQueue.push(task);
    indexingQueueStore.set(this._indexingQueue.map((t) => t.projectId));

    if (!this._isProcessing) {
      await this._processQueue();
    }
  }

  async indexFile(projectId: string, filePath: string, content: string, forceIndex = false): Promise<void> {
    logger.info(`Indexing single file: ${filePath}`);

    try {
      // Generate hash to check if content changed
      const contentHash = this._generateHash(content);
      const previousHash = this._fileHashes.get(filePath);

      if (!forceIndex && previousHash === contentHash) {
        logger.debug(`File ${filePath} unchanged, skipping`);
        return;
      }

      // Delete existing embeddings for this file
      await this._deleteFileEmbeddings(projectId, filePath);

      // Process and store new embeddings
      const records = await this._embeddingService.processFile(content, filePath, projectId);
      await this._storeEmbeddings(records);

      // Update hash
      this._fileHashes.set(filePath, contentHash);

      logger.info(`Successfully indexed ${filePath} with ${records.length} chunks`);
    } catch (error) {
      logger.error(`Failed to index file ${filePath}:`, error);
      throw error;
    }
  }

  async deleteFile(projectId: string, filePath: string): Promise<void> {
    logger.info(`Removing embeddings for deleted file: ${filePath}`);

    try {
      await this._deleteFileEmbeddings(projectId, filePath);
      this._fileHashes.delete(filePath);
    } catch (error) {
      logger.error(`Failed to delete embeddings for ${filePath}:`, error);
      throw error;
    }
  }

  private async _processQueue(): Promise<void> {
    this._isProcessing = true;

    while (this._indexingQueue.length > 0) {
      const task = this._indexingQueue.shift();

      if (!task) {
        continue;
      }

      this._currentTask = task;

      try {
        await this._processTask(task);
      } catch (error) {
        logger.error(`Failed to process indexing task for project ${task.projectId}:`, error);

        if (task.onProgress) {
          task.onProgress({
            projectId: task.projectId,
            current: 0,
            total: 0,
            percentage: 0,
            status: 'failed',
            message: `Indexing failed: ${error}`,
          });
        }
      }

      indexingQueueStore.set(this._indexingQueue.map((t) => t.projectId));
    }

    this._isProcessing = false;
    this._currentTask = null;
    indexingProgressStore.set(null);
  }

  private async _processTask(task: IndexingTask): Promise<void> {
    const { projectId, files, onProgress } = task;
    const fileEntries = Object.entries(files);
    const totalFiles = fileEntries.length;
    let processedFiles = 0;

    // Update status to indexing
    await this._updateIndexingStatus(projectId, 'indexing');

    if (onProgress) {
      onProgress({
        projectId,
        current: 0,
        total: totalFiles,
        percentage: 0,
        status: 'indexing',
        message: 'Starting indexing...',
      });
    }

    /*
     * Create file map for potential future use
     * const _fileMap = new Map(fileEntries);
     */

    // Process files in batches
    const batchSize = 5;

    for (let i = 0; i < fileEntries.length; i += batchSize) {
      const batch = fileEntries.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async ([filePath, dirent]) => {
          if (this._shouldSkipFile(filePath) || !dirent || dirent.type !== 'file') {
            logger.debug(`Skipping file: ${filePath}`);
            return;
          }

          try {
            await this.indexFile(projectId, filePath, dirent.content);
            processedFiles++;

            if (onProgress) {
              onProgress({
                projectId,
                current: processedFiles,
                total: totalFiles,
                percentage: (processedFiles / totalFiles) * 100,
                currentFile: filePath,
                status: 'indexing',
                message: `Indexed ${filePath}`,
              });
            }
          } catch (error) {
            logger.error(`Failed to index ${filePath}:`, error);
          }
        }),
      );
    }

    // Update status to completed
    await this._updateIndexingStatus(projectId, 'completed', processedFiles);

    if (onProgress) {
      onProgress({
        projectId,
        current: processedFiles,
        total: totalFiles,
        percentage: 100,
        status: 'completed',
        message: `Indexing completed: ${processedFiles} files processed`,
      });
    }
  }

  private async _storeEmbeddings(records: any[]): Promise<void> {
    /*
     * This will be implemented with Supabase client
     * For now, just log
     */
    logger.info(`Storing ${records.length} embedding records`);

    /*
     * TODO: Implement actual storage using Supabase client
     * const { error } = await supabase
     *   .from('codebase_embeddings')
     *   .insert(records);
     */
  }

  private async _deleteFileEmbeddings(projectId: string, filePath: string): Promise<void> {
    // This will be implemented with Supabase client
    logger.info(`Deleting embeddings for ${filePath} in project ${projectId}`);

    /*
     * TODO: Implement actual deletion using Supabase client
     * const { error } = await supabase
     *   .from('codebase_embeddings')
     *   .delete()
     *   .match({ project_id: projectId, file_path: filePath });
     */
  }

  private async _updateIndexingStatus(
    projectId: string,
    status: IndexingStatus,
    _indexedFiles?: number,
  ): Promise<void> {
    // This will be implemented with Supabase client
    logger.info(`Updating indexing status for project ${projectId}: ${status}`);

    /*
     * TODO: Implement actual status update using Supabase client
     * const { error } = await supabase
     *   .from('indexing_status')
     *   .upsert({
     *     project_id: projectId,
     *     status,
     *     indexed_files: indexedFiles,
     *     updated_at: new Date().toISOString(),
     *   });
     */
  }

  private _generateHash(content: string): string {
    // Simple hash for content comparison
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
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

  getProgress(): IndexingProgress | null {
    return indexingProgressStore.get();
  }

  getQueue(): string[] {
    return this._indexingQueue.map((task) => task.projectId);
  }

  cancelCurrentTask(): void {
    if (this._currentTask) {
      logger.info(`Cancelling indexing for project ${this._currentTask.projectId}`);

      // TODO: Implement proper cancellation
      this._currentTask = null;
    }
  }
}

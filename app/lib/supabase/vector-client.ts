import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EmbeddingRecord, IndexingStatusRecord, SimilarChunk, ProjectStats } from '~/types/embeddings';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('VectorClient');

export class VectorClient {
  private _client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this._client = createClient(supabaseUrl, supabaseKey);
  }

  async upsertEmbeddings(embeddings: Partial<EmbeddingRecord>[]): Promise<void> {
    try {
      // Map camelCase TypeScript properties to snake_case database columns
      const dbRecords = embeddings.map((embedding) => {
        const record: any = {
          project_id: embedding.projectId,
          file_path: embedding.filePath,
          chunk_index: embedding.chunkIndex,
          chunk_type: embedding.chunkType,
          chunk_name: embedding.chunkName,
          chunk_content: embedding.chunkContent,
          chunk_hash: embedding.chunkHash,
          embedding: embedding.embedding,
          token_count: embedding.tokenCount,
          language: embedding.language,
          metadata: embedding.metadata || {},
          updated_at: new Date().toISOString(),
        };

        // Only include id if it exists (for updates), let database generate it for new records
        if (embedding.id) {
          record.id = embedding.id;
        }

        // Only include created_at if it exists
        if (embedding.createdAt) {
          record.created_at = embedding.createdAt.toISOString();
        }

        return record;
      });

      const { error } = await this._client.from('codebase_embeddings').upsert(dbRecords, {
        onConflict: 'project_id,file_path,chunk_hash',
      });

      if (error) {
        throw error;
      }

      logger.info(`Successfully upserted ${embeddings.length} embeddings`);
    } catch (error) {
      logger.error('Failed to upsert embeddings:', error);
      throw error;
    }
  }

  async deleteFileEmbeddings(projectId: string, filePath: string): Promise<void> {
    try {
      const { error } = await this._client.from('codebase_embeddings').delete().match({
        project_id: projectId,
        file_path: filePath,
      });

      if (error) {
        throw error;
      }

      logger.info(`Deleted embeddings for ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete embeddings for ${filePath}:`, error);
      throw error;
    }
  }

  async deleteProjectEmbeddings(projectId: string): Promise<void> {
    try {
      const { error } = await this._client.from('codebase_embeddings').delete().eq('project_id', projectId);

      if (error) {
        throw error;
      }

      logger.info(`Deleted all embeddings for project ${projectId}`);
    } catch (error) {
      logger.error(`Failed to delete project embeddings:`, error);
      throw error;
    }
  }

  async searchSimilarChunks(
    projectId: string,
    queryEmbedding: number[],
    limit: number = 10,
    threshold: number = 0.7,
  ): Promise<SimilarChunk[]> {
    try {
      const { data, error } = await this._client.rpc('search_similar_chunks', {
        query_embedding: queryEmbedding,
        target_project_id: projectId,
        match_threshold: threshold,
        match_count: limit,
      });

      if (error) {
        throw error;
      }

      return data as SimilarChunk[];
    } catch (error) {
      logger.error('Failed to search similar chunks:', error);
      throw error;
    }
  }

  async getProjectStats(projectId: string): Promise<ProjectStats | null> {
    try {
      const { data, error } = await this._client.rpc('get_project_stats', {
        target_project_id: projectId,
      });

      if (error) {
        throw error;
      }

      return data?.[0] || null;
    } catch (error) {
      logger.error('Failed to get project stats:', error);
      return null;
    }
  }

  async getIndexingStatus(projectId: string): Promise<IndexingStatusRecord | null> {
    try {
      const { data, error } = await this._client
        .from('indexing_status')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found
          return null;
        }

        throw error;
      }

      // Map snake_case database response to camelCase TypeScript interface
      return {
        id: data.id,
        projectId: data.project_id,
        totalFiles: data.total_files || 0,
        indexedFiles: data.indexed_files || 0,
        totalChunks: data.total_chunks || 0,
        status: data.status || 'idle',
        lastError: data.last_error,
        startedAt: data.started_at ? new Date(data.started_at) : undefined,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as IndexingStatusRecord;
    } catch (error) {
      logger.error('Failed to get indexing status:', error);
      return null;
    }
  }

  async updateIndexingStatus(projectId: string, status: Partial<IndexingStatusRecord>): Promise<void> {
    try {
      // Map camelCase to snake_case for database
      const dbRecord: any = {
        project_id: projectId,
        updated_at: new Date().toISOString(),
      };

      // Map TypeScript camelCase to database snake_case
      if (status.totalFiles !== undefined) {
        dbRecord.total_files = status.totalFiles;
      }

      if (status.indexedFiles !== undefined) {
        dbRecord.indexed_files = status.indexedFiles;
      }

      if (status.totalChunks !== undefined) {
        dbRecord.total_chunks = status.totalChunks;
      }

      if (status.status !== undefined) {
        dbRecord.status = status.status;
      }

      if (status.lastError !== undefined) {
        dbRecord.last_error = status.lastError;
      }

      if (status.startedAt !== undefined) {
        dbRecord.started_at = status.startedAt?.toISOString();
      }

      if (status.completedAt !== undefined) {
        dbRecord.completed_at = status.completedAt?.toISOString();
      }

      const { error } = await this._client.from('indexing_status').upsert(dbRecord, {
        onConflict: 'project_id',
        ignoreDuplicates: false,
      });

      if (error) {
        throw error;
      }

      logger.info(`Updated indexing status for project ${projectId}`);
    } catch (error) {
      logger.error('Failed to update indexing status:', error);
      throw error;
    }
  }

  async getFileEmbeddings(projectId: string, filePath: string): Promise<EmbeddingRecord[]> {
    try {
      const { data, error } = await this._client
        .from('codebase_embeddings')
        .select('*')
        .match({
          project_id: projectId,
          file_path: filePath,
        })
        .order('chunk_index', { ascending: true });

      if (error) {
        throw error;
      }

      return data as EmbeddingRecord[];
    } catch (error) {
      logger.error(`Failed to get embeddings for ${filePath}:`, error);
      return [];
    }
  }

  async getProjectFiles(projectId: string): Promise<string[]> {
    try {
      const { data, error } = await this._client
        .from('codebase_embeddings')
        .select('file_path')
        .eq('project_id', projectId)
        .order('file_path');

      if (error) {
        throw error;
      }

      // Get unique file paths
      const uniqueFiles = [...new Set(data.map((item) => item.file_path))];

      return uniqueFiles;
    } catch (error) {
      logger.error('Failed to get project files:', error);
      return [];
    }
  }

  async checkEmbeddingsExist(projectId: string): Promise<boolean> {
    try {
      const { count, error } = await this._client
        .from('codebase_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .limit(1);

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error('Failed to check embeddings existence:', error);
      return false;
    }
  }

  // Batch operations for efficiency
  async batchUpsertEmbeddings(embeddings: Partial<EmbeddingRecord>[], batchSize: number = 100): Promise<void> {
    const batches = [];

    for (let i = 0; i < embeddings.length; i += batchSize) {
      batches.push(embeddings.slice(i, i + batchSize));
    }

    for (const [index, batch] of batches.entries()) {
      try {
        await this.upsertEmbeddings(batch);
        logger.info(`Processed batch ${index + 1}/${batches.length}`);
      } catch (error) {
        logger.error(`Failed to process batch ${index + 1}:`, error);
        throw error;
      }
    }
  }

  // Get embeddings with pagination
  async getEmbeddingsPaginated(
    projectId: string,
    page: number = 1,
    pageSize: number = 100,
  ): Promise<{ data: EmbeddingRecord[]; total: number }> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await this._client
        .from('codebase_embeddings')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .range(from, to)
        .order('file_path')
        .order('chunk_index');

      if (error) {
        throw error;
      }

      return {
        data: data as EmbeddingRecord[],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Failed to get paginated embeddings:', error);
      return { data: [], total: 0 };
    }
  }
}

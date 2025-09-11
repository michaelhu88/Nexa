import { type ActionFunctionArgs, json } from '@remix-run/node';
import { EmbeddingService } from '~/lib/services/embedding-service';

// Removed unused import: IndexingService
import { VectorClient } from '~/lib/supabase/vector-client';
import { createScopedLogger } from '~/utils/logger';
import type { FileMap } from '~/lib/.server/llm/constants';

const logger = createScopedLogger('api.embeddings.index');

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as any;
    const { projectId, files, openaiApiKey, supabaseUrl, supabaseKey, forceReindex = false } = body;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!files || Object.keys(files).length === 0) {
      return json({ error: 'No files provided for indexing' }, { status: 400 });
    }

    if (!openaiApiKey) {
      return json({ error: 'OpenAI API key is required for embeddings' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Supabase credentials are required' }, { status: 400 });
    }

    logger.info(`Starting indexing for project ${projectId} with ${Object.keys(files).length} files`);

    // Initialize services
    const embeddingService = new EmbeddingService({
      openaiApiKey,
      model: 'text-embedding-3-small',
      batchSize: 10,
    });

    const vectorClient = new VectorClient(supabaseUrl, supabaseKey);

    // Check if we should force reindex
    if (forceReindex) {
      logger.info('Force reindex requested, deleting existing embeddings');
      await vectorClient.deleteProjectEmbeddings(projectId);
    }

    // Update indexing status
    await vectorClient.updateIndexingStatus(projectId, {
      status: 'indexing',
      totalFiles: Object.keys(files).length,
      indexedFiles: 0,
      startedAt: new Date(),
    });

    // Process files
    const fileMap = new Map(Object.entries(files as FileMap));
    let processedCount = 0;
    const errors: string[] = [];

    for (const [filePath, content] of fileMap.entries()) {
      try {
        // Skip certain files
        if (shouldSkipFile(filePath)) {
          logger.debug(`Skipping file: ${filePath}`);
          continue;
        }

        // Process file and generate embeddings
        const embeddingRecords = await embeddingService.processFile(content, filePath, projectId);

        // Store embeddings in database
        await vectorClient.batchUpsertEmbeddings(embeddingRecords, 50);

        processedCount++;

        // Update progress
        await vectorClient.updateIndexingStatus(projectId, {
          indexedFiles: processedCount,
        });

        logger.info(`Indexed ${filePath}: ${embeddingRecords.length} chunks`);
      } catch (error) {
        logger.error(`Failed to index ${filePath}:`, error);
        errors.push(`${filePath}: ${error}`);
      }
    }

    // Update final status
    await vectorClient.updateIndexingStatus(projectId, {
      status: errors.length > 0 ? 'completed' : 'completed',
      indexedFiles: processedCount,
      completedAt: new Date(),
      lastError: errors.length > 0 ? errors.join('; ') : undefined,
    });

    // Get project stats
    const stats = await vectorClient.getProjectStats(projectId);

    return json({
      success: true,
      projectId,
      processedFiles: processedCount,
      totalFiles: Object.keys(files).length,
      errors: errors.length > 0 ? errors : undefined,
      stats,
    });
  } catch (error) {
    logger.error('Indexing failed:', error);
    return json({ error: `Indexing failed: ${error}` }, { status: 500 });
  }
}

function shouldSkipFile(filePath: string): boolean {
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
  ];

  return skipPatterns.some((pattern) => {
    if (pattern.startsWith('*')) {
      return filePath.endsWith(pattern.slice(1));
    }

    return filePath.includes(pattern);
  });
}

import { type ActionFunctionArgs, json } from '@remix-run/node';
import { EmbeddingService } from '~/lib/services/embedding-service';
import { VectorClient } from '~/lib/supabase/vector-client';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.embeddings.search');

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as any;
    const { query, projectId, openaiApiKey, supabaseUrl, supabaseKey, limit = 10, threshold = 0.7 } = body;

    if (!query) {
      return json({ error: 'Search query is required' }, { status: 400 });
    }

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!openaiApiKey) {
      return json({ error: 'OpenAI API key is required' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Supabase credentials are required' }, { status: 400 });
    }

    logger.info(`Searching for: "${query}" in project ${projectId}`);

    // Initialize services
    const embeddingService = new EmbeddingService({
      openaiApiKey,
      model: 'text-embedding-3-small',
    });

    const vectorClient = new VectorClient(supabaseUrl, supabaseKey);

    // Check if embeddings exist
    const hasEmbeddings = await vectorClient.checkEmbeddingsExist(projectId);

    if (!hasEmbeddings) {
      return json(
        {
          error: 'No embeddings found for this project. Please index the codebase first.',
        },
        { status: 404 },
      );
    }

    // Generate embedding for the search query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Search for similar chunks
    const similarChunks = await vectorClient.searchSimilarChunks(projectId, queryEmbedding, limit, threshold);

    logger.info(`Found ${similarChunks.length} similar chunks`);

    return json({
      success: true,
      query,
      results: similarChunks,
      count: similarChunks.length,
    });
  } catch (error) {
    logger.error('Search failed:', error);
    return json({ error: `Search failed: ${error}` }, { status: 500 });
  }
}

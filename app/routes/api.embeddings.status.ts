import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { VectorClient } from '~/lib/supabase/vector-client';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.embeddings.status');

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const supabaseUrl = url.searchParams.get('supabaseUrl');
  const supabaseKey = url.searchParams.get('supabaseKey');

  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'Supabase credentials are required' }, { status: 400 });
  }

  try {
    const vectorClient = new VectorClient(supabaseUrl, supabaseKey);

    // Get indexing status
    const status = await vectorClient.getIndexingStatus(projectId);

    // Get project statistics
    const stats = await vectorClient.getProjectStats(projectId);

    // Check if embeddings exist
    const hasEmbeddings = await vectorClient.checkEmbeddingsExist(projectId);

    return json({
      success: true,
      projectId,
      status: status || {
        status: 'idle',
        totalFiles: 0,
        indexedFiles: 0,
        totalChunks: 0,
      },
      stats,
      hasEmbeddings,
    });
  } catch (error) {
    logger.error('Failed to get status:', error);
    return json({ error: `Failed to get status: ${error}` }, { status: 500 });
  }
}

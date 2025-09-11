import type { Message } from 'ai';
import type { IProviderSetting } from '~/types/model';
import type { FileMap } from './constants';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('context-selector');

interface ContextSelectorOptions {
  messages: Message[];
  env?: Env;
  apiKeys?: Record<string, string>;
  files: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
  contextOptimization?: boolean;
  summary: string;
  hasWorkbench: boolean;
  projectId?: string;
  supabaseClient?: any;
  onFinish?: (resp: any) => void;
}

/**
 * Smart context selector that chooses the appropriate method based on workbench state
 */
export async function selectContextSmart(options: ContextSelectorOptions): Promise<FileMap> {
  const { hasWorkbench, projectId, supabaseClient, files } = options;

  /*
   * If no workbench is open, don't use any context selection
   * This is the "chatting phase" where there's no codebase yet
   */
  if (!hasWorkbench) {
    logger.info('No workbench active - skipping context selection (chatting phase)');
    return {};
  }

  // If workbench is open but no files, return empty
  if (!files || Object.keys(files).length === 0) {
    logger.info('Workbench active but no files available');
    return {};
  }

  // Check if vector embeddings are available for this project
  const hasVectorEmbeddings = await checkVectorEmbeddingsAvailable(projectId, supabaseClient);

  if (hasVectorEmbeddings && options.contextOptimization) {
    logger.info('Using vector-based context selection (building phase with embeddings)');

    try {
      // Import and use vector context
      const { selectVectorContext } = await import('./vector-context');
      return await selectVectorContext({
        ...options,
        projectId: projectId || 'current-project',
        supabaseClient,
      });
    } catch (error) {
      logger.error('Vector context selection failed, falling back to text-based:', error);

      // Fall through to text-based selection
    }
  }

  // Fall back to text-based context selection
  logger.info('Using text-based context selection (building phase without embeddings)');

  try {
    const { selectContext: selectTextContext } = await import('./select-context');
    return await selectTextContext(options);
  } catch (error) {
    logger.error('Text-based context selection failed:', error);
    return {};
  }
}

async function checkVectorEmbeddingsAvailable(projectId?: string, supabaseClient?: any): Promise<boolean> {
  if (!projectId || !supabaseClient) {
    return false;
  }

  try {
    const { count, error } = await supabaseClient
      .from('codebase_embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .limit(1);

    if (error) {
      logger.error('Error checking embeddings:', error);
      return false;
    }

    const hasEmbeddings = (count || 0) > 0;
    logger.info(`Project ${projectId} has embeddings: ${hasEmbeddings}`);

    return hasEmbeddings;
  } catch (error) {
    logger.error('Failed to check embeddings availability:', error);
    return false;
  }
}

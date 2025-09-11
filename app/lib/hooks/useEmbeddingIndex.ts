import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { embeddingsStore, indexingProgress } from '~/lib/stores/embeddings';
import { toast } from 'react-toastify';
import { createScopedLogger } from '~/utils/logger';
import { getApiKeysFromCookies } from '~/components/chat/APIKeyManager';

const logger = createScopedLogger('useEmbeddingIndex');

interface UseEmbeddingIndexOptions {
  autoIndex?: boolean;
  indexDelay?: number; // Debounce delay in ms
}

export function useEmbeddingIndex(options: UseEmbeddingIndexOptions = {}) {
  const { autoIndex = false, indexDelay = 2000 } = options;

  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const files = useStore(workbenchStore.files);
  const progress = useStore(indexingProgress);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousFilesRef = useRef<string>();

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only proceed if auto-indexing is enabled and workbench is shown
    if (autoIndex && showWorkbench) {
      const currentFilesHash = JSON.stringify(Object.keys(files || {}).sort());

      // Only trigger indexing if files actually changed and not already indexing
      if (currentFilesHash !== previousFilesRef.current && progress?.status !== 'indexing') {
        previousFilesRef.current = currentFilesHash;

        // Debounce indexing to avoid too frequent updates
        timeoutRef.current = setTimeout(() => {
          triggerIndexing();
        }, indexDelay);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [files, showWorkbench, autoIndex, indexDelay]);

  const triggerIndexing = async () => {
    if (!files || Object.keys(files).length === 0) {
      logger.info('No files to index');
      return;
    }

    logger.info('Auto-triggering indexing due to file changes');

    try {
      // Get API keys from cookies (same as chat functionality)
      const apiKeys = getApiKeysFromCookies();
      const openaiApiKey = apiKeys.OpenAI;

      // Use existing Supabase credentials from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Also check environment variables for API key
      let hasEnvKey = false;

      try {
        const response = await fetch('/api/check-env-key?provider=OpenAI');
        const data = (await response.json()) as any;
        hasEnvKey = data.isSet;
      } catch (error) {
        logger.warn('Failed to check environment API key:', error);
      }

      if (!openaiApiKey && !hasEnvKey) {
        logger.warn('Missing OpenAI API key for auto-indexing');
        return;
      }

      if (!supabaseUrl || !supabaseKey) {
        logger.warn('Missing Supabase credentials in environment variables for auto-indexing');
        return;
      }

      embeddingsStore.setStatus('indexing');

      const response = await fetch('/api/embeddings/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'current-project',
          files,
          openaiApiKey,
          supabaseUrl,
          supabaseKey,
          forceReindex: false,
        }),
      });

      const result = (await response.json()) as any;

      if (result.success) {
        embeddingsStore.setStatus('completed');
        embeddingsStore.setEmbeddingsAvailable(true);

        if (result.stats) {
          embeddingsStore.setProjectStats(result.stats);
        }

        logger.info(`Auto-indexed ${result.processedFiles} files`);
      } else {
        embeddingsStore.setError(result.error || 'Auto-indexing failed');
        logger.error('Auto-indexing failed:', result.error);
      }
    } catch (error) {
      embeddingsStore.setError(`Auto-indexing error: ${error}`);
      logger.error('Auto-indexing error:', error);
    }
  };

  const manualIndex = async (forceReindex = false) => {
    if (!files || Object.keys(files).length === 0) {
      toast.warning('No files to index');
      return false;
    }

    try {
      // Get API keys from cookies (same as chat functionality)
      const apiKeys = getApiKeysFromCookies();
      const openaiApiKey = apiKeys.OpenAI;

      // Use existing Supabase credentials from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Also check environment variables for API key
      let hasEnvKey = false;

      try {
        const response = await fetch('/api/check-env-key?provider=OpenAI');
        const data = (await response.json()) as any;
        hasEnvKey = data.isSet;
      } catch (error) {
        logger.warn('Failed to check environment API key:', error);
      }

      if (!openaiApiKey && !hasEnvKey) {
        toast.error('OpenAI API key is required for indexing. Please add it in settings or environment variables.');
        return false;
      }

      if (!supabaseUrl || !supabaseKey) {
        toast.error('Supabase credentials are missing from environment variables. Please check your .env.local file.');
        return false;
      }

      embeddingsStore.setStatus('indexing');
      embeddingsStore.clearError();

      const response = await fetch('/api/embeddings/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'current-project',
          files,
          openaiApiKey,
          supabaseUrl,
          supabaseKey,
          forceReindex,
        }),
      });

      const result = (await response.json()) as any;

      if (result.success) {
        embeddingsStore.setStatus('completed');
        embeddingsStore.setEmbeddingsAvailable(true);

        if (result.stats) {
          embeddingsStore.setProjectStats(result.stats);
        }

        toast.success(`Successfully indexed ${result.processedFiles} files`);

        return true;
      } else {
        embeddingsStore.setError(result.error || 'Indexing failed');
        toast.error(result.error || 'Indexing failed');

        return false;
      }
    } catch (error) {
      const errorMessage = `Indexing error: ${error}`;
      embeddingsStore.setError(errorMessage);
      toast.error('Failed to index codebase');
      logger.error('Manual indexing error:', error);

      return false;
    }
  };

  const checkIndexStatus = async () => {
    try {
      // Use existing Supabase credentials from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return;
      }

      const params = new URLSearchParams({
        projectId: 'current-project',
        supabaseUrl,
        supabaseKey,
      });

      const response = await fetch(`/api/embeddings/status?${params}`);
      const result = (await response.json()) as any;

      if (result.success) {
        embeddingsStore.setEmbeddingsAvailable(result.hasEmbeddings);

        if (result.stats) {
          embeddingsStore.setProjectStats(result.stats);
        }
      }
    } catch (error) {
      logger.error('Failed to check index status:', error);
    }
  };

  return {
    manualIndex,
    checkIndexStatus,
    isIndexing: progress?.status === 'indexing',
    progress: progress?.percentage || 0,
    currentFile: progress?.currentFile,
  };
}

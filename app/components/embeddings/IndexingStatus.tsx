import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { indexingProgress, indexingStatus, projectStats, embeddingsAvailable } from '~/lib/stores/embeddings';
import { workbenchStore } from '~/lib/stores/workbench';
import { toast } from 'react-toastify';
import { getApiKeysFromCookies } from '~/components/chat/APIKeyManager';

export function IndexingStatus() {
  const progress = useStore(indexingProgress);
  const status = useStore(indexingStatus);
  const stats = useStore(projectStats);
  const available = useStore(embeddingsAvailable);
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const [isIndexing, setIsIndexing] = useState(false);

  // Only show when workbench is active
  if (!showWorkbench) {
    return null;
  }

  const handleStartIndexing = async () => {
    try {
      setIsIndexing(true);

      // Get current files from workbench
      const files = workbenchStore.files.get();

      if (!files || Object.keys(files).length === 0) {
        toast.warning('No files to index in the current project');
        return;
      }

      // Get API keys from cookies (same as chat functionality)
      const apiKeys = getApiKeysFromCookies();
      const openaiApiKey = apiKeys.OpenAI;

      // Use existing Supabase credentials from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Also check environment variables via API
      let hasEnvKey = false;

      try {
        const response = await fetch('/api/check-env-key?provider=OpenAI');
        const data = (await response.json()) as any;
        hasEnvKey = data.isSet;
      } catch (error) {
        console.error('Failed to check environment API key:', error);
      }

      if (!openaiApiKey && !hasEnvKey) {
        toast.error('OpenAI API key is required for indexing. Please add it in settings or environment variables.');
        return;
      }

      if (!supabaseUrl || !supabaseKey) {
        toast.error('Supabase credentials are missing from environment variables. Please check your .env.local file.');
        return;
      }

      const response = await fetch('/api/embeddings/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'current-project', // TODO: Get actual project ID
          files,
          openaiApiKey,
          supabaseUrl,
          supabaseKey,
          forceReindex: false,
        }),
      });

      const result = (await response.json()) as any;

      if (result.success) {
        toast.success(`Indexed ${result.processedFiles} files successfully`);

        // Update stats
        if (result.stats) {
          projectStats.set(result.stats);
        }

        embeddingsAvailable.set(true);
      } else {
        toast.error(result.error || 'Indexing failed');
      }
    } catch (error) {
      console.error('Indexing error:', error);
      toast.error('Failed to start indexing');
    } finally {
      setIsIndexing(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return available ? '✅' : '⚪';
      case 'indexing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    if (status === 'indexing' && progress) {
      return `Indexing: ${progress.current}/${progress.total} files (${Math.round(progress.percentage)}%)`;
    }

    if (available && stats) {
      return `Indexed: ${stats.totalFiles} files, ${stats.totalChunks} chunks`;
    }

    if (status === 'failed') {
      return 'Indexing failed';
    }

    return 'Not indexed';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-nexa-background-primary/50 rounded-lg border border-nexa-border-primary">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-lg" title={`Status: ${status}`}>
          {getStatusIcon()}
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-nexa-text-secondary">Vector Index</span>
          <span className="text-xs text-nexa-text-primary">{getStatusText()}</span>
        </div>
      </div>

      {status !== 'indexing' && (
        <button
          onClick={handleStartIndexing}
          disabled={isIndexing}
          className="px-2 py-1 text-xs bg-nexa-accent text-white rounded hover:bg-nexa-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          title={available ? 'Re-index codebase' : 'Index codebase'}
        >
          {available ? 'Re-index' : 'Index'}
        </button>
      )}

      {status === 'indexing' && progress && (
        <div className="w-24 h-1 bg-nexa-background-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-nexa-accent transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

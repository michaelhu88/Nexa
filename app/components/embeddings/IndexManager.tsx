import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { projectStats, embeddingsAvailable, selectedContextFiles } from '~/lib/stores/embeddings';
import { workbenchStore } from '~/lib/stores/workbench';
import { toast } from 'react-toastify';
import { getApiKeysFromCookies } from '~/components/chat/APIKeyManager';

interface IndexManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IndexManager({ isOpen, onClose }: IndexManagerProps) {
  // const _status = useStore(indexingStatus); // Reserved for future use
  const stats = useStore(projectStats);
  const available = useStore(embeddingsAvailable);
  const contextFiles = useStore(selectedContextFiles);
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen || !showWorkbench) {
    return null;
  }

  const handleDeleteIndex = async () => {
    if (!confirm('Are you sure you want to delete all indexed embeddings? This cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);

      // TODO: Implement delete API call
      toast.info('Index deletion not yet implemented');

      embeddingsAvailable.set(false);
      projectStats.set(null);
    } catch (error) {
      console.error('Failed to delete index:', error);
      toast.error('Failed to delete index');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestSearch = async () => {
    const query = prompt('Enter a search query to test:');

    if (!query) {
      return;
    }

    try {
      // Get API keys from cookies (same as chat functionality)
      const apiKeys = getApiKeysFromCookies();
      const openaiApiKey = apiKeys.OpenAI;

      // Use existing Supabase credentials from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch('/api/embeddings/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          projectId: 'current-project',
          openaiApiKey,
          supabaseUrl,
          supabaseKey,
          limit: 5,
        }),
      });

      const result = (await response.json()) as any;

      if (result.success) {
        alert(
          `Found ${result.count} results:\n\n${result.results
            .map((r: any) => `${r.file_path} (${r.chunk_type}): ${r.similarity.toFixed(2)}`)
            .join('\n')}`,
        );
      } else {
        toast.error(result.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-nexa-background-primary rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-nexa-border-primary">
          <h2 className="text-lg font-semibold text-nexa-text-primary">Vector Index Manager</h2>
          <button onClick={onClose} className="text-nexa-text-secondary hover:text-nexa-text-primary">
            <span className="i-ph:x text-xl" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Status Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-nexa-text-primary mb-2">Index Status</h3>
            <div className="bg-nexa-background-secondary rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-nexa-text-secondary">Status:</span>
                <span className={`text-sm font-medium ${available ? 'text-green-500' : 'text-nexa-text-secondary'}`}>
                  {available ? 'Indexed' : 'Not Indexed'}
                </span>
              </div>

              {stats && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-nexa-text-secondary">Total Files:</span>
                    <span className="text-sm text-nexa-text-primary">{stats.totalFiles}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-nexa-text-secondary">Total Chunks:</span>
                    <span className="text-sm text-nexa-text-primary">{stats.totalChunks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-nexa-text-secondary">Avg Chunks/File:</span>
                    <span className="text-sm text-nexa-text-primary">{stats.avgChunksPerFile}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Context Files Section */}
          {contextFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-nexa-text-primary mb-2">Files in Current Context</h3>
              <div className="bg-nexa-background-secondary rounded p-3 max-h-40 overflow-y-auto">
                {contextFiles.map((file, index) => (
                  <div key={index} className="text-xs text-nexa-text-secondary mb-1">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-nexa-text-primary mb-2">Actions</h3>
            <div className="flex gap-2">
              <button
                onClick={handleTestSearch}
                disabled={!available}
                className="px-3 py-1.5 text-sm bg-nexa-accent text-white rounded hover:bg-nexa-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Search
              </button>
              <button
                onClick={handleDeleteIndex}
                disabled={!available || isDeleting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Index'}
              </button>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-nexa-text-secondary hover:text-nexa-text-primary mb-2"
            >
              <span className={`i-ph:caret-${showAdvanced ? 'down' : 'right'} text-lg`} />
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="bg-nexa-background-secondary rounded p-3">
                <div className="text-xs text-nexa-text-secondary">
                  <p className="mb-2">
                    <strong>Embedding Model:</strong> text-embedding-3-small (1536 dimensions)
                  </p>
                  <p className="mb-2">
                    <strong>Chunk Size:</strong> ~500 tokens
                  </p>
                  <p className="mb-2">
                    <strong>Similarity Threshold:</strong> 0.7
                  </p>
                  <p>
                    <strong>Max Context Chunks:</strong> 15
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-nexa-border-primary">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-nexa-background-secondary text-nexa-text-primary rounded hover:bg-nexa-background-tertiary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

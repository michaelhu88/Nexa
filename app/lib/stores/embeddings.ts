import { atom } from 'nanostores';
import type { IndexingProgress, IndexingStatus, ProjectStats } from '~/types/embeddings';

// Current indexing progress
export const indexingProgress = atom<IndexingProgress | null>(null);

// Indexing queue
export const indexingQueue = atom<string[]>([]);

// Overall indexing status
export const indexingStatus = atom<IndexingStatus>('idle');

// Project statistics
export const projectStats = atom<ProjectStats | null>(null);

// Error messages
export const indexingError = atom<string | null>(null);

// Whether embeddings are available for current project
export const embeddingsAvailable = atom<boolean>(false);

// Selected files for context (for UI display)
export const selectedContextFiles = atom<string[]>([]);

// Store actions
export const embeddingsStore = {
  // Update indexing progress
  updateProgress(progress: IndexingProgress | null) {
    indexingProgress.set(progress);

    if (progress) {
      indexingStatus.set(progress.status);
    }
  },

  // Add to indexing queue
  addToQueue(projectId: string) {
    const queue = indexingQueue.get();

    if (!queue.includes(projectId)) {
      indexingQueue.set([...queue, projectId]);
    }
  },

  // Remove from queue
  removeFromQueue(projectId: string) {
    const queue = indexingQueue.get();
    indexingQueue.set(queue.filter((id) => id !== projectId));
  },

  // Set indexing status
  setStatus(status: IndexingStatus) {
    indexingStatus.set(status);
  },

  // Set project stats
  setProjectStats(stats: ProjectStats | null) {
    projectStats.set(stats);
  },

  // Set error
  setError(error: string | null) {
    indexingError.set(error);

    if (error) {
      indexingStatus.set('failed');
    }
  },

  // Clear error
  clearError() {
    indexingError.set(null);
  },

  // Set embeddings availability
  setEmbeddingsAvailable(available: boolean) {
    embeddingsAvailable.set(available);
  },

  // Update selected context files
  setSelectedContextFiles(files: string[]) {
    selectedContextFiles.set(files);
  },

  // Reset all state
  reset() {
    indexingProgress.set(null);
    indexingQueue.set([]);
    indexingStatus.set('idle');
    projectStats.set(null);
    indexingError.set(null);
    embeddingsAvailable.set(false);
    selectedContextFiles.set([]);
  },
};

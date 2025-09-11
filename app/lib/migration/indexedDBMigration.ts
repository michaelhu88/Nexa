import { openDatabase, getAll } from '~/lib/persistence/db';
import { projectActions } from '~/lib/stores/projects';

// Removed unused import: toast
import { createScopedLogger } from '~/utils/logger';
import type { FileMap } from '~/lib/stores/files';

const logger = createScopedLogger('IndexedDBMigration');

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: string[];
}

export class IndexedDBMigration {
  async checkForExistingData(): Promise<boolean> {
    try {
      const db = await openDatabase();

      if (!db) {
        return false;
      }

      const chats = await getAll(db);

      return chats.length > 0;
    } catch (error) {
      logger.error('Error checking for existing data:', error);
      return false;
    }
  }

  async migrateToProjects(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const db = await openDatabase();

      if (!db) {
        result.errors.push('Could not access IndexedDB');
        return result;
      }

      const chats = await getAll(db);

      if (chats.length === 0) {
        result.success = true;
        return result;
      }

      logger.info(`Found ${chats.length} chats to migrate`);

      for (const chat of chats) {
        try {
          await this._migrateChatToProject(chat);
          result.migratedCount++;
          logger.info(`Migrated chat ${chat.id} successfully`);
        } catch (error) {
          result.failedCount++;

          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to migrate chat ${chat.id}: ${errorMsg}`);
          logger.error(`Failed to migrate chat ${chat.id}:`, error);
        }
      }

      result.success = result.migratedCount > 0 || result.failedCount === 0;

      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Migration failed');
      logger.error('Migration failed:', error);

      return result;
    }
  }

  private async _migrateChatToProject(chat: any): Promise<void> {
    // Extract files from chat messages
    const files = this._extractFilesFromMessages(chat.messages);

    // Determine project name from chat
    const projectName = this._generateProjectName(chat);

    // Create the project
    const project = await projectActions.createProject({
      name: projectName,
      description: chat.description || `Migrated from chat ${chat.id}`,
      files,
      metadata: chat.metadata || {},
    });

    logger.info(`Created project ${project.id} from chat ${chat.id}`);
  }

  private _extractFilesFromMessages(messages: any[]): FileMap {
    const files: FileMap = {};

    for (const message of messages) {
      if (message.role === 'assistant' && message.content) {
        // Look for artifact patterns in the content
        const artifactMatches = this._findArtifacts(message.content);

        for (const artifact of artifactMatches) {
          const artifactFiles = this._extractFilesFromArtifact(artifact);
          Object.assign(files, artifactFiles);
        }
      }
    }

    return files;
  }

  private _findArtifacts(content: string): string[] {
    const artifacts: string[] = [];

    // Match both old boltArtifact and new nexaArtifact patterns
    const patterns = [
      /<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/g,
      /<nexaArtifact[^>]*>([\s\S]*?)<\/nexaArtifact>/g,
    ];

    for (const pattern of patterns) {
      let match;

      while ((match = pattern.exec(content)) !== null) {
        artifacts.push(match[1]);
      }
    }

    return artifacts;
  }

  private _extractFilesFromArtifact(artifactContent: string): FileMap {
    const files: FileMap = {};

    // Match both old boltAction and new nexaAction patterns
    const patterns = [
      /<boltAction\s+type="file"\s+filePath="([^"]+)"[^>]*>([\s\S]*?)<\/boltAction>/g,
      /<nexaAction\s+type="file"\s+filePath="([^"]+)"[^>]*>([\s\S]*?)<\/nexaAction>/g,
    ];

    for (const pattern of patterns) {
      let match;

      while ((match = pattern.exec(artifactContent)) !== null) {
        const filePath = match[1];
        const content = match[2].trim();

        files[filePath] = {
          type: 'file',
          content,
          isBinary: false,
        };
      }
    }

    return files;
  }

  private _generateProjectName(chat: any): string {
    // Try to extract a meaningful name from the chat
    if (chat.description && chat.description.trim()) {
      return chat.description.trim().substring(0, 50);
    }

    // Look for the first artifact title
    for (const message of chat.messages || []) {
      if (message.role === 'assistant' && message.content) {
        const titleMatch = message.content.match(/title="([^"]+)"/);

        if (titleMatch) {
          return titleMatch[1].substring(0, 50);
        }
      }
    }

    // Look for project-related keywords in messages
    for (const message of chat.messages || []) {
      if (message.role === 'user' && message.content) {
        const content = message.content.toLowerCase();

        if (content.includes('app') || content.includes('website') || content.includes('project')) {
          // Extract a few words around these keywords
          const words = message.content.split(' ').slice(0, 5).join(' ');
          return words.substring(0, 50);
        }
      }
    }

    // Fallback to timestamp-based name
    const date = new Date(chat.timestamp || Date.now()).toLocaleDateString();

    return `Migrated Project ${date}`;
  }

  async cleanupIndexedDB(): Promise<void> {
    try {
      logger.info('Cleaning up IndexedDB data...');

      // Delete the IndexedDB database
      if (typeof indexedDB !== 'undefined') {
        const deleteRequest = indexedDB.deleteDatabase('boltHistory');

        return new Promise((resolve, reject) => {
          deleteRequest.onsuccess = () => {
            logger.info('IndexedDB cleaned up successfully');
            resolve();
          };

          deleteRequest.onerror = () => {
            logger.error('Failed to cleanup IndexedDB:', deleteRequest.error);
            reject(deleteRequest.error);
          };
        });
      }

      // No IndexedDB available, nothing to clean up
      return Promise.resolve();
    } catch (error) {
      logger.error('Error during IndexedDB cleanup:', error);
      throw error;
    }
  }
}

export const indexedDBMigration = new IndexedDBMigration();

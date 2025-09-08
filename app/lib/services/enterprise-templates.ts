import JSZip from 'jszip';
import { apiClient } from '~/lib/api/client';
import { authStore } from '~/lib/stores/auth';
import { createScopedLogger } from '~/utils/logger';
import { escapeNexaTags, detectProjectCommands, createCommandsMessage } from '~/utils/projectCommands';
import type { Message } from 'ai';
import { generateId } from '~/utils/fileUtils';

const logger = createScopedLogger('EnterpriseTemplates');

export interface TemplateFile {
  path: string;
  content: string;
  isBinary: boolean;
}

export interface EnterpriseTemplate {
  id: string;
  title: string;
  filename: string;
  size: number;
  url: string;
  mimetype: string;
}

export class EnterpriseTemplateService {
  /**
   * Check if user is authenticated with NocoBase
   */
  isAuthenticated(): boolean {
    const { token } = authStore.get();
    return !!token;
  }

  /**
   * Fetch the base-template from NocoBase
   */
  async fetchBaseTemplate(): Promise<EnterpriseTemplate> {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required to fetch enterprise templates');
    }

    try {
      const template = await apiClient.getBaseTemplate();
      logger.debug('Fetched base template:', template);

      return template;
    } catch (error) {
      logger.error('Failed to fetch base template:', error);
      throw error;
    }
  }

  /**
   * Download and extract zip file contents
   */
  async extractTemplateZip(template: EnterpriseTemplate): Promise<TemplateFile[]> {
    try {
      logger.debug(`Downloading template: ${template.title} from ${template.url}`);

      // Download the zip file
      const zipData = await apiClient.downloadZipByUrl(template.url);
      logger.debug(`Downloaded ${zipData.byteLength} bytes`);

      // Load zip with JSZip
      const zip = await JSZip.loadAsync(zipData);
      logger.debug(`Loaded zip with ${Object.keys(zip.files).length} entries`);

      const files: TemplateFile[] = [];

      // Extract all files
      const promises = Object.keys(zip.files).map(async (filename) => {
        const file = zip.files[filename];

        // Skip directories
        if (file.dir) {
          logger.debug(`Skipping directory: ${filename}`);
          return;
        }

        // Strip base-template prefix from path (similar to webkitRelativePath.split('/').slice(1).join('/'))
        let cleanPath = filename;

        if (filename.startsWith('base-template/')) {
          cleanPath = filename.replace('base-template/', '');
        }

        // Skip if path becomes empty after stripping
        if (!cleanPath) {
          logger.debug(`Skipping file with empty path: ${filename}`);
          return;
        }

        // Determine if file is binary based on extension
        const isBinary = this._isBinaryFile(filename);

        let content: string;

        if (isBinary) {
          // For binary files, convert to base64
          const arrayBuffer = await file.async('arraybuffer');
          const bytes = new Uint8Array(arrayBuffer);
          const binaryString = Array.from(bytes)
            .map((byte) => String.fromCharCode(byte))
            .join('');
          content = btoa(binaryString);
          logger.debug(`Extracted binary file: ${cleanPath} (${bytes.length} bytes -> base64)`);
        } else {
          // For text files, get as string
          content = await file.async('string');
          logger.debug(`Extracted text file: ${cleanPath} (${content.length} chars)`);
        }

        files.push({
          path: cleanPath,
          content,
          isBinary,
        });
      });

      await Promise.all(promises);

      logger.info(`Successfully extracted ${files.length} files from template`);
      files.forEach((f) => logger.debug(`  - ${f.path} (${f.isBinary ? 'binary' : 'text'})`));

      return files;
    } catch (error) {
      logger.error('Failed to extract template zip:', error);
      throw error;
    }
  }

  /**
   * Generate files artifact message content (following folderImport pattern)
   */
  generateFilesMessage(files: TemplateFile[], templateTitle: string): Message {
    logger.info(`Generating files message for ${files.length} files`);

    const nexaActions = files
      .map((file) => {
        // Use the correct escapeNexaTags function (not HTML entities)
        const escapedContent = escapeNexaTags(file.content);

        return `<nexaAction type="file" filePath="${file.path}">
${escapedContent}
</nexaAction>`;
      })
      .join('\n\n');

    const filesMessage = `I've loaded the ${templateTitle} enterprise automation template with ${files.length} files. The template is now ready for customization.

<nexaArtifact id="enterprise-template" title="${templateTitle} - Enterprise Automation Template" type="bundled">
${nexaActions}
</nexaArtifact>

The enterprise automation template has been successfully loaded into your workspace. You can now:
1. Review the template structure  
2. Customize it for your specific needs
3. Add your business logic
4. Test and deploy your solution

Feel free to ask me to help you customize any part of the template!`;

    logger.debug(`Generated files message with ${nexaActions.split('<nexaAction').length - 1} actions`);

    return {
      id: generateId(),
      role: 'assistant',
      content: filesMessage,
      createdAt: new Date(),
    };
  }

  /**
   * Generate commands message if project has package.json (following folderImport pattern)
   */
  async generateCommandsMessage(files: TemplateFile[]): Promise<Message | null> {
    try {
      // Convert TemplateFile[] to the format expected by detectProjectCommands
      const fileContents = files
        .filter((f) => !f.isBinary)
        .map((f) => ({
          content: f.content,
          path: f.path,
        }));

      logger.debug(`Detecting project commands from ${fileContents.length} text files`);

      const commands = await detectProjectCommands(fileContents);

      if (!commands.setupCommand && !commands.startCommand) {
        logger.debug('No setup or start commands detected');
        return null;
      }

      logger.info(`Detected project commands: setup="${commands.setupCommand}", start="${commands.startCommand}"`);

      return createCommandsMessage(commands);
    } catch (error) {
      logger.error('Failed to generate commands message:', error);
      return null;
    }
  }

  /**
   * Load enterprise template and generate messages for chat
   */
  async loadEnterpriseTemplate(): Promise<Message> {
    try {
      logger.info('Starting enterprise template loading process');

      // Fetch base template
      const template = await this.fetchBaseTemplate();
      logger.info(`Fetched template: ${template.title} (${template.size} bytes)`);

      // Extract files
      const files = await this.extractTemplateZip(template);
      logger.info(`Successfully extracted ${files.length} files`);

      // Generate files message
      const filesMessage = this.generateFilesMessage(files, template.title);
      logger.info('Generated files artifact message');

      // Check if we need commands and append them to the files message
      const commandsMessage = await this.generateCommandsMessage(files);

      if (commandsMessage) {
        logger.info('Adding project setup commands to the message');

        // Append a shell action for npm install to the existing artifact
        const installAction = '\n<nexaAction type="shell">npm install</nexaAction>';
        const enhancedContent = filesMessage.content.replace('</nexaArtifact>', installAction + '\n</nexaArtifact>');

        filesMessage.content = enhancedContent;
        logger.debug('Enhanced message with npm install command');
      }

      logger.info('Successfully completed enterprise template loading');

      return filesMessage;
    } catch (error) {
      logger.error('Failed to load enterprise template:', error);

      // Return error message
      return {
        id: generateId(),
        role: 'assistant',
        content: `I encountered an error while loading the enterprise automation template: ${error instanceof Error ? error.message : 'Unknown error'}. 

Please make sure you're logged in to the NocoBase system and try again.

Error details: ${error instanceof Error ? error.stack : 'No additional details available'}`,
        createdAt: new Date(),
      };
    }
  }

  /**
   * Check if a file is binary based on its extension
   */
  private _isBinaryFile(filename: string): boolean {
    const binaryExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.ico',
      '.svg',
      '.pdf',
      '.zip',
      '.tar',
      '.gz',
      '.7z',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
      '.mp3',
      '.mp4',
      '.avi',
      '.mov',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
    ];

    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

    return binaryExtensions.includes(ext);
  }
}

// Export singleton instance
export const enterpriseTemplateService = new EnterpriseTemplateService();

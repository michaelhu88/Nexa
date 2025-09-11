import type { CodeChunk, ChunkingOptions } from '~/types/embeddings';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('CodeChunker');

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 2000,
  overlapSize: 200,
  includeImports: true,
  includeComments: true,
  minChunkSize: 100,
};

export class CodeChunker {
  private _options: ChunkingOptions;

  constructor(options: ChunkingOptions = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  async chunkFile(content: string | Uint8Array | Buffer | any, filePath: string): Promise<CodeChunk[]> {
    const language = this._detectLanguage(filePath);
    const chunks: CodeChunk[] = [];

    // Ensure content is a string
    let stringContent: string;

    if (typeof content === 'string') {
      stringContent = content;
    } else if (content instanceof Uint8Array || Buffer.isBuffer(content)) {
      stringContent = content.toString('utf-8');
    } else if (content && typeof content.toString === 'function') {
      stringContent = content.toString();
    } else {
      logger.warn(`Invalid content type for ${filePath}:`, typeof content);
      return [];
    }

    try {
      if (this._isCodeFile(filePath)) {
        // Use language-specific chunking
        chunks.push(...this._chunkByLanguage(stringContent, language, filePath));
      } else if (this._isMarkdownFile(filePath)) {
        chunks.push(...this._chunkMarkdown(stringContent, filePath));
      } else {
        // Default chunking for other files
        chunks.push(...this._chunkBySize(stringContent, language));
      }
    } catch (error) {
      logger.error(`Failed to chunk file ${filePath}:`, error);

      // Fallback to simple chunking
      chunks.push(...this._chunkBySize(stringContent, language));
    }

    return chunks;
  }

  private _chunkByLanguage(content: string, language: string, _filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    // Extract imports first
    const importChunk = this._extractImports(lines, language);

    if (importChunk && this._options.includeImports) {
      chunks.push(importChunk);
    }

    // Extract functions, classes, and other semantic blocks
    if (['typescript', 'javascript', 'tsx', 'jsx'].includes(language)) {
      chunks.push(...this._chunkTypeScript(lines, language));
    } else if (['python', 'py'].includes(language)) {
      chunks.push(...this._chunkPython(lines, language));
    } else {
      // Default to line-based chunking
      chunks.push(...this._chunkByLines(lines, language));
    }

    return chunks.filter((chunk) => chunk.content.trim().length >= (this._options.minChunkSize || 100));
  }

  private _chunkTypeScript(lines: string[], language: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    let currentChunk: string[] = [];
    let currentType: 'function' | 'class' | 'interface' | 'type' | 'general' = 'general';
    let currentName: string | undefined;
    let startLine = 0;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect function declarations
      if (trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)/)) {
        if (currentChunk.length > 0) {
          chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        }

        currentChunk = [line];
        currentType = 'function';
        currentName = trimmed.match(/function\s+(\w+)/)?.[1];
        startLine = i;
        braceDepth = 0;
      }
      // Detect arrow functions with names
      else if (trimmed.match(/^(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\(/)) {
        if (currentChunk.length > 0) {
          chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        }

        currentChunk = [line];
        currentType = 'function';
        currentName = trimmed.match(/const\s+(\w+)/)?.[1];
        startLine = i;
        braceDepth = 0;
      }
      // Detect class declarations
      else if (trimmed.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)/)) {
        if (currentChunk.length > 0) {
          chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        }

        currentChunk = [line];
        currentType = 'class';
        currentName = trimmed.match(/class\s+(\w+)/)?.[1];
        startLine = i;
        braceDepth = 0;
      }
      // Detect interface declarations
      else if (trimmed.match(/^(export\s+)?interface\s+(\w+)/)) {
        if (currentChunk.length > 0) {
          chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        }

        currentChunk = [line];
        currentType = 'interface';
        currentName = trimmed.match(/interface\s+(\w+)/)?.[1];
        startLine = i;
        braceDepth = 0;
      }
      // Detect type declarations
      else if (trimmed.match(/^(export\s+)?type\s+(\w+)\s*=/)) {
        if (currentChunk.length > 0) {
          chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        }

        currentChunk = [line];
        currentType = 'type';
        currentName = trimmed.match(/type\s+(\w+)/)?.[1];
        startLine = i;
        braceDepth = 0;
      } else {
        currentChunk.push(line);
      }

      // Track brace depth to know when blocks end
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // If we've closed all braces for a non-general chunk, finalize it
      if (braceDepth === 0 && currentType !== 'general' && currentChunk.length > 1) {
        chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i, currentName));
        currentChunk = [];
        currentType = 'general';
        currentName = undefined;
        startLine = i + 1;
      }

      // Check if chunk is getting too large
      if (currentChunk.join('\n').length > (this._options.maxChunkSize || 2000)) {
        chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i, currentName));
        currentChunk = [];
        currentType = 'general';
        currentName = undefined;
        startLine = i + 1;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(this._createChunk(currentChunk, currentType, language, startLine, lines.length - 1, currentName));
    }

    return chunks;
  }

  private _chunkPython(lines: string[], language: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    let currentChunk: string[] = [];
    let currentType: 'function' | 'class' | 'general' = 'general';
    let currentName: string | undefined;
    let startLine = 0;
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const currentIndent = line.length - line.trimStart().length;

      // Detect function definitions
      if (trimmed.match(/^(async\s+)?def\s+(\w+)/)) {
        if (currentChunk.length > 0) {
          chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        }

        currentChunk = [line];
        currentType = 'function';
        currentName = trimmed.match(/def\s+(\w+)/)?.[1];
        startLine = i;
        indentLevel = currentIndent;
      }
      // Detect class definitions
      else if (trimmed.match(/^class\s+(\w+)/)) {
        if (currentChunk.length > 0) {
          chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        }

        currentChunk = [line];
        currentType = 'class';
        currentName = trimmed.match(/class\s+(\w+)/)?.[1];
        startLine = i;
        indentLevel = currentIndent;
      } else if (currentType !== 'general' && currentIndent <= indentLevel && trimmed.length > 0) {
        // End of current function/class
        chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i - 1, currentName));
        currentChunk = [line];
        currentType = 'general';
        currentName = undefined;
        startLine = i;
      } else {
        currentChunk.push(line);
      }

      // Check if chunk is getting too large
      if (currentChunk.join('\n').length > (this._options.maxChunkSize || 2000)) {
        chunks.push(this._createChunk(currentChunk, currentType, language, startLine, i, currentName));
        currentChunk = [];
        currentType = 'general';
        currentName = undefined;
        startLine = i + 1;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(this._createChunk(currentChunk, currentType, language, startLine, lines.length - 1, currentName));
    }

    return chunks;
  }

  private _chunkMarkdown(content: string, _filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const sections = content.split(/^#{1,3}\s+/m);

    sections.forEach((section, _index) => {
      if (section.trim()) {
        chunks.push({
          content: section.trim(),
          type: 'general',
          startLine: 0,
          endLine: 0,
          language: 'markdown',
        });
      }
    });

    return chunks;
  }

  private _chunkByLines(lines: string[], language: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const chunkSize = Math.floor((this._options.maxChunkSize || 2000) / 50); // Estimate lines per chunk

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      chunks.push({
        content: chunkLines.join('\n'),
        type: 'general',
        startLine: i,
        endLine: Math.min(i + chunkSize - 1, lines.length - 1),
        language,
      });
    }

    return chunks;
  }

  private _chunkBySize(content: string, language: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const maxSize = this._options.maxChunkSize || 2000;
    const overlapSize = this._options.overlapSize || 200;

    for (let i = 0; i < content.length; i += maxSize - overlapSize) {
      const chunk = content.slice(i, i + maxSize);
      chunks.push({
        content: chunk,
        type: 'general',
        startLine: 0,
        endLine: 0,
        language,
      });
    }

    return chunks;
  }

  private _extractImports(lines: string[], language: string): CodeChunk | null {
    const importLines: string[] = [];
    let lastImportLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (
        trimmed.startsWith('import ') ||
        trimmed.startsWith('from ') ||
        trimmed.startsWith('require(') ||
        (trimmed.startsWith('const ') && trimmed.includes('require('))
      ) {
        importLines.push(line);
        lastImportLine = i;
      } else if (lastImportLine > -1 && i - lastImportLine > 1) {
        // Stop if we've moved past imports
        break;
      }
    }

    if (importLines.length > 0) {
      return {
        content: importLines.join('\n'),
        type: 'import',
        startLine: 0,
        endLine: lastImportLine,
        language,
      };
    }

    return null;
  }

  private _createChunk(
    lines: string[],
    type: CodeChunk['type'],
    language: string,
    startLine: number,
    endLine: number,
    name?: string,
  ): CodeChunk {
    return {
      content: lines.join('\n'),
      type,
      name,
      startLine,
      endLine,
      language,
    };
  }

  private _detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      r: 'r',
      m: 'matlab',
      sql: 'sql',
      sh: 'bash',
      ps1: 'powershell',
      md: 'markdown',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      css: 'css',
      scss: 'scss',
      html: 'html',
    };

    return languageMap[extension || ''] || 'text';
  }

  private _isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      'ts',
      'tsx',
      'js',
      'jsx',
      'py',
      'java',
      'cpp',
      'c',
      'cs',
      'go',
      'rs',
      'php',
      'rb',
      'swift',
      'kt',
      'scala',
      'r',
      'm',
      'sql',
    ];
    const extension = filePath.split('.').pop()?.toLowerCase();

    return codeExtensions.includes(extension || '');
  }

  private _isMarkdownFile(filePath: string): boolean {
    return filePath.endsWith('.md') || filePath.endsWith('.mdx');
  }
}

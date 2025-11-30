/**
 * ScriptBlockParser
 *
 * Parses script blocks from HTTP request content.
 * Handles both pre-request scripts (< {% %}) and response handlers (> {% %}).
 *
 * JetBrains HTTP Client compatible syntax:
 * - Pre-request scripts: < {% script %} or < script.js
 * - Response handlers: > {% script %} or > script.js
 */
import { ParsedScript } from '../types';

/**
 * Result from parsing all scripts in content
 */
export interface ParsedScriptsResult {
  preRequestScripts: ParsedScript[];
  responseHandlers: ParsedScript[];
}

export class ScriptBlockParser {
  /**
   * Parse response handler scripts from content
   * Syntax:
   *   > {% script content %}
   *   > path/to/script.js
   */
  parseResponseHandlers(content: string): ParsedScript[] {
    return ScriptBlockParser.parseResponseHandlers(content);
  }

  /**
   * Parse pre-request scripts from content
   * Syntax:
   *   < {% script content %}
   *   < path/to/script.js (only .js files, not body references)
   */
  parsePreRequestScripts(content: string): ParsedScript[] {
    return ScriptBlockParser.parsePreRequestScripts(content);
  }

  /**
   * Remove all script blocks from content
   * Returns content with script blocks filtered out
   */
  removeScriptBlocks(section: string): string {
    const lines = section.split('\n');
    const result: string[] = [];
    let inScriptBlock = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for start of inline script block
      if (!inScriptBlock && (trimmedLine.startsWith('< {%') || trimmedLine.startsWith('> {%'))) {
        inScriptBlock = true;
        // Check if it ends on the same line
        if (trimmedLine.endsWith('%}')) {
          inScriptBlock = false;
        }
        continue;
      }

      // Check for end of inline script block
      if (inScriptBlock) {
        if (trimmedLine.endsWith('%}')) {
          inScriptBlock = false;
        }
        continue;
      }

      // Remove external pre-request script references (only .js files)
      if (trimmedLine.startsWith('< ') && trimmedLine.endsWith('.js')) {
        continue;
      }

      // Remove response handlers: > script.js or > path/to/script
      if (trimmedLine.startsWith('> ') && !trimmedLine.startsWith('> {%')) {
        continue;
      }

      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * Parse all scripts (pre-request and response handlers) from content
   */
  parseAllScripts(content: string): ParsedScriptsResult {
    return {
      preRequestScripts: this.parsePreRequestScripts(content),
      responseHandlers: this.parseResponseHandlers(content)
    };
  }

  // ==========================================================================
  // Static Methods (for backward compatibility and direct usage)
  // ==========================================================================

  /**
   * Parse response handler scripts from HTTP file content
   * Syntax:
   *   > {% script content %}
   *   > path/to/script.js
   */
  static parseResponseHandlers(content: string): ParsedScript[] {
    const scripts: ParsedScript[] = [];
    const lines = content.split('\n');

    let inInlineScript = false;
    let scriptContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for inline script start: > {%
      if (!inInlineScript && trimmedLine.startsWith('> {%')) {
        inInlineScript = true;
        // Check if script content is on the same line
        const afterMarker = trimmedLine.slice(4).trim();
        if (afterMarker && !afterMarker.endsWith('%}')) {
          scriptContent = afterMarker + '\n';
        } else if (afterMarker.endsWith('%}')) {
          // Single line script: > {% content %}
          scripts.push({
            type: 'inline',
            content: afterMarker.slice(0, -2).trim()
          });
          inInlineScript = false;
        }
        continue;
      }

      // Check for inline script end: %}
      if (inInlineScript) {
        if (trimmedLine.endsWith('%}')) {
          // End of inline script
          const endContent = trimmedLine.slice(0, -2);
          scriptContent += endContent;
          scripts.push({
            type: 'inline',
            content: scriptContent.trim()
          });
          scriptContent = '';
          inInlineScript = false;
        } else {
          scriptContent += line + '\n';
        }
        continue;
      }

      // Check for external script reference: > path/to/script.js
      if (trimmedLine.startsWith('> ') && !trimmedLine.startsWith('> {%')) {
        const path = trimmedLine.slice(2).trim();
        if (path && !path.startsWith('{')) {
          scripts.push({
            type: 'file',
            path
          });
        }
      }
    }

    return scripts;
  }

  /**
   * Parse pre-request scripts from HTTP file content
   * Syntax:
   *   < {% script content %}
   *   < path/to/script.js (only .js files are treated as scripts)
   */
  static parsePreRequestScripts(content: string): ParsedScript[] {
    const scripts: ParsedScript[] = [];
    const lines = content.split('\n');

    let inInlineScript = false;
    let scriptContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for inline script start: < {%
      if (!inInlineScript && trimmedLine.startsWith('< {%')) {
        inInlineScript = true;
        // Check if script content is on the same line
        const afterMarker = trimmedLine.slice(4).trim();
        if (afterMarker && !afterMarker.endsWith('%}')) {
          scriptContent = afterMarker + '\n';
        } else if (afterMarker.endsWith('%}')) {
          // Single line script: < {% content %}
          scripts.push({
            type: 'inline',
            content: afterMarker.slice(0, -2).trim()
          });
          inInlineScript = false;
        }
        continue;
      }

      // Check for inline script end: %}
      if (inInlineScript) {
        if (trimmedLine.endsWith('%}')) {
          // End of inline script
          const endContent = trimmedLine.slice(0, -2);
          scriptContent += endContent;
          scripts.push({
            type: 'inline',
            content: scriptContent.trim()
          });
          scriptContent = '';
          inInlineScript = false;
        } else {
          scriptContent += line + '\n';
        }
        continue;
      }

      // Check for external script reference: < path/to/script.js
      // Only .js files are treated as pre-request scripts
      // Other file references (like < ./data/body.json) are body file references
      if (trimmedLine.startsWith('< ') && !trimmedLine.startsWith('< {%')) {
        const path = trimmedLine.slice(2).trim();
        // Only treat .js files as scripts
        if (path && path.endsWith('.js')) {
          scripts.push({
            type: 'file',
            path
          });
        }
      }
    }

    return scripts;
  }
}

/**
 * ScriptEngine - JetBrains HTTP Client Compatible Scripting Engine
 *
 * Provides sandboxed JavaScript execution for:
 * - Response handler scripts (> {% %})
 * - Pre-request scripts (< {% %})
 *
 * Implements client/response/request APIs compatible with JetBrains HTTP Client
 */

import * as vm from 'vm';
import { HttpResponse } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ScriptTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ScriptResult {
  success: boolean;
  error?: Error;
  logs?: string[];
  tests?: ScriptTestResult[];
  variables?: Map<string, string>;
}

export interface ScriptContext {
  response?: HttpResponse;
  isPreRequest?: boolean;
  variables?: Map<string, string>;
}

export interface ParsedScript {
  type: 'inline' | 'file';
  content?: string;
  path?: string;
}

export interface ContentType {
  mimeType: string;
  charset?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple JSONPath implementation for basic path queries
 * Supports: $.property, $.array[index], $.array.length
 */
export function jsonPath(obj: unknown, path: string): unknown {
  if (!obj || typeof path !== 'string') return undefined;

  // Remove leading $. if present
  const normalizedPath = path.startsWith('$.') ? path.slice(2) : path;

  const parts = normalizedPath.split(/\.|\[|\]/).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Parse content-type header into structured ContentType object
 */
function parseContentType(contentTypeHeader?: string): ContentType {
  if (!contentTypeHeader) {
    return { mimeType: 'application/octet-stream' };
  }

  const parts = contentTypeHeader.split(';').map(p => p.trim());
  const mimeType = parts[0] || 'application/octet-stream';

  let charset: string | undefined;
  for (const part of parts.slice(1)) {
    if (part.toLowerCase().startsWith('charset=')) {
      charset = part.slice(8).replace(/"/g, '');
    }
  }

  return { mimeType, charset };
}

// ============================================================================
// ScriptEngine Class
// ============================================================================

export class ScriptEngine {
  private globals: Map<string, unknown> = new Map();

  /**
   * Execute a script in a sandboxed environment
   */
  async execute(script: string, context: ScriptContext = {}): Promise<ScriptResult> {
    const logs: string[] = [];
    const tests: ScriptTestResult[] = [];
    const variables = context.variables ? new Map(context.variables) : new Map<string, string>();


    // Create client API
    const client = {
      log: (...args: unknown[]) => {
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
        logs.push(message);
      },

      global: {
        set: (key: string, value: unknown) => {
          this.globals.set(key, value);
        },
        get: (key: string) => {
          return this.globals.get(key);
        },
        clear: () => {
          this.globals.clear();
        }
      },

      test: (name: string, fn: () => void) => {
        try {
          fn();
          tests.push({ name, passed: true });
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          tests.push({ name, passed: false, error: errorMessage });
        }
      },

      assert: (condition: boolean, message?: string) => {
        if (!condition) {
          const error = new Error(message || 'Assertion failed');
          throw error;
        }
      }
    };

    // Create response API (for response handler scripts)
    const responseApi = context.response ? {
      status: context.response.status,
      statusText: context.response.statusText,
      headers: context.response.headers,
      body: context.response.data,
      contentType: parseContentType(context.response.headers?.['content-type'])
    } : undefined;

    // Create request API (for pre-request scripts)
    const requestApi = context.isPreRequest ? {
      variables: {
        set: (key: string, value: string) => {
          variables.set(key, value);
        },
        get: (key: string) => {
          return variables.get(key);
        }
      }
    } : undefined;

    // Build sandbox context
    const sandbox: Record<string, unknown> = {
      client,
      console: {
        log: client.log,
        info: client.log,
        warn: client.log,
        error: client.log
      },
      jsonPath
    };

    if (responseApi) {
      sandbox.response = responseApi;
    }

    if (requestApi) {
      sandbox.request = requestApi;
    }

    try {
      // Create a VM context with limited access
      const vmContext = vm.createContext(sandbox);

      // Execute the script
      vm.runInContext(script, vmContext, {
        timeout: 5000, // 5 second timeout
        displayErrors: true
      });

      return {
        success: true,
        logs,
        tests: tests.length > 0 ? tests : undefined,
        variables: context.isPreRequest ? variables : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        logs,
        tests: tests.length > 0 ? tests : undefined,
        variables: context.isPreRequest ? variables : undefined
      };
    }
  }

  /**
   * Execute a script from external file content
   */
  async executeFile(_filePath: string, content: string, context: ScriptContext = {}): Promise<ScriptResult> {
    return this.execute(content, context);
  }

  /**
   * Clear all global variables
   */
  clearGlobals(): void {
    this.globals.clear();
  }

  /**
   * Get all global variables (for debugging/testing)
   */
  getGlobals(): Map<string, unknown> {
    return new Map(this.globals);
  }

  // ==========================================================================
  // Static Parsing Methods
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
   *   < path/to/script.js
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
        const filePath = trimmedLine.slice(2).trim();
        if (filePath && !filePath.startsWith('{') && filePath.endsWith('.js')) {
          scripts.push({
            type: 'file',
            path: filePath
          });
        }
      }
    }

    return scripts;
  }
}

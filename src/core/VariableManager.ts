import { Variables, HttpResponse } from '../types';
import { logVerbose } from '../utils/logger';
import { replaceVariablesInString } from '../utils/variableUtils';
import { JSONPath } from 'jsonpath-plus';

/**
 * Stored response data for named requests
 */
export interface StoredResponse {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  body: unknown;
}

export class VariableManager {
  private variables: Variables = {};
  private namedResponses: Map<string, StoredResponse> = new Map();

  setVariables(variables: Variables): void {
    this.variables = { ...this.variables, ...variables };
  }

  replaceVariables(content: string): string {
    // First process named request references
    let processed = this.processNamedRequestReferences(content);
    // Then process regular variables
    return replaceVariablesInString(processed, this.variables);
  }

  setVariable(key: string, value: string | number | boolean): void {
    this.variables[key] = value;
    logVerbose(`Set variable: ${key} = ${value}`);
  }

  getVariable(key: string): string | number | boolean | undefined {
    return this.variables[key];
  }

  getAllVariables(): Variables {
    return this.variables;
  }

  /**
   * Store response for a named request
   */
  storeNamedResponse(requestId: string, response: HttpResponse): void {
    let body: unknown = response.data;

    // Try to parse JSON body
    if (typeof response.data === 'string' && response.data.trim()) {
      try {
        body = JSON.parse(response.data);
      } catch {
        // Keep as string if not JSON
        body = response.data;
      }
    }

    const storedResponse: StoredResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body
    };

    this.namedResponses.set(requestId, storedResponse);
    logVerbose(`Stored response for named request: ${requestId}`);
  }

  /**
   * Get stored response for a named request
   */
  getNamedResponse(requestId: string): StoredResponse | undefined {
    return this.namedResponses.get(requestId);
  }

  /**
   * Process named request reference syntax:
   * - {{requestName.response.body}} - entire body
   * - {{requestName.response.body.field}} - specific field
   * - {{requestName.response.body.$.jsonpath}} - JSONPath expression
   * - {{requestName.response.headers.Content-Type}} - specific header
   * - {{requestName.response.status}} - status code
   */
  private processNamedRequestReferences(content: string): string {
    // Match {{requestName.response.xxx}} pattern
    return content.replace(/\{\{(\w+)\.response\.([\w.$\[\].-]+)\}\}/g, (match, requestId, path) => {
      const storedResponse = this.namedResponses.get(requestId);
      if (!storedResponse) {
        logVerbose(`Named request '${requestId}' not found, keeping original: ${match}`);
        return match;
      }

      try {
        const value = this.extractFromResponse(storedResponse, path);
        if (value === undefined) {
          logVerbose(`Path '${path}' not found in response for '${requestId}'`);
          return match;
        }

        // Convert value to string for replacement
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      } catch (error) {
        logVerbose(`Error extracting '${path}' from '${requestId}': ${error}`);
        return match;
      }
    });
  }

  /**
   * Extract value from stored response using path
   */
  private extractFromResponse(response: StoredResponse, path: string): unknown {
    const parts = path.split('.');
    const firstPart = parts[0];

    if (firstPart === 'status') {
      return response.status;
    }

    if (firstPart === 'statusText') {
      return response.statusText;
    }

    if (firstPart === 'headers') {
      const headerName = parts.slice(1).join('.');
      if (!headerName) {
        return response.headers;
      }
      // Case-insensitive header lookup
      const lowerHeaderName = headerName.toLowerCase();
      for (const [key, value] of Object.entries(response.headers)) {
        if (key.toLowerCase() === lowerHeaderName) {
          return value;
        }
      }
      return undefined;
    }

    if (firstPart === 'body') {
      const remainingPath = parts.slice(1).join('.');

      if (!remainingPath) {
        return response.body;
      }

      // Check if it's a JSONPath expression (starts with $)
      if (remainingPath.startsWith('$')) {
        const result = JSONPath({ path: remainingPath, json: response.body as object });
        return Array.isArray(result) && result.length > 0 ? result[0] : undefined;
      }

      // Simple dot notation access
      return this.getNestedValue(response.body, remainingPath);
    }

    return undefined;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array index notation like "items[0]"
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        current = (current as Record<string, unknown>)[key];
        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  /**
   * Clear all named responses (useful for test isolation)
   */
  clearNamedResponses(): void {
    this.namedResponses.clear();
  }
}

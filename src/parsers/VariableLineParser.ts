/**
 * VariableLineParser
 *
 * Parses variable lines from HTTP request content.
 * Handles REST Client @name directive and variable assignments.
 *
 * Supported syntax:
 * - @name requestId (REST Client named request)
 * - @key = value (variable assignment)
 * - @key = $.jsonpath (JSONPath for response variable extraction)
 */
import { VariableUpdate } from '../types';

/**
 * Type of variable line
 */
export type VariableLineType = 'name' | 'variable' | 'jsonpath' | 'invalid';

/**
 * Result from parsing a variable line
 */
export interface VariableLineResult {
  type: VariableLineType;
  /** Request ID for @name directive */
  requestId?: string;
  /** Variable key */
  key?: string;
  /** Variable value or JSONPath expression */
  value?: string;
  /** Whether value is a JSONPath expression */
  isJsonPath?: boolean;
  /** Error message for invalid lines */
  error?: string;
}

export class VariableLineParser {
  /**
   * Check if a line is a variable line (starts with @)
   */
  isVariableLine(line: string): boolean {
    return VariableLineParser.isVariableLine(line);
  }

  /**
   * Parse a single variable line
   */
  parse(line: string): VariableLineResult {
    return VariableLineParser.parse(line);
  }

  /**
   * Parse multiple lines, returning results for variable lines only
   */
  parseMultiple(lines: string[]): VariableLineResult[] {
    const results: VariableLineResult[] = [];

    for (const line of lines) {
      if (this.isVariableLine(line)) {
        const result = this.parse(line);
        if (result.type !== 'invalid') {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Extract all variable lines from content
   */
  extractFromContent(content: string): VariableLineResult[] {
    const lines = content.split('\n');
    return this.parseMultiple(lines);
  }

  /**
   * Convert a parse result to VariableUpdate format
   * Returns null for name directives or invalid results
   */
  toVariableUpdate(result: VariableLineResult): VariableUpdate | null {
    if (result.type === 'name' || result.type === 'invalid') {
      return null;
    }

    if (!result.key || result.value === undefined) {
      return null;
    }

    return {
      key: result.key,
      value: result.value
    };
  }

  // ==========================================================================
  // Static Methods
  // ==========================================================================

  /**
   * Check if a line is a variable line (starts with @)
   */
  static isVariableLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.length > 0 && trimmed.startsWith('@');
  }

  /**
   * Parse a single variable line
   */
  static parse(line: string): VariableLineResult {
    const trimmed = line.trim();

    // Check if it's a variable line
    if (!trimmed.startsWith('@')) {
      return {
        type: 'invalid',
        error: 'Line does not start with @'
      };
    }

    const content = trimmed.slice(1).trim();

    // Check for @name directive
    if (content.toLowerCase().startsWith('name ')) {
      const requestId = content.slice(5).trim();
      return {
        type: 'name',
        requestId
      };
    }

    // Check for variable assignment
    const equalIndex = content.indexOf('=');
    if (equalIndex === -1) {
      return {
        type: 'invalid',
        error: 'Invalid variable format: missing = sign'
      };
    }

    const key = content.slice(0, equalIndex).trim();
    const value = content.slice(equalIndex + 1).trim();

    // Check if value is JSONPath expression
    if (value.startsWith('$.')) {
      return {
        type: 'jsonpath',
        key,
        value,
        isJsonPath: true
      };
    }

    return {
      type: 'variable',
      key,
      value,
      isJsonPath: false
    };
  }
}

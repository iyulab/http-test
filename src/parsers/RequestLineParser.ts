/**
 * RequestLineParser
 *
 * Parses HTTP request lines (method, URL) and header lines.
 * Handles all standard HTTP methods and header parsing.
 *
 * Supported syntax:
 * - METHOD URL [HTTP/version]
 * - Header-Name: header-value
 */
import { HttpMethod } from '../types';

/**
 * Result from parsing a method line
 */
export interface RequestLineResult {
  method: HttpMethod;
  url: string;
}

/**
 * Result from parsing a header line
 */
export interface HeaderResult {
  key: string;
  value: string;
}

/**
 * Result from parsing multiple lines
 */
export interface ParsedLinesResult {
  method: HttpMethod | null;
  url: string | null;
  headers: HeaderResult[];
  /** Index where body content starts (after empty line) */
  bodyStartIndex: number | null;
}

export class RequestLineParser {
  /**
   * Regex pattern for detecting HTTP method lines
   */
  private static readonly METHOD_PATTERN = /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\s/;

  /**
   * Check if a line is an HTTP method line
   */
  isMethodLine(line: string): boolean {
    return RequestLineParser.isMethodLine(line);
  }

  /**
   * Parse a method line to extract method and URL
   */
  parseMethodLine(line: string): RequestLineResult | null {
    return RequestLineParser.parseMethodLine(line);
  }

  /**
   * Check if a line is a header line
   */
  isHeaderLine(line: string): boolean {
    return RequestLineParser.isHeaderLine(line);
  }

  /**
   * Parse a header line to extract key and value
   */
  parseHeaderLine(line: string): HeaderResult | null {
    return RequestLineParser.parseHeaderLine(line);
  }

  /**
   * Parse multiple lines to extract method, URL, and headers
   * Stops at empty line (body start)
   */
  parseLines(lines: string[]): ParsedLinesResult {
    const result: ParsedLinesResult = {
      method: null,
      url: null,
      headers: [],
      bodyStartIndex: null
    };

    let hasSeenMethod = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line after method means body starts
      if (trimmed === '') {
        if (hasSeenMethod) {
          result.bodyStartIndex = i + 1;
          break;
        }
        continue; // Skip leading empty lines
      }

      // Try to parse as method line
      if (!hasSeenMethod && this.isMethodLine(line)) {
        const methodResult = this.parseMethodLine(line);
        if (methodResult) {
          result.method = methodResult.method;
          result.url = methodResult.url;
          hasSeenMethod = true;
        }
        continue;
      }

      // Try to parse as header line
      if (this.isHeaderLine(line)) {
        const headerResult = this.parseHeaderLine(line);
        if (headerResult) {
          result.headers.push(headerResult);
        }
      }
    }

    return result;
  }

  // ==========================================================================
  // Static Methods
  // ==========================================================================

  /**
   * Check if a line is an HTTP method line
   */
  static isMethodLine(line: string): boolean {
    return RequestLineParser.METHOD_PATTERN.test(line);
  }

  /**
   * Parse a method line to extract method and URL
   */
  static parseMethodLine(line: string): RequestLineResult | null {
    if (!RequestLineParser.isMethodLine(line)) {
      return null;
    }

    const parts = line.split(/\s+/);
    const method = parts[0] as HttpMethod;
    let url = parts[1] || '';

    // Remove HTTP version if present (e.g., HTTP/1.1)
    if (parts.length > 2 && parts[2]?.startsWith('HTTP/')) {
      url = parts[1];
    }

    return {
      method,
      url: url.trim()
    };
  }

  /**
   * Check if a line is a header line
   */
  static isHeaderLine(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed === '' || !trimmed.includes(':')) {
      return false;
    }

    // Make sure it's not a method line (method lines don't have : before space)
    if (RequestLineParser.isMethodLine(line)) {
      return false;
    }

    // Make sure it's not a variable line
    if (trimmed.startsWith('@')) {
      return false;
    }

    return true;
  }

  /**
   * Parse a header line to extract key and value
   */
  static parseHeaderLine(line: string): HeaderResult | null {
    if (!RequestLineParser.isHeaderLine(line)) {
      return null;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return null;
    }

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    return { key, value };
  }
}

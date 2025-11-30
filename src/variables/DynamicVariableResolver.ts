/**
 * DynamicVariableResolver
 *
 * Resolves dynamic variables in strings.
 * Supports REST Client compatible syntax:
 * - {{$guid}} / {{$uuid}} - UUID v4
 * - {{$timestamp}} - Unix timestamp
 * - {{$randomInt min max}} - Random integer
 * - {{$datetime format offset}} - UTC datetime
 * - {{$localDatetime format offset}} - Local datetime
 * - {{$dotenv VARIABLE_NAME}} - .env file variable
 * - {{$processEnv VARIABLE_NAME}} - Process environment variable
 */
import * as fs from 'fs';
import * as path from 'path';

export class DynamicVariableResolver {
  /** Cache for dotenv values */
  private dotenvCache: Record<string, string> | null = null;

  /** Base path for .env file lookup */
  private dotenvPath: string | null = null;

  /**
   * Resolve all dynamic variables in a string
   */
  resolve(content: string): string {
    if (!content) return content;

    // Match {{$variableName args...}}
    return content.replace(/\{\{\s*\$(\w+)(?:\s+([^}]*))?\s*\}\}/g, (match, varName, args) => {
      const trimmedArgs = args?.trim() || '';
      return this.resolveVariable(varName, trimmedArgs, match);
    });
  }

  /**
   * Set the base directory for .env file lookup
   */
  setDotenvPath(basePath: string): void {
    this.dotenvPath = basePath;
    this.dotenvCache = null; // Clear cache when path changes
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.dotenvCache = null;
  }

  /**
   * Resolve a single dynamic variable
   */
  private resolveVariable(varName: string, args: string, original: string): string {
    switch (varName.toLowerCase()) {
      case 'guid':
      case 'uuid':
        return this.generateGuid();

      case 'timestamp':
        return this.generateTimestamp().toString();

      case 'randomint':
        return this.generateRandomInt(args);

      case 'datetime':
        return this.generateDatetime(args, false);

      case 'localdatetime':
        return this.generateDatetime(args, true);

      case 'dotenv':
        return this.resolveDotenv(args, original);

      case 'processenv':
        return this.resolveProcessEnv(args, original);

      default:
        return original;
    }
  }

  /**
   * Generate a UUID v4
   */
  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate Unix timestamp (seconds since epoch)
   */
  private generateTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Generate random integer
   */
  private generateRandomInt(args: string): string {
    const parts = args.split(/\s+/).filter(Boolean);
    const min = parts[0] ? parseInt(parts[0], 10) : 0;
    const max = parts[1] ? parseInt(parts[1], 10) : 1000;

    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return result.toString();
  }

  /**
   * Generate datetime string
   */
  private generateDatetime(args: string, isLocal: boolean): string {
    const parts = args.split(/\s+/).filter(Boolean);
    const format = parts[0] || 'iso8601';
    const offset = parts.slice(1).join(' ') || undefined;

    let date = new Date();

    // Apply offset if provided
    if (offset) {
      date = this.applyOffset(date, offset);
    }

    if (isLocal) {
      return this.formatLocalDatetime(date, format);
    }

    return this.formatDatetime(date, format);
  }

  /**
   * Format UTC datetime
   */
  private formatDatetime(date: Date, format: string): string {
    if (!format || format.toLowerCase() === 'iso8601') {
      return date.toISOString();
    }

    if (format.toLowerCase() === 'rfc1123') {
      return date.toUTCString();
    }

    return this.formatCustomDate(date, format);
  }

  /**
   * Format local datetime
   */
  private formatLocalDatetime(date: Date, format: string): string {
    if (!format || format.toLowerCase() === 'iso8601') {
      // Return ISO string without timezone (local time)
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
    }

    return this.formatCustomDate(date, format);
  }

  /**
   * Format date with custom format string
   * Supports: YYYY, MM, DD, HH, mm, ss, SSS
   */
  private formatCustomDate(date: Date, format: string): string {
    const pad = (n: number, width: number = 2): string => n.toString().padStart(width, '0');

    return format
      .replace(/YYYY/g, date.getFullYear().toString())
      .replace(/MM/g, pad(date.getMonth() + 1))
      .replace(/DD/g, pad(date.getDate()))
      .replace(/HH/g, pad(date.getHours()))
      .replace(/mm/g, pad(date.getMinutes()))
      .replace(/ss/g, pad(date.getSeconds()))
      .replace(/SSS/g, pad(date.getMilliseconds(), 3));
  }

  /**
   * Apply time offset to a date
   */
  private applyOffset(date: Date, offset: string): Date {
    const match = offset.match(/^(-?\d+)\s*(second|minute|hour|day|week|month|year)s?$/i);
    if (!match) {
      return date;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const result = new Date(date.getTime());

    switch (unit) {
      case 'second':
        result.setSeconds(result.getSeconds() + value);
        break;
      case 'minute':
        result.setMinutes(result.getMinutes() + value);
        break;
      case 'hour':
        result.setHours(result.getHours() + value);
        break;
      case 'day':
        result.setDate(result.getDate() + value);
        break;
      case 'week':
        result.setDate(result.getDate() + value * 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() + value);
        break;
      case 'year':
        result.setFullYear(result.getFullYear() + value);
        break;
    }

    return result;
  }

  /**
   * Resolve $dotenv variable
   */
  private resolveDotenv(varName: string, original: string): string {
    if (!varName) {
      return original;
    }

    const env = this.loadDotenv();
    const value = env[varName];

    return value !== undefined ? value : original;
  }

  /**
   * Resolve $processEnv variable
   */
  private resolveProcessEnv(varName: string, original: string): string {
    if (!varName) {
      return original;
    }

    const value = process.env[varName];
    return value !== undefined ? value : original;
  }

  /**
   * Load and parse .env file
   */
  private loadDotenv(): Record<string, string> {
    if (this.dotenvCache !== null) {
      return this.dotenvCache;
    }

    this.dotenvCache = {};

    // Search for .env file in common locations
    const searchPaths = [
      this.dotenvPath ? path.join(this.dotenvPath, '.env') : null,
      '.env',
      path.join(process.cwd(), '.env'),
    ].filter(Boolean) as string[];

    for (const envPath of searchPaths) {
      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf-8');
          this.parseDotenvContent(content);
          break;
        }
      } catch {
        // Continue to next path
      }
    }

    return this.dotenvCache;
  }

  /**
   * Parse .env file content
   */
  private parseDotenvContent(content: string): void {
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        this.dotenvCache![key] = value;
      }
    }
  }
}

import { logVerbose } from "./logger";
import fs from "fs";
import path from "path";

/**
 * Dynamic variable generators for REST Client compatibility
 * Supports: $guid, $timestamp, $randomInt, $datetime, $localDatetime,
 *           $dotenv, $processEnv
 */

// Cache for dotenv values
let dotenvCache: Record<string, string> | null = null;
let dotenvPath: string | null = null;

export interface DynamicVariableOptions {
  min?: number;
  max?: number;
  format?: string;
  offset?: string;
}

/**
 * Generate a UUID v4
 */
export function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate Unix timestamp (seconds since epoch)
 */
export function generateTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generate random integer between min and max (inclusive)
 */
export function generateRandomInt(min: number = 0, max: number = 1000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate datetime string in specified format
 * Supports ISO8601, RFC1123, and custom formats
 */
export function generateDatetime(format?: string, offset?: string): string {
  let date = new Date();

  // Apply offset if provided (e.g., "1 day", "-2 hours")
  if (offset) {
    date = applyOffset(date, offset);
  }

  if (!format || format === 'iso8601' || format === 'ISO8601') {
    return date.toISOString();
  }

  if (format === 'rfc1123' || format === 'RFC1123') {
    return date.toUTCString();
  }

  // Custom format support
  return formatDate(date, format);
}

/**
 * Generate local datetime string
 */
export function generateLocalDatetime(format?: string, offset?: string): string {
  let date = new Date();

  if (offset) {
    date = applyOffset(date, offset);
  }

  if (!format || format === 'iso8601' || format === 'ISO8601') {
    // Return ISO string without timezone (local time)
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
  }

  return formatDate(date, format);
}

/**
 * Apply time offset to a date
 */
function applyOffset(date: Date, offset: string): Date {
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
 * Format date with custom format string
 * Supports: YYYY, MM, DD, HH, mm, ss, SSS
 */
function formatDate(date: Date, format: string): string {
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
 * Set the base directory for .env file lookup
 */
export function setDotenvBasePath(basePath: string): void {
  dotenvPath = basePath;
  dotenvCache = null; // Clear cache when path changes
}

/**
 * Load and parse .env file
 */
function loadDotenv(): Record<string, string> {
  if (dotenvCache !== null) {
    return dotenvCache;
  }

  dotenvCache = {};

  // Search for .env file in common locations
  const searchPaths = [
    dotenvPath ? path.join(dotenvPath, '.env') : null,
    '.env',
    path.join(process.cwd(), '.env'),
  ].filter(Boolean) as string[];

  for (const envPath of searchPaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
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

            dotenvCache[key] = value;
          }
        }

        logVerbose(`Loaded .env file from: ${envPath}`);
        break;
      }
    } catch (error) {
      logVerbose(`Failed to load .env file from ${envPath}: ${error}`);
    }
  }

  return dotenvCache;
}

/**
 * Get value from .env file
 */
export function getDotenvValue(key: string): string | undefined {
  const env = loadDotenv();
  return env[key];
}

/**
 * Get value from process environment
 */
export function getProcessEnvValue(key: string): string | undefined {
  return process.env[key];
}

/**
 * Process dynamic variables in a string
 * Supports REST Client compatible syntax:
 * - {{$guid}}
 * - {{$timestamp}}
 * - {{$randomInt min max}}
 * - {{$datetime format offset}}
 * - {{$localDatetime format offset}}
 * - {{$dotenv VARIABLE_NAME}}
 * - {{$processEnv VARIABLE_NAME}}
 */
export function processDynamicVariables(content: string): string {
  // Match {{$variableName args...}}
  return content.replace(/\{\{\s*\$(\w+)(?:\s+([^}]*))?\s*\}\}/g, (match, varName, args) => {
    const trimmedArgs = args?.trim() || '';

    logVerbose(`Processing dynamic variable: $${varName} with args: ${trimmedArgs}`);

    switch (varName.toLowerCase()) {
      case 'guid':
      case 'uuid':
        return generateGuid();

      case 'timestamp':
        return generateTimestamp().toString();

      case 'randomint': {
        const parts = trimmedArgs.split(/\s+/).filter(Boolean);
        const min = parts[0] ? parseInt(parts[0], 10) : 0;
        const max = parts[1] ? parseInt(parts[1], 10) : 1000;
        return generateRandomInt(min, max).toString();
      }

      case 'datetime': {
        const parts = trimmedArgs.split(/\s+/).filter(Boolean);
        const format = parts[0] || 'iso8601';
        const offset = parts.slice(1).join(' ') || undefined;
        return generateDatetime(format, offset);
      }

      case 'localdatetime': {
        const parts = trimmedArgs.split(/\s+/).filter(Boolean);
        const format = parts[0] || 'iso8601';
        const offset = parts.slice(1).join(' ') || undefined;
        return generateLocalDatetime(format, offset);
      }

      case 'dotenv': {
        if (!trimmedArgs) {
          logVerbose('$dotenv requires a variable name');
          return match;
        }
        const value = getDotenvValue(trimmedArgs);
        if (value === undefined) {
          logVerbose(`$dotenv: Variable '${trimmedArgs}' not found in .env`);
          return match;
        }
        return value;
      }

      case 'processenv': {
        if (!trimmedArgs) {
          logVerbose('$processEnv requires a variable name');
          return match;
        }
        const value = getProcessEnvValue(trimmedArgs);
        if (value === undefined) {
          logVerbose(`$processEnv: Variable '${trimmedArgs}' not found in environment`);
          return match;
        }
        return value;
      }

      default:
        // Return original match if unknown dynamic variable
        logVerbose(`Unknown dynamic variable: $${varName}`);
        return match;
    }
  });
}

/**
 * Clear the dotenv cache (useful for testing)
 */
export function clearDotenvCache(): void {
  dotenvCache = null;
}

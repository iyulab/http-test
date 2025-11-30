/**
 * JsonSchemaHandler
 *
 * Handles JSON Schema validation assertions against response body.
 * Supports inline JSON schemas and schema files.
 * Uses _JsonSchema key for assertions.
 */
import * as fs from 'fs';
import * as path from 'path';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { HttpResponse } from '../../types';
import { IAssertionHandler, AssertionResult } from '../IAssertionHandler';

export class JsonSchemaHandler implements IAssertionHandler {
  readonly type = 'json-schema';

  private ajv: Ajv;

  constructor() {
    // Initialize Ajv with all formats support
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false
    });
    addFormats(this.ajv);
  }

  canHandle(key: string): boolean {
    return key.toLowerCase() === '_jsonschema';
  }

  assert(key: string, value: string, response: HttpResponse): AssertionResult {
    // Parse response data
    let data = response.data;

    // Handle null/undefined response
    if (data === null || data === undefined) {
      return {
        passed: false,
        assertionKey: key,
        expected: 'valid JSON data',
        actual: String(data),
        message: 'Response body is empty or null'
      };
    }

    // Handle string response - parse as JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return {
          passed: false,
          assertionKey: key,
          expected: 'valid JSON data',
          actual: 'invalid JSON string',
          message: 'Response body is not valid JSON'
        };
      }
    }

    // Get schema - either inline or from file
    let schema: object;
    try {
      schema = this.loadSchema(value);
    } catch (err) {
      return {
        passed: false,
        assertionKey: key,
        expected: 'valid JSON schema',
        actual: 'error',
        message: err instanceof Error ? err.message : 'Failed to load schema'
      };
    }

    // Validate data against schema
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      return {
        passed: true,
        assertionKey: key,
        expected: 'matches schema',
        actual: 'matches schema'
      };
    }

    // Format validation errors
    const errorMessage = this.formatErrors(validate.errors || []);

    return {
      passed: false,
      assertionKey: key,
      expected: 'matches schema',
      actual: 'validation failed',
      message: `JSON Schema validation failed: ${errorMessage}`
    };
  }

  /**
   * Load schema from inline JSON or file path
   */
  private loadSchema(value: string): object {
    const trimmedValue = value.trim();

    // Check if it looks like a file path
    if (this.isFilePath(trimmedValue)) {
      return this.loadSchemaFromFile(trimmedValue);
    }

    // Try to parse as inline JSON schema
    try {
      return JSON.parse(trimmedValue);
    } catch {
      throw new Error(`Invalid JSON schema: ${trimmedValue.substring(0, 50)}...`);
    }
  }

  /**
   * Check if value looks like a file path
   */
  private isFilePath(value: string): boolean {
    // File path if:
    // - Starts with ./ or ../
    // - Ends with .json
    // - Contains path separators
    // - Does not start with {
    if (value.startsWith('{') || value.startsWith('[')) {
      return false;
    }

    if (value.startsWith('./') || value.startsWith('../')) {
      return true;
    }

    if (value.endsWith('.json')) {
      return true;
    }

    // Windows absolute path
    if (/^[A-Za-z]:[\\\/]/.test(value)) {
      return true;
    }

    // Unix absolute path
    if (value.startsWith('/')) {
      return true;
    }

    return false;
  }

  /**
   * Load schema from file
   */
  private loadSchemaFromFile(filePath: string): object {
    // Resolve path relative to current working directory
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Schema file not found: ${filePath}`);
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid JSON in schema file: ${filePath}`);
      }
      throw err;
    }
  }

  /**
   * Format validation errors into readable message
   */
  private formatErrors(errors: ErrorObject[]): string {
    if (errors.length === 0) {
      return 'Unknown validation error';
    }

    const messages = errors.map(err => {
      const path = err.instancePath || 'root';
      const keyword = err.keyword;
      const message = err.message || '';

      switch (keyword) {
        case 'type':
          return `${path}: ${message}`;
        case 'required':
          return `${path}: ${message}`;
        case 'pattern':
          return `${path}: ${message}`;
        case 'minimum':
        case 'maximum':
        case 'exclusiveMinimum':
        case 'exclusiveMaximum':
          return `${path}: ${message}`;
        case 'additionalProperties':
          return `${path}: ${message}`;
        default:
          return `${path}: ${message}`;
      }
    });

    return messages.join('; ');
  }
}

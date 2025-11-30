/**
 * JsonSchemaHandler Tests
 *
 * TDD tests for JSON Schema validation assertion handler.
 */
import { JsonSchemaHandler } from '../../src/assertions/handlers/JsonSchemaHandler';
import { HttpResponse } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('JsonSchemaHandler', () => {
  let handler: JsonSchemaHandler;
  let tempDir: string;

  beforeEach(() => {
    handler = new JsonSchemaHandler();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-schema-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('type', () => {
    it('should have type "json-schema"', () => {
      expect(handler.type).toBe('json-schema');
    });
  });

  describe('canHandle', () => {
    it('should handle _JsonSchema key', () => {
      expect(handler.canHandle('_JsonSchema')).toBe(true);
    });

    it('should handle _jsonschema key (case insensitive)', () => {
      expect(handler.canHandle('_jsonschema')).toBe(true);
    });

    it('should handle _JSONSCHEMA key (case insensitive)', () => {
      expect(handler.canHandle('_JSONSCHEMA')).toBe(true);
    });

    it('should not handle other keys', () => {
      expect(handler.canHandle('Status')).toBe(false);
      expect(handler.canHandle('$.data')).toBe(false);
      expect(handler.canHandle('Content-Type')).toBe(false);
    });
  });

  describe('assert - inline schema', () => {
    it('should validate response against inline JSON schema', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        },
        required: ['id', 'name']
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(true);
      expect(result.assertionKey).toBe('_JsonSchema');
    });

    it('should fail when response does not match schema', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          id: 'not-a-number', // Should be number
          name: 'Test User'
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('number'); // "must be number"
    });

    it('should fail when required field is missing', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          name: 'Test User'
          // missing required 'id' field
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('required');
    });
  });

  describe('assert - schema from file', () => {
    it('should validate response against schema file', () => {
      // Create schema file
      const schemaPath = path.join(tempDir, 'user-schema.json');
      fs.writeFileSync(schemaPath, JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' }
        },
        required: ['id']
      }));

      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: { id: 1, name: 'Test' }
      };

      const result = handler.assert('_JsonSchema', schemaPath, response);

      expect(result.passed).toBe(true);
    });

    it('should fail when schema file does not exist', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: { id: 1 }
      };

      const result = handler.assert('_JsonSchema', './nonexistent-schema.json', response);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('assert - array validation', () => {
    it('should validate array response', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' }
        ]
      };

      const schema = JSON.stringify({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' }
          },
          required: ['id', 'name']
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(true);
    });

    it('should fail when array item does not match schema', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: [
          { id: 1, name: 'User 1' },
          { id: 'invalid', name: 'User 2' } // id should be number
        ]
      };

      const schema = JSON.stringify({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' }
          },
          required: ['id']
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
    });
  });

  describe('assert - string response', () => {
    it('should parse JSON string response and validate', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: '{"id": 1, "name": "Test"}'
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' }
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(true);
    });

    it('should fail for invalid JSON string response', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: 'not valid json'
      };

      const schema = JSON.stringify({
        type: 'object'
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('not valid JSON');
    });
  });

  describe('assert - additional properties', () => {
    it('should allow additional properties by default', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          id: 1,
          name: 'Test',
          extraField: 'extra'
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(true);
    });

    it('should reject additional properties when specified', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          id: 1,
          extraField: 'extra'
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        additionalProperties: false
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
    });
  });

  describe('assert - nested objects', () => {
    it('should validate nested object structures', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          user: {
            id: 1,
            profile: {
              name: 'Test',
              age: 25
            }
          }
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              profile: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  age: { type: 'number' }
                }
              }
            }
          }
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(true);
    });
  });

  describe('assert - pattern validation', () => {
    it('should validate string patterns', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          email: 'test@example.com',
          phone: '+1-555-123-4567'
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          email: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          },
          phone: {
            type: 'string',
            pattern: '^\\+?[0-9-]+$'
          }
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(true);
    });

    it('should fail when pattern does not match', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          email: 'not-an-email'
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          email: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          }
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('pattern');
    });
  });

  describe('assert - numeric constraints', () => {
    it('should validate minimum and maximum values', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          age: 25,
          score: 85.5
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 0, maximum: 150 },
          score: { type: 'number', minimum: 0, maximum: 100 }
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(true);
    });

    it('should fail when value exceeds maximum', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: {
          score: 150 // exceeds maximum of 100
        }
      };

      const schema = JSON.stringify({
        type: 'object',
        properties: {
          score: { type: 'number', maximum: 100 }
        }
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid schema gracefully', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: { id: 1 }
      };

      const result = handler.assert('_JsonSchema', 'not valid json', response);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Invalid JSON schema');
    });

    it('should handle null response data', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: null
      };

      const schema = JSON.stringify({
        type: 'object'
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
    });

    it('should handle undefined response data', () => {
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: undefined
      };

      const schema = JSON.stringify({
        type: 'object'
      });

      const result = handler.assert('_JsonSchema', schema, response);

      expect(result.passed).toBe(false);
    });
  });
});

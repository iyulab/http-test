/**
 * VariableLineParser Tests
 *
 * Tests for parsing variable lines (@variable = value) in HTTP files.
 * Supports REST Client @name directive and JetBrains variable syntax.
 */
import { VariableLineParser, VariableLineResult } from '../../src/parsers/VariableLineParser';

describe('VariableLineParser', () => {
  let parser: VariableLineParser;

  beforeEach(() => {
    parser = new VariableLineParser();
  });

  describe('isVariableLine()', () => {
    it('should return true for lines starting with @', () => {
      expect(parser.isVariableLine('@variable = value')).toBe(true);
      expect(parser.isVariableLine('@name requestId')).toBe(true);
      expect(parser.isVariableLine('@key=value')).toBe(true);
    });

    it('should return false for non-variable lines', () => {
      expect(parser.isVariableLine('GET http://example.com')).toBe(false);
      expect(parser.isVariableLine('Content-Type: application/json')).toBe(false);
      expect(parser.isVariableLine('variable = value')).toBe(false);
      expect(parser.isVariableLine('# Comment')).toBe(false);
    });

    it('should return false for empty or whitespace lines', () => {
      expect(parser.isVariableLine('')).toBe(false);
      expect(parser.isVariableLine('   ')).toBe(false);
    });
  });

  describe('parse()', () => {
    describe('@name directive', () => {
      it('should parse @name directive', () => {
        const result = parser.parse('@name myRequest');

        expect(result.type).toBe('name');
        expect(result.requestId).toBe('myRequest');
      });

      it('should parse @name directive case-insensitively', () => {
        const result = parser.parse('@NAME MyRequest');

        expect(result.type).toBe('name');
        expect(result.requestId).toBe('MyRequest');
      });

      it('should trim whitespace from request ID', () => {
        const result = parser.parse('@name   myRequest   ');

        expect(result.requestId).toBe('myRequest');
      });
    });

    describe('Variable assignments', () => {
      it('should parse simple variable assignment', () => {
        const result = parser.parse('@baseUrl = http://example.com');

        expect(result.type).toBe('variable');
        expect(result.key).toBe('baseUrl');
        expect(result.value).toBe('http://example.com');
      });

      it('should parse variable without spaces around =', () => {
        const result = parser.parse('@key=value');

        expect(result.type).toBe('variable');
        expect(result.key).toBe('key');
        expect(result.value).toBe('value');
      });

      it('should handle values with = signs', () => {
        const result = parser.parse('@token = abc=def=ghi');

        expect(result.key).toBe('token');
        expect(result.value).toBe('abc=def=ghi');
      });

      it('should trim whitespace from key and value', () => {
        const result = parser.parse('@  key  =  value  ');

        expect(result.key).toBe('key');
        expect(result.value).toBe('value');
      });
    });

    describe('JSONPath variable updates', () => {
      it('should detect JSONPath expression', () => {
        const result = parser.parse('@userId = $.data.id');

        expect(result.type).toBe('jsonpath');
        expect(result.key).toBe('userId');
        expect(result.value).toBe('$.data.id');
        expect(result.isJsonPath).toBe(true);
      });

      it('should detect complex JSONPath expressions', () => {
        const result = parser.parse('@token = $.response.auth.token');

        expect(result.type).toBe('jsonpath');
        expect(result.key).toBe('token');
        expect(result.value).toBe('$.response.auth.token');
        expect(result.isJsonPath).toBe(true);
      });

      it('should handle JSONPath with array access', () => {
        const result = parser.parse('@firstUser = $.users[0].name');

        expect(result.type).toBe('jsonpath');
        expect(result.key).toBe('firstUser');
        expect(result.value).toBe('$.users[0].name');
        expect(result.isJsonPath).toBe(true);
      });
    });

    describe('Invalid formats', () => {
      it('should return invalid for lines without =', () => {
        const result = parser.parse('@invalidVariable');

        expect(result.type).toBe('invalid');
        expect(result.error).toBeDefined();
      });

      it('should return invalid for non-@ lines', () => {
        const result = parser.parse('not a variable');

        expect(result.type).toBe('invalid');
      });
    });
  });

  describe('parseMultiple()', () => {
    it('should parse multiple variable lines', () => {
      const lines = [
        '@baseUrl = http://api.example.com',
        '@token = secret123',
        '@userId = $.data.id'
      ];

      const results = parser.parseMultiple(lines);

      expect(results).toHaveLength(3);
      expect(results[0].key).toBe('baseUrl');
      expect(results[1].key).toBe('token');
      expect(results[2].key).toBe('userId');
      expect(results[2].isJsonPath).toBe(true);
    });

    it('should skip non-variable lines', () => {
      const lines = [
        '@name request1',
        'GET http://example.com',
        '@key = value'
      ];

      const results = parser.parseMultiple(lines);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('name');
      expect(results[1].type).toBe('variable');
    });

    it('should handle empty array', () => {
      const results = parser.parseMultiple([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('extractFromContent()', () => {
    it('should extract all variable lines from content', () => {
      const content = `
@name TestRequest
@baseUrl = http://example.com
@token = abc123

GET {{baseUrl}}/api
Content-Type: application/json
      `;

      const results = parser.extractFromContent(content);

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('name');
      expect(results[1].key).toBe('baseUrl');
      expect(results[2].key).toBe('token');
    });

    it('should return empty array for content without variables', () => {
      const content = `
GET http://example.com
Content-Type: application/json

{"key": "value"}
      `;

      const results = parser.extractFromContent(content);
      expect(results).toHaveLength(0);
    });
  });

  describe('toVariableUpdate()', () => {
    it('should convert result to VariableUpdate format', () => {
      const result = parser.parse('@key = $.value');
      const update = parser.toVariableUpdate(result);

      expect(update).toEqual({
        key: 'key',
        value: '$.value'
      });
    });

    it('should return null for name directive', () => {
      const result = parser.parse('@name request');
      const update = parser.toVariableUpdate(result);

      expect(update).toBeNull();
    });

    it('should return null for invalid results', () => {
      const result = parser.parse('@invalid');
      const update = parser.toVariableUpdate(result);

      expect(update).toBeNull();
    });
  });

  describe('Static methods', () => {
    it('should provide static isVariableLine', () => {
      expect(VariableLineParser.isVariableLine('@var = value')).toBe(true);
      expect(VariableLineParser.isVariableLine('not a var')).toBe(false);
    });

    it('should provide static parse', () => {
      const result = VariableLineParser.parse('@key = value');
      expect(result.key).toBe('key');
    });
  });
});

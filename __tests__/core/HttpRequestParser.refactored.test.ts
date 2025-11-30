/**
 * HttpRequestParser Refactoring Tests
 *
 * Tests to verify HttpRequestParser works correctly after refactoring
 * to use sub-parsers (ScriptBlockParser, VariableLineParser, RequestLineParser).
 */
import { HttpRequestParser } from '../../src/core/HttpRequestParser';
import { VariableManager } from '../../src/core/VariableManager';

describe('HttpRequestParser (Refactored)', () => {
  let variableManager: VariableManager;
  let parser: HttpRequestParser;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new HttpRequestParser(variableManager);
  });

  describe('parse() basic functionality', () => {
    it('should parse simple GET request', () => {
      const section = `### Simple GET
GET http://example.com/api`;

      const request = parser.parse(section);

      expect(request.name).toBe('Simple GET');
      expect(request.method).toBe('GET');
      expect(request.url).toBe('http://example.com/api');
    });

    it('should parse POST request with body', () => {
      const section = `### Create User
POST http://example.com/users
Content-Type: application/json

{
  "name": "Test User"
}`;

      const request = parser.parse(section);

      expect(request.method).toBe('POST');
      expect(request.headers['Content-Type']).toBe('application/json');
      expect(request.body).toContain('"name": "Test User"');
    });

    it('should parse request with multiple headers', () => {
      const section = `### Request with Headers
GET http://example.com/api
Content-Type: application/json
Authorization: Bearer token123
Accept: application/json`;

      const request = parser.parse(section);

      expect(request.headers['Content-Type']).toBe('application/json');
      expect(request.headers['Authorization']).toBe('Bearer token123');
      expect(request.headers['Accept']).toBe('application/json');
    });
  });

  describe('Script block handling', () => {
    it('should parse pre-request scripts', () => {
      const section = `### With Pre-request Script
< {%
request.variables.set("timestamp", Date.now());
%}
GET http://example.com/api`;

      const request = parser.parse(section);

      expect(request.preRequestScripts).toHaveLength(1);
      expect(request.preRequestScripts![0].type).toBe('inline');
    });

    it('should parse response handlers', () => {
      const section = `### With Response Handler
GET http://example.com/api
> {%
client.log(response.status);
%}`;

      const request = parser.parse(section);

      expect(request.responseHandlers).toHaveLength(1);
      expect(request.responseHandlers![0].type).toBe('inline');
    });

    it('should parse external script references', () => {
      const section = `### With External Scripts
< ./pre-request.js
GET http://example.com/api
> ./response-handler.js`;

      const request = parser.parse(section);

      expect(request.preRequestScripts).toHaveLength(1);
      expect(request.preRequestScripts![0].type).toBe('file');
      expect(request.responseHandlers).toHaveLength(1);
      expect(request.responseHandlers![0].type).toBe('file');
    });

    it('should not include script blocks in body', () => {
      const section = `### Script Before Body
GET http://example.com/api
Content-Type: application/json
> {%
client.log("test");
%}

{"key": "value"}`;

      const request = parser.parse(section);

      expect(request.body).not.toContain('client.log');
      expect(request.body).toContain('"key": "value"');
    });
  });

  describe('Variable handling', () => {
    it('should parse @name directive', () => {
      const section = `### Named Request
@name myRequestId
GET http://example.com/api`;

      const request = parser.parse(section);

      expect(request.requestId).toBe('myRequestId');
    });

    it('should parse regular variable assignment', () => {
      const section = `### With Variables
@baseUrl = http://example.com
GET {{baseUrl}}/api`;

      const request = parser.parse(section);

      expect(request.url).toBe('http://example.com/api');
    });

    it('should parse JSONPath variable updates', () => {
      const section = `### With JSONPath
@userId = $.data.id
GET http://example.com/api`;

      const request = parser.parse(section);

      expect(request.variableUpdates).toContainEqual({
        key: 'userId',
        value: '$.data.id'
      });
    });
  });

  describe('Request line parsing', () => {
    it('should parse all HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      methods.forEach((method) => {
        const section = `### ${method} Request\n${method} http://example.com`;
        const request = parser.parse(section);
        expect(request.method).toBe(method);
      });
    });

    it('should handle URL with query parameters', () => {
      const section = `### With Query
GET http://example.com/search?q=test&page=1`;

      const request = parser.parse(section);

      expect(request.url).toBe('http://example.com/search?q=test&page=1');
    });

    it('should handle header with colon in value', () => {
      const section = `### With Complex Header
GET http://example.com
Location: http://redirect.com:8080/path`;

      const request = parser.parse(section);

      expect(request.headers['Location']).toBe('http://redirect.com:8080/path');
    });
  });

  describe('Body parsing', () => {
    it('should parse JSON body', () => {
      const section = `### JSON Body
POST http://example.com/api
Content-Type: application/json

{"name": "test", "value": 123}`;

      const request = parser.parse(section);

      expect(request.body).toBe('{"name": "test", "value": 123}');
    });

    it('should parse body from file reference', () => {
      const section = `### Body from File
POST http://example.com/api
Content-Type: application/json

< ./data/body.json`;

      const request = parser.parse(section);

      expect(request.bodyFromFile).toBe('./data/body.json');
    });

    it('should parse multiline body', () => {
      const section = `### Multiline Body
POST http://example.com/api
Content-Type: application/json

{
  "name": "test",
  "items": [1, 2, 3]
}`;

      const request = parser.parse(section);

      expect(request.body).toContain('"name": "test"');
      expect(request.body).toContain('"items": [1, 2, 3]');
    });
  });

  describe('Variable replacement', () => {
    it('should replace variables in URL', () => {
      variableManager.setVariable('host', 'api.example.com');
      const section = `### Variable URL
GET http://{{host}}/users`;

      const request = parser.parse(section);

      expect(request.url).toBe('http://api.example.com/users');
    });

    it('should replace variables in headers', () => {
      variableManager.setVariable('token', 'secret123');
      const section = `### Variable Header
GET http://example.com
Authorization: Bearer {{token}}`;

      const request = parser.parse(section);

      expect(request.headers['Authorization']).toBe('Bearer secret123');
    });
  });

  describe('Test section handling', () => {
    it('should separate test section from request', () => {
      const section = `### With Tests
GET http://example.com/api

#### Assert
Status: 200
Content-Type: application/json`;

      const request = parser.parse(section);

      expect(request.tests).toHaveLength(1);
      expect(request.tests[0].assertions).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty lines before method', () => {
      const section = `### Empty Lines

GET http://example.com/api`;

      const request = parser.parse(section);

      expect(request.method).toBe('GET');
      expect(request.url).toBe('http://example.com/api');
    });

    it('should handle request without headers', () => {
      const section = `### No Headers
GET http://example.com/api`;

      const request = parser.parse(section);

      expect(Object.keys(request.headers)).toHaveLength(0);
    });

    it('should handle request without body', () => {
      const section = `### No Body
GET http://example.com/api
Accept: application/json`;

      const request = parser.parse(section);

      expect(request.body).toBeUndefined();
    });
  });
});

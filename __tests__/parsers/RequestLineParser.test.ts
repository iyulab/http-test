/**
 * RequestLineParser Tests
 *
 * Tests for parsing HTTP request lines (method, URL, headers).
 * Handles standard HTTP methods and header parsing.
 */
import { RequestLineParser, RequestLineResult, HeaderResult } from '../../src/parsers/RequestLineParser';
import { HttpMethod } from '../../src/types';

describe('RequestLineParser', () => {
  let parser: RequestLineParser;

  beforeEach(() => {
    parser = new RequestLineParser();
  });

  describe('isMethodLine()', () => {
    it('should return true for standard HTTP methods', () => {
      expect(parser.isMethodLine('GET http://example.com')).toBe(true);
      expect(parser.isMethodLine('POST http://example.com')).toBe(true);
      expect(parser.isMethodLine('PUT http://example.com')).toBe(true);
      expect(parser.isMethodLine('DELETE http://example.com')).toBe(true);
      expect(parser.isMethodLine('PATCH http://example.com')).toBe(true);
      expect(parser.isMethodLine('HEAD http://example.com')).toBe(true);
      expect(parser.isMethodLine('OPTIONS http://example.com')).toBe(true);
      expect(parser.isMethodLine('CONNECT http://example.com')).toBe(true);
      expect(parser.isMethodLine('TRACE http://example.com')).toBe(true);
    });

    it('should return false for non-method lines', () => {
      expect(parser.isMethodLine('Content-Type: application/json')).toBe(false);
      expect(parser.isMethodLine('@variable = value')).toBe(false);
      expect(parser.isMethodLine('# Comment')).toBe(false);
      expect(parser.isMethodLine('')).toBe(false);
    });

    it('should require space after method', () => {
      expect(parser.isMethodLine('GEThttp://example.com')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(parser.isMethodLine('get http://example.com')).toBe(false);
      expect(parser.isMethodLine('Get http://example.com')).toBe(false);
    });
  });

  describe('parseMethodLine()', () => {
    it('should parse GET request', () => {
      const result = parser.parseMethodLine('GET http://example.com/api');

      expect(result.method).toBe('GET');
      expect(result.url).toBe('http://example.com/api');
    });

    it('should parse POST request', () => {
      const result = parser.parseMethodLine('POST http://example.com/users');

      expect(result.method).toBe('POST');
      expect(result.url).toBe('http://example.com/users');
    });

    it('should handle URL with query parameters', () => {
      const result = parser.parseMethodLine('GET http://example.com/search?q=test&page=1');

      expect(result.method).toBe('GET');
      expect(result.url).toBe('http://example.com/search?q=test&page=1');
    });

    it('should handle URL with HTTP version', () => {
      const result = parser.parseMethodLine('GET http://example.com/api HTTP/1.1');

      expect(result.method).toBe('GET');
      expect(result.url).toBe('http://example.com/api');
    });

    it('should handle multiple spaces between method and URL', () => {
      const result = parser.parseMethodLine('GET   http://example.com/api');

      expect(result.method).toBe('GET');
      expect(result.url).toBe('http://example.com/api');
    });

    it('should trim URL whitespace', () => {
      const result = parser.parseMethodLine('GET http://example.com/api  ');

      expect(result.url).toBe('http://example.com/api');
    });

    it('should return null for invalid lines', () => {
      const result = parser.parseMethodLine('Content-Type: application/json');

      expect(result).toBeNull();
    });
  });

  describe('isHeaderLine()', () => {
    it('should return true for header lines', () => {
      expect(parser.isHeaderLine('Content-Type: application/json')).toBe(true);
      expect(parser.isHeaderLine('Authorization: Bearer token')).toBe(true);
      expect(parser.isHeaderLine('X-Custom-Header: value')).toBe(true);
    });

    it('should return false for non-header lines', () => {
      expect(parser.isHeaderLine('GET http://example.com')).toBe(false);
      expect(parser.isHeaderLine('@variable = value')).toBe(false);
      expect(parser.isHeaderLine('just text')).toBe(false);
      expect(parser.isHeaderLine('')).toBe(false);
    });

    it('should handle edge cases', () => {
      // Colon in URL-like patterns in headers
      expect(parser.isHeaderLine('Location: http://example.com')).toBe(true);
    });
  });

  describe('parseHeaderLine()', () => {
    it('should parse simple header', () => {
      const result = parser.parseHeaderLine('Content-Type: application/json');

      expect(result).not.toBeNull();
      expect(result!.key).toBe('Content-Type');
      expect(result!.value).toBe('application/json');
    });

    it('should handle header value with colons', () => {
      const result = parser.parseHeaderLine('Location: http://example.com:8080/path');

      expect(result!.key).toBe('Location');
      expect(result!.value).toBe('http://example.com:8080/path');
    });

    it('should trim header key and value', () => {
      const result = parser.parseHeaderLine('  Content-Type  :  application/json  ');

      expect(result!.key).toBe('Content-Type');
      expect(result!.value).toBe('application/json');
    });

    it('should handle empty value', () => {
      const result = parser.parseHeaderLine('X-Empty:');

      expect(result!.key).toBe('X-Empty');
      expect(result!.value).toBe('');
    });

    it('should return null for invalid lines', () => {
      const result = parser.parseHeaderLine('not a header');

      expect(result).toBeNull();
    });
  });

  describe('parseLines()', () => {
    it('should parse method and headers from lines', () => {
      const lines = [
        'GET http://example.com/api',
        'Content-Type: application/json',
        'Authorization: Bearer token'
      ];

      const result = parser.parseLines(lines);

      expect(result.method).toBe('GET');
      expect(result.url).toBe('http://example.com/api');
      expect(result.headers).toHaveLength(2);
      expect(result.headers[0].key).toBe('Content-Type');
      expect(result.headers[1].key).toBe('Authorization');
    });

    it('should stop at empty line (body start)', () => {
      const lines = [
        'POST http://example.com/api',
        'Content-Type: application/json',
        '',
        '{"key": "value"}'
      ];

      const result = parser.parseLines(lines);

      expect(result.method).toBe('POST');
      expect(result.headers).toHaveLength(1);
      expect(result.bodyStartIndex).toBe(3);
    });

    it('should skip leading empty lines', () => {
      const lines = [
        '',
        '',
        'GET http://example.com/api',
        'Content-Type: application/json'
      ];

      const result = parser.parseLines(lines);

      expect(result.method).toBe('GET');
    });

    it('should handle missing method line', () => {
      const lines = [
        'Content-Type: application/json'
      ];

      const result = parser.parseLines(lines);

      expect(result.method).toBeNull();
      expect(result.headers).toHaveLength(1);
    });
  });

  describe('HTTP methods', () => {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

    methods.forEach((method) => {
      it(`should parse ${method} method`, () => {
        const result = parser.parseMethodLine(`${method} http://example.com`);
        expect(result?.method).toBe(method);
      });
    });
  });

  describe('Static methods', () => {
    it('should provide static isMethodLine', () => {
      expect(RequestLineParser.isMethodLine('GET http://example.com')).toBe(true);
      expect(RequestLineParser.isMethodLine('not a method')).toBe(false);
    });

    it('should provide static parseMethodLine', () => {
      const result = RequestLineParser.parseMethodLine('POST http://example.com/api');
      expect(result?.method).toBe('POST');
    });

    it('should provide static parseHeaderLine', () => {
      const result = RequestLineParser.parseHeaderLine('Accept: application/json');
      expect(result?.key).toBe('Accept');
    });
  });
});

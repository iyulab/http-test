/**
 * IHttpFileParser Contract Tests
 *
 * These tests define the contract that any IHttpFileParser implementation must fulfill.
 * Following TDD principles: Write tests first, then implement.
 */
import { IHttpFileParser } from '../../src/interfaces/IHttpFileParser';
import { HttpFileParser } from '../../src/core/HttpFileParser';
import { VariableManager } from '../../src/core/VariableManager';
import { HttpRequest } from '../../src/types';

describe('IHttpFileParser Contract', () => {
  let parser: IHttpFileParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new HttpFileParser(variableManager);
  });

  describe('parse()', () => {
    it('should return a Promise that resolves to HttpRequest array', async () => {
      const result = parser.parse('./tests/test_server.http');
      expect(result).toBeInstanceOf(Promise);

      const requests = await result;
      expect(Array.isArray(requests)).toBe(true);
    });

    it('should parse requests with required properties', async () => {
      const requests = await parser.parse('./tests/test_server.http');

      if (requests.length > 0) {
        const request = requests[0];
        expect(request).toHaveProperty('method');
        expect(request).toHaveProperty('url');
        expect(request).toHaveProperty('headers');
        expect(request).toHaveProperty('tests');
        expect(request).toHaveProperty('variableUpdates');
      }
    });

    it('should handle non-existent file gracefully', async () => {
      await expect(parser.parse('./non-existent.http')).rejects.toThrow();
    });
  });

  describe('Interface Type Checking', () => {
    it('should satisfy IHttpFileParser interface', () => {
      // Type assertion - if this compiles, the interface is satisfied
      const typedParser: IHttpFileParser = parser;
      expect(typeof typedParser.parse).toBe('function');
    });
  });
});

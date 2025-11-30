/**
 * ScriptBlockParser Tests
 *
 * Tests for the script block parsing functionality.
 * Parses pre-request scripts (< {% %}) and response handlers (> {% %})
 */
import { ScriptBlockParser } from '../../src/parsers/ScriptBlockParser';
import { ParsedScript } from '../../src/types';

describe('ScriptBlockParser', () => {
  let parser: ScriptBlockParser;

  beforeEach(() => {
    parser = new ScriptBlockParser();
  });

  describe('parseResponseHandlers()', () => {
    it('should parse inline response handler script', () => {
      const content = `
GET http://example.com/api
> {%
client.log("response received");
%}
      `;
      const scripts = parser.parseResponseHandlers(content);

      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[0].content).toBe('client.log("response received");');
    });

    it('should parse single-line inline script', () => {
      const content = 'GET http://example.com\n> {% client.log("test"); %}';
      const scripts = parser.parseResponseHandlers(content);

      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[0].content).toBe('client.log("test");');
    });

    it('should parse external script reference', () => {
      const content = 'GET http://example.com\n> ./scripts/handler.js';
      const scripts = parser.parseResponseHandlers(content);

      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('file');
      expect(scripts[0].path).toBe('./scripts/handler.js');
    });

    it('should parse multiple response handlers', () => {
      const content = `
GET http://example.com
> {% client.log("first"); %}
> ./handler.js
      `;
      const scripts = parser.parseResponseHandlers(content);

      expect(scripts).toHaveLength(2);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[1].type).toBe('file');
    });

    it('should return empty array when no handlers present', () => {
      const content = 'GET http://example.com\nContent-Type: application/json';
      const scripts = parser.parseResponseHandlers(content);

      expect(scripts).toHaveLength(0);
    });

    it('should handle multi-line inline script', () => {
      const content = `
> {%
const data = response.body;
client.test("check data", function() {
  client.assert(data.id > 0);
});
%}
      `;
      const scripts = parser.parseResponseHandlers(content);

      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[0].content).toContain('const data = response.body;');
      expect(scripts[0].content).toContain('client.assert(data.id > 0);');
    });
  });

  describe('parsePreRequestScripts()', () => {
    it('should parse inline pre-request script', () => {
      const content = `
< {%
request.variables.set("timestamp", Date.now());
%}
GET http://example.com
      `;
      const scripts = parser.parsePreRequestScripts(content);

      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[0].content).toBe('request.variables.set("timestamp", Date.now());');
    });

    it('should parse single-line pre-request script', () => {
      const content = '< {% request.variables.set("test", "value"); %}\nGET http://example.com';
      const scripts = parser.parsePreRequestScripts(content);

      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[0].content).toBe('request.variables.set("test", "value");');
    });

    it('should parse external pre-request script (.js only)', () => {
      const content = '< ./scripts/pre-request.js\nGET http://example.com';
      const scripts = parser.parsePreRequestScripts(content);

      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('file');
      expect(scripts[0].path).toBe('./scripts/pre-request.js');
    });

    it('should NOT parse body file references as scripts', () => {
      const content = '< ./data/body.json\nGET http://example.com';
      const scripts = parser.parsePreRequestScripts(content);

      expect(scripts).toHaveLength(0);
    });

    it('should return empty array when no scripts present', () => {
      const content = 'GET http://example.com\nContent-Type: application/json';
      const scripts = parser.parsePreRequestScripts(content);

      expect(scripts).toHaveLength(0);
    });
  });

  describe('removeScriptBlocks()', () => {
    it('should remove inline response handler blocks', () => {
      const content = `GET http://example.com
> {%
client.log("test");
%}
Content-Type: application/json`;

      const result = parser.removeScriptBlocks(content);

      expect(result).not.toContain('> {%');
      expect(result).not.toContain('client.log("test");');
      expect(result).not.toContain('%}');
      expect(result).toContain('GET http://example.com');
      expect(result).toContain('Content-Type: application/json');
    });

    it('should remove inline pre-request blocks', () => {
      const content = `< {%
request.variables.set("test", "value");
%}
GET http://example.com`;

      const result = parser.removeScriptBlocks(content);

      expect(result).not.toContain('< {%');
      expect(result).not.toContain('request.variables');
      expect(result).toContain('GET http://example.com');
    });

    it('should remove external script references', () => {
      const content = `< ./pre-request.js
GET http://example.com
> ./handler.js`;

      const result = parser.removeScriptBlocks(content);

      expect(result).not.toContain('< ./pre-request.js');
      expect(result).not.toContain('> ./handler.js');
      expect(result).toContain('GET http://example.com');
    });

    it('should handle single-line inline script', () => {
      const content = 'GET http://example.com\n> {% client.log("test"); %}';
      const result = parser.removeScriptBlocks(content);

      expect(result).not.toContain('> {%');
      expect(result).toContain('GET http://example.com');
    });

    it('should preserve non-script content', () => {
      const content = `GET http://example.com
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "test"
}`;

      const result = parser.removeScriptBlocks(content);

      expect(result).toContain('GET http://example.com');
      expect(result).toContain('Content-Type: application/json');
      expect(result).toContain('Authorization: Bearer {{token}}');
      expect(result).toContain('"name": "test"');
    });

    it('should NOT remove body file references (< ./data.json)', () => {
      const content = `POST http://example.com
Content-Type: application/json

< ./data/body.json`;

      const result = parser.removeScriptBlocks(content);

      expect(result).toContain('< ./data/body.json');
    });
  });

  describe('parseAllScripts()', () => {
    it('should parse both pre-request and response scripts', () => {
      const content = `
< {% request.variables.set("start", Date.now()); %}
GET http://example.com
> {% client.log(response.status); %}
      `;

      const result = parser.parseAllScripts(content);

      expect(result.preRequestScripts).toHaveLength(1);
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.preRequestScripts[0].content).toContain('request.variables.set');
      expect(result.responseHandlers[0].content).toContain('client.log');
    });

    it('should return empty arrays when no scripts', () => {
      const content = 'GET http://example.com';
      const result = parser.parseAllScripts(content);

      expect(result.preRequestScripts).toHaveLength(0);
      expect(result.responseHandlers).toHaveLength(0);
    });
  });

  describe('Static methods for backward compatibility', () => {
    it('should provide static parseResponseHandlers', () => {
      const content = '> {% client.log("test"); %}';
      const scripts = ScriptBlockParser.parseResponseHandlers(content);

      expect(scripts).toHaveLength(1);
    });

    it('should provide static parsePreRequestScripts', () => {
      const content = '< {% request.variables.set("x", 1); %}';
      const scripts = ScriptBlockParser.parsePreRequestScripts(content);

      expect(scripts).toHaveLength(1);
    });
  });
});

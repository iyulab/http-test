/**
 * Script Integration Tests
 *
 * Tests for scripting integration with HttpRequestParser and TestManager
 */

import { HttpFileParser, TestManager, ScriptEngine } from '../../src';
import { VariableManager } from '../../src/core/VariableManager';
import { HttpRequestParser } from '../../src/core/HttpRequestParser';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

describe('Script Integration', () => {
  describe('HttpRequestParser Script Parsing', () => {
    let variableManager: VariableManager;
    let parser: HttpRequestParser;

    beforeEach(() => {
      variableManager = new VariableManager();
      parser = new HttpRequestParser(variableManager);
    });

    it('should parse inline response handler from request section', () => {
      const section = `### Test Request
GET https://api.example.com/users

> {%
  client.test("Check status", function() {
    client.assert(response.status === 200);
  });
%}`;

      const request = parser.parse(section);

      expect(request.responseHandlers).toHaveLength(1);
      expect(request.responseHandlers?.[0].type).toBe('inline');
      expect(request.responseHandlers?.[0].content).toContain('client.test');
    });

    it('should parse external script reference from request section', () => {
      const section = `### Test Request
GET https://api.example.com/users

> scripts/handler.js`;

      const request = parser.parse(section);

      expect(request.responseHandlers).toHaveLength(1);
      expect(request.responseHandlers?.[0].type).toBe('file');
      expect(request.responseHandlers?.[0].path).toBe('scripts/handler.js');
    });

    it('should parse inline pre-request script from request section', () => {
      const section = `< {%
  request.variables.set("timestamp", Date.now().toString());
%}

### Test Request
GET https://api.example.com/users`;

      const request = parser.parse(section);

      expect(request.preRequestScripts).toHaveLength(1);
      expect(request.preRequestScripts?.[0].type).toBe('inline');
      expect(request.preRequestScripts?.[0].content).toContain('request.variables.set');
    });

    it('should parse external pre-request script from request section', () => {
      const section = `< scripts/pre-request.js

### Test Request
GET https://api.example.com/users`;

      const request = parser.parse(section);

      expect(request.preRequestScripts).toHaveLength(1);
      expect(request.preRequestScripts?.[0].type).toBe('file');
      expect(request.preRequestScripts?.[0].path).toBe('scripts/pre-request.js');
    });

    it('should parse multiple scripts from request section', () => {
      const section = `< {%
  request.variables.set("token", "abc123");
%}

### Test Request
GET https://api.example.com/users

> {%
  client.log("Response received");
%}

> {%
  client.test("Status OK", function() {
    client.assert(response.status === 200);
  });
%}`;

      const request = parser.parse(section);

      expect(request.preRequestScripts).toHaveLength(1);
      expect(request.responseHandlers).toHaveLength(2);
    });

    it('should not confuse body file reference with pre-request script', () => {
      const section = `### Test Request
POST https://api.example.com/users
Content-Type: application/json

< ./data/body.json`;

      const request = parser.parse(section);

      // Body file references (non-.js) should not be treated as scripts
      expect(request.preRequestScripts).toHaveLength(0);
      expect(request.bodyFromFile).toBe('./data/body.json');
    });

    it('should correctly extract request URL after removing script blocks', () => {
      const section = `< {%
  request.variables.set("token", "test");
%}

### Test Request
GET https://api.example.com/users

> {%
  client.log("Done");
%}`;

      const request = parser.parse(section);

      expect(request.url).toBe('https://api.example.com/users');
      expect(request.method).toBe('GET');
    });
  });

  describe('HttpFileParser Full Integration', () => {
    let tempDir: string;
    let tempFile: string;

    beforeAll(async () => {
      tempDir = join(tmpdir(), 'http-test-script-integration');
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      if (tempFile) {
        try {
          await unlink(tempFile);
        } catch {
          // Ignore
        }
      }
    });

    it('should parse HTTP file with scripts', async () => {
      tempFile = join(tempDir, `${randomUUID()}.http`);

      const content = `### Get Users
GET https://api.example.com/users

> {%
  client.test("Status is 200", function() {
    client.assert(response.status === 200);
  });
%}

### Create User
< {%
  request.variables.set("timestamp", Date.now().toString());
%}

POST https://api.example.com/users
Content-Type: application/json

{
  "name": "Test User"
}

> {%
  client.log("User created");
%}`;

      await writeFile(tempFile, content, 'utf-8');

      const testManager = new TestManager(tempFile);
      const parser = new HttpFileParser((testManager as any).variableManager);
      const requests = await parser.parse(tempFile);

      expect(requests).toHaveLength(2);

      // First request
      expect(requests[0].name).toBe('Get Users');
      expect(requests[0].responseHandlers).toHaveLength(1);
      expect(requests[0].preRequestScripts).toHaveLength(0);

      // Second request
      expect(requests[1].name).toBe('Create User');
      expect(requests[1].preRequestScripts).toHaveLength(1);
      expect(requests[1].responseHandlers).toHaveLength(1);
    });
  });

  describe('ScriptEngine with Variables', () => {
    let engine: ScriptEngine;

    beforeEach(() => {
      engine = new ScriptEngine();
    });

    afterEach(() => {
      engine.clearGlobals();
    });

    it('should allow pre-request scripts to set variables', async () => {
      const initialVars = new Map<string, string>([
        ['baseUrl', 'https://api.example.com']
      ]);

      const script = `
        request.variables.set("authToken", "Bearer xyz123");
        request.variables.set("timestamp", "1234567890");
      `;

      const result = await engine.execute(script, {
        isPreRequest: true,
        variables: initialVars
      });

      expect(result.success).toBe(true);
      expect(result.variables?.get('authToken')).toBe('Bearer xyz123');
      expect(result.variables?.get('timestamp')).toBe('1234567890');
      expect(result.variables?.get('baseUrl')).toBe('https://api.example.com');
    });

    it('should allow response handler to use response data', async () => {
      const mockResponse = {
        status: 201,
        statusText: 'Created',
        headers: {
          'content-type': 'application/json',
          'location': '/users/123'
        },
        data: {
          id: 123,
          name: 'New User',
          email: 'new@example.com'
        }
      };

      const script = `
        client.global.set("newUserId", response.body.id);
        client.log("Created user: " + response.body.name);
        client.test("Should return 201 Created", function() {
          client.assert(response.status === 201, "Expected 201 Created");
        });
        client.test("Should have location header", function() {
          client.assert(response.headers["location"] === "/users/123");
        });
      `;

      const result = await engine.execute(script, { response: mockResponse });

      expect(result.success).toBe(true);
      expect(result.logs).toContain('Created user: New User');
      expect(result.tests).toHaveLength(2);
      expect(result.tests?.every(t => t.passed)).toBe(true);
      expect(engine.getGlobals().get('newUserId')).toBe(123);
    });

    it('should persist globals across multiple script executions', async () => {
      // First script sets a token
      await engine.execute(`
        client.global.set("authToken", "initial-token");
      `);

      // Second script reads and updates the token
      await engine.execute(`
        const current = client.global.get("authToken");
        client.global.set("authToken", current + "-refreshed");
      `);

      // Third script reads the final value
      const result = await engine.execute(`
        client.log(client.global.get("authToken"));
      `);

      expect(result.logs).toContain('initial-token-refreshed');
    });

    it('should handle test failures properly', async () => {
      const mockResponse = {
        status: 404,
        headers: {},
        data: { error: 'Not found' }
      };

      const script = `
        client.test("Status should be 200", function() {
          client.assert(response.status === 200, "Expected status 200 but got " + response.status);
        });
        client.test("Should have data", function() {
          client.assert(response.body.data !== undefined, "Missing data field");
        });
      `;

      const result = await engine.execute(script, { response: mockResponse });

      expect(result.success).toBe(true); // Script itself executed successfully
      expect(result.tests).toHaveLength(2);
      expect(result.tests?.[0].passed).toBe(false);
      expect(result.tests?.[0].error).toContain('Expected status 200 but got 404');
      expect(result.tests?.[1].passed).toBe(false);
      expect(result.tests?.[1].error).toContain('Missing data field');
    });
  });
});

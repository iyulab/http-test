/**
 * ScriptEngine Tests - TDD
 *
 * Tests for JetBrains HTTP Client compatible scripting engine
 * Supports response handler scripts (> {% %}) and pre-request scripts (< {% %})
 */

import { ScriptEngine, ScriptContext, ScriptResult } from '../../src/core/ScriptEngine';
import { HttpResponse } from '../../src/types';

describe('ScriptEngine', () => {
  let engine: ScriptEngine;

  beforeEach(() => {
    engine = new ScriptEngine();
  });

  afterEach(() => {
    engine.clearGlobals();
  });

  describe('Basic Script Execution', () => {
    it('should execute simple JavaScript code', async () => {
      const script = '1 + 1';
      const result = await engine.execute(script);
      expect(result.success).toBe(true);
    });

    it('should handle syntax errors gracefully', async () => {
      const script = 'const x = {';
      const result = await engine.execute(script);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle runtime errors gracefully', async () => {
      const script = 'throw new Error("Test error")';
      const result = await engine.execute(script);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Test error');
    });
  });

  describe('client.log()', () => {
    it('should capture log messages', async () => {
      const script = 'client.log("Hello", "World")';
      const result = await engine.execute(script);
      expect(result.success).toBe(true);
      expect(result.logs).toContain('Hello World');
    });

    it('should capture multiple log calls', async () => {
      const script = `
        client.log("First");
        client.log("Second");
      `;
      const result = await engine.execute(script);
      expect(result.logs).toHaveLength(2);
      expect(result.logs).toContain('First');
      expect(result.logs).toContain('Second');
    });

    it('should handle object logging', async () => {
      const script = 'client.log({ key: "value" })';
      const result = await engine.execute(script);
      expect(result.success).toBe(true);
      expect(result.logs?.[0]).toContain('key');
    });
  });

  describe('client.global', () => {
    it('should set and get global variables', async () => {
      const setScript = 'client.global.set("token", "abc123")';
      await engine.execute(setScript);

      const getScript = 'client.log(client.global.get("token"))';
      const result = await engine.execute(getScript);
      expect(result.logs).toContain('abc123');
    });

    it('should persist globals across script executions', async () => {
      await engine.execute('client.global.set("count", 1)');
      await engine.execute('client.global.set("count", client.global.get("count") + 1)');

      const result = await engine.execute('client.log(client.global.get("count"))');
      expect(result.logs).toContain('2');
    });

    it('should return undefined for non-existent globals', async () => {
      const script = 'client.log(client.global.get("nonexistent"))';
      const result = await engine.execute(script);
      expect(result.logs).toContain('undefined');
    });

    it('should clear all globals', async () => {
      await engine.execute('client.global.set("key1", "value1")');
      await engine.execute('client.global.set("key2", "value2")');
      engine.clearGlobals();

      const result = await engine.execute('client.log(client.global.get("key1"))');
      expect(result.logs).toContain('undefined');
    });
  });

  describe('client.test() and client.assert()', () => {
    it('should define and pass a test', async () => {
      const script = `
        client.test("Status is 200", function() {
          client.assert(true, "Should pass");
        });
      `;
      const result = await engine.execute(script);
      expect(result.success).toBe(true);
      expect(result.tests).toHaveLength(1);
      expect(result.tests?.[0].name).toBe('Status is 200');
      expect(result.tests?.[0].passed).toBe(true);
    });

    it('should fail a test when assertion fails', async () => {
      const script = `
        client.test("Should fail", function() {
          client.assert(false, "This should fail");
        });
      `;
      const result = await engine.execute(script);
      expect(result.success).toBe(true); // Script executed successfully
      expect(result.tests?.[0].passed).toBe(false);
      expect(result.tests?.[0].error).toContain('This should fail');
    });

    it('should handle multiple tests', async () => {
      const script = `
        client.test("Test 1", function() {
          client.assert(true);
        });
        client.test("Test 2", function() {
          client.assert(false, "Failed");
        });
        client.test("Test 3", function() {
          client.assert(true);
        });
      `;
      const result = await engine.execute(script);
      expect(result.tests).toHaveLength(3);
      expect(result.tests?.[0].passed).toBe(true);
      expect(result.tests?.[1].passed).toBe(false);
      expect(result.tests?.[2].passed).toBe(true);
    });

    it('should catch errors thrown in test functions', async () => {
      const script = `
        client.test("Error test", function() {
          throw new Error("Unexpected error");
        });
      `;
      const result = await engine.execute(script);
      expect(result.tests?.[0].passed).toBe(false);
      expect(result.tests?.[0].error).toContain('Unexpected error');
    });
  });

  describe('Response Context', () => {
    const mockResponse: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'x-custom-header': 'test-value'
      },
      data: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        nested: {
          value: 42
        }
      },
      executionTime: 150
    };

    it('should access response.status', async () => {
      const script = 'client.log(response.status)';
      const result = await engine.execute(script, { response: mockResponse });
      expect(result.logs).toContain('200');
    });

    it('should access response.headers', async () => {
      const script = 'client.log(response.headers["content-type"])';
      const result = await engine.execute(script, { response: mockResponse });
      expect(result.logs).toContain('application/json');
    });

    it('should access response.body', async () => {
      const script = 'client.log(response.body.name)';
      const result = await engine.execute(script, { response: mockResponse });
      expect(result.logs).toContain('Test User');
    });

    it('should access nested response body properties', async () => {
      const script = 'client.log(response.body.nested.value)';
      const result = await engine.execute(script, { response: mockResponse });
      expect(result.logs).toContain('42');
    });

    it('should use response in assertions', async () => {
      const script = `
        client.test("Status check", function() {
          client.assert(response.status === 200, "Status should be 200");
        });
        client.test("Body check", function() {
          client.assert(response.body.id === 1, "ID should be 1");
        });
      `;
      const result = await engine.execute(script, { response: mockResponse });
      expect(result.tests?.every(t => t.passed)).toBe(true);
    });

    it('should access response.contentType', async () => {
      const script = 'client.log(response.contentType.mimeType)';
      const result = await engine.execute(script, { response: mockResponse });
      expect(result.logs).toContain('application/json');
    });
  });

  describe('Request Context (Pre-request Scripts)', () => {
    it('should set request variables', async () => {
      const script = 'request.variables.set("authToken", "Bearer xyz")';
      const result = await engine.execute(script, { isPreRequest: true });
      expect(result.success).toBe(true);
      expect(result.variables?.get('authToken')).toBe('Bearer xyz');
    });

    it('should get request variables', async () => {
      const initialVars = new Map([['existingVar', 'existingValue']]);
      const script = 'client.log(request.variables.get("existingVar"))';
      const result = await engine.execute(script, {
        isPreRequest: true,
        variables: initialVars
      });
      expect(result.logs).toContain('existingValue');
    });

    it('should modify existing variables', async () => {
      const initialVars = new Map([['counter', '1']]);
      const script = `
        const count = parseInt(request.variables.get("counter"));
        request.variables.set("counter", String(count + 1));
      `;
      const result = await engine.execute(script, {
        isPreRequest: true,
        variables: initialVars
      });
      expect(result.variables?.get('counter')).toBe('2');
    });
  });

  describe('Helper Functions', () => {
    const jsonResponse: HttpResponse = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        meta: { total: 2 }
      }
    };

    it('should use jsonPath to extract values', async () => {
      const script = 'client.log(jsonPath(response.body, "$.users[0].name"))';
      const result = await engine.execute(script, { response: jsonResponse });
      expect(result.logs).toContain('Alice');
    });

    it('should use jsonPath with array access', async () => {
      const script = 'client.log(jsonPath(response.body, "$.users.length"))';
      const result = await engine.execute(script, { response: jsonResponse });
      expect(result.logs).toContain('2');
    });

    it('should handle invalid jsonPath gracefully', async () => {
      const script = 'client.log(jsonPath(response.body, "$.nonexistent.path"))';
      const result = await engine.execute(script, { response: jsonResponse });
      expect(result.success).toBe(true);
    });
  });

  describe('Script Isolation', () => {
    it('should not allow access to Node.js globals', async () => {
      const scripts = [
        'process.exit(1)',
        'require("fs")',
        '__dirname',
        'global.process'
      ];

      for (const script of scripts) {
        const result = await engine.execute(script);
        expect(result.success).toBe(false);
      }
    });

    it('should not pollute global scope between executions', async () => {
      await engine.execute('var testVar = "value1"');
      const result = await engine.execute('client.log(typeof testVar)');
      expect(result.logs).toContain('undefined');
    });
  });

  describe('External Script Files', () => {
    it('should load and execute external script file', async () => {
      // This test requires mocking the file system
      const mockFileContent = 'client.log("From external file")';
      const result = await engine.executeFile('mock-path.js', mockFileContent);
      expect(result.logs).toContain('From external file');
    });
  });
});

describe('Script Parsing', () => {
  describe('Response Handler Syntax', () => {
    it('should extract inline script from > {% %}', () => {
      const content = `
GET https://api.example.com/users

> {%
  client.test("Check status", function() {
    client.assert(response.status === 200);
  });
%}
      `;
      const scripts = ScriptEngine.parseResponseHandlers(content);
      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[0].content).toContain('client.test');
    });

    it('should extract external script reference', () => {
      const content = `
GET https://api.example.com/users

> scripts/handler.js
      `;
      const scripts = ScriptEngine.parseResponseHandlers(content);
      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('file');
      expect(scripts[0].path).toBe('scripts/handler.js');
    });

    it('should extract multiple response handlers', () => {
      const content = `
GET https://api.example.com/users

> {%
  client.log("First handler");
%}

> {%
  client.log("Second handler");
%}
      `;
      const scripts = ScriptEngine.parseResponseHandlers(content);
      expect(scripts).toHaveLength(2);
    });
  });

  describe('Pre-request Script Syntax', () => {
    it('should extract inline pre-request script from < {% %}', () => {
      const content = `
< {%
  request.variables.set("timestamp", Date.now());
%}

GET https://api.example.com/users
      `;
      const scripts = ScriptEngine.parsePreRequestScripts(content);
      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('inline');
      expect(scripts[0].content).toContain('request.variables.set');
    });

    it('should extract external pre-request script reference', () => {
      const content = `
< scripts/pre-request.js

GET https://api.example.com/users
      `;
      const scripts = ScriptEngine.parsePreRequestScripts(content);
      expect(scripts).toHaveLength(1);
      expect(scripts[0].type).toBe('file');
      expect(scripts[0].path).toBe('scripts/pre-request.js');
    });
  });
});

/**
 * IScriptEngine Contract Tests
 *
 * These tests define the contract that any IScriptEngine implementation must fulfill.
 */
import { IScriptEngine, ScriptContext, ScriptResult } from '../../src/interfaces/IScriptEngine';
import { ScriptEngine } from '../../src/core/ScriptEngine';
import { HttpResponse } from '../../src/types';

describe('IScriptEngine Contract', () => {
  let engine: IScriptEngine;

  beforeEach(() => {
    engine = new ScriptEngine();
    engine.clearGlobals();
  });

  const createMockResponse = (): HttpResponse => ({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data: { id: 1, name: 'Test' }
  });

  const createMockContext = (): ScriptContext => ({
    response: createMockResponse()
  });

  describe('execute()', () => {
    it('should return a Promise that resolves to ScriptResult', async () => {
      const script = 'client.log("Hello");';
      const context = createMockContext();

      const result = engine.execute(script, context);
      expect(result).toBeInstanceOf(Promise);

      const scriptResult = await result;
      expect(scriptResult).toHaveProperty('success');
      expect(typeof scriptResult.success).toBe('boolean');
    });

    it('should capture logs from client.log()', async () => {
      const script = 'client.log("test message");';
      const context = createMockContext();

      const result = await engine.execute(script, context);
      expect(result.success).toBe(true);
      expect(result.logs).toContain('test message');
    });

    it('should handle client.global.set()', async () => {
      const script = 'client.global.set("myVar", "myValue");';
      const context = createMockContext();

      const result = await engine.execute(script, context);
      expect(result.success).toBe(true);

      const globals = engine.getGlobals();
      expect(globals.get('myVar')).toBe('myValue');
    });

    it('should handle client.test() with passing assertion', async () => {
      const script = 'client.test("should pass", () => { client.assert(true); });';
      const context = createMockContext();

      const result = await engine.execute(script, context);
      expect(result.success).toBe(true);
      expect(result.tests).toBeDefined();
      expect(result.tests!.length).toBeGreaterThan(0);
      expect(result.tests![0]).toHaveProperty('name', 'should pass');
      expect(result.tests![0]).toHaveProperty('passed', true);
    });

    it('should handle client.test() with failing assertion', async () => {
      const script = 'client.test("should fail", () => { client.assert(false, "failed"); });';
      const context = createMockContext();

      const result = await engine.execute(script, context);
      expect(result.success).toBe(true); // Script execution succeeded
      expect(result.tests).toBeDefined();
      expect(result.tests![0]).toHaveProperty('passed', false);
      expect(result.tests![0]).toHaveProperty('error', 'failed');
    });

    it('should provide response context', async () => {
      const script = 'client.global.set("status", response.status);';
      const context = createMockContext();

      const result = await engine.execute(script, context);
      expect(result.success).toBe(true);

      const globals = engine.getGlobals();
      expect(globals.get('status')).toBe(200);
    });

    it('should handle script errors gracefully', async () => {
      const script = 'throw new Error("Script error");';
      const context = createMockContext();

      const result = await engine.execute(script, context);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getGlobals()', () => {
    it('should return current global variables as Map', async () => {
      const script = 'client.global.set("key", "value");';
      const context = createMockContext();

      await engine.execute(script, context);
      const globals = engine.getGlobals();

      expect(globals).toBeInstanceOf(Map);
      expect(globals.get('key')).toBe('value');
    });
  });

  describe('clearGlobals()', () => {
    it('should clear all global variables', async () => {
      const script = 'client.global.set("key", "value");';
      const context = createMockContext();

      await engine.execute(script, context);
      engine.clearGlobals();
      const globals = engine.getGlobals();

      expect(globals.size).toBe(0);
    });
  });

  describe('Interface Type Checking', () => {
    it('should satisfy IScriptEngine interface', () => {
      const typedEngine: IScriptEngine = engine;
      expect(typeof typedEngine.execute).toBe('function');
      expect(typeof typedEngine.getGlobals).toBe('function');
      expect(typeof typedEngine.clearGlobals).toBe('function');
    });
  });
});

/**
 * IAssertionEngine Contract Tests
 *
 * These tests define the contract that any IAssertionEngine implementation must fulfill.
 */
import { IAssertionEngine } from '../../src/interfaces/IAssertionEngine';
import { AssertionEngine } from '../../src/core/AssertionEngine';
import { VariableManager } from '../../src/core/VariableManager';
import { Assertion, HttpResponse, HttpRequest } from '../../src/types';
import { AssertionError } from '../../src/errors/AssertionError';

describe('IAssertionEngine Contract', () => {
  let engine: IAssertionEngine;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    engine = new AssertionEngine(variableManager, process.cwd());
  });

  const createMockResponse = (status: number = 200, data: unknown = {}): HttpResponse => ({
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
    data
  });

  const createMockRequest = (): HttpRequest => ({
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com',
    headers: {},
    tests: [],
    variableUpdates: []
  });

  describe('assert()', () => {
    describe('status assertions', () => {
      it('should resolve for matching status code', async () => {
        const assertion: Assertion = {
          type: 'status',
          value: 200
        };
        const response = createMockResponse(200);

        await expect(engine.assert(assertion, response)).resolves.not.toThrow();
      });

      it('should reject with AssertionError for non-matching status code', async () => {
        const assertion: Assertion = {
          type: 'status',
          value: 200
        };
        const response = createMockResponse(404);

        await expect(engine.assert(assertion, response)).rejects.toThrow(AssertionError);
      });

      it('should handle status range patterns (2xx)', async () => {
        const assertion: Assertion = {
          type: 'status',
          value: '2xx'
        };
        const response = createMockResponse(201);

        await expect(engine.assert(assertion, response)).resolves.not.toThrow();
      });
    });

    describe('header assertions', () => {
      it('should resolve for matching header', async () => {
        const assertion: Assertion = {
          type: 'header',
          key: 'content-type',
          value: 'application/json'
        };
        const response = createMockResponse(200);

        await expect(engine.assert(assertion, response)).resolves.not.toThrow();
      });

      it('should reject with AssertionError for non-matching header', async () => {
        const assertion: Assertion = {
          type: 'header',
          key: 'content-type',
          value: 'text/html'
        };
        const response = createMockResponse(200);

        await expect(engine.assert(assertion, response)).rejects.toThrow(AssertionError);
      });
    });

    describe('body assertions', () => {
      it('should validate JSONPath expressions', async () => {
        const assertion: Assertion = {
          type: 'body',
          key: '$.id',
          value: 123
        };
        const response = createMockResponse(200, { id: 123, name: 'Test' });

        await expect(engine.assert(assertion, response)).resolves.not.toThrow();
      });

      it('should reject for non-matching JSONPath value', async () => {
        const assertion: Assertion = {
          type: 'body',
          key: '$.id',
          value: 999
        };
        const response = createMockResponse(200, { id: 123, name: 'Test' });

        await expect(engine.assert(assertion, response)).rejects.toThrow(AssertionError);
      });
    });

    describe('with request context', () => {
      it('should accept optional request parameter', async () => {
        const assertion: Assertion = {
          type: 'status',
          value: 200
        };
        const response = createMockResponse(200);
        const request = createMockRequest();

        await expect(engine.assert(assertion, response, request)).resolves.not.toThrow();
      });
    });
  });

  describe('Interface Type Checking', () => {
    it('should satisfy IAssertionEngine interface', () => {
      const typedEngine: IAssertionEngine = engine;
      expect(typeof typedEngine.assert).toBe('function');
    });
  });
});

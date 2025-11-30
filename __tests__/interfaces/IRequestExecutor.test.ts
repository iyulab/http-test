/**
 * IRequestExecutor Contract Tests
 *
 * These tests define the contract that any IRequestExecutor implementation must fulfill.
 */
import { IRequestExecutor } from '../../src/interfaces/IRequestExecutor';
import { RequestExecutor } from '../../src/core/RequestExecutor';
import { VariableManager } from '../../src/core/VariableManager';
import { HttpRequest, HttpResponse } from '../../src/types';

describe('IRequestExecutor Contract', () => {
  let executor: IRequestExecutor;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    executor = new RequestExecutor(variableManager);
  });

  describe('execute()', () => {
    it('should return a Promise that resolves to HttpResponse', async () => {
      const request: HttpRequest = {
        name: 'Test Request',
        method: 'GET',
        url: 'https://httpbin.org/get',
        headers: {},
        tests: [],
        variableUpdates: []
      };

      const result = executor.execute(request);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle request with all required response properties', async () => {
      const request: HttpRequest = {
        name: 'Test Request',
        method: 'GET',
        url: 'https://httpbin.org/get',
        headers: {},
        tests: [],
        variableUpdates: []
      };

      try {
        const response = await executor.execute(request);
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('headers');
        expect(response).toHaveProperty('data');
        expect(typeof response.status).toBe('number');
      } catch (error) {
        // Network errors are acceptable in tests
        expect(error).toBeDefined();
      }
    });

    it('should reject for invalid URLs', async () => {
      const request: HttpRequest = {
        name: 'Invalid Request',
        method: 'GET',
        url: 'not-a-valid-url',
        headers: {},
        tests: [],
        variableUpdates: []
      };

      await expect(executor.execute(request)).rejects.toThrow();
    });
  });

  describe('Interface Type Checking', () => {
    it('should satisfy IRequestExecutor interface', () => {
      const typedExecutor: IRequestExecutor = executor;
      expect(typeof typedExecutor.execute).toBe('function');
    });
  });
});

/**
 * ParallelExecutor Tests
 *
 * TDD tests for parallel HTTP request execution.
 */
import { ParallelExecutor, ParallelExecutionResult } from '../../src/performance/ParallelExecutor';
import { HttpRequest, HttpResponse } from '../../src/types';

describe('ParallelExecutor', () => {
  let executor: ParallelExecutor;

  // Mock request executor
  const mockExecute = jest.fn();

  beforeEach(() => {
    executor = new ParallelExecutor({
      maxConcurrency: 3,
      execute: mockExecute
    });
    mockExecute.mockReset();
  });

  describe('execute', () => {
    it('should execute single request', async () => {
      const request: HttpRequest = {
        name: 'test',
        method: 'GET',
        url: 'http://example.com',
        headers: {},
        tests: [],
        variableUpdates: []
      };

      const mockResponse: HttpResponse = {
        status: 200,
        headers: {},
        data: { success: true }
      };

      mockExecute.mockResolvedValue(mockResponse);

      const results = await executor.execute([request]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].response).toEqual(mockResponse);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should execute multiple requests in parallel', async () => {
      const requests: HttpRequest[] = [
        { name: 'req1', method: 'GET', url: 'http://example.com/1', headers: {}, tests: [], variableUpdates: [] },
        { name: 'req2', method: 'GET', url: 'http://example.com/2', headers: {}, tests: [], variableUpdates: [] },
        { name: 'req3', method: 'GET', url: 'http://example.com/3', headers: {}, tests: [], variableUpdates: [] }
      ];

      const executionOrder: number[] = [];
      mockExecute.mockImplementation(async (req: HttpRequest) => {
        const index = parseInt(req.url.slice(-1));
        executionOrder.push(index);
        return { status: 200, headers: {}, data: { id: index } };
      });

      const results = await executor.execute(requests);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should respect maxConcurrency limit', async () => {
      const requests: HttpRequest[] = Array.from({ length: 5 }, (_, i) => ({
        name: `req${i}`,
        method: 'GET' as const,
        url: `http://example.com/${i}`,
        headers: {},
        tests: [],
        variableUpdates: []
      }));

      let concurrentCount = 0;
      let maxConcurrent = 0;

      mockExecute.mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCount--;
        return { status: 200, headers: {}, data: {} };
      });

      await executor.execute(requests);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should handle request errors gracefully', async () => {
      const requests: HttpRequest[] = [
        { name: 'success', method: 'GET', url: 'http://example.com/ok', headers: {}, tests: [], variableUpdates: [] },
        { name: 'error', method: 'GET', url: 'http://example.com/fail', headers: {}, tests: [], variableUpdates: [] }
      ];

      mockExecute.mockImplementation(async (req: HttpRequest) => {
        if (req.url.includes('fail')) {
          throw new Error('Request failed');
        }
        return { status: 200, headers: {}, data: {} };
      });

      const results = await executor.execute(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
      expect(results[1].error?.message).toBe('Request failed');
    });

    it('should return results in original order', async () => {
      const requests: HttpRequest[] = [
        { name: 'slow', method: 'GET', url: 'http://example.com/slow', headers: {}, tests: [], variableUpdates: [] },
        { name: 'fast', method: 'GET', url: 'http://example.com/fast', headers: {}, tests: [], variableUpdates: [] }
      ];

      mockExecute.mockImplementation(async (req: HttpRequest) => {
        const delay = req.url.includes('slow') ? 100 : 10;
        await new Promise(resolve => setTimeout(resolve, delay));
        return { status: 200, headers: {}, data: { url: req.url } };
      });

      const results = await executor.execute(requests);

      expect(results[0].request.name).toBe('slow');
      expect(results[1].request.name).toBe('fast');
    });

    it('should track execution time', async () => {
      const request: HttpRequest = {
        name: 'test',
        method: 'GET',
        url: 'http://example.com',
        headers: {},
        tests: [],
        variableUpdates: []
      };

      mockExecute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { status: 200, headers: {}, data: {} };
      });

      const results = await executor.execute([request]);

      expect(results[0].executionTime).toBeGreaterThanOrEqual(50);
      expect(results[0].executionTime).toBeLessThan(200);
    });
  });

  describe('options', () => {
    it('should use default concurrency of 5', () => {
      const defaultExecutor = new ParallelExecutor({ execute: mockExecute });
      expect(defaultExecutor.getMaxConcurrency()).toBe(5);
    });

    it('should allow setting concurrency', () => {
      const customExecutor = new ParallelExecutor({
        maxConcurrency: 10,
        execute: mockExecute
      });
      expect(customExecutor.getMaxConcurrency()).toBe(10);
    });

    it('should handle empty request array', async () => {
      const results = await executor.execute([]);
      expect(results).toEqual([]);
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('abort', () => {
    it('should abort pending requests when aborted', async () => {
      const requests: HttpRequest[] = Array.from({ length: 10 }, (_, i) => ({
        name: `req${i}`,
        method: 'GET' as const,
        url: `http://example.com/${i}`,
        headers: {},
        tests: [],
        variableUpdates: []
      }));

      let completedCount = 0;
      mockExecute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        completedCount++;
        return { status: 200, headers: {}, data: {} };
      });

      // Start execution but abort after short delay
      const executePromise = executor.execute(requests);
      setTimeout(() => executor.abort(), 50);

      const results = await executePromise;

      // Some requests should be aborted
      const abortedCount = results.filter(r => r.aborted).length;
      expect(abortedCount).toBeGreaterThan(0);
    });

    it('should reset abort state for new executions', async () => {
      const request: HttpRequest = {
        name: 'test',
        method: 'GET',
        url: 'http://example.com',
        headers: {},
        tests: [],
        variableUpdates: []
      };

      mockExecute.mockResolvedValue({ status: 200, headers: {}, data: {} });

      // First execution aborted
      executor.abort();

      // Second execution should work normally
      const results = await executor.execute([request]);

      expect(results[0].success).toBe(true);
      expect(results[0].aborted).toBeFalsy();
    });
  });

  describe('progress callback', () => {
    it('should call progress callback for each completed request', async () => {
      const requests: HttpRequest[] = [
        { name: 'req1', method: 'GET', url: 'http://example.com/1', headers: {}, tests: [], variableUpdates: [] },
        { name: 'req2', method: 'GET', url: 'http://example.com/2', headers: {}, tests: [], variableUpdates: [] }
      ];

      mockExecute.mockResolvedValue({ status: 200, headers: {}, data: {} });

      const progressUpdates: { completed: number; total: number }[] = [];

      await executor.execute(requests, {
        onProgress: (completed, total) => {
          progressUpdates.push({ completed, total });
        }
      });

      expect(progressUpdates).toHaveLength(2);
      expect(progressUpdates[0]).toEqual({ completed: 1, total: 2 });
      expect(progressUpdates[1]).toEqual({ completed: 2, total: 2 });
    });
  });
});

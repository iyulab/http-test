/**
 * RequestCache Tests
 *
 * TDD tests for HTTP request caching.
 */
import { RequestCache, CacheEntry, CacheOptions } from '../../src/performance/RequestCache';
import { HttpRequest, HttpResponse } from '../../src/types';

describe('RequestCache', () => {
  let cache: RequestCache;

  const createRequest = (url: string, method: string = 'GET'): HttpRequest => ({
    name: 'test',
    method: method as HttpRequest['method'],
    url,
    headers: {},
    tests: [],
    variableUpdates: []
  });

  const createResponse = (status: number, data: unknown = {}): HttpResponse => ({
    status,
    headers: { 'content-type': 'application/json' },
    data
  });

  beforeEach(() => {
    cache = new RequestCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve cached response', () => {
      const request = createRequest('http://example.com/api');
      const response = createResponse(200, { message: 'hello' });

      cache.set(request, response);
      const cached = cache.get(request);

      expect(cached).toBeDefined();
      expect(cached?.response).toEqual(response);
    });

    it('should return undefined for uncached request', () => {
      const request = createRequest('http://example.com/api');

      const cached = cache.get(request);

      expect(cached).toBeUndefined();
    });

    it('should generate consistent cache keys for same request', () => {
      const request1 = createRequest('http://example.com/api');
      const request2 = createRequest('http://example.com/api');
      const response = createResponse(200);

      cache.set(request1, response);
      const cached = cache.get(request2);

      expect(cached).toBeDefined();
    });

    it('should differentiate requests by URL', () => {
      const request1 = createRequest('http://example.com/api/1');
      const request2 = createRequest('http://example.com/api/2');
      const response1 = createResponse(200, { id: 1 });
      const response2 = createResponse(200, { id: 2 });

      cache.set(request1, response1);
      cache.set(request2, response2);

      expect(cache.get(request1)?.response).toEqual(response1);
      expect(cache.get(request2)?.response).toEqual(response2);
    });

    it('should differentiate requests by method', () => {
      // Configure cache to allow both GET and POST
      cache = new RequestCache({ cacheableMethods: ['GET', 'POST'], cacheableStatusCodes: [200, 201] });
      const getRequest = createRequest('http://example.com/api', 'GET');
      const postRequest = createRequest('http://example.com/api', 'POST');
      const getResponse = createResponse(200, { method: 'get' });
      const postResponse = createResponse(201, { method: 'post' });

      cache.set(getRequest, getResponse);
      cache.set(postRequest, postResponse);

      expect(cache.get(getRequest)?.response).toEqual(getResponse);
      expect(cache.get(postRequest)?.response).toEqual(postResponse);
    });

    it('should include headers in cache key', () => {
      const request1: HttpRequest = {
        ...createRequest('http://example.com/api'),
        headers: { 'Authorization': 'Bearer token1' }
      };
      const request2: HttpRequest = {
        ...createRequest('http://example.com/api'),
        headers: { 'Authorization': 'Bearer token2' }
      };
      const response1 = createResponse(200, { user: 'user1' });
      const response2 = createResponse(200, { user: 'user2' });

      cache.set(request1, response1);
      cache.set(request2, response2);

      expect(cache.get(request1)?.response).toEqual(response1);
      expect(cache.get(request2)?.response).toEqual(response2);
    });
  });

  describe('TTL (Time-To-Live)', () => {
    it('should expire entries after TTL', async () => {
      cache = new RequestCache({ ttl: 50 }); // 50ms TTL
      const request = createRequest('http://example.com/api');
      const response = createResponse(200);

      cache.set(request, response);
      expect(cache.get(request)).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get(request)).toBeUndefined();
    });

    it('should allow per-entry TTL override', async () => {
      cache = new RequestCache({ ttl: 1000 }); // 1s default
      const request = createRequest('http://example.com/api');
      const response = createResponse(200);

      cache.set(request, response, { ttl: 50 }); // 50ms override

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get(request)).toBeUndefined();
    });

    it('should return entry timestamp', () => {
      const request = createRequest('http://example.com/api');
      const response = createResponse(200);
      const before = Date.now();

      cache.set(request, response);
      const cached = cache.get(request);

      expect(cached?.timestamp).toBeGreaterThanOrEqual(before);
      expect(cached?.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('cache management', () => {
    it('should clear all entries', () => {
      const request1 = createRequest('http://example.com/api/1');
      const request2 = createRequest('http://example.com/api/2');
      const response = createResponse(200);

      cache.set(request1, response);
      cache.set(request2, response);

      cache.clear();

      expect(cache.get(request1)).toBeUndefined();
      expect(cache.get(request2)).toBeUndefined();
    });

    it('should delete specific entry', () => {
      const request1 = createRequest('http://example.com/api/1');
      const request2 = createRequest('http://example.com/api/2');
      const response = createResponse(200);

      cache.set(request1, response);
      cache.set(request2, response);

      cache.delete(request1);

      expect(cache.get(request1)).toBeUndefined();
      expect(cache.get(request2)).toBeDefined();
    });

    it('should report cache size', () => {
      const request1 = createRequest('http://example.com/api/1');
      const request2 = createRequest('http://example.com/api/2');
      const response = createResponse(200);

      expect(cache.size()).toBe(0);

      cache.set(request1, response);
      expect(cache.size()).toBe(1);

      cache.set(request2, response);
      expect(cache.size()).toBe(2);

      cache.delete(request1);
      expect(cache.size()).toBe(1);
    });

    it('should check if entry exists', () => {
      const request = createRequest('http://example.com/api');
      const response = createResponse(200);

      expect(cache.has(request)).toBe(false);

      cache.set(request, response);

      expect(cache.has(request)).toBe(true);
    });
  });

  describe('max size limit', () => {
    it('should evict oldest entries when max size reached', () => {
      cache = new RequestCache({ maxSize: 2 });
      const request1 = createRequest('http://example.com/api/1');
      const request2 = createRequest('http://example.com/api/2');
      const request3 = createRequest('http://example.com/api/3');
      const response = createResponse(200);

      cache.set(request1, response);
      cache.set(request2, response);
      cache.set(request3, response);

      expect(cache.size()).toBe(2);
      expect(cache.get(request1)).toBeUndefined(); // Oldest evicted
      expect(cache.get(request2)).toBeDefined();
      expect(cache.get(request3)).toBeDefined();
    });

    it('should use LRU eviction', async () => {
      cache = new RequestCache({ maxSize: 2 });
      const request1 = createRequest('http://example.com/api/1');
      const request2 = createRequest('http://example.com/api/2');
      const request3 = createRequest('http://example.com/api/3');
      const response = createResponse(200);

      cache.set(request1, response);
      cache.set(request2, response);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Access request1 to make it recently used
      cache.get(request1);

      cache.set(request3, response);

      expect(cache.get(request1)).toBeDefined(); // Still there (recently used)
      expect(cache.get(request2)).toBeUndefined(); // Evicted (least recently used)
      expect(cache.get(request3)).toBeDefined();
    });
  });

  describe('cache key generation', () => {
    it('should handle requests with body', () => {
      // Configure cache to allow POST
      cache = new RequestCache({ cacheableMethods: ['GET', 'POST'], cacheableStatusCodes: [200, 201] });
      const request1: HttpRequest = {
        ...createRequest('http://example.com/api', 'POST'),
        body: JSON.stringify({ data: 'value1' })
      };
      const request2: HttpRequest = {
        ...createRequest('http://example.com/api', 'POST'),
        body: JSON.stringify({ data: 'value2' })
      };
      const response1 = createResponse(201, { result: 1 });
      const response2 = createResponse(201, { result: 2 });

      cache.set(request1, response1);
      cache.set(request2, response2);

      expect(cache.get(request1)?.response).toEqual(response1);
      expect(cache.get(request2)?.response).toEqual(response2);
    });

    it('should handle query parameters in URL', () => {
      const request1 = createRequest('http://example.com/api?page=1');
      const request2 = createRequest('http://example.com/api?page=2');
      const response1 = createResponse(200, { page: 1 });
      const response2 = createResponse(200, { page: 2 });

      cache.set(request1, response1);
      cache.set(request2, response2);

      expect(cache.get(request1)?.response).toEqual(response1);
      expect(cache.get(request2)?.response).toEqual(response2);
    });
  });

  describe('cache statistics', () => {
    it('should track cache hits and misses', () => {
      const request = createRequest('http://example.com/api');
      const response = createResponse(200);

      cache.get(request); // Miss
      cache.set(request, response);
      cache.get(request); // Hit
      cache.get(request); // Hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should reset statistics', () => {
      const request = createRequest('http://example.com/api');
      const response = createResponse(200);

      cache.set(request, response);
      cache.get(request);
      cache.get(request);

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('conditional caching', () => {
    it('should only cache GET requests by default', () => {
      cache = new RequestCache({ cacheableMethods: ['GET'] });
      const getRequest = createRequest('http://example.com/api', 'GET');
      const postRequest = createRequest('http://example.com/api', 'POST');
      const response = createResponse(200);

      cache.set(getRequest, response);
      cache.set(postRequest, response);

      expect(cache.get(getRequest)).toBeDefined();
      expect(cache.get(postRequest)).toBeUndefined();
    });

    it('should respect cacheable status codes', () => {
      cache = new RequestCache({ cacheableStatusCodes: [200, 304] });
      const request1 = createRequest('http://example.com/api/1');
      const request2 = createRequest('http://example.com/api/2');
      const response200 = createResponse(200);
      const response500 = createResponse(500);

      cache.set(request1, response200);
      cache.set(request2, response500);

      expect(cache.get(request1)).toBeDefined();
      expect(cache.get(request2)).toBeUndefined();
    });
  });
});

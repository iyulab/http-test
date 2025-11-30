/**
 * AuthRegistry Tests
 *
 * Tests for the authentication provider registry.
 */
import { HttpRequest } from '../../src/types';
import {
  AuthRegistry,
  BasicAuthProvider,
  BearerTokenProvider,
  AuthContext
} from '../../src/auth';

describe('AuthRegistry', () => {
  let registry: AuthRegistry;

  const createRequest = (headers: Record<string, string> = {}): HttpRequest => ({
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com/api',
    headers,
    tests: [],
    variableUpdates: []
  });

  const createContext = (variables: Record<string, string> = {}): AuthContext => ({
    variables: {
      get: (key: string) => variables[key],
      set: () => {},
      getAll: () => variables
    }
  });

  beforeEach(() => {
    registry = new AuthRegistry();
  });

  describe('Provider Registration', () => {
    it('should register a provider', () => {
      registry.register(new BasicAuthProvider());
      expect(registry.getProviderCount()).toBe(1);
    });

    it('should register multiple providers', () => {
      registry.register(new BasicAuthProvider());
      registry.register(new BearerTokenProvider());
      expect(registry.getProviderCount()).toBe(2);
    });

    it('should prevent duplicate provider names', () => {
      registry.register(new BasicAuthProvider());
      expect(() => {
        registry.register(new BasicAuthProvider());
      }).toThrow();
    });

    it('should allow replacing providers with force flag', () => {
      registry.register(new BasicAuthProvider());
      registry.register(new BasicAuthProvider(), { force: true });
      expect(registry.getProviderCount()).toBe(1);
    });
  });

  describe('Provider Lookup', () => {
    beforeEach(() => {
      registry.register(new BasicAuthProvider());
      registry.register(new BearerTokenProvider());
    });

    it('should find provider for basic auth request', () => {
      const request = createRequest();
      request.auth = { type: 'basic', username: 'user', password: 'pass' };

      const provider = registry.findProvider(request);
      expect(provider).not.toBeNull();
      expect(provider?.name).toBe('basic');
    });

    it('should find provider for bearer auth request', () => {
      const request = createRequest();
      request.auth = { type: 'bearer', token: 'mytoken' };

      const provider = registry.findProvider(request);
      expect(provider).not.toBeNull();
      expect(provider?.name).toBe('bearer');
    });

    it('should return null for request without auth', () => {
      const request = createRequest();
      const provider = registry.findProvider(request);
      expect(provider).toBeNull();
    });
  });

  describe('Auth Application', () => {
    beforeEach(() => {
      registry.register(new BasicAuthProvider());
      registry.register(new BearerTokenProvider());
    });

    it('should apply auth using appropriate provider', async () => {
      const request = createRequest();
      request.auth = { type: 'basic', username: 'user', password: 'pass' };

      const context = createContext();
      const result = await registry.applyAuth(request, context);

      expect(result.headers['Authorization']).toMatch(/^Basic /);
    });

    it('should return original request if no auth needed', async () => {
      const request = createRequest({ 'X-Custom': 'header' });
      const context = createContext();

      const result = await registry.applyAuth(request, context);

      expect(result.headers['X-Custom']).toBe('header');
      expect(result.headers['Authorization']).toBeUndefined();
    });

    it('should handle auth application errors gracefully', async () => {
      // Register a provider that throws
      const errorProvider = {
        name: 'error',
        canHandle: () => true,
        applyAuth: async () => {
          throw new Error('Auth failed');
        }
      };
      const errorRegistry = new AuthRegistry();
      errorRegistry.register(errorProvider as any);

      const request = createRequest();
      request.auth = { type: 'error' };

      await expect(
        errorRegistry.applyAuth(request, createContext())
      ).rejects.toThrow('Auth failed');
    });
  });

  describe('Default Registry', () => {
    it('should create registry with default providers', () => {
      const defaultRegistry = AuthRegistry.createDefault();

      const basicRequest = createRequest();
      basicRequest.auth = { type: 'basic', username: 'u', password: 'p' };

      const bearerRequest = createRequest();
      bearerRequest.auth = { type: 'bearer', token: 't' };

      expect(defaultRegistry.findProvider(basicRequest)).not.toBeNull();
      expect(defaultRegistry.findProvider(bearerRequest)).not.toBeNull();
    });
  });

  describe('Provider Priority', () => {
    it('should check providers in registration order', () => {
      const request = createRequest();
      request.auth = { type: 'bearer', token: 'test' };

      // Bearer should be found before basic
      registry.register(new BearerTokenProvider());
      registry.register(new BasicAuthProvider());

      const provider = registry.findProvider(request);
      expect(provider?.name).toBe('bearer');
    });
  });
});

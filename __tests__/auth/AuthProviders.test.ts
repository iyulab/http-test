/**
 * Authentication Providers Tests
 *
 * TDD tests for the authentication provider system.
 * Each provider handles a specific authentication scheme.
 */
import { HttpRequest } from '../../src/types';
import {
  IAuthProvider,
  AuthContext,
  BasicAuthProvider,
  BearerTokenProvider,
  DigestAuthProvider
} from '../../src/auth';

describe('IAuthProvider Contract', () => {
  // Sample request for testing
  const createRequest = (headers: Record<string, string> = {}): HttpRequest => ({
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com/api',
    headers,
    tests: [],
    variableUpdates: []
  });

  // Auth context with variables
  const createContext = (variables: Record<string, string> = {}): AuthContext => ({
    variables: {
      get: (key: string) => variables[key],
      set: () => {},
      getAll: () => variables
    }
  });

  describe('BasicAuthProvider', () => {
    let provider: IAuthProvider;

    beforeEach(() => {
      provider = new BasicAuthProvider();
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('basic');
    });

    it('should handle requests with Authorization: Basic header', () => {
      const request = createRequest({
        'Authorization': 'Basic {{username}}:{{password}}'
      });
      expect(provider.canHandle(request)).toBe(true);
    });

    it('should handle requests with @auth basic directive', () => {
      const request = createRequest();
      request.auth = { type: 'basic', username: 'user', password: 'pass' };
      expect(provider.canHandle(request)).toBe(true);
    });

    it('should not handle requests without basic auth', () => {
      const request = createRequest({
        'Authorization': 'Bearer token123'
      });
      expect(provider.canHandle(request)).toBe(false);
    });

    it('should apply basic auth with credentials', async () => {
      const request = createRequest();
      request.auth = { type: 'basic', username: 'testuser', password: 'testpass' };

      const context = createContext();
      const result = await provider.applyAuth(request, context);

      expect(result.headers['Authorization']).toBeDefined();
      expect(result.headers['Authorization']).toMatch(/^Basic /);

      // Verify base64 encoding
      const encoded = result.headers['Authorization'].replace('Basic ', '');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      expect(decoded).toBe('testuser:testpass');
    });

    it('should replace variables in credentials', async () => {
      const request = createRequest();
      request.auth = { type: 'basic', username: '{{username}}', password: '{{password}}' };

      const context = createContext({ username: 'admin', password: 'secret' });
      const result = await provider.applyAuth(request, context);

      const encoded = result.headers['Authorization'].replace('Basic ', '');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      expect(decoded).toBe('admin:secret');
    });

    it('should parse inline Basic auth header', async () => {
      const request = createRequest({
        'Authorization': 'Basic user:pass'
      });

      const context = createContext();
      const result = await provider.applyAuth(request, context);

      const encoded = result.headers['Authorization'].replace('Basic ', '');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      expect(decoded).toBe('user:pass');
    });
  });

  describe('BearerTokenProvider', () => {
    let provider: IAuthProvider;

    beforeEach(() => {
      provider = new BearerTokenProvider();
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('bearer');
    });

    it('should handle requests with Authorization: Bearer header', () => {
      const request = createRequest({
        'Authorization': 'Bearer {{token}}'
      });
      expect(provider.canHandle(request)).toBe(true);
    });

    it('should handle requests with @auth bearer directive', () => {
      const request = createRequest();
      request.auth = { type: 'bearer', token: 'mytoken' };
      expect(provider.canHandle(request)).toBe(true);
    });

    it('should not handle requests without bearer auth', () => {
      const request = createRequest({
        'Authorization': 'Basic dXNlcjpwYXNz'
      });
      expect(provider.canHandle(request)).toBe(false);
    });

    it('should apply bearer token', async () => {
      const request = createRequest();
      request.auth = { type: 'bearer', token: 'mytoken123' };

      const context = createContext();
      const result = await provider.applyAuth(request, context);

      expect(result.headers['Authorization']).toBe('Bearer mytoken123');
    });

    it('should replace variables in token', async () => {
      const request = createRequest();
      request.auth = { type: 'bearer', token: '{{api_token}}' };

      const context = createContext({ api_token: 'secret_token_456' });
      const result = await provider.applyAuth(request, context);

      expect(result.headers['Authorization']).toBe('Bearer secret_token_456');
    });

    it('should preserve existing Bearer token if already set', async () => {
      const request = createRequest({
        'Authorization': 'Bearer existing_token'
      });

      const context = createContext();
      const result = await provider.applyAuth(request, context);

      expect(result.headers['Authorization']).toBe('Bearer existing_token');
    });
  });

  describe('DigestAuthProvider', () => {
    let provider: IAuthProvider;

    beforeEach(() => {
      provider = new DigestAuthProvider();
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('digest');
    });

    it('should handle requests with @auth digest directive', () => {
      const request = createRequest();
      request.auth = { type: 'digest', username: 'user', password: 'pass' };
      expect(provider.canHandle(request)).toBe(true);
    });

    it('should not handle requests without digest auth', () => {
      const request = createRequest({
        'Authorization': 'Bearer token'
      });
      expect(provider.canHandle(request)).toBe(false);
    });

    it('should return request unchanged for initial request (challenge needed)', async () => {
      const request = createRequest();
      request.auth = { type: 'digest', username: 'user', password: 'pass' };

      const context = createContext();
      const result = await provider.applyAuth(request, context);

      // Digest auth requires a challenge from server first
      // Initial request should mark it needs digest auth
      expect(result.auth?.type).toBe('digest');
    });
  });
});

describe('Auth Type Detection', () => {
  it('should detect basic auth from header pattern', () => {
    const provider = new BasicAuthProvider();
    const request: HttpRequest = {
      name: 'Test',
      method: 'GET',
      url: 'http://example.com',
      headers: { 'Authorization': 'Basic test:pass' },
      tests: [],
      variableUpdates: []
    };
    expect(provider.canHandle(request)).toBe(true);
  });

  it('should detect bearer auth from header pattern', () => {
    const provider = new BearerTokenProvider();
    const request: HttpRequest = {
      name: 'Test',
      method: 'GET',
      url: 'http://example.com',
      headers: { 'Authorization': 'Bearer mytoken' },
      tests: [],
      variableUpdates: []
    };
    expect(provider.canHandle(request)).toBe(true);
  });
});

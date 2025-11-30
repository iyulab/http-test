/**
 * OAuth2Provider Tests
 *
 * TDD tests for OAuth2 authentication provider.
 * Supports client_credentials, password, and refresh_token grant types.
 */
import { OAuth2Provider } from '../../src/auth/OAuth2Provider';
import { AuthContext } from '../../src/auth/IAuthProvider';
import { HttpRequest } from '../../src/types';
import nock from 'nock';

describe('OAuth2Provider', () => {
  let provider: OAuth2Provider;
  let mockContext: AuthContext;

  beforeEach(() => {
    provider = new OAuth2Provider();
    mockContext = {
      variables: {
        get: jest.fn((key: string) => {
          const vars: Record<string, string> = {
            'client_id': 'test-client',
            'client_secret': 'test-secret',
            'token_url': 'https://auth.example.com/token',
            'access_token': 'existing-token',
            'refresh_token': 'refresh-123'
          };
          return vars[key];
        }),
        set: jest.fn(),
        getAll: jest.fn(() => ({}))
      }
    };
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    provider.clearTokenCache();
  });

  describe('name', () => {
    it('should have name "oauth2"', () => {
      expect(provider.name).toBe('oauth2');
    });
  });

  describe('canHandle', () => {
    it('should handle requests with auth.type = oauth2', () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: { type: 'oauth2' }
      };
      expect(provider.canHandle(request)).toBe(true);
    });

    it('should not handle requests without oauth2 auth type', () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {}
      };
      expect(provider.canHandle(request)).toBe(false);
    });

    it('should not handle requests with different auth type', () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: { type: 'bearer' }
      };
      expect(provider.canHandle(request)).toBe(false);
    });
  });

  describe('applyAuth - client_credentials grant', () => {
    it('should fetch token and apply Authorization header', async () => {
      // Mock token endpoint
      nock('https://auth.example.com')
        .post('/token', body => {
          return body.grant_type === 'client_credentials' &&
                 body.client_id === 'test-client' &&
                 body.client_secret === 'test-secret';
        })
        .reply(200, {
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'test-client',
          clientSecret: 'test-secret'
        }
      };

      const result = await provider.applyAuth(request, mockContext);

      expect(result.headers['Authorization']).toBe('Bearer new-access-token');
    });

    it('should use cached token if not expired', async () => {
      // First request - fetch token
      nock('https://auth.example.com')
        .post('/token')
        .once()
        .reply(200, {
          access_token: 'cached-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'test-client',
          clientSecret: 'test-secret'
        }
      };

      // First call - fetches token
      const result1 = await provider.applyAuth(request, mockContext);
      expect(result1.headers['Authorization']).toBe('Bearer cached-token');

      // Second call - should use cached token, no new HTTP request
      const result2 = await provider.applyAuth(request, mockContext);
      expect(result2.headers['Authorization']).toBe('Bearer cached-token');

      // Verify only one HTTP request was made
      expect(nock.isDone()).toBe(true);
    });

    it('should use variable replacement in auth config', async () => {
      nock('https://auth.example.com')
        .post('/token')
        .reply(200, {
          access_token: 'var-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: '{{token_url}}',
          clientId: '{{client_id}}',
          clientSecret: '{{client_secret}}'
        }
      };

      const result = await provider.applyAuth(request, mockContext);

      expect(result.headers['Authorization']).toBe('Bearer var-token');
    });
  });

  describe('applyAuth - password grant', () => {
    it('should fetch token with username and password', async () => {
      nock('https://auth.example.com')
        .post('/token', body => {
          return body.grant_type === 'password' &&
                 body.username === 'testuser' &&
                 body.password === 'testpass' &&
                 body.client_id === 'test-client';
        })
        .reply(200, {
          access_token: 'password-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'refresh-token'
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'password',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'test-client',
          username: 'testuser',
          password: 'testpass'
        }
      };

      const result = await provider.applyAuth(request, mockContext);

      expect(result.headers['Authorization']).toBe('Bearer password-token');
    });
  });

  describe('applyAuth - refresh_token grant', () => {
    it('should refresh expired token', async () => {
      nock('https://auth.example.com')
        .post('/token', body => {
          return body.grant_type === 'refresh_token' &&
                 body.refresh_token === 'my-refresh-token';
        })
        .reply(200, {
          access_token: 'refreshed-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'refresh_token',
          tokenUrl: 'https://auth.example.com/token',
          refreshToken: 'my-refresh-token'
        }
      };

      const result = await provider.applyAuth(request, mockContext);

      expect(result.headers['Authorization']).toBe('Bearer refreshed-token');
    });
  });

  describe('applyAuth - with scope', () => {
    it('should include scope in token request', async () => {
      nock('https://auth.example.com')
        .post('/token', body => {
          return body.scope === 'read write';
        })
        .reply(200, {
          access_token: 'scoped-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'test-client',
          clientSecret: 'test-secret',
          scope: 'read write'
        }
      };

      const result = await provider.applyAuth(request, mockContext);

      expect(result.headers['Authorization']).toBe('Bearer scoped-token');
    });
  });

  describe('applyAuth - existing token', () => {
    it('should use provided access token without fetching', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          accessToken: 'pre-provided-token'
        }
      };

      const result = await provider.applyAuth(request, mockContext);

      expect(result.headers['Authorization']).toBe('Bearer pre-provided-token');
      // No HTTP requests should be made
      expect(nock.pendingMocks()).toHaveLength(0);
    });

    it('should replace variables in existing access token', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          accessToken: '{{access_token}}'
        }
      };

      const result = await provider.applyAuth(request, mockContext);

      expect(result.headers['Authorization']).toBe('Bearer existing-token');
    });
  });

  describe('error handling', () => {
    it('should throw error on token fetch failure', async () => {
      nock('https://auth.example.com')
        .post('/token')
        .reply(401, {
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'invalid-client',
          clientSecret: 'invalid-secret'
        }
      };

      await expect(provider.applyAuth(request, mockContext))
        .rejects.toThrow(/OAuth2 token request failed/);
    });

    it('should throw error on network failure', async () => {
      nock('https://auth.example.com')
        .post('/token')
        .replyWithError('Network error');

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'test-client',
          clientSecret: 'test-secret'
        }
      };

      await expect(provider.applyAuth(request, mockContext))
        .rejects.toThrow();
    });

    it('should throw error for unsupported grant type', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'authorization_code', // Not supported yet
          tokenUrl: 'https://auth.example.com/token'
        }
      };

      await expect(provider.applyAuth(request, mockContext))
        .rejects.toThrow(/Unsupported grant type/);
    });
  });

  describe('token caching', () => {
    it('should clear token cache', async () => {
      nock('https://auth.example.com')
        .post('/token')
        .twice()
        .reply(200, {
          access_token: 'token-1',
          token_type: 'Bearer',
          expires_in: 3600
        });

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'test-client',
          clientSecret: 'test-secret'
        }
      };

      // First call
      await provider.applyAuth(request, mockContext);

      // Clear cache
      provider.clearTokenCache();

      // Second call should fetch new token
      await provider.applyAuth(request, mockContext);

      expect(nock.isDone()).toBe(true);
    });

    it('should use separate cache keys for different client credentials', async () => {
      nock('https://auth.example.com')
        .post('/token')
        .twice()
        .reply(200, function(uri, body) {
          const params = new URLSearchParams(body as string);
          return {
            access_token: `token-for-${params.get('client_id')}`,
            token_type: 'Bearer',
            expires_in: 3600
          };
        });

      const request1: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'client-1',
          clientSecret: 'secret-1'
        }
      };

      const request2: HttpRequest = {
        method: 'GET',
        url: 'https://api.example.com/resource',
        headers: {},
        auth: {
          type: 'oauth2',
          grantType: 'client_credentials',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'client-2',
          clientSecret: 'secret-2'
        }
      };

      const result1 = await provider.applyAuth(request1, mockContext);
      const result2 = await provider.applyAuth(request2, mockContext);

      expect(result1.headers['Authorization']).toBe('Bearer token-for-client-1');
      expect(result2.headers['Authorization']).toBe('Bearer token-for-client-2');
    });
  });
});

/**
 * OAuth2Provider
 *
 * Handles OAuth2 Authentication.
 * Supports client_credentials, password, and refresh_token grant types.
 * Includes token caching to avoid repeated token requests.
 */
import axios from 'axios';
import { HttpRequest } from '../types';
import { IAuthProvider, AuthContext } from './IAuthProvider';

/**
 * Cached token entry
 */
interface CachedToken {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

/**
 * OAuth2 token response from authorization server
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export class OAuth2Provider implements IAuthProvider {
  readonly name = 'oauth2';

  /** Token cache keyed by cache key (tokenUrl + clientId + grantType) */
  private tokenCache: Map<string, CachedToken> = new Map();

  /** Buffer time before token expiry to refresh (in milliseconds) */
  private readonly expiryBufferMs = 60000; // 1 minute

  canHandle(request: HttpRequest): boolean {
    return request.auth?.type === 'oauth2';
  }

  async applyAuth(request: HttpRequest, context: AuthContext): Promise<HttpRequest> {
    const result = { ...request, headers: { ...request.headers } };
    const auth = request.auth;

    if (!auth) {
      return result;
    }

    // If accessToken is directly provided, use it
    if (auth.accessToken) {
      const token = this.replaceVariables(auth.accessToken as string, context);
      result.headers['Authorization'] = `Bearer ${token}`;
      return result;
    }

    // Otherwise, fetch token using grant type
    const grantType = auth.grantType as string;

    if (!grantType) {
      throw new Error('OAuth2: grantType is required when accessToken is not provided');
    }

    // Validate grant type
    const supportedGrantTypes = ['client_credentials', 'password', 'refresh_token'];
    if (!supportedGrantTypes.includes(grantType)) {
      throw new Error(`Unsupported grant type: ${grantType}. Supported: ${supportedGrantTypes.join(', ')}`);
    }

    const tokenUrl = this.replaceVariables(auth.tokenUrl as string || '', context);
    if (!tokenUrl) {
      throw new Error('OAuth2: tokenUrl is required');
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(auth, context);

    // Check cache for valid token
    const cachedToken = this.tokenCache.get(cacheKey);
    if (cachedToken && this.isTokenValid(cachedToken)) {
      result.headers['Authorization'] = `Bearer ${cachedToken.accessToken}`;
      return result;
    }

    // Fetch new token
    const token = await this.fetchToken(auth, context);
    result.headers['Authorization'] = `Bearer ${token}`;

    return result;
  }

  /**
   * Clear the token cache
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
  }

  /**
   * Check if cached token is still valid
   */
  private isTokenValid(cached: CachedToken): boolean {
    return Date.now() < cached.expiresAt - this.expiryBufferMs;
  }

  /**
   * Generate cache key from auth config
   */
  private generateCacheKey(auth: Record<string, unknown>, context: AuthContext): string {
    const tokenUrl = this.replaceVariables(auth.tokenUrl as string || '', context);
    const clientId = this.replaceVariables(auth.clientId as string || '', context);
    const grantType = auth.grantType as string || '';
    const username = this.replaceVariables(auth.username as string || '', context);

    return `${tokenUrl}|${clientId}|${grantType}|${username}`;
  }

  /**
   * Fetch token from authorization server
   */
  private async fetchToken(auth: Record<string, unknown>, context: AuthContext): Promise<string> {
    const tokenUrl = this.replaceVariables(auth.tokenUrl as string, context);
    const grantType = auth.grantType as string;

    // Build request body based on grant type
    const params = new URLSearchParams();
    params.append('grant_type', grantType);

    switch (grantType) {
      case 'client_credentials':
        this.addClientCredentialsParams(params, auth, context);
        break;
      case 'password':
        this.addPasswordParams(params, auth, context);
        break;
      case 'refresh_token':
        this.addRefreshTokenParams(params, auth, context);
        break;
    }

    // Add scope if provided
    if (auth.scope) {
      params.append('scope', this.replaceVariables(auth.scope as string, context));
    }

    try {
      const response = await axios.post<TokenResponse>(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        validateStatus: () => true // Handle all status codes manually
      });

      if (response.status >= 400) {
        const errorData = response.data as { error?: string; error_description?: string };
        const errorMsg = errorData.error_description || errorData.error || 'Unknown error';
        throw new Error(`OAuth2 token request failed (${response.status}): ${errorMsg}`);
      }

      const tokenData = response.data;
      const accessToken = tokenData.access_token;

      // Cache the token
      const cacheKey = this.generateCacheKey(auth, context);
      const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
      this.tokenCache.set(cacheKey, {
        accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
        refreshToken: tokenData.refresh_token
      });

      return accessToken;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OAuth2 token request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Add client_credentials grant parameters
   */
  private addClientCredentialsParams(
    params: URLSearchParams,
    auth: Record<string, unknown>,
    context: AuthContext
  ): void {
    const clientId = this.replaceVariables(auth.clientId as string || '', context);
    const clientSecret = this.replaceVariables(auth.clientSecret as string || '', context);

    if (clientId) {
      params.append('client_id', clientId);
    }
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }
  }

  /**
   * Add password grant parameters
   */
  private addPasswordParams(
    params: URLSearchParams,
    auth: Record<string, unknown>,
    context: AuthContext
  ): void {
    const clientId = this.replaceVariables(auth.clientId as string || '', context);
    const username = this.replaceVariables(auth.username as string || '', context);
    const password = this.replaceVariables(auth.password as string || '', context);

    if (clientId) {
      params.append('client_id', clientId);
    }
    if (auth.clientSecret) {
      params.append('client_secret', this.replaceVariables(auth.clientSecret as string, context));
    }
    if (username) {
      params.append('username', username);
    }
    if (password) {
      params.append('password', password);
    }
  }

  /**
   * Add refresh_token grant parameters
   */
  private addRefreshTokenParams(
    params: URLSearchParams,
    auth: Record<string, unknown>,
    context: AuthContext
  ): void {
    const refreshToken = this.replaceVariables(auth.refreshToken as string || '', context);

    if (refreshToken) {
      params.append('refresh_token', refreshToken);
    }
    if (auth.clientId) {
      params.append('client_id', this.replaceVariables(auth.clientId as string, context));
    }
    if (auth.clientSecret) {
      params.append('client_secret', this.replaceVariables(auth.clientSecret as string, context));
    }
  }

  /**
   * Replace variable placeholders with actual values
   */
  private replaceVariables(value: string, context: AuthContext): string {
    if (!value) return value;
    return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const replacement = context.variables.get(varName.trim());
      return replacement !== undefined ? replacement : match;
    });
  }
}

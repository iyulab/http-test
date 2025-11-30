/**
 * BearerTokenProvider
 *
 * Handles Bearer Token Authentication.
 * Supports @auth bearer directive and Authorization: Bearer header.
 */
import { HttpRequest } from '../types';
import { IAuthProvider, AuthContext } from './IAuthProvider';

export class BearerTokenProvider implements IAuthProvider {
  readonly name = 'bearer';

  canHandle(request: HttpRequest): boolean {
    // Check for @auth bearer directive
    if (request.auth?.type === 'bearer') {
      return true;
    }

    // Check for Authorization: Bearer header
    const authHeader = this.getAuthHeader(request);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true;
    }

    return false;
  }

  async applyAuth(request: HttpRequest, context: AuthContext): Promise<HttpRequest> {
    const result = { ...request, headers: { ...request.headers } };

    // Check if already has Bearer header with a token that doesn't need variable replacement
    const existingHeader = this.getAuthHeader(request);
    if (existingHeader && !existingHeader.includes('{{')) {
      // Already has a complete Bearer token
      return result;
    }

    let token: string;

    if (request.auth?.type === 'bearer') {
      // Get token from auth config
      token = this.replaceVariables(request.auth.token || '', context);
    } else if (existingHeader) {
      // Parse token from existing header (may contain variables)
      const rawToken = existingHeader.substring(7).trim();
      token = this.replaceVariables(rawToken, context);
    } else {
      return result;
    }

    // Set header
    result.headers['Authorization'] = `Bearer ${token}`;

    return result;
  }

  private getAuthHeader(request: HttpRequest): string | undefined {
    // Case-insensitive header lookup
    for (const [key, value] of Object.entries(request.headers)) {
      if (key.toLowerCase() === 'authorization') {
        return value;
      }
    }
    return undefined;
  }

  private replaceVariables(value: string, context: AuthContext): string {
    return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const replacement = context.variables.get(varName.trim());
      return replacement !== undefined ? replacement : match;
    });
  }
}

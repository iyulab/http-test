/**
 * BasicAuthProvider
 *
 * Handles HTTP Basic Authentication.
 * Supports @auth basic directive and Authorization: Basic header.
 */
import { HttpRequest } from '../types';
import { IAuthProvider, AuthContext } from './IAuthProvider';

export class BasicAuthProvider implements IAuthProvider {
  readonly name = 'basic';

  canHandle(request: HttpRequest): boolean {
    // Check for @auth basic directive
    if (request.auth?.type === 'basic') {
      return true;
    }

    // Check for Authorization: Basic header
    const authHeader = this.getAuthHeader(request);
    if (authHeader && authHeader.startsWith('Basic ')) {
      return true;
    }

    return false;
  }

  async applyAuth(request: HttpRequest, context: AuthContext): Promise<HttpRequest> {
    const result = { ...request, headers: { ...request.headers } };

    // Check if already has a properly encoded Basic header
    const existingHeader = this.getAuthHeader(request);
    if (existingHeader && this.isBase64Encoded(existingHeader.substring(6))) {
      return result;
    }

    let username: string;
    let password: string;

    if (request.auth?.type === 'basic') {
      // Get credentials from auth config
      username = this.replaceVariables(request.auth.username || '', context);
      password = this.replaceVariables(request.auth.password || '', context);
    } else if (existingHeader) {
      // Parse from "Basic user:pass" header
      const credentials = existingHeader.substring(6).trim();
      const colonIndex = credentials.indexOf(':');
      if (colonIndex !== -1) {
        username = this.replaceVariables(credentials.substring(0, colonIndex), context);
        password = this.replaceVariables(credentials.substring(colonIndex + 1), context);
      } else {
        username = this.replaceVariables(credentials, context);
        password = '';
      }
    } else {
      return result;
    }

    // Encode and set header
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    result.headers['Authorization'] = `Basic ${encoded}`;

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

  private isBase64Encoded(str: string): boolean {
    // Check if string is valid base64
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf-8');
      const reencoded = Buffer.from(decoded).toString('base64');
      return reencoded === str;
    } catch {
      return false;
    }
  }

  private replaceVariables(value: string, context: AuthContext): string {
    return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const replacement = context.variables.get(varName.trim());
      return replacement !== undefined ? replacement : match;
    });
  }
}

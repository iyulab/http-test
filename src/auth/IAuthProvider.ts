/**
 * Authentication Provider Interface
 *
 * Defines the contract for authentication providers.
 * Each provider handles a specific authentication scheme.
 */
import { HttpRequest } from '../types';

/**
 * Context provided to auth providers
 */
export interface AuthContext {
  /** Variable manager for variable replacement */
  variables: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    getAll(): Record<string, string | number | boolean>;
  };
  /** Optional challenge from previous 401 response (for digest auth) */
  challenge?: string;
}

/**
 * Authentication provider interface
 */
export interface IAuthProvider {
  /** Unique name for this provider */
  readonly name: string;

  /**
   * Check if this provider can handle the given request
   * @param request The HTTP request
   * @returns true if this provider can handle authentication for this request
   */
  canHandle(request: HttpRequest): boolean;

  /**
   * Apply authentication to the request
   * @param request The HTTP request to modify
   * @param context Authentication context with variables
   * @returns Modified request with authentication applied
   */
  applyAuth(request: HttpRequest, context: AuthContext): Promise<HttpRequest>;
}

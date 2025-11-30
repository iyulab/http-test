/**
 * AuthRegistry
 *
 * Manages authentication provider registration and lookup.
 */
import { HttpRequest } from '../types';
import { IAuthProvider, AuthContext } from './IAuthProvider';
import { BasicAuthProvider } from './BasicAuthProvider';
import { BearerTokenProvider } from './BearerTokenProvider';
import { DigestAuthProvider } from './DigestAuthProvider';

/**
 * Registration options
 */
export interface AuthRegistrationOptions {
  /** Force replace existing provider of same name */
  force?: boolean;
}

export class AuthRegistry {
  private providers: IAuthProvider[] = [];

  /**
   * Register an auth provider
   * @param provider The provider to register
   * @param options Registration options
   * @throws Error if provider name already registered (unless force=true)
   */
  register(provider: IAuthProvider, options?: AuthRegistrationOptions): void {
    const existingIndex = this.providers.findIndex(p => p.name === provider.name);

    if (existingIndex !== -1) {
      if (options?.force) {
        this.providers[existingIndex] = provider;
        return;
      }
      throw new Error(`Auth provider "${provider.name}" already registered`);
    }

    this.providers.push(provider);
  }

  /**
   * Get the number of registered providers
   */
  getProviderCount(): number {
    return this.providers.length;
  }

  /**
   * Find a provider that can handle the given request
   * @param request The HTTP request
   * @returns The provider or null if none found
   */
  findProvider(request: HttpRequest): IAuthProvider | null {
    for (const provider of this.providers) {
      if (provider.canHandle(request)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Apply authentication to a request using the appropriate provider
   * @param request The HTTP request
   * @param context Authentication context
   * @returns Modified request with authentication applied
   */
  async applyAuth(request: HttpRequest, context: AuthContext): Promise<HttpRequest> {
    const provider = this.findProvider(request);

    if (!provider) {
      return request;
    }

    return await provider.applyAuth(request, context);
  }

  /**
   * Create a registry with all default providers
   */
  static createDefault(): AuthRegistry {
    const registry = new AuthRegistry();

    registry.register(new BasicAuthProvider());
    registry.register(new BearerTokenProvider());
    registry.register(new DigestAuthProvider());

    return registry;
  }
}

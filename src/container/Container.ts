/**
 * Simple Dependency Injection Container
 *
 * Provides basic DI functionality for managing application dependencies.
 * Supports singleton and factory registrations.
 */

type Factory<T> = (container: Container) => T;

interface Registration<T = unknown> {
  type: 'singleton' | 'factory';
  instance?: T;
  factory?: Factory<T>;
}

export class Container {
  private registrations = new Map<string, Registration>();

  /**
   * Register a singleton instance
   * @param key Unique identifier for the dependency
   * @param instance The singleton instance
   */
  registerSingleton<T>(key: string, instance: T): void {
    this.registrations.set(key, {
      type: 'singleton',
      instance
    });
  }

  /**
   * Register a factory function that creates new instances
   * @param key Unique identifier for the dependency
   * @param factory Function that creates the instance
   */
  registerFactory<T>(key: string, factory: Factory<T>): void {
    this.registrations.set(key, {
      type: 'factory',
      factory
    });
  }

  /**
   * Resolve a dependency by key
   * @param key Unique identifier for the dependency
   * @returns The resolved instance
   * @throws Error if dependency is not registered
   */
  resolve<T>(key: string): T {
    const registration = this.registrations.get(key);

    if (!registration) {
      throw new Error(`Dependency '${key}' is not registered`);
    }

    if (registration.type === 'singleton') {
      return registration.instance as T;
    }

    if (registration.type === 'factory' && registration.factory) {
      return registration.factory(this) as T;
    }

    throw new Error(`Invalid registration for '${key}'`);
  }

  /**
   * Check if a dependency is registered
   * @param key Unique identifier for the dependency
   * @returns true if registered, false otherwise
   */
  has(key: string): boolean {
    return this.registrations.has(key);
  }

  /**
   * Clear all registered dependencies
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Get all registered keys
   * @returns Array of registered dependency keys
   */
  getRegisteredKeys(): string[] {
    return Array.from(this.registrations.keys());
  }
}

/**
 * Default container instance for the application
 */
export const container = new Container();

/**
 * Container registration keys for core dependencies
 */
export const ContainerKeys = {
  VariableManager: 'IVariableManager',
  HttpFileParser: 'IHttpFileParser',
  RequestExecutor: 'IRequestExecutor',
  AssertionEngine: 'IAssertionEngine',
  ScriptEngine: 'IScriptEngine',
  EnvironmentManager: 'EnvironmentManager',
  CookieJar: 'CookieJar'
} as const;

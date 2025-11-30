/**
 * AssertionRegistry
 *
 * Manages assertion handler registration and lookup.
 * Provides a central registry for all assertion types.
 */
import { HttpResponse, HttpRequest } from '../types';
import { IAssertionHandler, AssertionResult } from './IAssertionHandler';
import {
  StatusCodeHandler,
  HeaderHandler,
  JsonPathHandler,
  ResponseTimeHandler,
  BodyExistsHandler
} from './handlers';

/**
 * Registration options
 */
export interface RegistrationOptions {
  /** Force replace existing handler of same type */
  force?: boolean;
}

/**
 * Assertion input for bulk assertions
 */
export interface AssertionInput {
  key: string;
  value: string;
}

export class AssertionRegistry {
  private handlers: IAssertionHandler[] = [];

  /**
   * Register a handler
   * @param handler The handler to register
   * @param options Registration options
   * @throws Error if handler type already registered (unless force=true)
   */
  register(handler: IAssertionHandler, options?: RegistrationOptions): void {
    const existingIndex = this.handlers.findIndex(h => h.type === handler.type);

    if (existingIndex !== -1) {
      if (options?.force) {
        this.handlers[existingIndex] = handler;
        return;
      }
      throw new Error(`Handler for type "${handler.type}" already registered`);
    }

    this.handlers.push(handler);
  }

  /**
   * Check if a handler type is registered
   */
  hasHandler(type: string): boolean {
    return this.handlers.some(h => h.type === type);
  }

  /**
   * Get the number of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Find a handler that can process the given assertion key
   * @param key The assertion key
   * @returns The handler or null if not found
   */
  findHandler(key: string): IAssertionHandler | null {
    for (const handler of this.handlers) {
      if (handler.canHandle(key)) {
        return handler;
      }
    }
    return null;
  }

  /**
   * Perform a single assertion
   * @param key The assertion key
   * @param value The expected value
   * @param response The HTTP response
   * @param request Optional HTTP request
   * @returns The assertion result
   * @throws Error if no handler found
   */
  assert(
    key: string,
    value: string,
    response: HttpResponse,
    request?: HttpRequest
  ): AssertionResult {
    const handler = this.findHandler(key);

    if (!handler) {
      throw new Error(`No handler found for assertion type: ${key}`);
    }

    try {
      return handler.assert(key, value, response, request);
    } catch (error) {
      return {
        passed: false,
        assertionKey: key,
        expected: value,
        actual: 'error',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Perform multiple assertions
   * @param assertions Array of assertion inputs
   * @param response The HTTP response
   * @param request Optional HTTP request
   * @returns Array of assertion results
   */
  assertAll(
    assertions: AssertionInput[],
    response: HttpResponse,
    request?: HttpRequest
  ): AssertionResult[] {
    return assertions.map(({ key, value }) => {
      try {
        return this.assert(key, value, response, request);
      } catch (error) {
        return {
          passed: false,
          assertionKey: key,
          expected: value,
          actual: 'error',
          message: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }

  /**
   * Create a registry with all default handlers
   */
  static createDefault(): AssertionRegistry {
    const registry = new AssertionRegistry();

    // Register handlers in priority order
    registry.register(new StatusCodeHandler());
    registry.register(new BodyExistsHandler());
    registry.register(new ResponseTimeHandler());
    registry.register(new JsonPathHandler());
    registry.register(new HeaderHandler());

    return registry;
  }
}

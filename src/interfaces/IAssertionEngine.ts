/**
 * IAssertionEngine Interface
 *
 * Contract for assertion engine implementations.
 * Validates HTTP responses against defined assertions.
 */
import { Assertion, HttpResponse, HttpRequest } from '../types';

export interface IAssertionEngine {
  /**
   * Assert that a response matches the expected assertion
   * @param assertion The assertion to validate
   * @param response The HTTP response to validate against
   * @param request Optional HTTP request for context
   * @returns Promise that resolves if assertion passes, rejects if it fails
   */
  assert(assertion: Assertion, response: HttpResponse, request?: HttpRequest): Promise<void>;
}

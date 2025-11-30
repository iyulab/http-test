/**
 * Assertion Handler Interface
 *
 * Defines the contract for assertion handlers in the assertion pipeline.
 * Each handler is responsible for a specific type of assertion.
 */
import { HttpResponse, HttpRequest } from '../types';

/**
 * Result of an assertion check
 */
export interface AssertionResult {
  /** Whether the assertion passed */
  passed: boolean;
  /** The assertion key (e.g., "Status", "Content-Type", "$.data.id") */
  assertionKey: string;
  /** The expected value */
  expected: string;
  /** The actual value found */
  actual: string;
  /** Optional message explaining the result */
  message?: string;
}

/**
 * Assertion handler interface
 *
 * Handlers are responsible for:
 * 1. Determining if they can handle a specific assertion key
 * 2. Performing the assertion and returning the result
 */
export interface IAssertionHandler {
  /** Unique type identifier for this handler */
  readonly type: string;

  /**
   * Check if this handler can process the given assertion key
   * @param key The assertion key (e.g., "Status", "Content-Type", "$.data.id")
   * @returns true if this handler can process the assertion
   */
  canHandle(key: string): boolean;

  /**
   * Perform the assertion
   * @param key The assertion key
   * @param value The expected value
   * @param response The HTTP response to assert against
   * @param request Optional HTTP request for context
   * @returns The assertion result
   */
  assert(
    key: string,
    value: string,
    response: HttpResponse,
    request?: HttpRequest
  ): AssertionResult;
}

/**
 * Options for assertion handlers
 */
export interface AssertionHandlerOptions {
  /** Variable manager for variable replacement */
  variableManager?: {
    replaceVariables(content: string): string;
  };
}

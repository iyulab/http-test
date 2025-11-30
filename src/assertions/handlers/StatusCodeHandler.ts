/**
 * StatusCodeHandler
 *
 * Handles status code assertions.
 * Supports exact match, numeric values, and range patterns (2xx, 4xx, etc.)
 */
import { HttpResponse } from '../../types';
import { IAssertionHandler, AssertionResult } from '../IAssertionHandler';

export class StatusCodeHandler implements IAssertionHandler {
  readonly type = 'status';

  canHandle(key: string): boolean {
    return key.toLowerCase() === 'status';
  }

  assert(key: string, value: string, response: HttpResponse): AssertionResult {
    const expectedValue = String(value);
    const actualStatus = response.status;

    // Check for range pattern (e.g., 2xx, 4xx)
    const rangeMatch = expectedValue.match(/^(\d)xx$/i);
    if (rangeMatch) {
      const expectedPrefix = parseInt(rangeMatch[1], 10);
      const actualPrefix = Math.floor(actualStatus / 100);
      const passed = expectedPrefix === actualPrefix;

      return {
        passed,
        assertionKey: key,
        expected: expectedValue,
        actual: String(actualStatus),
        message: passed
          ? undefined
          : `Expected status in range ${expectedValue} but got ${actualStatus}`
      };
    }

    // Exact match
    const expectedStatus = parseInt(expectedValue, 10);
    const passed = actualStatus === expectedStatus;

    return {
      passed,
      assertionKey: key,
      expected: expectedValue,
      actual: String(actualStatus),
      message: passed
        ? undefined
        : `Expected status ${expectedValue} but got ${actualStatus}`
    };
  }
}

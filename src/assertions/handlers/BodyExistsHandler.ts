/**
 * BodyExistsHandler
 *
 * Handles body existence and content assertions.
 * Supports existence check (*) and exact content match.
 */
import { HttpResponse } from '../../types';
import { IAssertionHandler, AssertionResult } from '../IAssertionHandler';

export class BodyExistsHandler implements IAssertionHandler {
  readonly type = 'body';

  canHandle(key: string): boolean {
    return key.toLowerCase() === 'body';
  }

  assert(key: string, value: string, response: HttpResponse): AssertionResult {
    const data = response.data;

    // Check if body exists
    const bodyExists = data !== null && data !== undefined && data !== '';

    // Existence check
    if (value === '*') {
      return {
        passed: bodyExists,
        assertionKey: key,
        expected: value,
        actual: bodyExists ? 'exists' : 'empty',
        message: bodyExists
          ? undefined
          : 'Expected response body to exist but it was empty'
      };
    }

    // Content match
    const actualString = typeof data === 'object'
      ? JSON.stringify(data)
      : String(data);

    const passed = actualString === value;

    return {
      passed,
      assertionKey: key,
      expected: value,
      actual: actualString,
      message: passed
        ? undefined
        : `Expected body "${value}" but got "${actualString.substring(0, 100)}${actualString.length > 100 ? '...' : ''}"`
    };
  }
}

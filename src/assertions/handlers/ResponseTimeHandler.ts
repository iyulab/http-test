/**
 * ResponseTimeHandler
 *
 * Handles response time assertions.
 * Supports comparison operators: <, >, <=, >=, exact match
 */
import { HttpResponse } from '../../types';
import { IAssertionHandler, AssertionResult } from '../IAssertionHandler';

export class ResponseTimeHandler implements IAssertionHandler {
  readonly type = 'responsetime';

  canHandle(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return lowerKey === '_responsetime' || lowerKey === 'responsetime';
  }

  assert(key: string, value: string, response: HttpResponse): AssertionResult {
    const actualTime = response.time || 0;
    const trimmedValue = value.trim();

    // Parse comparison operator and value
    const { operator, expectedTime } = this.parseValue(trimmedValue);

    // Perform comparison
    const passed = this.compare(actualTime, operator, expectedTime);

    return {
      passed,
      assertionKey: key,
      expected: value,
      actual: `${actualTime}ms`,
      message: passed
        ? undefined
        : `Expected response time ${value} but got ${actualTime}ms`
    };
  }

  private parseValue(value: string): { operator: string; expectedTime: number } {
    // Match pattern like "<500", ">=100", "<=200", ">50"
    const match = value.match(/^([<>]=?|=)?\s*(\d+)/);

    if (!match) {
      return { operator: '=', expectedTime: parseInt(value, 10) || 0 };
    }

    return {
      operator: match[1] || '=',
      expectedTime: parseInt(match[2], 10)
    };
  }

  private compare(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case '<':
        return actual < expected;
      case '>':
        return actual > expected;
      case '<=':
        return actual <= expected;
      case '>=':
        return actual >= expected;
      case '=':
      default:
        return actual === expected;
    }
  }
}

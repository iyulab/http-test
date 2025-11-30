/**
 * JsonPathHandler
 *
 * Handles JSONPath assertions against response body.
 * Supports JSONPath expressions starting with $. or $[
 */
import { HttpResponse } from '../../types';
import { IAssertionHandler, AssertionResult } from '../IAssertionHandler';
import { JSONPath } from 'jsonpath-plus';

export class JsonPathHandler implements IAssertionHandler {
  readonly type = 'jsonpath';

  canHandle(key: string): boolean {
    return key.startsWith('$.') || key.startsWith('$[');
  }

  assert(key: string, value: string, response: HttpResponse): AssertionResult {
    // Parse response data
    let data = response.data;

    // Handle string response
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return {
          passed: false,
          assertionKey: key,
          expected: value,
          actual: 'invalid JSON',
          message: `Response body is not valid JSON`
        };
      }
    }

    if (data === null || data === undefined) {
      return {
        passed: false,
        assertionKey: key,
        expected: value,
        actual: 'null',
        message: `Response body is empty`
      };
    }

    // Execute JSONPath query
    let result: any[];
    try {
      result = JSONPath({ path: key, json: data });
    } catch (err) {
      return {
        passed: false,
        assertionKey: key,
        expected: value,
        actual: 'error',
        message: `Invalid JSONPath expression: ${key}`
      };
    }

    // Check if path exists
    if (result.length === 0) {
      return {
        passed: false,
        assertionKey: key,
        expected: value,
        actual: 'undefined',
        message: `JSONPath "${key}" not found in response`
      };
    }

    const actualValue = result[0];
    const actualString = this.valueToString(actualValue);

    // Existence check
    if (value === '*') {
      return {
        passed: true,
        assertionKey: key,
        expected: value,
        actual: actualString
      };
    }

    // Compare values
    const passed = this.compareValues(actualValue, value);

    return {
      passed,
      assertionKey: key,
      expected: value,
      actual: actualString,
      message: passed
        ? undefined
        : `Expected "${key}" to be "${value}" but got "${actualString}"`
    };
  }

  private valueToString(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private compareValues(actual: any, expected: string): boolean {
    // Direct string comparison
    if (String(actual) === expected) return true;

    // Numeric comparison
    if (typeof actual === 'number') {
      const expectedNum = parseFloat(expected);
      if (!isNaN(expectedNum) && actual === expectedNum) return true;
    }

    // Boolean comparison
    if (typeof actual === 'boolean') {
      if (expected === 'true' && actual === true) return true;
      if (expected === 'false' && actual === false) return true;
    }

    // Array/Object JSON comparison
    if (typeof actual === 'object' && actual !== null) {
      try {
        const expectedObj = JSON.parse(expected);
        return JSON.stringify(actual) === JSON.stringify(expectedObj);
      } catch {
        return false;
      }
    }

    return false;
  }
}

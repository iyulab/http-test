/**
 * HeaderHandler
 *
 * Handles HTTP header assertions.
 * Supports exact match, existence check (*), and case-insensitive header names.
 */
import { HttpResponse } from '../../types';
import { IAssertionHandler, AssertionResult } from '../IAssertionHandler';

export class HeaderHandler implements IAssertionHandler {
  readonly type = 'header';

  // Common HTTP headers for quick lookup
  private static readonly KNOWN_HEADERS = new Set([
    'accept', 'accept-charset', 'accept-encoding', 'accept-language',
    'authorization', 'cache-control', 'connection', 'content-disposition',
    'content-encoding', 'content-language', 'content-length', 'content-type',
    'cookie', 'date', 'etag', 'expires', 'host', 'if-match', 'if-modified-since',
    'if-none-match', 'if-unmodified-since', 'last-modified', 'location',
    'origin', 'pragma', 'range', 'referer', 'retry-after', 'server',
    'set-cookie', 'transfer-encoding', 'user-agent', 'vary', 'www-authenticate',
    'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-requested-with',
    'x-custom-header', 'x-api-key', 'x-auth-token', 'x-csrf-token', 'x-frame-options',
    'x-content-type-options', 'x-xss-protection', 'access-control-allow-origin',
    'access-control-allow-methods', 'access-control-allow-headers',
    'access-control-allow-credentials', 'access-control-expose-headers',
    'access-control-max-age'
  ]);

  canHandle(key: string): boolean {
    const lowerKey = key.toLowerCase();

    // Exclude status and JSONPath patterns
    if (lowerKey === 'status') return false;
    if (key.startsWith('$.') || key.startsWith('$[')) return false;
    if (key.startsWith('_')) return false;  // Special assertions
    if (lowerKey === 'body') return false;

    // Must contain a hyphen (typical for HTTP headers) or be a known header
    // This prevents matching arbitrary text like "UnknownAssertion"
    if (key.includes('-')) return true;
    if (HeaderHandler.KNOWN_HEADERS.has(lowerKey)) return true;

    return false;
  }

  assert(key: string, value: string, response: HttpResponse): AssertionResult {
    // Find header with case-insensitive lookup
    const headers = response.headers || {};
    const lowerKey = key.toLowerCase();

    let actualValue: string | undefined;
    for (const [headerKey, headerValue] of Object.entries(headers)) {
      if (headerKey.toLowerCase() === lowerKey) {
        actualValue = String(headerValue);
        break;
      }
    }

    // Check if header exists
    if (actualValue === undefined) {
      return {
        passed: false,
        assertionKey: key,
        expected: value,
        actual: 'undefined',
        message: `Header "${key}" not found in response`
      };
    }

    // Existence check
    if (value === '*') {
      return {
        passed: true,
        assertionKey: key,
        expected: value,
        actual: actualValue
      };
    }

    // Exact match
    const passed = actualValue === value;

    return {
      passed,
      assertionKey: key,
      expected: value,
      actual: actualValue,
      message: passed
        ? undefined
        : `Expected header "${key}" to be "${value}" but got "${actualValue}"`
    };
  }
}

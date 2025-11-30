/**
 * Assertion Handlers Tests
 *
 * TDD tests for the assertion handler pipeline.
 * Each handler is responsible for a specific type of assertion.
 */
import { HttpResponse } from '../../src/types';
import {
  IAssertionHandler,
  AssertionResult,
  StatusCodeHandler,
  HeaderHandler,
  JsonPathHandler,
  ResponseTimeHandler,
  BodyExistsHandler
} from '../../src/assertions';

describe('IAssertionHandler Contract', () => {
  // Sample response for testing
  const sampleResponse: HttpResponse = {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
      'x-custom-header': 'test-value'
    },
    data: { id: 1, name: 'Test', items: [1, 2, 3] },
    time: 150
  };

  describe('StatusCodeHandler', () => {
    let handler: IAssertionHandler;

    beforeEach(() => {
      handler = new StatusCodeHandler();
    });

    it('should have correct type identifier', () => {
      expect(handler.type).toBe('status');
    });

    it('should handle status assertions', () => {
      expect(handler.canHandle('Status')).toBe(true);
      expect(handler.canHandle('status')).toBe(true);
      expect(handler.canHandle('Content-Type')).toBe(false);
    });

    it('should pass for matching status code', () => {
      const result = handler.assert('Status', '200', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail for non-matching status code', () => {
      const result = handler.assert('Status', '404', sampleResponse);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('200');
      expect(result.message).toContain('404');
    });

    it('should handle status range pattern 2xx', () => {
      const result = handler.assert('Status', '2xx', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail status range pattern 4xx', () => {
      const result = handler.assert('Status', '4xx', sampleResponse);
      expect(result.passed).toBe(false);
    });

    it('should handle numeric status code', () => {
      const result = handler.assert('Status', 200 as any, sampleResponse);
      expect(result.passed).toBe(true);
    });
  });

  describe('HeaderHandler', () => {
    let handler: IAssertionHandler;

    beforeEach(() => {
      handler = new HeaderHandler();
    });

    it('should have correct type identifier', () => {
      expect(handler.type).toBe('header');
    });

    it('should handle header assertions', () => {
      expect(handler.canHandle('Content-Type')).toBe(true);
      expect(handler.canHandle('X-Custom-Header')).toBe(true);
      expect(handler.canHandle('Status')).toBe(false);
      expect(handler.canHandle('$.data.id')).toBe(false);
    });

    it('should pass for matching header value', () => {
      const result = handler.assert('Content-Type', 'application/json', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail for non-matching header value', () => {
      const result = handler.assert('Content-Type', 'text/html', sampleResponse);
      expect(result.passed).toBe(false);
    });

    it('should handle case-insensitive header names', () => {
      const result = handler.assert('content-type', 'application/json', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail for non-existent header', () => {
      const result = handler.assert('X-Missing-Header', 'value', sampleResponse);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle header existence check', () => {
      const result = handler.assert('Content-Type', '*', sampleResponse);
      expect(result.passed).toBe(true);
    });
  });

  describe('JsonPathHandler', () => {
    let handler: IAssertionHandler;

    beforeEach(() => {
      handler = new JsonPathHandler();
    });

    it('should have correct type identifier', () => {
      expect(handler.type).toBe('jsonpath');
    });

    it('should handle JSONPath assertions', () => {
      expect(handler.canHandle('$.data.id')).toBe(true);
      expect(handler.canHandle('$.items[0]')).toBe(true);
      expect(handler.canHandle('Content-Type')).toBe(false);
      expect(handler.canHandle('Status')).toBe(false);
    });

    it('should pass for matching JSONPath value', () => {
      const result = handler.assert('$.id', '1', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail for non-matching JSONPath value', () => {
      const result = handler.assert('$.id', '999', sampleResponse);
      expect(result.passed).toBe(false);
    });

    it('should handle nested JSONPath', () => {
      const result = handler.assert('$.name', 'Test', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should handle array access', () => {
      const result = handler.assert('$.items[0]', '1', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should handle array length', () => {
      const result = handler.assert('$.items.length', '3', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail for non-existent path', () => {
      const result = handler.assert('$.nonexistent', 'value', sampleResponse);
      expect(result.passed).toBe(false);
    });

    it('should handle existence check', () => {
      const result = handler.assert('$.id', '*', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should handle string response data', () => {
      const stringResponse: HttpResponse = {
        ...sampleResponse,
        data: '{"id": 1, "name": "Test"}'
      };
      const result = handler.assert('$.id', '1', stringResponse);
      expect(result.passed).toBe(true);
    });
  });

  describe('ResponseTimeHandler', () => {
    let handler: IAssertionHandler;

    beforeEach(() => {
      handler = new ResponseTimeHandler();
    });

    it('should have correct type identifier', () => {
      expect(handler.type).toBe('responsetime');
    });

    it('should handle response time assertions', () => {
      expect(handler.canHandle('_ResponseTime')).toBe(true);
      expect(handler.canHandle('ResponseTime')).toBe(true);
      expect(handler.canHandle('Content-Type')).toBe(false);
    });

    it('should pass when response time is under limit', () => {
      const result = handler.assert('_ResponseTime', '<500', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail when response time exceeds limit', () => {
      const result = handler.assert('_ResponseTime', '<100', sampleResponse);
      expect(result.passed).toBe(false);
    });

    it('should handle greater than comparison', () => {
      const result = handler.assert('_ResponseTime', '>100', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should handle exact match', () => {
      const result = handler.assert('_ResponseTime', '150', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should handle less than or equal', () => {
      const result = handler.assert('_ResponseTime', '<=150', sampleResponse);
      expect(result.passed).toBe(true);
    });
  });

  describe('BodyExistsHandler', () => {
    let handler: IAssertionHandler;

    beforeEach(() => {
      handler = new BodyExistsHandler();
    });

    it('should have correct type identifier', () => {
      expect(handler.type).toBe('body');
    });

    it('should handle body existence assertions', () => {
      expect(handler.canHandle('Body')).toBe(true);
      expect(handler.canHandle('body')).toBe(true);
      expect(handler.canHandle('Content-Type')).toBe(false);
    });

    it('should pass when body exists', () => {
      const result = handler.assert('Body', '*', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail when body is empty', () => {
      const emptyResponse: HttpResponse = {
        ...sampleResponse,
        data: null
      };
      const result = handler.assert('Body', '*', emptyResponse);
      expect(result.passed).toBe(false);
    });

    it('should pass for specific body content match', () => {
      const textResponse: HttpResponse = {
        ...sampleResponse,
        data: 'Hello World'
      };
      const result = handler.assert('Body', 'Hello World', textResponse);
      expect(result.passed).toBe(true);
    });
  });
});

describe('AssertionResult', () => {
  it('should have required properties', () => {
    const result: AssertionResult = {
      passed: true,
      assertionKey: 'Status',
      expected: '200',
      actual: '200'
    };

    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('assertionKey');
    expect(result).toHaveProperty('expected');
    expect(result).toHaveProperty('actual');
  });

  it('should include message for failed assertions', () => {
    const result: AssertionResult = {
      passed: false,
      assertionKey: 'Status',
      expected: '200',
      actual: '404',
      message: 'Expected status 200 but got 404'
    };

    expect(result.message).toBeDefined();
  });
});

import { AssertionEngine } from '../../src/core/AssertionEngine';
import { VariableManager } from '../../src/core/VariableManager';
import { AssertionError } from '../../src/errors/AssertionError';
import { HttpResponse, HttpRequest, Assertion } from '../../src/types';

describe('AssertionEngine', () => {
  let assertionEngine: AssertionEngine;
  let variableManager: VariableManager;
  let mockResponse: HttpResponse;
  let mockRequest: HttpRequest;

  beforeEach(() => {
    variableManager = new VariableManager();
    assertionEngine = new AssertionEngine(variableManager, process.cwd());

    mockRequest = {
      name: 'Test Request',
      method: 'GET',
      url: 'http://localhost/api/test',
      headers: {},
      tests: [],
      variableUpdates: []
    };

    mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'x-request-id': '12345'
      },
      data: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          { id: 1, title: 'First Post' },
          { id: 2, title: 'Second Post' }
        ]
      },
      executionTime: 150
    };
  });

  describe('status assertions', () => {
    test('should pass for correct status code', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: 200
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should fail for incorrect status code', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: 404
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should pass for status function that returns true', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: (status: number) => status >= 200 && status < 300
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should fail for status function that returns false', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: (status: number) => status >= 400
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });
  });

  describe('header assertions', () => {
    test('should pass for existing header with correct value', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'content-type',
        value: 'application/json'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should fail for header with incorrect value', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'content-type',
        value: 'text/html'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should fail for non-existent header', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'non-existent',
        value: 'value'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should handle case-insensitive header names', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'Content-Type',
        value: 'application/json'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });
  });

  describe('body assertions', () => {
    test('should pass for correct JSON path value', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.name',
        value: 'John Doe'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should fail for incorrect JSON path value', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.name',
        value: 'Jane Doe'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should handle nested JSON path', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.posts[0].title',
        value: 'First Post'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should handle array length assertion', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.posts.length',
        value: 2
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should pass for body existence check', async () => {
      // Function-based body assertions are no longer supported, use JSONPath instead
      const assertion: Assertion = {
        type: 'body',
        key: '$.id',
        value: 1
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should fail for invalid JSON path', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.nonexistent',
        value: 'value'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should handle JSON string response', async () => {
      const jsonStringResponse = {
        ...mockResponse,
        data: '{"message": "Hello"}'
      };

      const assertion: Assertion = {
        type: 'body',
        key: '$.message',
        value: 'Hello'
      };

      await expect(assertionEngine.assert(assertion, jsonStringResponse, mockRequest)).resolves.not.toThrow();
    });
  });

  describe('custom assertions', () => {
    // Note: Custom assertions now require a file path to a custom validator function
    // Inline JavaScript code execution is no longer supported for security reasons

    test('should fail for non-existent custom validator file', async () => {
      const assertion: Assertion = {
        type: 'custom',
        value: './non-existent-validator.js'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow();
    });

    test('should fail for invalid validator path', async () => {
      const assertion: Assertion = {
        type: 'custom',
        value: ''
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow();
    });
  });

  describe('variable replacement in assertions', () => {
    beforeEach(() => {
      variableManager.setVariable('expectedStatus', '2xx');
      variableManager.setVariable('expectedName', 'John Doe');
      variableManager.setVariable('contentType', 'application/json');
    });

    test('should replace variables in assertion values', async () => {
      // Note: String status values are treated as ranges (2xx, 3xx, etc.)
      const assertion: Assertion = {
        type: 'status',
        value: '{{expectedStatus}}'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should replace variables in header assertions', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'content-type',
        value: '{{contentType}}'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should replace variables in body assertions', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.name',
        value: '{{expectedName}}'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    test('should throw AssertionError with descriptive message', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: 404
      };

      try {
        await assertionEngine.assert(assertion, mockResponse, mockRequest);
        fail('Expected AssertionError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AssertionError);
        expect((error as Error).message).toContain('Expected status 404, got 200');
      }
    });

    test('should handle non-JSON response for body assertions', async () => {
      const nonJsonResponse = {
        ...mockResponse,
        data: 'Not JSON'
      };

      const assertion: Assertion = {
        type: 'body',
        key: '$.name',
        value: 'value'
      };

      await expect(assertionEngine.assert(assertion, nonJsonResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should handle body assertion with existence check', async () => {
      // Body assertions now require a valid JSONPath key
      const assertion: Assertion = {
        type: 'body',
        key: '$',  // Root path for existence check
        value: null
      };

      // Root path check passes for any valid response data
      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle undefined assertion value', async () => {
      const assertion: Assertion = {
        type: 'status'
        // value is undefined
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should handle empty string values', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'x-request-id',
        value: ''
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest))
        .rejects.toThrow(AssertionError);
    });

    test('should handle status range assertion', async () => {
      // String status values are now treated as ranges (2xx, 3xx, 4xx, 5xx)
      const assertion: Assertion = {
        type: 'status',
        value: '2xx'
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });

    test('should handle numeric status assertion', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: 200
      };

      await expect(assertionEngine.assert(assertion, mockResponse, mockRequest)).resolves.not.toThrow();
    });
  });
});
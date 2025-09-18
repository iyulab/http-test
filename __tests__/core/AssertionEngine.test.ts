import { AssertionEngine } from '../../src/core/AssertionEngine';
import { VariableManager } from '../../src/core/VariableManager';
import { AssertionError } from '../../src/errors/AssertionError';
import { HttpResponse, Assertion } from '../../src/types';

describe('AssertionEngine', () => {
  let assertionEngine: AssertionEngine;
  let variableManager: VariableManager;
  let mockResponse: HttpResponse;

  beforeEach(() => {
    variableManager = new VariableManager();
    assertionEngine = new AssertionEngine(variableManager);

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

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should fail for incorrect status code', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: 404
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should pass for status function that returns true', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: (status: number) => status >= 200 && status < 300
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should fail for status function that returns false', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: (status: number) => status >= 400
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
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

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should fail for header with incorrect value', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'content-type',
        value: 'text/html'
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should fail for non-existent header', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'non-existent',
        value: 'value'
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should handle case-insensitive header names', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'Content-Type',
        value: 'application/json'
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });
  });

  describe('body assertions', () => {
    test('should pass for correct JSON path value', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.name',
        value: 'John Doe'
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should fail for incorrect JSON path value', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.name',
        value: 'Jane Doe'
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should handle nested JSON path', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.posts[0].title',
        value: 'First Post'
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should handle array length assertion', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.posts.length',
        value: 2
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should handle function-based body assertion', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.id',
        value: (value: any) => typeof value === 'number' && value > 0
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should fail for invalid JSON path', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.nonexistent',
        value: 'value'
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should handle string body response', async () => {
      const stringResponse = {
        ...mockResponse,
        data: 'Simple string response'
      };

      const assertion: Assertion = {
        type: 'body',
        value: 'Simple string response'
      };

      await expect(assertionEngine.assert(assertion, stringResponse)).resolves.not.toThrow();
    });
  });

  describe('custom assertions', () => {
    test('should execute custom JavaScript code', async () => {
      const assertion: Assertion = {
        type: 'custom',
        value: `
          if (response.data.name !== 'John Doe') {
            throw new Error('Name assertion failed');
          }
        `
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should fail for custom assertion that throws', async () => {
      const assertion: Assertion = {
        type: 'custom',
        value: `
          throw new Error('Custom assertion failed');
        `
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow('Custom assertion failed');
    });

    test('should have access to response and variables in custom assertion', async () => {
      variableManager.setVariable('expectedName', 'John Doe');

      const assertion: Assertion = {
        type: 'custom',
        value: `
          const expectedName = variables.expectedName;
          if (response.data.name !== expectedName) {
            throw new Error(\`Expected name \${expectedName}, got \${response.data.name}\`);
          }
        `
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should handle syntax errors in custom code', async () => {
      const assertion: Assertion = {
        type: 'custom',
        value: 'invalid javascript syntax {'
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow();
    });
  });

  describe('variable replacement in assertions', () => {
    beforeEach(() => {
      variableManager.setVariable('expectedStatus', '200');
      variableManager.setVariable('expectedName', 'John Doe');
      variableManager.setVariable('contentType', 'application/json');
    });

    test('should replace variables in assertion values', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: '{{expectedStatus}}'
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should replace variables in header assertions', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'content-type',
        value: '{{contentType}}'
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });

    test('should replace variables in body assertions', async () => {
      const assertion: Assertion = {
        type: 'body',
        key: '$.name',
        value: '{{expectedName}}'
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    test('should throw AssertionError with descriptive message', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: 404
      };

      try {
        await assertionEngine.assert(assertion, mockResponse);
        fail('Expected AssertionError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AssertionError);
        expect(error.message).toContain('Expected status 404, but got 200');
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

      await expect(assertionEngine.assert(assertion, nonJsonResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should handle null response data', async () => {
      const nullResponse = {
        ...mockResponse,
        data: null
      };

      const assertion: Assertion = {
        type: 'body',
        value: null
      };

      await expect(assertionEngine.assert(assertion, nullResponse)).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle undefined assertion value', async () => {
      const assertion: Assertion = {
        type: 'status'
        // value is undefined
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should handle empty string values', async () => {
      const assertion: Assertion = {
        type: 'header',
        key: 'x-request-id',
        value: ''
      };

      await expect(assertionEngine.assert(assertion, mockResponse))
        .rejects.toThrow(AssertionError);
    });

    test('should handle numeric strings in status assertion', async () => {
      const assertion: Assertion = {
        type: 'status',
        value: '200'
      };

      await expect(assertionEngine.assert(assertion, mockResponse)).resolves.not.toThrow();
    });
  });
});
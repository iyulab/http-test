import { HttpTestError } from '../../src/errors/HttpTestError';
import { RequestError } from '../../src/errors/RequestError';
import { AssertionError } from '../../src/errors/AssertionError';
import { ParserError } from '../../src/errors/ParserError';

describe('HttpTestError', () => {
  describe('RequestError', () => {
    test('should create RequestError with message', () => {
      const error = new RequestError('Request failed');

      expect(error).toBeInstanceOf(HttpTestError);
      expect(error).toBeInstanceOf(RequestError);
      expect(error.message).toBe('Request failed');
      expect(error.code).toBe('REQUEST_ERROR');
      expect(error.name).toBe('RequestError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    test('should create RequestError with status code', () => {
      const error = new RequestError('Not found', 404);

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('REQUEST_ERROR');
    });

    test('should create RequestError with context', () => {
      const context = { url: 'http://localhost:3000/users', method: 'GET' };
      const error = new RequestError('Request failed', 500, context);

      expect(error.context).toEqual(context);
      expect(error.statusCode).toBe(500);
    });

    test('should generate display message', () => {
      const error = new RequestError('Server error', 500, { url: 'http://localhost:3000' });
      const displayMessage = error.getDisplayMessage();

      expect(displayMessage).toContain('[500]');
      expect(displayMessage).toContain('[REQUEST_ERROR]');
      expect(displayMessage).toContain('Server error');
      expect(displayMessage).toContain('url: http://localhost:3000');
    });

    test('should serialize to JSON', () => {
      const error = new RequestError('Test error', 400, { test: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'RequestError',
        message: 'Test error',
        code: 'REQUEST_ERROR',
        statusCode: 400,
        context: { test: 'value' },
        timestamp: error.timestamp.toISOString(),
        stack: error.stack
      });
    });
  });

  describe('AssertionError', () => {
    test('should create AssertionError with message', () => {
      const error = new AssertionError('Assertion failed');

      expect(error).toBeInstanceOf(HttpTestError);
      expect(error).toBeInstanceOf(AssertionError);
      expect(error.message).toBe('Assertion failed');
      expect(error.code).toBe('ASSERTION_ERROR');
      expect(error.name).toBe('AssertionError');
    });

    test('should create AssertionError with context', () => {
      const context = {
        expected: 200,
        actual: 404,
        assertionType: 'status'
      };
      const error = new AssertionError('Status assertion failed', context);

      expect(error.context).toEqual(context);
    });

    test('should generate display message without status code', () => {
      const error = new AssertionError('Status mismatch', { expected: 200, actual: 404 });
      const displayMessage = error.getDisplayMessage();

      expect(displayMessage).toContain('[ASSERTION_ERROR]');
      expect(displayMessage).toContain('Status mismatch');
      expect(displayMessage).toContain('expected: 200, actual: 404');
      expect(displayMessage).not.toContain('[undefined]');
    });
  });

  describe('ParserError', () => {
    test('should create ParserError with message', () => {
      const error = new ParserError('Parse failed');

      expect(error).toBeInstanceOf(HttpTestError);
      expect(error).toBeInstanceOf(ParserError);
      expect(error.message).toBe('Parse failed');
      expect(error.code).toBe('PARSER_ERROR');
      expect(error.name).toBe('ParserError');
    });

    test('should create ParserError with parsing context', () => {
      const context = {
        line: 15,
        column: 10,
        fileName: 'test.http'
      };
      const error = new ParserError('Invalid syntax', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('HttpTestError base functionality', () => {
    class TestError extends HttpTestError {
      readonly code = 'TEST_ERROR';
    }

    test('should maintain proper stack trace', () => {
      const error = new TestError('Test message');

      expect(error.stack).toBeTruthy();
      expect(error.stack).toContain('TestError');
      expect(error.stack).toContain('Test message');
    });

    test('should handle empty context', () => {
      const error = new TestError('Test message', {});
      const displayMessage = error.getDisplayMessage();

      expect(displayMessage).toBe('[TEST_ERROR] Test message');
    });

    test('should handle undefined context', () => {
      const error = new TestError('Test message');
      const displayMessage = error.getDisplayMessage();

      expect(displayMessage).toBe('[TEST_ERROR] Test message');
    });

    test('should handle complex context objects', () => {
      const complexContext = {
        request: {
          method: 'POST',
          url: 'http://test.com',
          headers: { 'Content-Type': 'application/json' }
        },
        response: {
          status: 500,
          body: 'Internal Server Error'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          attempt: 3
        }
      };

      const error = new TestError('Complex error', complexContext);
      const json = error.toJSON();

      expect(json.context).toEqual(complexContext);
      expect(json.code).toBe('TEST_ERROR');
    });

    test('should handle circular references in context', () => {
      const circularContext: any = { name: 'test' };
      circularContext.self = circularContext;

      const error = new TestError('Circular ref error', circularContext);

      // Should not throw when serializing
      expect(() => error.toJSON()).not.toThrow();
    });

    test('should format timestamp correctly', () => {
      const error = new TestError('Time test');
      const json = error.toJSON();

      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(json.timestamp)).toBeInstanceOf(Date);
    });

    test('should handle very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(1000);
      const error = new TestError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.getDisplayMessage()).toContain(longMessage);
    });

    test('should handle special characters in messages', () => {
      const specialMessage = 'Error with émojis 🚀 and spëcial chars: @#$%^&*()';
      const error = new TestError(specialMessage);

      expect(error.message).toBe(specialMessage);
      expect(error.getDisplayMessage()).toContain(specialMessage);
    });

    test('should handle null and undefined values in context', () => {
      const nullContext = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        false: false
      };

      const error = new TestError('Null context test', nullContext);
      const json = error.toJSON();

      expect(json.context).toEqual({
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        false: false
      });
    });
  });

  describe('error inheritance', () => {
    test('should properly inherit from Error', () => {
      const error = new RequestError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpTestError).toBe(true);
      expect(error instanceof RequestError).toBe(true);
    });

    test('should work with instanceof checks', () => {
      const requestError = new RequestError('Request failed');
      const assertionError = new AssertionError('Assertion failed');
      const parserError = new ParserError('Parse failed');

      expect(requestError instanceof HttpTestError).toBe(true);
      expect(assertionError instanceof HttpTestError).toBe(true);
      expect(parserError instanceof HttpTestError).toBe(true);

      expect(requestError instanceof AssertionError).toBe(false);
      expect(assertionError instanceof RequestError).toBe(false);
      expect(parserError instanceof AssertionError).toBe(false);
    });

    test('should work with try-catch blocks', () => {
      const errors = [
        new RequestError('Request error'),
        new AssertionError('Assertion error'),
        new ParserError('Parser error')
      ];

      errors.forEach(error => {
        try {
          throw error;
        } catch (caught) {
          expect(caught instanceof HttpTestError).toBe(true);
          expect(caught.code).toBeTruthy();
          expect(caught.message).toBeTruthy();
        }
      });
    });
  });
});
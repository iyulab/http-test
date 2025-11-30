/**
 * AssertionRegistry Tests
 *
 * Tests for the assertion handler registry that manages
 * handler registration and lookup.
 */
import { HttpResponse } from '../../src/types';
import {
  IAssertionHandler,
  AssertionResult,
  AssertionRegistry,
  StatusCodeHandler,
  HeaderHandler,
  JsonPathHandler
} from '../../src/assertions';

describe('AssertionRegistry', () => {
  let registry: AssertionRegistry;

  // Sample response for testing
  const sampleResponse: HttpResponse = {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json'
    },
    data: { id: 1, name: 'Test' },
    time: 100
  };

  beforeEach(() => {
    registry = new AssertionRegistry();
  });

  describe('Handler Registration', () => {
    it('should register a handler', () => {
      const handler = new StatusCodeHandler();
      registry.register(handler);

      expect(registry.hasHandler('status')).toBe(true);
    });

    it('should register multiple handlers', () => {
      registry.register(new StatusCodeHandler());
      registry.register(new HeaderHandler());
      registry.register(new JsonPathHandler());

      expect(registry.getHandlerCount()).toBe(3);
    });

    it('should prevent duplicate handler types', () => {
      registry.register(new StatusCodeHandler());

      expect(() => {
        registry.register(new StatusCodeHandler());
      }).toThrow();
    });

    it('should allow replacing handlers with force flag', () => {
      const handler1 = new StatusCodeHandler();
      const handler2 = new StatusCodeHandler();

      registry.register(handler1);
      registry.register(handler2, { force: true });

      expect(registry.getHandlerCount()).toBe(1);
    });
  });

  describe('Handler Lookup', () => {
    beforeEach(() => {
      registry.register(new StatusCodeHandler());
      registry.register(new HeaderHandler());
      registry.register(new JsonPathHandler());
    });

    it('should find handler for Status assertion', () => {
      const handler = registry.findHandler('Status');
      expect(handler).not.toBeNull();
      expect(handler?.type).toBe('status');
    });

    it('should find handler for header assertion', () => {
      const handler = registry.findHandler('Content-Type');
      expect(handler).not.toBeNull();
      expect(handler?.type).toBe('header');
    });

    it('should find handler for JSONPath assertion', () => {
      const handler = registry.findHandler('$.data.id');
      expect(handler).not.toBeNull();
      expect(handler?.type).toBe('jsonpath');
    });

    it('should return null for unknown assertion key', () => {
      const handler = registry.findHandler('UnknownAssertion');
      expect(handler).toBeNull();
    });

    it('should prioritize handlers by registration order', () => {
      // First registered handler that can handle wins
      const handler = registry.findHandler('$.data.id');
      expect(handler?.type).toBe('jsonpath');
    });
  });

  describe('Assertion Execution', () => {
    beforeEach(() => {
      registry.register(new StatusCodeHandler());
      registry.register(new HeaderHandler());
      registry.register(new JsonPathHandler());
    });

    it('should assert using appropriate handler', () => {
      const result = registry.assert('Status', '200', sampleResponse);
      expect(result.passed).toBe(true);
    });

    it('should fail assertion for non-matching value', () => {
      const result = registry.assert('Status', '404', sampleResponse);
      expect(result.passed).toBe(false);
    });

    it('should throw for unknown assertion type', () => {
      expect(() => {
        registry.assert('UnknownType', 'value', sampleResponse);
      }).toThrow();
    });

    it('should assert multiple assertions', () => {
      const assertions = [
        { key: 'Status', value: '200' },
        { key: 'Content-Type', value: 'application/json' },
        { key: '$.id', value: '1' }
      ];

      const results = registry.assertAll(assertions, sampleResponse);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.passed)).toBe(true);
    });

    it('should continue asserting after failure', () => {
      const assertions = [
        { key: 'Status', value: '404' },  // will fail
        { key: 'Content-Type', value: 'application/json' }  // will pass
      ];

      const results = registry.assertAll(assertions, sampleResponse);

      expect(results).toHaveLength(2);
      expect(results[0].passed).toBe(false);
      expect(results[1].passed).toBe(true);
    });
  });

  describe('Default Registry', () => {
    it('should create registry with default handlers', () => {
      const defaultRegistry = AssertionRegistry.createDefault();

      expect(defaultRegistry.findHandler('Status')).not.toBeNull();
      expect(defaultRegistry.findHandler('Content-Type')).not.toBeNull();
      expect(defaultRegistry.findHandler('$.data.id')).not.toBeNull();
      expect(defaultRegistry.findHandler('_ResponseTime')).not.toBeNull();
      expect(defaultRegistry.findHandler('Body')).not.toBeNull();
    });
  });

  describe('Handler Priority', () => {
    it('should check handlers in order', () => {
      // Custom handler that handles everything
      const catchAllHandler: IAssertionHandler = {
        type: 'catchall',
        canHandle: () => true,
        assert: (key, value, response) => ({
          passed: true,
          assertionKey: key,
          expected: value,
          actual: 'catchall'
        })
      };

      const customRegistry = new AssertionRegistry();
      customRegistry.register(new StatusCodeHandler());
      customRegistry.register(catchAllHandler);

      // Status handler should be found first
      const statusHandler = customRegistry.findHandler('Status');
      expect(statusHandler?.type).toBe('status');

      // Unknown key should be caught by catchall
      const unknownHandler = customRegistry.findHandler('SomeRandomKey');
      expect(unknownHandler?.type).toBe('catchall');
    });
  });

  describe('Error Handling', () => {
    it('should handle assertion errors gracefully', () => {
      const errorHandler: IAssertionHandler = {
        type: 'error',
        canHandle: (key) => key === 'ErrorTest',
        assert: () => {
          throw new Error('Assertion error');
        }
      };

      registry.register(errorHandler);

      const result = registry.assert('ErrorTest', 'value', sampleResponse);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Assertion error');
    });
  });
});

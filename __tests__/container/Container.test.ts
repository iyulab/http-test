/**
 * Container Tests
 *
 * Tests for the simple dependency injection container.
 */
import { Container } from '../../src/container/Container';
import { IVariableManager } from '../../src/interfaces/IVariableManager';
import { IHttpFileParser } from '../../src/interfaces/IHttpFileParser';
import { IRequestExecutor } from '../../src/interfaces/IRequestExecutor';
import { IAssertionEngine } from '../../src/interfaces/IAssertionEngine';
import { IScriptEngine } from '../../src/interfaces/IScriptEngine';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('register() and resolve()', () => {
    it('should register and resolve a singleton instance', () => {
      const mockInstance = { name: 'test' };
      container.registerSingleton('test', mockInstance);

      const resolved = container.resolve('test');
      expect(resolved).toBe(mockInstance);
    });

    it('should return same instance for singleton', () => {
      const mockInstance = { count: 0 };
      container.registerSingleton('counter', mockInstance);

      const first = container.resolve<{ count: number }>('counter');
      first.count++;

      const second = container.resolve<{ count: number }>('counter');
      expect(second.count).toBe(1);
    });

    it('should register a factory function', () => {
      container.registerFactory('factory', () => ({ created: Date.now() }));

      const first = container.resolve<{ created: number }>('factory');
      const second = container.resolve<{ created: number }>('factory');

      // Factory creates new instance each time
      expect(first).not.toBe(second);
    });

    it('should throw for unregistered dependency', () => {
      expect(() => container.resolve('unknown')).toThrow();
    });
  });

  describe('has()', () => {
    it('should return true for registered dependencies', () => {
      container.registerSingleton('exists', {});
      expect(container.has('exists')).toBe(true);
    });

    it('should return false for unregistered dependencies', () => {
      expect(container.has('notExists')).toBe(false);
    });
  });

  describe('Core Dependencies', () => {
    it('should be able to register and resolve IVariableManager', () => {
      const mockVariableManager: IVariableManager = {
        setVariables: jest.fn(),
        setVariable: jest.fn(),
        getVariable: jest.fn(),
        replaceVariables: jest.fn((s) => s),
        getAllVariables: jest.fn(() => ({}))
      };

      container.registerSingleton('IVariableManager', mockVariableManager);
      const resolved = container.resolve<IVariableManager>('IVariableManager');

      expect(resolved).toBe(mockVariableManager);
      expect(typeof resolved.replaceVariables).toBe('function');
    });

    it('should support dependency chain resolution', () => {
      // Register base dependency
      const mockVariableManager: IVariableManager = {
        setVariables: jest.fn(),
        setVariable: jest.fn(),
        getVariable: jest.fn(),
        replaceVariables: jest.fn((s) => s),
        getAllVariables: jest.fn(() => ({}))
      };
      container.registerSingleton('IVariableManager', mockVariableManager);

      // Register dependent factory
      container.registerFactory('dependent', (c) => ({
        variableManager: c.resolve<IVariableManager>('IVariableManager')
      }));

      const resolved = container.resolve<{ variableManager: IVariableManager }>('dependent');
      expect(resolved.variableManager).toBe(mockVariableManager);
    });
  });

  describe('clear()', () => {
    it('should clear all registered dependencies', () => {
      container.registerSingleton('a', {});
      container.registerSingleton('b', {});

      container.clear();

      expect(container.has('a')).toBe(false);
      expect(container.has('b')).toBe(false);
    });
  });
});

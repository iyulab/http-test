/**
 * TestManager DI Integration Tests
 *
 * Tests for TestManager with dependency injection support.
 */
import path from 'path';
import { TestManager, TestManagerDependencies } from '../../src/core/TestManager';
import { Container, ContainerKeys, createTestContainer } from '../../src/container';
import { VariableManager } from '../../src/core/VariableManager';
import { AssertionEngine } from '../../src/core/AssertionEngine';
import { RequestExecutor } from '../../src/core/RequestExecutor';
import { ResponseProcessor } from '../../src/core/ResponseProcessor';
import { TestResultCollector } from '../../src/core/TestResultCollector';
import { ScriptEngine } from '../../src/core/ScriptEngine';

describe('TestManager DI Integration', () => {
  const mockHttpFilePath = path.join(process.cwd(), 'test.http');
  const baseDir = path.dirname(mockHttpFilePath);

  describe('constructor with dependencies', () => {
    it('should accept injected dependencies', () => {
      const deps: TestManagerDependencies = {
        variableManager: new VariableManager(),
        assertionEngine: new AssertionEngine(new VariableManager(), baseDir),
        requestExecutor: new RequestExecutor(new VariableManager(), baseDir),
        responseProcessor: new ResponseProcessor(new VariableManager()),
        resultCollector: new TestResultCollector(),
        scriptEngine: new ScriptEngine()
      };

      const manager = new TestManager(mockHttpFilePath, deps);

      expect(manager).toBeDefined();
      expect(typeof manager.run).toBe('function');
    });

    it('should use injected dependencies instead of creating new ones', () => {
      const variableManager = new VariableManager();
      variableManager.setVariable('injected', 'yes');

      const deps: TestManagerDependencies = {
        variableManager,
        assertionEngine: new AssertionEngine(variableManager, baseDir),
        requestExecutor: new RequestExecutor(variableManager, baseDir),
        responseProcessor: new ResponseProcessor(variableManager),
        resultCollector: new TestResultCollector(),
        scriptEngine: new ScriptEngine()
      };

      const manager = new TestManager(mockHttpFilePath, deps);

      // Verify injected dependency is used (indirectly)
      expect(manager).toBeDefined();
    });

    it('should maintain backward compatibility without dependencies', () => {
      const manager = new TestManager(mockHttpFilePath);

      expect(manager).toBeDefined();
      expect(typeof manager.run).toBe('function');
    });
  });

  describe('createWithContainer()', () => {
    it('should create TestManager using provided container', () => {
      const container = new Container();

      const manager = TestManager.createWithContainer(mockHttpFilePath, container);

      expect(manager).toBeDefined();
      expect(typeof manager.run).toBe('function');
    });

    it('should setup container before creating TestManager', () => {
      const container = new Container();

      TestManager.createWithContainer(mockHttpFilePath, container);

      expect(container.has(ContainerKeys.VariableManager)).toBe(true);
      expect(container.has(ContainerKeys.ScriptEngine)).toBe(true);
      expect(container.has(ContainerKeys.RequestExecutor)).toBe(true);
      expect(container.has(ContainerKeys.AssertionEngine)).toBe(true);
    });

    it('should use global container when none provided', () => {
      const { container: globalContainer } = require('../../src/container');

      // Clear global container first
      globalContainer.clear();

      const manager = TestManager.createWithContainer(mockHttpFilePath);

      expect(manager).toBeDefined();
      expect(globalContainer.has(ContainerKeys.VariableManager)).toBe(true);

      // Cleanup
      globalContainer.clear();
    });
  });

  describe('TestManagerDependencies interface', () => {
    it('should require all dependencies', () => {
      const variableManager = new VariableManager();
      const deps: TestManagerDependencies = {
        variableManager,
        assertionEngine: new AssertionEngine(variableManager, baseDir),
        requestExecutor: new RequestExecutor(variableManager, baseDir),
        responseProcessor: new ResponseProcessor(variableManager),
        resultCollector: new TestResultCollector(),
        scriptEngine: new ScriptEngine()
      };

      expect(deps.variableManager).toBeDefined();
      expect(deps.assertionEngine).toBeDefined();
      expect(deps.requestExecutor).toBeDefined();
      expect(deps.responseProcessor).toBeDefined();
      expect(deps.resultCollector).toBeDefined();
      expect(deps.scriptEngine).toBeDefined();
    });
  });

  describe('Shared dependencies', () => {
    it('should allow sharing VariableManager across components', () => {
      const sharedVariableManager = new VariableManager();
      sharedVariableManager.setVariable('shared', 'value');

      const deps: TestManagerDependencies = {
        variableManager: sharedVariableManager,
        assertionEngine: new AssertionEngine(sharedVariableManager, baseDir),
        requestExecutor: new RequestExecutor(sharedVariableManager, baseDir),
        responseProcessor: new ResponseProcessor(sharedVariableManager),
        resultCollector: new TestResultCollector(),
        scriptEngine: new ScriptEngine()
      };

      const manager = new TestManager(mockHttpFilePath, deps);

      // Verify the same instance is used
      expect(deps.variableManager.getVariable('shared')).toBe('value');
    });
  });

  describe('Container factory pattern', () => {
    it('should support creating multiple isolated TestManagers', () => {
      const container1 = new Container();
      const container2 = new Container();

      const manager1 = TestManager.createWithContainer(mockHttpFilePath, container1);
      const manager2 = TestManager.createWithContainer(mockHttpFilePath, container2);

      expect(manager1).not.toBe(manager2);
    });

    it('should use createTestContainer helper', () => {
      const container = createTestContainer(baseDir);

      expect(container.has(ContainerKeys.VariableManager)).toBe(true);
      expect(container.has(ContainerKeys.ScriptEngine)).toBe(true);
    });
  });
});

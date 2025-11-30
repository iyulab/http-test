/**
 * Container Setup Tests
 *
 * Tests for the container setup utilities.
 */
import {
  Container,
  ContainerKeys,
  setupContainer,
  createTestContainer,
  resolveTestManagerDependencies,
  InternalKeys
} from '../../src/container';
import { IVariableManager } from '../../src/interfaces/IVariableManager';
import { IRequestExecutor } from '../../src/interfaces/IRequestExecutor';
import { IAssertionEngine } from '../../src/interfaces/IAssertionEngine';
import { IScriptEngine } from '../../src/interfaces/IScriptEngine';

describe('Container Setup', () => {
  let testContainer: Container;

  beforeEach(() => {
    testContainer = new Container();
  });

  afterEach(() => {
    testContainer.clear();
  });

  describe('setupContainer()', () => {
    it('should register all core dependencies as singletons', () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      expect(testContainer.has(ContainerKeys.VariableManager)).toBe(true);
      expect(testContainer.has(ContainerKeys.ScriptEngine)).toBe(true);
      expect(testContainer.has(ContainerKeys.RequestExecutor)).toBe(true);
      expect(testContainer.has(ContainerKeys.AssertionEngine)).toBe(true);
      expect(testContainer.has(ContainerKeys.EnvironmentManager)).toBe(true);
      expect(testContainer.has(ContainerKeys.CookieJar)).toBe(true);
    });

    it('should register internal dependencies', () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      expect(testContainer.has(InternalKeys.ResponseProcessor)).toBe(true);
      expect(testContainer.has(InternalKeys.TestResultCollector)).toBe(true);
    });

    it('should return singletons when useSingletons is true', () => {
      setupContainer({ baseDir: process.cwd(), useSingletons: true }, testContainer);

      const first = testContainer.resolve<IVariableManager>(ContainerKeys.VariableManager);
      const second = testContainer.resolve<IVariableManager>(ContainerKeys.VariableManager);

      expect(first).toBe(second);
    });

    it('should return new instances when useSingletons is false', () => {
      setupContainer({ baseDir: process.cwd(), useSingletons: false }, testContainer);

      const first = testContainer.resolve<IVariableManager>(ContainerKeys.VariableManager);
      const second = testContainer.resolve<IVariableManager>(ContainerKeys.VariableManager);

      expect(first).not.toBe(second);
    });

    it('should clear existing registrations before setup', () => {
      // Register something first
      testContainer.registerSingleton('CustomKey', { custom: 'value' });

      // Setup container
      setupContainer({ baseDir: process.cwd() }, testContainer);

      // Custom key should be cleared
      expect(testContainer.has('CustomKey')).toBe(false);
    });
  });

  describe('createTestContainer()', () => {
    it('should create a new pre-configured container', () => {
      const container = createTestContainer(process.cwd());

      expect(container.has(ContainerKeys.VariableManager)).toBe(true);
      expect(container.has(ContainerKeys.ScriptEngine)).toBe(true);
      expect(container.has(ContainerKeys.RequestExecutor)).toBe(true);
      expect(container.has(ContainerKeys.AssertionEngine)).toBe(true);
    });

    it('should use singletons by default', () => {
      const container = createTestContainer(process.cwd());

      const first = container.resolve<IVariableManager>(ContainerKeys.VariableManager);
      const second = container.resolve<IVariableManager>(ContainerKeys.VariableManager);

      expect(first).toBe(second);
    });

    it('should not affect global container', () => {
      const localContainer = createTestContainer(process.cwd());
      const { container: globalContainer } = require('../../src/container');

      // Clear global to ensure isolation
      globalContainer.clear();

      // Local container should still have dependencies
      expect(localContainer.has(ContainerKeys.VariableManager)).toBe(true);
      expect(globalContainer.has(ContainerKeys.VariableManager)).toBe(false);
    });
  });

  describe('resolveTestManagerDependencies()', () => {
    it('should resolve all dependencies needed for TestManager', () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      const deps = resolveTestManagerDependencies(testContainer);

      expect(deps.variableManager).toBeDefined();
      expect(deps.scriptEngine).toBeDefined();
      expect(deps.requestExecutor).toBeDefined();
      expect(deps.assertionEngine).toBeDefined();
      expect(deps.responseProcessor).toBeDefined();
      expect(deps.resultCollector).toBeDefined();
    });

    it('should return components with correct interfaces', () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      const deps = resolveTestManagerDependencies(testContainer);

      // Verify interface compliance
      expect(typeof deps.variableManager.replaceVariables).toBe('function');
      expect(typeof deps.scriptEngine.execute).toBe('function');
      expect(typeof deps.requestExecutor.execute).toBe('function');
      expect(typeof deps.assertionEngine.assert).toBe('function');
    });
  });

  describe('Dependency resolution', () => {
    it('should resolve IVariableManager with correct implementation', () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      const variableManager = testContainer.resolve<IVariableManager>(ContainerKeys.VariableManager);

      variableManager.setVariable('test', 'value');
      expect(variableManager.getVariable('test')).toBe('value');
      expect(variableManager.replaceVariables('{{test}}')).toBe('value');
    });

    it('should resolve IScriptEngine with correct implementation', async () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      const scriptEngine = testContainer.resolve<IScriptEngine>(ContainerKeys.ScriptEngine);

      const result = await scriptEngine.execute('client.log("test")');
      expect(result.success).toBe(true);
    });

    it('should resolve IRequestExecutor with correct implementation', () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      const requestExecutor = testContainer.resolve<IRequestExecutor>(ContainerKeys.RequestExecutor);

      expect(typeof requestExecutor.execute).toBe('function');
    });

    it('should resolve IAssertionEngine with correct implementation', () => {
      setupContainer({ baseDir: process.cwd() }, testContainer);

      const assertionEngine = testContainer.resolve<IAssertionEngine>(ContainerKeys.AssertionEngine);

      expect(typeof assertionEngine.assert).toBe('function');
    });
  });
});

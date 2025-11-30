/**
 * Container Integration Tests
 *
 * Tests for DI container integration with core components.
 * Validates that TestManager can be properly constructed using DI.
 */
import { Container, ContainerKeys, container } from '../../src/container/Container';
import { IVariableManager } from '../../src/interfaces/IVariableManager';
import { IRequestExecutor } from '../../src/interfaces/IRequestExecutor';
import { IAssertionEngine } from '../../src/interfaces/IAssertionEngine';
import { IScriptEngine } from '../../src/interfaces/IScriptEngine';
import { VariableManager } from '../../src/core/VariableManager';
import { RequestExecutor } from '../../src/core/RequestExecutor';
import { AssertionEngine } from '../../src/core/AssertionEngine';
import { ScriptEngine } from '../../src/core/ScriptEngine';

describe('Container Integration', () => {
  let testContainer: Container;

  beforeEach(() => {
    testContainer = new Container();
  });

  afterEach(() => {
    testContainer.clear();
  });

  describe('Core dependency registration', () => {
    it('should register and resolve VariableManager as IVariableManager', () => {
      const variableManager = new VariableManager();
      testContainer.registerSingleton(ContainerKeys.VariableManager, variableManager);

      const resolved = testContainer.resolve<IVariableManager>(ContainerKeys.VariableManager);

      expect(resolved).toBe(variableManager);
      expect(typeof resolved.replaceVariables).toBe('function');
      expect(typeof resolved.setVariable).toBe('function');
      expect(typeof resolved.getVariable).toBe('function');
    });

    it('should register and resolve ScriptEngine as IScriptEngine', () => {
      const scriptEngine = new ScriptEngine();
      testContainer.registerSingleton(ContainerKeys.ScriptEngine, scriptEngine);

      const resolved = testContainer.resolve<IScriptEngine>(ContainerKeys.ScriptEngine);

      expect(resolved).toBe(scriptEngine);
      expect(typeof resolved.execute).toBe('function');
      expect(typeof resolved.executeFile).toBe('function');
    });

    it('should register and resolve AssertionEngine as IAssertionEngine', () => {
      const variableManager = new VariableManager();
      const assertionEngine = new AssertionEngine(variableManager, process.cwd());
      testContainer.registerSingleton(ContainerKeys.AssertionEngine, assertionEngine);

      const resolved = testContainer.resolve<IAssertionEngine>(ContainerKeys.AssertionEngine);

      expect(resolved).toBe(assertionEngine);
      expect(typeof resolved.assert).toBe('function');
    });

    it('should register and resolve RequestExecutor as IRequestExecutor', () => {
      const variableManager = new VariableManager();
      const requestExecutor = new RequestExecutor(variableManager, process.cwd());
      testContainer.registerSingleton(ContainerKeys.RequestExecutor, requestExecutor);

      const resolved = testContainer.resolve<IRequestExecutor>(ContainerKeys.RequestExecutor);

      expect(resolved).toBe(requestExecutor);
      expect(typeof resolved.execute).toBe('function');
    });
  });

  describe('Factory registration with dependency chain', () => {
    it('should create RequestExecutor using factory with resolved VariableManager', () => {
      const variableManager = new VariableManager();
      testContainer.registerSingleton(ContainerKeys.VariableManager, variableManager);

      testContainer.registerFactory(ContainerKeys.RequestExecutor, (c) => {
        const vm = c.resolve<IVariableManager>(ContainerKeys.VariableManager);
        return new RequestExecutor(vm as VariableManager, process.cwd());
      });

      const requestExecutor = testContainer.resolve<IRequestExecutor>(ContainerKeys.RequestExecutor);

      expect(requestExecutor).toBeDefined();
      expect(typeof requestExecutor.execute).toBe('function');
    });

    it('should create AssertionEngine using factory with resolved VariableManager', () => {
      const variableManager = new VariableManager();
      testContainer.registerSingleton(ContainerKeys.VariableManager, variableManager);

      testContainer.registerFactory(ContainerKeys.AssertionEngine, (c) => {
        const vm = c.resolve<IVariableManager>(ContainerKeys.VariableManager);
        return new AssertionEngine(vm as VariableManager, process.cwd());
      });

      const assertionEngine = testContainer.resolve<IAssertionEngine>(ContainerKeys.AssertionEngine);

      expect(assertionEngine).toBeDefined();
      expect(typeof assertionEngine.assert).toBe('function');
    });
  });

  describe('Full dependency graph setup', () => {
    it('should setup complete dependency graph for TestManager', () => {
      const baseDir = process.cwd();

      // Register base dependencies
      testContainer.registerSingleton(ContainerKeys.VariableManager, new VariableManager());
      testContainer.registerSingleton(ContainerKeys.ScriptEngine, new ScriptEngine());

      // Register dependent components via factories
      testContainer.registerFactory(ContainerKeys.RequestExecutor, (c) => {
        const vm = c.resolve<IVariableManager>(ContainerKeys.VariableManager);
        return new RequestExecutor(vm as VariableManager, baseDir);
      });

      testContainer.registerFactory(ContainerKeys.AssertionEngine, (c) => {
        const vm = c.resolve<IVariableManager>(ContainerKeys.VariableManager);
        return new AssertionEngine(vm as VariableManager, baseDir);
      });

      // Verify all dependencies can be resolved
      expect(testContainer.has(ContainerKeys.VariableManager)).toBe(true);
      expect(testContainer.has(ContainerKeys.ScriptEngine)).toBe(true);
      expect(testContainer.has(ContainerKeys.RequestExecutor)).toBe(true);
      expect(testContainer.has(ContainerKeys.AssertionEngine)).toBe(true);

      // Verify resolution works
      const variableManager = testContainer.resolve<IVariableManager>(ContainerKeys.VariableManager);
      const scriptEngine = testContainer.resolve<IScriptEngine>(ContainerKeys.ScriptEngine);
      const requestExecutor = testContainer.resolve<IRequestExecutor>(ContainerKeys.RequestExecutor);
      const assertionEngine = testContainer.resolve<IAssertionEngine>(ContainerKeys.AssertionEngine);

      expect(variableManager).toBeDefined();
      expect(scriptEngine).toBeDefined();
      expect(requestExecutor).toBeDefined();
      expect(assertionEngine).toBeDefined();
    });
  });

  describe('Global container singleton', () => {
    afterEach(() => {
      container.clear();
    });

    it('should use the global container instance', () => {
      const variableManager = new VariableManager();
      container.registerSingleton(ContainerKeys.VariableManager, variableManager);

      const resolved = container.resolve<IVariableManager>(ContainerKeys.VariableManager);
      expect(resolved).toBe(variableManager);
    });

    it('should maintain singleton across multiple resolves from global container', () => {
      const variableManager = new VariableManager();
      variableManager.setVariable('test', 'value');
      container.registerSingleton(ContainerKeys.VariableManager, variableManager);

      const first = container.resolve<IVariableManager>(ContainerKeys.VariableManager);
      const second = container.resolve<IVariableManager>(ContainerKeys.VariableManager);

      expect(first).toBe(second);
      expect(first.getVariable('test')).toBe('value');
    });
  });
});

/**
 * Container Setup Module
 *
 * Provides factory functions to configure the DI container
 * for different use cases (testing, production).
 */
import { Container, container, ContainerKeys } from './Container';
import { VariableManager } from '../core/VariableManager';
import { ScriptEngine } from '../core/ScriptEngine';
import { RequestExecutor } from '../core/RequestExecutor';
import { AssertionEngine } from '../core/AssertionEngine';
import { ResponseProcessor } from '../core/ResponseProcessor';
import { TestResultCollector } from '../core/TestResultCollector';
import { EnvironmentManager } from '../core/EnvironmentManager';
import { CookieJar } from '../core/CookieJar';
import { IVariableManager } from '../interfaces/IVariableManager';

/**
 * Options for container setup
 */
export interface ContainerSetupOptions {
  /** Base directory for file resolution */
  baseDir: string;
  /** Whether to use singletons (default: true) */
  useSingletons?: boolean;
}

/**
 * Extended container keys for internal components
 */
export const InternalKeys = {
  ResponseProcessor: 'ResponseProcessor',
  TestResultCollector: 'TestResultCollector'
} as const;

/**
 * Setup the container with all core dependencies
 * @param options Configuration options
 * @param targetContainer Container to setup (defaults to global container)
 */
export function setupContainer(
  options: ContainerSetupOptions,
  targetContainer: Container = container
): void {
  const { baseDir, useSingletons = true } = options;

  // Clear existing registrations
  targetContainer.clear();

  if (useSingletons) {
    // Register singleton instances
    const variableManager = new VariableManager();
    const scriptEngine = new ScriptEngine();
    const environmentManager = new EnvironmentManager(baseDir);
    const cookieJar = new CookieJar();

    targetContainer.registerSingleton(ContainerKeys.VariableManager, variableManager);
    targetContainer.registerSingleton(ContainerKeys.ScriptEngine, scriptEngine);
    targetContainer.registerSingleton(ContainerKeys.EnvironmentManager, environmentManager);
    targetContainer.registerSingleton(ContainerKeys.CookieJar, cookieJar);

    // Register dependent components
    targetContainer.registerSingleton(
      ContainerKeys.RequestExecutor,
      new RequestExecutor(variableManager, baseDir)
    );
    targetContainer.registerSingleton(
      ContainerKeys.AssertionEngine,
      new AssertionEngine(variableManager, baseDir)
    );
    targetContainer.registerSingleton(
      InternalKeys.ResponseProcessor,
      new ResponseProcessor(variableManager)
    );
    targetContainer.registerSingleton(
      InternalKeys.TestResultCollector,
      new TestResultCollector()
    );
  } else {
    // Register factories for transient instances
    targetContainer.registerFactory(ContainerKeys.VariableManager, () => new VariableManager());
    targetContainer.registerFactory(ContainerKeys.ScriptEngine, () => new ScriptEngine());
    targetContainer.registerFactory(
      ContainerKeys.EnvironmentManager,
      () => new EnvironmentManager(baseDir)
    );
    targetContainer.registerFactory(ContainerKeys.CookieJar, () => new CookieJar());

    targetContainer.registerFactory(ContainerKeys.RequestExecutor, (c) => {
      const vm = c.resolve<IVariableManager>(ContainerKeys.VariableManager);
      return new RequestExecutor(vm as VariableManager, baseDir);
    });

    targetContainer.registerFactory(ContainerKeys.AssertionEngine, (c) => {
      const vm = c.resolve<IVariableManager>(ContainerKeys.VariableManager);
      return new AssertionEngine(vm as VariableManager, baseDir);
    });

    targetContainer.registerFactory(InternalKeys.ResponseProcessor, (c) => {
      const vm = c.resolve<IVariableManager>(ContainerKeys.VariableManager);
      return new ResponseProcessor(vm as VariableManager);
    });

    targetContainer.registerFactory(
      InternalKeys.TestResultCollector,
      () => new TestResultCollector()
    );
  }
}

/**
 * Create a pre-configured container for testing
 * @param baseDir Base directory for file resolution
 * @returns Configured container instance
 */
export function createTestContainer(baseDir: string): Container {
  const testContainer = new Container();
  setupContainer({ baseDir, useSingletons: true }, testContainer);
  return testContainer;
}

/**
 * Resolve dependencies from container for TestManager construction
 * @param targetContainer Container to resolve from
 */
export function resolveTestManagerDependencies(targetContainer: Container = container) {
  return {
    variableManager: targetContainer.resolve<VariableManager>(ContainerKeys.VariableManager),
    scriptEngine: targetContainer.resolve<ScriptEngine>(ContainerKeys.ScriptEngine),
    requestExecutor: targetContainer.resolve<RequestExecutor>(ContainerKeys.RequestExecutor),
    assertionEngine: targetContainer.resolve<AssertionEngine>(ContainerKeys.AssertionEngine),
    responseProcessor: targetContainer.resolve<ResponseProcessor>(InternalKeys.ResponseProcessor),
    resultCollector: targetContainer.resolve<TestResultCollector>(InternalKeys.TestResultCollector)
  };
}

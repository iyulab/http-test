import {
  HttpRequest,
  TestResult,
  RunOptions,
  HttpResponse,
  TestItem,
  Assertion,
  LogLevel,
  ParsedScript,
} from "../types";
import { AssertionEngine } from "./AssertionEngine";
import { VariableManager } from "./VariableManager";
import { RequestExecutor } from "./RequestExecutor";
import { ResponseProcessor } from "./ResponseProcessor";
import { TestResultCollector } from "./TestResultCollector";
import { ScriptEngine } from "./ScriptEngine";
import {
  logRequestStart,
  logTestResult,
  logTestSummary,
  log,
  setVerbose,
  logError,
  logVerbose,
} from "../utils/logger";
import path from "path";
import { promises as fs } from "fs";
import {
  Container,
  setupContainer,
  resolveTestManagerDependencies,
} from "../container";

/**
 * Dependencies required by TestManager
 */
export interface TestManagerDependencies {
  variableManager: VariableManager;
  assertionEngine: AssertionEngine;
  requestExecutor: RequestExecutor;
  responseProcessor: ResponseProcessor;
  resultCollector: TestResultCollector;
  scriptEngine: ScriptEngine;
}

export class TestManager {
  private requestExecutor: RequestExecutor;
  private responseProcessor: ResponseProcessor;
  private resultCollector: TestResultCollector;
  private variableManager: VariableManager;
  private assertionEngine: AssertionEngine;
  private scriptEngine: ScriptEngine;
  private baseDir: string;

  /**
   * Create a TestManager instance
   * @param httpFilePath Path to the .http file (used for baseDir)
   * @param deps Optional pre-configured dependencies (for DI)
   */
  constructor(httpFilePath: string, deps?: TestManagerDependencies) {
    this.baseDir = path.dirname(httpFilePath);

    if (deps) {
      // Use injected dependencies
      this.variableManager = deps.variableManager;
      this.assertionEngine = deps.assertionEngine;
      this.requestExecutor = deps.requestExecutor;
      this.responseProcessor = deps.responseProcessor;
      this.resultCollector = deps.resultCollector;
      this.scriptEngine = deps.scriptEngine;
    } else {
      // Create dependencies directly (backward compatible)
      this.variableManager = new VariableManager();
      this.assertionEngine = new AssertionEngine(this.variableManager, this.baseDir);
      this.requestExecutor = new RequestExecutor(this.variableManager, this.baseDir);
      this.responseProcessor = new ResponseProcessor(this.variableManager);
      this.resultCollector = new TestResultCollector();
      this.scriptEngine = new ScriptEngine();
    }
  }

  /**
   * Create a TestManager using DI container
   * @param httpFilePath Path to the .http file
   * @param container Optional container (uses global if not provided)
   */
  static createWithContainer(
    httpFilePath: string,
    container?: Container
  ): TestManager {
    const baseDir = path.dirname(httpFilePath);

    // Setup container if not already configured
    if (container) {
      setupContainer({ baseDir }, container);
    } else {
      setupContainer({ baseDir });
    }

    const deps = resolveTestManagerDependencies(container);
    return new TestManager(httpFilePath, deps);
  }

  async run(
    requests: HttpRequest[],
    options?: RunOptions
  ): Promise<TestResult[]> {
    setVerbose(!!options?.verbose);

    for (const request of requests) {
      try {
        await this.processRequest(request);
      } catch (error) {
        await this.handleRequestError(error, request);
      }
    }

    const summary = this.resultCollector.getSummary();
    await logTestSummary(summary);

    return this.resultCollector.getResults();
  }

  private async processRequest(request: HttpRequest): Promise<void> {
    logRequestStart(request);
    try {
      // Execute pre-request scripts
      if (request.preRequestScripts && request.preRequestScripts.length > 0) {
        await this.executePreRequestScripts(request);
      }

      const response = await this.requestExecutor.execute(request);

      // Store response for named requests (REST Client @name directive support)
      if (request.requestId) {
        this.variableManager.storeNamedResponse(request.requestId, response);
      }

      await this.responseProcessor.process(response, request.variableUpdates);

      // Execute response handler scripts
      if (request.responseHandlers && request.responseHandlers.length > 0) {
        await this.executeResponseHandlers(request, response);
      }

      const testResults = await this.runTests(request, response);
      for (const result of testResults) {
        this.resultCollector.addResult(result);
        logTestResult(result);
      }
    } catch (error) {
      const errorMessage = `Request failed: ${request.name}\n${
        error instanceof Error ? error.message : String(error)
      }`;
      logError(errorMessage);
      this.resultCollector.addResult({
        name: request.name,
        passed: false,
        error: new Error(errorMessage),
        statusCode: undefined,
      });
    }
  }

  /**
   * Execute pre-request scripts before making the HTTP request
   */
  private async executePreRequestScripts(request: HttpRequest): Promise<void> {
    if (!request.preRequestScripts) return;

    // Get current variables as a Map
    const variables = new Map<string, string>();
    const allVars = this.variableManager.getAllVariables();
    for (const [key, value] of Object.entries(allVars)) {
      variables.set(key, String(value));
    }

    for (const script of request.preRequestScripts) {
      const scriptContent = await this.resolveScriptContent(script);
      if (!scriptContent) continue;

      logVerbose(`Executing pre-request script for ${request.name}`);
      const result = await this.scriptEngine.execute(scriptContent, {
        isPreRequest: true,
        variables,
      });

      if (!result.success) {
        logError(`Pre-request script error: ${result.error?.message}`);
        throw result.error;
      }

      // Apply variable updates from script
      if (result.variables) {
        for (const [key, value] of result.variables) {
          this.variableManager.setVariable(key, value);
          variables.set(key, value);
        }
      }

      // Log script output
      if (result.logs && result.logs.length > 0) {
        for (const logMsg of result.logs) {
          log(logMsg, LogLevel.INFO);
        }
      }
    }
  }

  /**
   * Execute response handler scripts after receiving HTTP response
   */
  private async executeResponseHandlers(
    request: HttpRequest,
    response: HttpResponse
  ): Promise<void> {
    if (!request.responseHandlers) return;

    for (const script of request.responseHandlers) {
      const scriptContent = await this.resolveScriptContent(script);
      if (!scriptContent) continue;

      logVerbose(`Executing response handler for ${request.name}`);
      const result = await this.scriptEngine.execute(scriptContent, {
        response,
      });

      if (!result.success) {
        logError(`Response handler error: ${result.error?.message}`);
        // Don't throw - script errors shouldn't fail the request
      }

      // Log script output
      if (result.logs && result.logs.length > 0) {
        for (const logMsg of result.logs) {
          log(logMsg, LogLevel.INFO);
        }
      }

      // Add script test results
      if (result.tests && result.tests.length > 0) {
        for (const test of result.tests) {
          this.resultCollector.addResult({
            name: `[Script] ${test.name}`,
            passed: test.passed,
            error: test.error ? new Error(test.error) : undefined,
            statusCode: response.status,
            executionTime: response.executionTime,
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              data: response.data,
              executionTime: response.executionTime,
            },
          });
          logTestResult({
            name: `[Script] ${test.name}`,
            passed: test.passed,
            error: test.error ? new Error(test.error) : undefined,
          });
        }
      }
    }
  }

  /**
   * Resolve script content from inline or file reference
   */
  private async resolveScriptContent(script: ParsedScript): Promise<string | null> {
    if (script.type === 'inline' && script.content) {
      return script.content;
    }

    if (script.type === 'file' && script.path) {
      try {
        const fullPath = path.resolve(this.baseDir, script.path);
        const content = await fs.readFile(fullPath, 'utf-8');
        return content;
      } catch (error) {
        logError(`Failed to read script file: ${script.path}`);
        return null;
      }
    }

    return null;
  }

  private async runTests(
    request: HttpRequest,
    response: HttpResponse
  ): Promise<TestResult[]> {
    const tests =
      request.tests.length > 0
        ? request.tests
        : [this.createDefaultStatusCodeTest(request.name)];
    const results: TestResult[] = [];

    for (const test of tests) {
      try {
        for (const assertion of test.assertions) {
          await this.assertionEngine.assert(assertion, response, request);
        }
        results.push(this.createTestResult(test, request, response, true));
      } catch (error) {
        results.push(
          this.createTestResult(test, request, response, false, error)
        );
      }
    }

    return results;
  }

  private createTestResult(
    test: TestItem,
    request: HttpRequest,
    response: HttpResponse,
    passed: boolean,
    error?: unknown
  ): TestResult {
    const expectedErrorPassed = request.expectError && !passed;
    return {
      name: test.name || request.name,
      passed: expectedErrorPassed || passed,
      statusCode: response.status,
      executionTime: response.executionTime,
      error: passed
        ? undefined
        : error instanceof Error
        ? error
        : new Error(String(error)),
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        executionTime: response.executionTime,
      },
    };
  }

  private createDefaultStatusCodeTest(name: string): TestItem {
    return {
      type: "Assert",
      name: `${name} Status OK`,
      assertions: [
        {
          type: "status",
          value: (status: number) => status >= 200 && status < 300,
        } as Assertion,
      ],
    };
  }

  private async handleRequestError(
    error: unknown,
    request: HttpRequest
  ): Promise<void> {
    const errorMessage = `Request failed: ${request.name}\n${
      error instanceof Error ? error.message : String(error)
    }`;
    log(errorMessage, LogLevel.ERROR);
    this.resultCollector.addResult({
      name: request.name,
      passed: false,
      error: new Error(errorMessage),
      statusCode: undefined,
    });
  }
}
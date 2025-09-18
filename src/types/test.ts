/**
 * Test execution options
 */
export interface RunOptions {
  verbose?: boolean;
  var?: string;
  parallel?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  bail?: boolean; // Stop on first failure
}

/**
 * Individual test item within a request
 */
export interface TestItem {
  type: "Assert";
  name?: string;
  assertions: Assertion[];
  timeout?: number;
  retries?: number;
}

/**
 * Test execution result
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  statusCode?: number;
  executionTime?: number;
  retryCount?: number;
}

/**
 * Test suite summary
 */
export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests?: number;
  totalExecutionTime?: number;
  results: TestResult[];
  startTime?: Date;
  endTime?: Date;
}

/**
 * Supported assertion types
 */
export type AssertionType = "status" | "header" | "body" | "custom" | "response-time" | "json-schema";

/**
 * Legacy assertion interface for backward compatibility
 */
export interface Assertion {
  type: AssertionType;
  key?: string;
  value?: unknown | ((value: unknown) => boolean) | string;
  description?: string;
  timeout?: number;
}

/**
 * Test execution context
 */
export interface TestContext {
  variables: Record<string, string>;
  currentRequest: string;
  totalRequests: number;
  executedRequests: number;
}
import FormData from "form-data";

// Core types
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "CONNECT" | "TRACE";

export type AssertionType = "status" | "header" | "body" | "custom" | "response-time" | "json-schema";

export interface RunOptions {
  verbose?: boolean;
  var?: string;
  parallel?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  bail?: boolean;
}

export interface VariableUpdate {
  key: string;
  value: string;
}

export interface Assertion {
  type: AssertionType;
  key?: string;
  value?: unknown | ((value: unknown) => boolean) | string;
  description?: string;
  timeout?: number;
}

export interface TestItem {
  type: "Assert";
  name?: string;
  assertions: Assertion[];
  timeout?: number;
  retries?: number;
}

export interface HttpRequest {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string | FormData | object;
  tests: TestItem[];
  variableUpdates: VariableUpdate[];
  expectError?: boolean;
  /** Named request identifier for REST Client @name directive */
  requestId?: string;
  /** File path for body content (REST Client < filepath syntax) */
  bodyFromFile?: string;
}

export interface HttpResponse<T = unknown> {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  data: T;
  executionTime?: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  statusCode?: number;
  executionTime?: number;
  retryCount?: number;
}

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

export interface Variables {
  [key: string]: string | number | boolean;
}

export interface VariableManager {
  setVariables(variables: Variables): void;
  replaceVariables(content: string): string;
  setVariable(key: string, value: string | number | boolean): void;
  getVariable(key: string): string | number | boolean | undefined;
  getAllVariables(): Variables;
}

export interface CustomValidatorContext {
  request?: HttpRequest;
  variables: Variables;
}

export type CustomValidatorFunction = (
  response: HttpResponse,
  context: CustomValidatorContext
) => void;

export enum LogLevel {
  INFO,
  WARNING,
  ERROR,
  VERBOSE,
  PLAIN,
}

// Re-export parse options
export type { ParseOptions } from './parser';

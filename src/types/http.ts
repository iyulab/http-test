import FormData from "form-data";
import { TestItem } from './test';

/**
 * Supported HTTP methods for requests
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

/**
 * Branded type for validated URLs
 */
export type ValidatedUrl = string & { readonly __brand: 'ValidatedUrl' };

/**
 * Branded type for JSON paths
 */
export type JsonPath = string & { readonly __brand: 'JsonPath' };

/**
 * HTTP request interface with improved type safety
 */
export interface HttpRequest {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string | FormData | object;
  tests: TestItem[];
  variableUpdates: VariableUpdate[];
  expectError?: boolean;
}

/**
 * HTTP response interface with generic data type
 */
export interface HttpResponse<T = unknown> {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  data: T;
  executionTime?: number;
}

/**
 * Variable update specification
 */
export interface VariableUpdate {
  key: string;
  value: string;
}

/**
 * Request timeout configuration
 */
export interface TimeoutConfig {
  connect?: number;
  request?: number;
  response?: number;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseURL?: string;
  timeout?: TimeoutConfig;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
  headers?: Record<string, string>;
}
/**
 * Pipeline Stage Interface
 *
 * Defines the contract for pipeline stages that process
 * HTTP requests before execution and responses after.
 */
import { HttpRequest, HttpResponse } from '../types';

/**
 * Context shared across pipeline stages
 */
export interface PipelineContext {
  /** Variable manager */
  variables: {
    get(key: string): string | undefined;
    set(key: string, value: any): void;
    replace(content: string): string;
  };
  /** Global variables (persisted across requests) */
  globals: Map<string, any>;
  /** Optional cookies */
  cookies?: Map<string, string>;
}

/**
 * Pipeline stage interface
 *
 * Stages can implement one or both of:
 * - processRequest: Modify request before execution
 * - processResponse: Process response after execution
 */
export interface IPipelineStage {
  /** Unique name for this stage */
  readonly name: string;

  /**
   * Process request before execution
   * @param request The HTTP request
   * @param context Pipeline context
   * @returns Modified request
   */
  processRequest?(
    request: HttpRequest,
    context: PipelineContext
  ): Promise<HttpRequest>;

  /**
   * Process response after execution
   * @param request The original request
   * @param response The HTTP response
   * @param context Pipeline context
   */
  processResponse?(
    request: HttpRequest,
    response: HttpResponse,
    context: PipelineContext
  ): Promise<void>;
}

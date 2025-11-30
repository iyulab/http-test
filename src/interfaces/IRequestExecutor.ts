/**
 * IRequestExecutor Interface
 *
 * Contract for HTTP request execution implementations.
 * Handles sending HTTP requests and receiving responses.
 */
import { HttpRequest, HttpResponse } from '../types';

export interface IRequestExecutor {
  /**
   * Execute an HTTP request and return the response
   * @param request The HTTP request to execute
   * @returns Promise resolving to the HTTP response
   * @throws Error if request fails or URL is invalid
   */
  execute(request: HttpRequest): Promise<HttpResponse>;
}

import { HttpTestError } from './HttpTestError';

/**
 * Represents an error that occurs during HTTP request execution.
 */
export class RequestError extends HttpTestError {
  readonly code = 'REQUEST_ERROR';
  readonly statusCode?: number;

  constructor(
    message: string,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, context);
    this.statusCode = statusCode;
  }
}

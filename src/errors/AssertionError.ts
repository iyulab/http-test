import { HttpTestError } from './HttpTestError';

/**
 * Represents an error that occurs during assertion.
 */
export class AssertionError extends HttpTestError {
  readonly code = 'ASSERTION_ERROR';

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

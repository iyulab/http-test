import { HttpTestError } from './HttpTestError';

/**
 * Represents an error that occurs during parsing.
 */
export class ParserError extends HttpTestError {
  readonly code = 'PARSER_ERROR';

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

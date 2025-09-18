/**
 * Base class for all HTTP Test related errors.
 * Provides consistent error structure and handling across the library.
 */
export abstract class HttpTestError extends Error {
  /**
   * Error code for programmatic identification
   */
  abstract readonly code: string;

  /**
   * HTTP status code if applicable
   */
  readonly statusCode?: number;

  /**
   * Additional context for the error
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: Date;

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts error to a structured object for logging or serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Creates a formatted error message for display
   */
  getDisplayMessage(): string {
    let message = `[${this.code}] ${this.message}`;

    if (this.statusCode) {
      message = `[${this.statusCode}] ${message}`;
    }

    if (this.context && Object.keys(this.context).length > 0) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      message += ` (${contextStr})`;
    }

    return message;
  }
}
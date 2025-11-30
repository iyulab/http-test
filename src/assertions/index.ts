/**
 * Assertions Module
 *
 * Provides assertion handler pipeline for HTTP response validation.
 */

// Core types and interfaces
export type {
  IAssertionHandler,
  AssertionResult,
  AssertionHandlerOptions
} from './IAssertionHandler';

// Registry
export { AssertionRegistry } from './AssertionRegistry';
export type {
  RegistrationOptions,
  AssertionInput
} from './AssertionRegistry';

// Built-in handlers
export {
  StatusCodeHandler,
  HeaderHandler,
  JsonPathHandler,
  ResponseTimeHandler,
  BodyExistsHandler
} from './handlers';

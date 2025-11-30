/**
 * Variables Module
 *
 * Provides hierarchical variable management and dynamic variable resolution.
 */

// Variable Scope
export {
  VariableScope,
  ScopeType,
  ScopePriority,
  createScopeChain,
  createRequestScope
} from './VariableScope';
export type {
  VariableValue,
  Variables,
  ScopeChain
} from './VariableScope';

// Dynamic Variable Resolver
export { DynamicVariableResolver } from './DynamicVariableResolver';

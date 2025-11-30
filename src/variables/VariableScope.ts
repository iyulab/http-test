/**
 * VariableScope
 *
 * Hierarchical variable scoping system for http-test.
 * Variables are resolved in priority order from highest to lowest:
 * 1. Request-level (@var = value in current request)
 * 2. File-level (@var = value at file top)
 * 3. Runtime variables (from --var file)
 * 4. Environment variables (http-client.env.json)
 * 5. Script globals (client.global.set)
 * 6. Dynamic variables ($guid, $timestamp, etc.)
 * 7. System environment ($processEnv NAME)
 */

/**
 * Scope type enumeration
 */
export enum ScopeType {
  /** Request-level variables */
  REQUEST = 'request',
  /** File-level variables */
  FILE = 'file',
  /** Runtime variables from --var file */
  RUNTIME = 'runtime',
  /** Environment variables from http-client.env.json */
  ENVIRONMENT = 'environment',
  /** Script global variables */
  SCRIPT_GLOBAL = 'script_global',
  /** Dynamic variables ($guid, $timestamp, etc.) */
  DYNAMIC = 'dynamic',
  /** System environment variables */
  SYSTEM = 'system'
}

/**
 * Priority order for scope types (higher = higher priority)
 */
export const ScopePriority: Record<ScopeType, number> = {
  [ScopeType.REQUEST]: 100,
  [ScopeType.FILE]: 90,
  [ScopeType.RUNTIME]: 80,
  [ScopeType.ENVIRONMENT]: 70,
  [ScopeType.SCRIPT_GLOBAL]: 60,
  [ScopeType.DYNAMIC]: 50,
  [ScopeType.SYSTEM]: 40
};

/**
 * Variable value type
 */
export type VariableValue = string | number | boolean;

/**
 * Variables record type
 */
export type Variables = Record<string, VariableValue>;

/**
 * Variable scope with optional parent chain
 */
export class VariableScope {
  readonly type: ScopeType;
  private parent?: VariableScope;
  private variables: Map<string, VariableValue> = new Map();

  /**
   * Create a new variable scope
   * @param type Scope type
   * @param parent Optional parent scope for chain resolution
   */
  constructor(type: ScopeType, parent?: VariableScope) {
    this.type = type;
    this.parent = parent;
  }

  /**
   * Set a variable in this scope
   */
  set(key: string, value: VariableValue): void {
    this.variables.set(key, value);
  }

  /**
   * Set multiple variables at once
   */
  setMany(variables: Variables): void {
    for (const [key, value] of Object.entries(variables)) {
      this.variables.set(key, value);
    }
  }

  /**
   * Get a variable from this scope only (not parent)
   */
  get(key: string): VariableValue | undefined {
    return this.variables.get(key);
  }

  /**
   * Check if variable exists in this scope only
   */
  has(key: string): boolean {
    return this.variables.has(key);
  }

  /**
   * Delete a variable from this scope
   */
  delete(key: string): boolean {
    return this.variables.delete(key);
  }

  /**
   * Clear all variables in this scope
   */
  clear(): void {
    this.variables.clear();
  }

  /**
   * Get all variables in this scope only
   */
  getAll(): Variables {
    const result: Variables = {};
    for (const [key, value] of this.variables) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Resolve a variable through the scope chain
   * Checks this scope first, then parent scopes
   */
  resolve(key: string): VariableValue | undefined {
    // Check this scope first
    if (this.variables.has(key)) {
      return this.variables.get(key);
    }

    // Check parent scope if exists
    if (this.parent) {
      return this.parent.resolve(key);
    }

    return undefined;
  }

  /**
   * Check if variable exists in this scope or any parent
   */
  resolvable(key: string): boolean {
    if (this.variables.has(key)) {
      return true;
    }
    if (this.parent) {
      return this.parent.resolvable(key);
    }
    return false;
  }

  /**
   * Get all resolved variables from this scope and all parents
   * Higher priority scopes override lower priority ones
   */
  resolveAll(): Variables {
    // Get parent variables first
    const parentVars = this.parent ? this.parent.resolveAll() : {};

    // Override with this scope's variables
    const thisVars = this.getAll();

    return { ...parentVars, ...thisVars };
  }

  /**
   * Get the parent scope
   */
  getParent(): VariableScope | undefined {
    return this.parent;
  }

  /**
   * Set a new parent scope
   */
  setParent(parent: VariableScope | undefined): void {
    this.parent = parent;
  }

  /**
   * Get the number of variables in this scope only
   */
  size(): number {
    return this.variables.size;
  }
}

/**
 * Complete scope chain for a request
 */
export interface ScopeChain {
  /** System environment scope (lowest priority) */
  system: VariableScope;
  /** Dynamic variables scope */
  dynamic: VariableScope;
  /** Script global variables scope */
  scriptGlobal: VariableScope;
  /** Environment file scope */
  environment: VariableScope;
  /** Runtime variables scope */
  runtime: VariableScope;
  /** File-level scope */
  file: VariableScope;
  /** Request-level scope (highest priority) */
  request: VariableScope;
}

/**
 * Create a complete scope chain with proper parent links
 */
export function createScopeChain(): ScopeChain {
  // Create scopes from lowest to highest priority
  const system = new VariableScope(ScopeType.SYSTEM);
  const dynamic = new VariableScope(ScopeType.DYNAMIC, system);
  const scriptGlobal = new VariableScope(ScopeType.SCRIPT_GLOBAL, dynamic);
  const environment = new VariableScope(ScopeType.ENVIRONMENT, scriptGlobal);
  const runtime = new VariableScope(ScopeType.RUNTIME, environment);
  const file = new VariableScope(ScopeType.FILE, runtime);
  const request = new VariableScope(ScopeType.REQUEST, file);

  return {
    system,
    dynamic,
    scriptGlobal,
    environment,
    runtime,
    file,
    request
  };
}

/**
 * Create a fresh request scope attached to existing file scope
 */
export function createRequestScope(fileScope: VariableScope): VariableScope {
  return new VariableScope(ScopeType.REQUEST, fileScope);
}

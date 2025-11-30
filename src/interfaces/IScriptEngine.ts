/**
 * IScriptEngine Interface
 *
 * Contract for script engine implementations.
 * Executes JavaScript scripts in a sandboxed environment.
 *
 * Note: Re-exports types from core/ScriptEngine for compatibility.
 */
import { HttpResponse } from '../types';

/**
 * Script test result from client.test()
 */
export interface ScriptTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

/**
 * Result of script execution
 */
export interface ScriptResult {
  success: boolean;
  error?: Error;
  logs?: string[];
  tests?: ScriptTestResult[];
  variables?: Map<string, string>;
}

/**
 * Context provided to script execution
 */
export interface ScriptContext {
  response?: HttpResponse;
  isPreRequest?: boolean;
  variables?: Map<string, string>;
}

/**
 * Parsed script definition
 */
export interface ParsedScript {
  type: 'inline' | 'file';
  content?: string;
  path?: string;
}

export interface IScriptEngine {
  /**
   * Execute a script in a sandboxed environment
   * @param script The script content as string
   * @param context The execution context (response, variables)
   * @returns Promise resolving to script execution result
   */
  execute(script: string, context?: ScriptContext): Promise<ScriptResult>;

  /**
   * Execute a script from file
   * @param filePath Path to the script file
   * @param context The execution context
   * @returns Promise resolving to script execution result
   */
  executeFile(filePath: string, context?: ScriptContext): Promise<ScriptResult>;

  /**
   * Get all global variables set by scripts
   * @returns Map containing all global variables
   */
  getGlobals(): Map<string, unknown>;

  /**
   * Clear all global variables
   */
  clearGlobals(): void;
}

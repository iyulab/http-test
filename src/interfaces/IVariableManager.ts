/**
 * IVariableManager Interface
 *
 * Contract for variable management implementations.
 * Handles variable storage, retrieval, and template replacement.
 */
import { Variables } from '../types';

export interface IVariableManager {
  /**
   * Set multiple variables at once from an object
   * @param variables Object containing key-value pairs
   */
  setVariables(variables: Variables): void;

  /**
   * Set a single variable
   * @param key Variable name
   * @param value Variable value (string, number, or boolean)
   */
  setVariable(key: string, value: string | number | boolean): void;

  /**
   * Get a variable value by key
   * @param key Variable name
   * @returns Variable value or undefined if not found
   */
  getVariable(key: string): string | number | boolean | undefined;

  /**
   * Replace {{variable}} placeholders in a string with their values
   * @param content String containing variable placeholders
   * @returns String with variables replaced
   */
  replaceVariables(content: string): string;

  /**
   * Get all stored variables
   * @returns Object containing all variables
   */
  getAllVariables(): Variables;
}

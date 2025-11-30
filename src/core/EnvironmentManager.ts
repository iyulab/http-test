/**
 * EnvironmentManager - JetBrains HTTP Client Compatible Environment Management
 *
 * Supports:
 * - http-client.env.json (public environments)
 * - http-client.private.env.json (private/sensitive variables)
 * - Multiple environment selection (dev, prod, test, etc.)
 * - Nested variable access with dot notation
 * - Runtime variable overrides
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { logVerbose, logError } from '../utils/logger';

export interface EnvironmentConfig {
  [envName: string]: EnvironmentVariables;
}

export interface EnvironmentVariables {
  [key: string]: string | number | boolean | object | unknown[];
}

export class EnvironmentManager {
  private baseDir: string;
  private publicEnv: EnvironmentConfig = {};
  private privateEnv: EnvironmentConfig = {};
  private mergedEnv: EnvironmentConfig = {};
  private currentEnvName: string | undefined;
  private runtimeVariables: Map<string, unknown> = new Map();

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Load environment files from the base directory
   */
  async load(): Promise<void> {
    await this.loadPublicEnv();
    await this.loadPrivateEnv();
    this.mergeEnvironments();
  }

  private async loadPublicEnv(): Promise<void> {
    const publicEnvPath = join(this.baseDir, 'http-client.env.json');
    this.publicEnv = await this.loadEnvFile(publicEnvPath);
  }

  private async loadPrivateEnv(): Promise<void> {
    const privateEnvPath = join(this.baseDir, 'http-client.private.env.json');
    this.privateEnv = await this.loadEnvFile(privateEnvPath);
  }

  private async loadEnvFile(filePath: string): Promise<EnvironmentConfig> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      logVerbose(`Loaded environment file: ${filePath}`);
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logError(`Failed to load environment file ${filePath}: ${error}`);
      }
      return {};
    }
  }

  private mergeEnvironments(): void {
    // Get all environment names from both public and private
    const allEnvNames = new Set([
      ...Object.keys(this.publicEnv),
      ...Object.keys(this.privateEnv)
    ]);

    this.mergedEnv = {};

    for (const envName of allEnvNames) {
      const publicVars = this.publicEnv[envName] || {};
      const privateVars = this.privateEnv[envName] || {};

      // Private variables override public ones
      this.mergedEnv[envName] = {
        ...publicVars,
        ...privateVars
      };
    }
  }

  /**
   * Get list of available environment names
   */
  getAvailableEnvironments(): string[] {
    return Object.keys(this.mergedEnv);
  }

  /**
   * Select an environment by name
   */
  selectEnvironment(envName: string): void {
    if (!this.mergedEnv[envName]) {
      throw new Error(`Environment "${envName}" not found`);
    }

    this.currentEnvName = envName;
    this.runtimeVariables.clear();
    logVerbose(`Selected environment: ${envName}`);
  }

  /**
   * Get the currently selected environment name
   */
  getCurrentEnvironment(): string | undefined {
    return this.currentEnvName;
  }

  /**
   * Auto-select a default environment
   * Priority: dev > development > first available
   */
  autoSelectDefaultEnvironment(): void {
    const envs = this.getAvailableEnvironments();

    if (envs.length === 0) {
      return;
    }

    if (envs.length === 1) {
      this.selectEnvironment(envs[0]);
      return;
    }

    // Prefer dev or development
    if (envs.includes('dev')) {
      this.selectEnvironment('dev');
    } else if (envs.includes('development')) {
      this.selectEnvironment('development');
    } else {
      this.selectEnvironment(envs[0]);
    }
  }

  /**
   * Get a variable value from the current environment
   * Supports dot notation for nested values (e.g., "database.host")
   */
  getVariable(key: string): unknown {
    // Check runtime overrides first
    if (this.runtimeVariables.has(key)) {
      return this.runtimeVariables.get(key);
    }

    if (!this.currentEnvName) {
      return undefined;
    }

    const envVars = this.mergedEnv[this.currentEnvName];
    if (!envVars) {
      return undefined;
    }

    // Handle dot notation for nested values
    if (key.includes('.')) {
      return this.getNestedValue(envVars, key);
    }

    return envVars[key];
  }

  private getNestedValue(obj: EnvironmentVariables, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Get all variables for the current environment
   */
  getAllVariables(): EnvironmentVariables {
    if (!this.currentEnvName) {
      return {};
    }

    const envVars = this.mergedEnv[this.currentEnvName] || {};

    // Apply runtime overrides
    const result: EnvironmentVariables = { ...envVars };
    for (const [key, value] of this.runtimeVariables) {
      result[key] = value as string | number | boolean | object | unknown[];
    }

    return result;
  }

  /**
   * Set a runtime variable that overrides environment values
   */
  setRuntimeVariable(key: string, value: unknown): void {
    this.runtimeVariables.set(key, value);
    logVerbose(`Set runtime variable: ${key}`);
  }

  /**
   * Replace {{variable}} placeholders in a string with environment values
   */
  replaceVariables(content: string): string {
    return content.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varName) => {
      const value = this.getVariable(varName);
      if (value === undefined) {
        return match; // Keep original if not found
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    });
  }

  /**
   * Export variables to a format compatible with VariableManager
   */
  exportToVariables(): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    const allVars = this.getAllVariables();

    for (const [key, value] of Object.entries(allVars)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      } else if (typeof value === 'object') {
        // Flatten nested objects with dot notation
        this.flattenObject(value as Record<string, unknown>, key, result);
      }
    }

    return result;
  }

  private flattenObject(
    obj: Record<string, unknown>,
    prefix: string,
    result: Record<string, string | number | boolean>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = `${prefix}.${key}`;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[fullKey] = value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.flattenObject(value as Record<string, unknown>, fullKey, result);
      }
    }
  }
}

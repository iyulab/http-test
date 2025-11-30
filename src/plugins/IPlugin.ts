/**
 * Plugin Interface
 *
 * Defines the contract for http-test plugins.
 * Plugins can hook into the request/response lifecycle.
 */
import { HttpRequest, HttpResponse } from '../types';

/**
 * Plugin hook types
 */
export type PluginHook = 'init' | 'destroy' | 'beforeRequest' | 'afterResponse';

/**
 * Context provided to plugins
 */
export interface PluginContext {
  /** Variable manager */
  variables: {
    get(key: string): string | undefined;
    set(key: string, value: any): void;
    getAll(): Record<string, any>;
  };
  /** Logger */
  logger: {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
  };
  /** Plugin configuration */
  config: Record<string, any>;
}

/**
 * Plugin interface
 */
export interface IPlugin {
  /** Unique plugin name */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /** Optional description */
  readonly description?: string;

  /**
   * Initialize the plugin
   * Called when the plugin is registered
   * @param context Plugin context
   */
  init(context?: PluginContext): Promise<void>;

  /**
   * Cleanup the plugin
   * Called when the plugin is unregistered
   */
  destroy?(): Promise<void>;

  /**
   * Hook called before each request is executed
   * Can modify the request
   * @param request The HTTP request
   * @param context Plugin context
   * @returns Modified request
   */
  beforeRequest?(
    request: HttpRequest,
    context: PluginContext
  ): Promise<HttpRequest>;

  /**
   * Hook called after each response is received
   * @param request The original request
   * @param response The HTTP response
   * @param context Plugin context
   */
  afterResponse?(
    request: HttpRequest,
    response: HttpResponse,
    context: PluginContext
  ): Promise<void>;
}

/**
 * Plugin information for listing
 */
export interface PluginInfo {
  name: string;
  version: string;
  description?: string;
}

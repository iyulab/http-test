/**
 * PluginManager
 *
 * Manages plugin registration and lifecycle.
 * Executes plugin hooks at appropriate points.
 */
import { HttpRequest, HttpResponse } from '../types';
import { IPlugin, PluginContext, PluginInfo } from './IPlugin';

export class PluginManager {
  private plugins: Map<string, IPlugin> = new Map();

  /**
   * Get the number of registered plugins
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Check if a plugin is registered
   * @param name Plugin name
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Register a plugin
   * @param plugin The plugin to register
   * @param context Optional context for initialization
   * @throws Error if plugin with same name already registered
   */
  async register(plugin: IPlugin, context?: PluginContext): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`);
    }

    try {
      await plugin.init(context);
      this.plugins.set(plugin.name, plugin);
    } catch (error) {
      // Don't register if init fails
      throw error;
    }
  }

  /**
   * Unregister a plugin
   * @param name Plugin name
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return;
    }

    if (plugin.destroy) {
      try {
        await plugin.destroy();
      } catch {
        // Ignore destroy errors
      }
    }

    this.plugins.delete(name);
  }

  /**
   * List all registered plugins
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description
    }));
  }

  /**
   * Execute beforeRequest hooks for all plugins
   * @param request The HTTP request
   * @param context Plugin context
   * @returns Modified request
   */
  async executeBeforeRequest(
    request: HttpRequest,
    context: PluginContext
  ): Promise<HttpRequest> {
    let processedRequest = request;

    for (const plugin of this.plugins.values()) {
      if (plugin.beforeRequest) {
        processedRequest = await plugin.beforeRequest(processedRequest, context);
      }
    }

    return processedRequest;
  }

  /**
   * Execute afterResponse hooks for all plugins
   * @param request The original request
   * @param response The HTTP response
   * @param context Plugin context
   */
  async executeAfterResponse(
    request: HttpRequest,
    response: HttpResponse,
    context: PluginContext
  ): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.afterResponse) {
        try {
          await plugin.afterResponse(request, response, context);
        } catch {
          // Continue executing other plugins even if one fails
        }
      }
    }
  }

  /**
   * Destroy all plugins
   */
  async destroyAll(): Promise<void> {
    for (const name of this.plugins.keys()) {
      await this.unregister(name);
    }
  }
}

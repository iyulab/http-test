/**
 * Plugins Module
 *
 * Provides plugin architecture for extending http-test functionality.
 */

// Core types and interfaces
export type {
  IPlugin,
  PluginContext,
  PluginHook,
  PluginInfo
} from './IPlugin';

// Manager
export { PluginManager } from './PluginManager';

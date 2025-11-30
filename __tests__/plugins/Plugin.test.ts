/**
 * Plugin Architecture Tests
 *
 * TDD tests for the plugin system.
 */
import { HttpRequest, HttpResponse } from '../../src/types';
import {
  IPlugin,
  PluginContext,
  PluginManager,
  PluginHook
} from '../../src/plugins';

describe('IPlugin Contract', () => {
  const createRequest = (): HttpRequest => ({
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com/api',
    headers: {},
    tests: [],
    variableUpdates: []
  });

  const createResponse = (): HttpResponse => ({
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { id: 1 }
  });

  const createContext = (): PluginContext => ({
    variables: {
      get: jest.fn(),
      set: jest.fn(),
      getAll: jest.fn().mockReturnValue({})
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    config: {}
  });

  describe('Plugin Interface', () => {
    it('should have required properties', () => {
      const plugin: IPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        init: async () => {}
      };

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.init).toBeDefined();
    });

    it('should support optional hooks', () => {
      const plugin: IPlugin = {
        name: 'full-plugin',
        version: '1.0.0',
        description: 'A full-featured plugin',
        init: async () => {},
        destroy: async () => {},
        beforeRequest: async (request) => request,
        afterResponse: async (request, response) => {}
      };

      expect(plugin.description).toBe('A full-featured plugin');
      expect(plugin.destroy).toBeDefined();
      expect(plugin.beforeRequest).toBeDefined();
      expect(plugin.afterResponse).toBeDefined();
    });
  });

  describe('PluginManager', () => {
    let manager: PluginManager;

    beforeEach(() => {
      manager = new PluginManager();
    });

    describe('Plugin Registration', () => {
      it('should register a plugin', async () => {
        const plugin: IPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          init: jest.fn()
        };

        await manager.register(plugin);

        expect(manager.getPluginCount()).toBe(1);
        expect(manager.hasPlugin('test-plugin')).toBe(true);
      });

      it('should call init on registration', async () => {
        const initFn = jest.fn();
        const plugin: IPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          init: initFn
        };

        await manager.register(plugin);

        expect(initFn).toHaveBeenCalled();
      });

      it('should prevent duplicate plugin names', async () => {
        const plugin: IPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          init: async () => {}
        };

        await manager.register(plugin);

        await expect(manager.register(plugin)).rejects.toThrow();
      });

      it('should pass context to init', async () => {
        const initFn = jest.fn();
        const plugin: IPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          init: initFn
        };

        const context = createContext();
        await manager.register(plugin, context);

        expect(initFn).toHaveBeenCalledWith(context);
      });
    });

    describe('Plugin Unregistration', () => {
      it('should unregister a plugin', async () => {
        const destroyFn = jest.fn();
        const plugin: IPlugin = {
          name: 'test-plugin',
          version: '1.0.0',
          init: async () => {},
          destroy: destroyFn
        };

        await manager.register(plugin);
        await manager.unregister('test-plugin');

        expect(manager.hasPlugin('test-plugin')).toBe(false);
        expect(destroyFn).toHaveBeenCalled();
      });

      it('should handle unregister of non-existent plugin', async () => {
        await expect(manager.unregister('non-existent')).resolves.not.toThrow();
      });
    });

    describe('Hook Execution', () => {
      it('should execute beforeRequest hooks', async () => {
        const hookFn = jest.fn().mockImplementation((request) => ({
          ...request,
          headers: { ...request.headers, 'X-Plugin': 'modified' }
        }));

        const plugin: IPlugin = {
          name: 'modifier-plugin',
          version: '1.0.0',
          init: async () => {},
          beforeRequest: hookFn
        };

        await manager.register(plugin);

        const request = createRequest();
        const context = createContext();
        const result = await manager.executeBeforeRequest(request, context);

        expect(hookFn).toHaveBeenCalledWith(request, context);
        expect(result.headers['X-Plugin']).toBe('modified');
      });

      it('should execute afterResponse hooks', async () => {
        const hookFn = jest.fn();

        const plugin: IPlugin = {
          name: 'logger-plugin',
          version: '1.0.0',
          init: async () => {},
          afterResponse: hookFn
        };

        await manager.register(plugin);

        const request = createRequest();
        const response = createResponse();
        const context = createContext();

        await manager.executeAfterResponse(request, response, context);

        expect(hookFn).toHaveBeenCalledWith(request, response, context);
      });

      it('should chain multiple beforeRequest hooks', async () => {
        const plugin1: IPlugin = {
          name: 'plugin-1',
          version: '1.0.0',
          init: async () => {},
          beforeRequest: async (request) => ({
            ...request,
            headers: { ...request.headers, 'X-Plugin-1': 'value1' }
          })
        };

        const plugin2: IPlugin = {
          name: 'plugin-2',
          version: '1.0.0',
          init: async () => {},
          beforeRequest: async (request) => ({
            ...request,
            headers: { ...request.headers, 'X-Plugin-2': 'value2' }
          })
        };

        await manager.register(plugin1);
        await manager.register(plugin2);

        const request = createRequest();
        const context = createContext();
        const result = await manager.executeBeforeRequest(request, context);

        expect(result.headers['X-Plugin-1']).toBe('value1');
        expect(result.headers['X-Plugin-2']).toBe('value2');
      });

      it('should execute all afterResponse hooks even if one fails', async () => {
        const hook1Fn = jest.fn().mockRejectedValue(new Error('Hook 1 failed'));
        const hook2Fn = jest.fn();

        const plugin1: IPlugin = {
          name: 'failing-plugin',
          version: '1.0.0',
          init: async () => {},
          afterResponse: hook1Fn
        };

        const plugin2: IPlugin = {
          name: 'success-plugin',
          version: '1.0.0',
          init: async () => {},
          afterResponse: hook2Fn
        };

        await manager.register(plugin1);
        await manager.register(plugin2);

        const request = createRequest();
        const response = createResponse();
        const context = createContext();

        // Should not throw
        await manager.executeAfterResponse(request, response, context);

        expect(hook2Fn).toHaveBeenCalled();
      });
    });

    describe('Plugin Information', () => {
      it('should list all registered plugins', async () => {
        await manager.register({
          name: 'plugin-a',
          version: '1.0.0',
          init: async () => {}
        });

        await manager.register({
          name: 'plugin-b',
          version: '2.0.0',
          description: 'Plugin B',
          init: async () => {}
        });

        const plugins = manager.listPlugins();

        expect(plugins).toHaveLength(2);
        expect(plugins[0]).toEqual({
          name: 'plugin-a',
          version: '1.0.0',
          description: undefined
        });
        expect(plugins[1]).toEqual({
          name: 'plugin-b',
          version: '2.0.0',
          description: 'Plugin B'
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle init errors gracefully', async () => {
        const plugin: IPlugin = {
          name: 'error-plugin',
          version: '1.0.0',
          init: async () => {
            throw new Error('Init failed');
          }
        };

        await expect(manager.register(plugin)).rejects.toThrow('Init failed');
        expect(manager.hasPlugin('error-plugin')).toBe(false);
      });

      it('should handle beforeRequest errors', async () => {
        const plugin: IPlugin = {
          name: 'error-plugin',
          version: '1.0.0',
          init: async () => {},
          beforeRequest: async () => {
            throw new Error('Hook failed');
          }
        };

        await manager.register(plugin);

        const request = createRequest();
        const context = createContext();

        // Should throw as beforeRequest errors are critical
        await expect(
          manager.executeBeforeRequest(request, context)
        ).rejects.toThrow('Hook failed');
      });
    });
  });

  describe('PluginHook Types', () => {
    it('should define correct hook types', () => {
      const hooks: PluginHook[] = ['init', 'destroy', 'beforeRequest', 'afterResponse'];
      expect(hooks).toHaveLength(4);
    });
  });
});

/**
 * EnvironmentManager Tests
 *
 * Tests for JetBrains HTTP Client compatible environment file support:
 * - http-client.env.json (public environments)
 * - http-client.private.env.json (private/sensitive variables)
 * - Environment selection (dev, prod, test, etc.)
 */

import { EnvironmentManager } from '../../src/core/EnvironmentManager';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

describe('EnvironmentManager', () => {
  let tempDir: string;
  let manager: EnvironmentManager;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `http-test-env-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Environment File Loading', () => {
    it('should load http-client.env.json from base directory', async () => {
      const envFile = {
        dev: {
          host: 'localhost:8080',
          token: 'dev-token'
        },
        prod: {
          host: 'api.example.com',
          token: 'prod-token'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();

      expect(manager.getAvailableEnvironments()).toEqual(['dev', 'prod']);
    });

    it('should return empty environments when no env file exists', async () => {
      manager = new EnvironmentManager(tempDir);
      await manager.load();

      expect(manager.getAvailableEnvironments()).toEqual([]);
    });

    it('should handle invalid JSON in env file gracefully', async () => {
      await writeFile(
        join(tempDir, 'http-client.env.json'),
        'invalid json {',
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();

      expect(manager.getAvailableEnvironments()).toEqual([]);
    });
  });

  describe('Environment Selection', () => {
    beforeEach(async () => {
      const envFile = {
        dev: {
          host: 'localhost:8080',
          apiKey: 'dev-key'
        },
        prod: {
          host: 'api.example.com',
          apiKey: 'prod-key'
        },
        test: {
          host: 'test.example.com',
          apiKey: 'test-key'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
    });

    it('should select an environment and return its variables', () => {
      manager.selectEnvironment('dev');

      expect(manager.getVariable('host')).toBe('localhost:8080');
      expect(manager.getVariable('apiKey')).toBe('dev-key');
    });

    it('should switch between environments', () => {
      manager.selectEnvironment('dev');
      expect(manager.getVariable('host')).toBe('localhost:8080');

      manager.selectEnvironment('prod');
      expect(manager.getVariable('host')).toBe('api.example.com');
    });

    it('should return undefined for non-existent variable', () => {
      manager.selectEnvironment('dev');
      expect(manager.getVariable('nonExistent')).toBeUndefined();
    });

    it('should return all variables for selected environment', () => {
      manager.selectEnvironment('dev');
      const vars = manager.getAllVariables();

      expect(vars).toEqual({
        host: 'localhost:8080',
        apiKey: 'dev-key'
      });
    });

    it('should throw error when selecting non-existent environment', () => {
      expect(() => manager.selectEnvironment('staging')).toThrow(
        'Environment "staging" not found'
      );
    });

    it('should get current environment name', () => {
      expect(manager.getCurrentEnvironment()).toBeUndefined();

      manager.selectEnvironment('dev');
      expect(manager.getCurrentEnvironment()).toBe('dev');
    });
  });

  describe('Private Environment File', () => {
    it('should merge private env variables with public env', async () => {
      const publicEnv = {
        dev: {
          host: 'localhost:8080',
          apiKey: 'public-key'
        }
      };

      const privateEnv = {
        dev: {
          apiKey: 'secret-key',
          secretToken: 'private-token'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(publicEnv),
        'utf-8'
      );
      await writeFile(
        join(tempDir, 'http-client.private.env.json'),
        JSON.stringify(privateEnv),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.selectEnvironment('dev');

      // Private should override public
      expect(manager.getVariable('apiKey')).toBe('secret-key');
      // Private-only variable should be available
      expect(manager.getVariable('secretToken')).toBe('private-token');
      // Public variable not in private should remain
      expect(manager.getVariable('host')).toBe('localhost:8080');
    });

    it('should work with only private env file', async () => {
      const privateEnv = {
        dev: {
          secretToken: 'private-only-token'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.private.env.json'),
        JSON.stringify(privateEnv),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();

      expect(manager.getAvailableEnvironments()).toEqual(['dev']);
      manager.selectEnvironment('dev');
      expect(manager.getVariable('secretToken')).toBe('private-only-token');
    });

    it('should combine environments from both public and private files', async () => {
      const publicEnv = {
        dev: { host: 'localhost' }
      };

      const privateEnv = {
        staging: { host: 'staging.example.com' }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(publicEnv),
        'utf-8'
      );
      await writeFile(
        join(tempDir, 'http-client.private.env.json'),
        JSON.stringify(privateEnv),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();

      expect(manager.getAvailableEnvironments()).toContain('dev');
      expect(manager.getAvailableEnvironments()).toContain('staging');
    });
  });

  describe('Variable Replacement', () => {
    beforeEach(async () => {
      const envFile = {
        dev: {
          baseUrl: 'http://localhost:8080',
          apiVersion: 'v1',
          token: 'test-token'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.selectEnvironment('dev');
    });

    it('should replace variables in string', () => {
      const result = manager.replaceVariables('{{baseUrl}}/api/{{apiVersion}}/users');
      expect(result).toBe('http://localhost:8080/api/v1/users');
    });

    it('should handle unknown variables gracefully', () => {
      const result = manager.replaceVariables('{{baseUrl}}/{{unknownVar}}');
      expect(result).toBe('http://localhost:8080/{{unknownVar}}');
    });

    it('should replace multiple occurrences of same variable', () => {
      const result = manager.replaceVariables('{{token}} and {{token}}');
      expect(result).toBe('test-token and test-token');
    });
  });

  describe('Nested Variable Support', () => {
    it('should support nested objects in environment', async () => {
      const envFile = {
        dev: {
          database: {
            host: 'localhost',
            port: 5432,
            name: 'testdb'
          }
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.selectEnvironment('dev');

      // Access nested value using dot notation
      expect(manager.getVariable('database.host')).toBe('localhost');
      expect(manager.getVariable('database.port')).toBe(5432);
    });

    it('should handle array values', async () => {
      const envFile = {
        dev: {
          hosts: ['host1.example.com', 'host2.example.com'],
          primaryHost: 'host1.example.com'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.selectEnvironment('dev');

      expect(manager.getVariable('hosts')).toEqual(['host1.example.com', 'host2.example.com']);
      expect(manager.getVariable('primaryHost')).toBe('host1.example.com');
    });
  });

  describe('Default Environment', () => {
    it('should auto-select first environment if only one exists', async () => {
      const envFile = {
        production: {
          host: 'api.example.com'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.autoSelectDefaultEnvironment();

      expect(manager.getCurrentEnvironment()).toBe('production');
    });

    it('should prefer "dev" as default when multiple environments exist', async () => {
      const envFile = {
        prod: { host: 'prod.example.com' },
        dev: { host: 'localhost' },
        test: { host: 'test.example.com' }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.autoSelectDefaultEnvironment();

      expect(manager.getCurrentEnvironment()).toBe('dev');
    });

    it('should prefer "development" as default', async () => {
      const envFile = {
        production: { host: 'prod.example.com' },
        development: { host: 'localhost' }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.autoSelectDefaultEnvironment();

      expect(manager.getCurrentEnvironment()).toBe('development');
    });
  });

  describe('Runtime Variable Override', () => {
    it('should allow setting runtime variables that override environment', async () => {
      const envFile = {
        dev: {
          host: 'localhost',
          port: '8080'
        }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.selectEnvironment('dev');

      // Override at runtime
      manager.setRuntimeVariable('port', '3000');

      expect(manager.getVariable('host')).toBe('localhost');
      expect(manager.getVariable('port')).toBe('3000'); // Runtime override
    });

    it('should clear runtime variables when switching environments', async () => {
      const envFile = {
        dev: { host: 'localhost' },
        prod: { host: 'api.example.com' }
      };

      await writeFile(
        join(tempDir, 'http-client.env.json'),
        JSON.stringify(envFile),
        'utf-8'
      );

      manager = new EnvironmentManager(tempDir);
      await manager.load();
      manager.selectEnvironment('dev');
      manager.setRuntimeVariable('customVar', 'value');

      expect(manager.getVariable('customVar')).toBe('value');

      manager.selectEnvironment('prod');
      expect(manager.getVariable('customVar')).toBeUndefined();
    });
  });
});

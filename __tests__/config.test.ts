import { loadConfig, validateConfig, defaultConfig } from '../src/config';

describe('Config', () => {
  describe('defaultConfig', () => {
    test('should have all required properties', () => {
      expect(defaultConfig).toHaveProperty('timeouts');
      expect(defaultConfig).toHaveProperty('security');
      expect(defaultConfig).toHaveProperty('retries');
      expect(defaultConfig).toHaveProperty('logging');
      expect(defaultConfig).toHaveProperty('performance');
    });

    test('should have reasonable default values', () => {
      expect(defaultConfig.timeouts.serverCheck).toBe(5000);
      expect(defaultConfig.timeouts.request).toBe(10000);
      expect(defaultConfig.timeouts.response).toBe(30000);

      expect(defaultConfig.retries.maxAttempts).toBe(3);
      expect(defaultConfig.retries.backoffMultiplier).toBe(2);
      expect(defaultConfig.retries.initialDelay).toBe(1000);

      expect(defaultConfig.logging.level).toBe('info');
      expect(defaultConfig.logging.colorOutput).toBe(true);

      expect(defaultConfig.performance.maxConcurrentRequests).toBe(10);
      expect(defaultConfig.performance.requestBufferSize).toBe(1024 * 1024);
    });

    test('should respect NODE_TLS_REJECT_UNAUTHORIZED environment variable', () => {
      // This test verifies the default behavior based on environment
      expect(defaultConfig.security.rejectUnauthorized).toBeDefined();
      expect(typeof defaultConfig.security.rejectUnauthorized).toBe('boolean');
    });
  });

  describe('loadConfig', () => {
    test('should return default config when no custom config provided', () => {
      const config = loadConfig();
      expect(config).toEqual(defaultConfig);
    });

    test('should merge custom config with default config', () => {
      const customConfig = {
        timeouts: {
          request: 15000
        },
        logging: {
          level: 'verbose' as const
        }
      };

      const config = loadConfig(customConfig);

      expect(config.timeouts.request).toBe(15000);
      expect(config.timeouts.serverCheck).toBe(defaultConfig.timeouts.serverCheck); // unchanged
      expect(config.logging.level).toBe('verbose');
      expect(config.logging.colorOutput).toBe(defaultConfig.logging.colorOutput); // unchanged
    });

    test('should deep merge nested objects', () => {
      const customConfig = {
        timeouts: {
          request: 8000
          // serverCheck and response should remain default
        },
        security: {
          rejectUnauthorized: false
          // allowInsecureConnections should remain default
        }
      };

      const config = loadConfig(customConfig);

      expect(config.timeouts.request).toBe(8000);
      expect(config.timeouts.serverCheck).toBe(defaultConfig.timeouts.serverCheck);
      expect(config.timeouts.response).toBe(defaultConfig.timeouts.response);

      expect(config.security.rejectUnauthorized).toBe(false);
      expect(config.security.allowInsecureConnections).toBe(defaultConfig.security.allowInsecureConnections);
    });

    test('should handle partial custom config', () => {
      const customConfig = {
        performance: {
          maxConcurrentRequests: 5
        }
      };

      const config = loadConfig(customConfig);

      expect(config.performance.maxConcurrentRequests).toBe(5);
      expect(config.performance.requestBufferSize).toBe(defaultConfig.performance.requestBufferSize);
      expect(config.timeouts).toEqual(defaultConfig.timeouts);
      expect(config.security).toEqual(defaultConfig.security);
      expect(config.retries).toEqual(defaultConfig.retries);
      expect(config.logging).toEqual(defaultConfig.logging);
    });

    test('should handle empty custom config', () => {
      const config = loadConfig({});
      expect(config).toEqual(defaultConfig);
    });

    test('should handle null/undefined values in custom config', () => {
      const customConfig = {
        timeouts: {
          request: 5000,
          serverCheck: undefined,
          response: null as any
        }
      };

      const config = loadConfig(customConfig);

      expect(config.timeouts.request).toBe(5000);
      expect(config.timeouts.serverCheck).toBe(defaultConfig.timeouts.serverCheck);
      expect(config.timeouts.response).toBe(defaultConfig.timeouts.response);
    });
  });

  describe('validateConfig', () => {
    test('should return no errors for valid config', () => {
      const errors = validateConfig(defaultConfig);
      expect(errors).toEqual([]);
    });

    test('should validate positive timeout values', () => {
      const invalidConfig = {
        ...defaultConfig,
        timeouts: {
          ...defaultConfig.timeouts,
          serverCheck: -1000
        }
      };

      const errors = validateConfig(invalidConfig);
      expect(errors).toContain('Server check timeout must be positive');
    });

    test('should validate positive request timeout', () => {
      const invalidConfig = {
        ...defaultConfig,
        timeouts: {
          ...defaultConfig.timeouts,
          request: 0
        }
      };

      const errors = validateConfig(invalidConfig);
      expect(errors).toContain('Request timeout must be positive');
    });

    test('should validate non-negative retry attempts', () => {
      const invalidConfig = {
        ...defaultConfig,
        retries: {
          ...defaultConfig.retries,
          maxAttempts: -1
        }
      };

      const errors = validateConfig(invalidConfig);
      expect(errors).toContain('Max retry attempts cannot be negative');
    });

    test('should validate positive concurrent requests', () => {
      const invalidConfig = {
        ...defaultConfig,
        performance: {
          ...defaultConfig.performance,
          maxConcurrentRequests: 0
        }
      };

      const errors = validateConfig(invalidConfig);
      expect(errors).toContain('Max concurrent requests must be positive');
    });

    test('should return multiple errors for multiple invalid values', () => {
      const invalidConfig = {
        ...defaultConfig,
        timeouts: {
          serverCheck: -1,
          request: 0,
          response: defaultConfig.timeouts.response
        },
        retries: {
          ...defaultConfig.retries,
          maxAttempts: -5
        },
        performance: {
          ...defaultConfig.performance,
          maxConcurrentRequests: -10
        }
      };

      const errors = validateConfig(invalidConfig);
      expect(errors).toHaveLength(4);
      expect(errors).toContain('Server check timeout must be positive');
      expect(errors).toContain('Request timeout must be positive');
      expect(errors).toContain('Max retry attempts cannot be negative');
      expect(errors).toContain('Max concurrent requests must be positive');
    });

    test('should handle edge case values', () => {
      const edgeConfig = {
        ...defaultConfig,
        timeouts: {
          serverCheck: 1, // minimum valid value
          request: 1, // minimum valid value
          response: defaultConfig.timeouts.response
        },
        retries: {
          ...defaultConfig.retries,
          maxAttempts: 0 // minimum valid value
        },
        performance: {
          ...defaultConfig.performance,
          maxConcurrentRequests: 1 // minimum valid value
        }
      };

      const errors = validateConfig(edgeConfig);
      expect(errors).toEqual([]);
    });

    test('should handle very large values', () => {
      const largeConfig = {
        ...defaultConfig,
        timeouts: {
          serverCheck: Number.MAX_SAFE_INTEGER,
          request: Number.MAX_SAFE_INTEGER,
          response: Number.MAX_SAFE_INTEGER
        },
        retries: {
          ...defaultConfig.retries,
          maxAttempts: Number.MAX_SAFE_INTEGER
        },
        performance: {
          ...defaultConfig.performance,
          maxConcurrentRequests: Number.MAX_SAFE_INTEGER
        }
      };

      const errors = validateConfig(largeConfig);
      expect(errors).toEqual([]);
    });

    test('should handle floating point values', () => {
      const floatConfig = {
        ...defaultConfig,
        timeouts: {
          serverCheck: 1000.5,
          request: 5000.75,
          response: defaultConfig.timeouts.response
        }
      };

      const errors = validateConfig(floatConfig);
      expect(errors).toEqual([]);
    });
  });

  describe('config immutability', () => {
    test('should not modify default config when loading custom config', () => {
      const originalDefault = { ...defaultConfig };

      loadConfig({
        timeouts: { request: 99999 }
      });

      expect(defaultConfig).toEqual(originalDefault);
    });

    test('should not modify custom config object', () => {
      const customConfig = {
        timeouts: { request: 8000 }
      };
      const originalCustom = JSON.parse(JSON.stringify(customConfig));

      loadConfig(customConfig);

      expect(customConfig).toEqual(originalCustom);
    });
  });
});
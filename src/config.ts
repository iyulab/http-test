export interface HttpTestConfig {
  timeouts: {
    serverCheck: number;
    request: number;
    response: number;
  };
  security: {
    rejectUnauthorized: boolean;
    allowInsecureConnections: boolean;
  };
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  logging: {
    level: 'silent' | 'error' | 'warn' | 'info' | 'verbose';
    colorOutput: boolean;
  };
  performance: {
    maxConcurrentRequests: number;
    requestBufferSize: number;
  };
}

export const defaultConfig: HttpTestConfig = {
  timeouts: {
    serverCheck: 5000,
    request: 10000,
    response: 30000,
  },
  security: {
    rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
    allowInsecureConnections: false,
  },
  retries: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
  },
  logging: {
    level: 'info',
    colorOutput: true,
  },
  performance: {
    maxConcurrentRequests: 10,
    requestBufferSize: 1024 * 1024, // 1MB
  },
};

export function loadConfig(customConfig?: Partial<HttpTestConfig>): HttpTestConfig {
  if (!customConfig) {
    return { ...defaultConfig };
  }

  return {
    ...defaultConfig,
    ...customConfig,
    timeouts: {
      ...defaultConfig.timeouts,
      ...(customConfig.timeouts ? Object.fromEntries(
        Object.entries(customConfig.timeouts).filter(([, value]) => value !== undefined && value !== null)
      ) : {})
    },
    security: {
      ...defaultConfig.security,
      ...(customConfig.security ? Object.fromEntries(
        Object.entries(customConfig.security).filter(([, value]) => value !== undefined && value !== null)
      ) : {})
    },
    retries: {
      ...defaultConfig.retries,
      ...(customConfig.retries ? Object.fromEntries(
        Object.entries(customConfig.retries).filter(([, value]) => value !== undefined && value !== null)
      ) : {})
    },
    logging: {
      ...defaultConfig.logging,
      ...(customConfig.logging ? Object.fromEntries(
        Object.entries(customConfig.logging).filter(([, value]) => value !== undefined && value !== null)
      ) : {})
    },
    performance: {
      ...defaultConfig.performance,
      ...(customConfig.performance ? Object.fromEntries(
        Object.entries(customConfig.performance).filter(([, value]) => value !== undefined && value !== null)
      ) : {})
    },
  };
}

export function validateConfig(config: HttpTestConfig): string[] {
  const errors: string[] = [];

  if (config.timeouts.serverCheck <= 0) {
    errors.push('Server check timeout must be positive');
  }

  if (config.timeouts.request <= 0) {
    errors.push('Request timeout must be positive');
  }

  if (config.retries.maxAttempts < 0) {
    errors.push('Max retry attempts cannot be negative');
  }

  if (config.performance.maxConcurrentRequests <= 0) {
    errors.push('Max concurrent requests must be positive');
  }

  return errors;
}
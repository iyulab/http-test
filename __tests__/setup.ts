// Jest setup file

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    name: 'test-request',
    method: 'GET' as const,
    url: 'http://localhost:3000/test',
    headers: {},
    body: undefined,
    tests: [],
    variableUpdates: [],
    expectError: false,
    ...overrides
  }),

  createMockResponse: (overrides = {}) => ({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data: { message: 'success' },
    executionTime: 100,
    ...overrides
  }),

  createMockAssertion: (overrides = {}) => ({
    type: 'status' as const,
    value: 200,
    ...overrides
  })
};

// Extend global namespace for TypeScript
declare global {
  var testUtils: {
    createMockRequest: (overrides?: any) => any;
    createMockResponse: (overrides?: any) => any;
    createMockAssertion: (overrides?: any) => any;
  };
}
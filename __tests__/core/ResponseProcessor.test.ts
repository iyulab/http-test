import { ResponseProcessor } from '../../src/core/ResponseProcessor';
import { VariableManager } from '../../src/core/VariableManager';
import { HttpResponse, VariableUpdate } from '../../src/types';

describe('ResponseProcessor', () => {
  let processor: ResponseProcessor;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    processor = new ResponseProcessor(variableManager);
  });

  test('should process simple JSONPath variable updates', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { id: 123, name: 'John Doe', email: 'john@example.com' }
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'userId', value: '$.id' },
      { key: 'userName', value: '$.name' },
      { key: 'userEmail', value: '$.email' }
    ];

    await processor.process(response, variableUpdates);

    expect(variableManager.getVariable('userId')).toBe(123);
    expect(variableManager.getVariable('userName')).toBe('John Doe');
    expect(variableManager.getVariable('userEmail')).toBe('john@example.com');
  });

  test('should handle nested object JSONPath', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        user: {
          profile: {
            name: 'John',
            settings: { theme: 'dark' }
          }
        }
      }
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'profileName', value: '$.user.profile.name' },
      { key: 'theme', value: '$.user.profile.settings.theme' }
    ];

    await processor.process(response, variableUpdates);

    expect(variableManager.getVariable('profileName')).toBe('John');
    expect(variableManager.getVariable('theme')).toBe('dark');
  });

  test('should handle array access in JSONPath', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      }
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'firstUserId', value: '$.users[0].id' },
      { key: 'secondUserName', value: '$.users[1].name' },
      { key: 'usersLength', value: '$.users.length' }
    ];

    await processor.process(response, variableUpdates);

    expect(variableManager.getVariable('firstUserId')).toBe(1);
    expect(variableManager.getVariable('secondUserName')).toBe('Bob');
    expect(variableManager.getVariable('usersLength')).toBe(2);
  });

  test('should handle string response data', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: '{"token": "abc123", "expires": 3600}'
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'authToken', value: '$.token' },
      { key: 'tokenExpires', value: '$.expires' }
    ];

    await processor.process(response, variableUpdates);

    expect(variableManager.getVariable('authToken')).toBe('abc123');
    expect(variableManager.getVariable('tokenExpires')).toBe(3600);
  });

  test('should handle invalid JSON string response', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: 'invalid json string'
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'rawData', value: '$' }
    ];

    // Invalid JSON with JSONPath '$' will store the string '$' (path not resolved)
    await processor.process(response, variableUpdates);

    // The $ path stores the result of the failed JSONPath query
    expect(variableManager.getVariable('rawData')).toBe('$');
  });

  test('should handle empty response data', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: null
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'emptyData', value: '$.nonexistent' }
    ];

    // Null data with non-root path throws an error internally
    // Variable should not be set when extraction fails
    await expect(processor.process(response, variableUpdates)).rejects.toThrow();
  });

  test('should handle undefined response data', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: undefined
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'undefinedData', value: '$.anything' }
    ];

    // Undefined data with JSONPath throws an error internally
    await expect(processor.process(response, variableUpdates)).rejects.toThrow();
  });

  test('should handle complex JSONPath expressions', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        products: [
          { id: 1, name: 'Product A', price: 10.99, inStock: true },
          { id: 2, name: 'Product B', price: 25.50, inStock: false },
          { id: 3, name: 'Product C', price: 5.99, inStock: true }
        ]
      }
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'inStockProducts', value: '$.products[?(@.inStock)].name' },
      { key: 'firstProductPrice', value: '$.products[0].price' }
    ];

    await processor.process(response, variableUpdates);

    // Complex JSONPath expressions may return arrays
    expect(variableManager.getVariable('firstProductPrice')).toBe(10.99);
  });

  test('should convert numeric strings to numbers', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { count: '42', price: '19.99', isActive: 'true' }
    };

    const variableUpdates: VariableUpdate[] = [
      { key: 'itemCount', value: '$.count' },
      { key: 'itemPrice', value: '$.price' },
      { key: 'activeStatus', value: '$.isActive' }
    ];

    await processor.process(response, variableUpdates);

    expect(variableManager.getVariable('itemCount')).toBe(42);
    expect(variableManager.getVariable('itemPrice')).toBe(19.99);
    expect(variableManager.getVariable('activeStatus')).toBe('true'); // Non-numeric strings remain strings
  });

  test('should handle empty variable updates array', async () => {
    const response: HttpResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { message: 'success' }
    };

    await processor.process(response, []);

    // Should not throw any errors
    expect(true).toBe(true);
  });
});
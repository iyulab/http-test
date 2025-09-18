import { RequestExecutor } from '../../src/core/RequestExecutor';
import { VariableManager } from '../../src/core/VariableManager';
import { RequestError } from '../../src/errors/RequestError';
import { HttpRequest } from '../../src/types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.isAxiosError function
(axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>) = jest.fn();

describe('RequestExecutor', () => {
  let requestExecutor: RequestExecutor;
  let variableManager: VariableManager;
  let mockAxiosInstance: any;
  const baseDir = '/test/dir';

  const mockRequest: HttpRequest = {
    name: 'test-request',
    method: 'GET',
    url: 'http://localhost:3000/users',
    headers: { 'Content-Type': 'application/json' },
    body: undefined,
    tests: [],
    variableUpdates: [],
    expectError: false
  };

  beforeEach(() => {
    variableManager = new VariableManager();

    // Reset all mocks
    jest.clearAllMocks();

    // Reset axios.isAxiosError mock to default false
    (axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>)
      .mockReturnValue(false);

    // Create a proper axios instance mock
    mockAxiosInstance = jest.fn();
    mockAxiosInstance.head = jest.fn().mockResolvedValue({ status: 200 });
    mockAxiosInstance.get = jest.fn();
    mockAxiosInstance.post = jest.fn();
    mockAxiosInstance.put = jest.fn();
    mockAxiosInstance.delete = jest.fn();

    // Setup axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    requestExecutor = new RequestExecutor(variableManager, baseDir);
  });

  describe('execute', () => {

    test('should execute successful GET request', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { users: [] }
      };

      mockAxiosInstance.mockResolvedValueOnce(mockAxiosResponse);

      const result = await requestExecutor.execute(mockRequest);

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ users: [] });
      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:3000/users',
          headers: { 'Content-Type': 'application/json' },
          data: undefined,
          validateStatus: expect.any(Function)
        })
      );
    });

    test('should execute POST request with JSON body', async () => {
      const postRequest: HttpRequest = {
        ...mockRequest,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "John", "email": "john@test.com"}'
      };

      const mockAxiosResponse = {
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 1, name: 'John', email: 'john@test.com' }
      };

      mockAxiosInstance.mockResolvedValueOnce(mockAxiosResponse);

      const result = await requestExecutor.execute(postRequest);

      expect(result.status).toBe(201);
      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: { name: 'John', email: 'john@test.com' }
        })
      );
    });

    test('should replace variables in request', async () => {
      variableManager.setVariable('baseUrl', 'http://localhost:3000');
      variableManager.setVariable('userId', '123');

      const requestWithVars: HttpRequest = {
        ...mockRequest,
        url: '{{baseUrl}}/users/{{userId}}',
        headers: { 'Authorization': 'Bearer {{token}}' },
        body: '{"name": "{{name}}"}'
      };

      variableManager.setVariable('token', 'abc123');
      variableManager.setVariable('name', 'John');

      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {}
      };

      mockAxiosInstance.mockResolvedValueOnce(mockAxiosResponse);

      await requestExecutor.execute(requestWithVars);

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/users/123',
          headers: { 'Authorization': 'Bearer abc123' },
          data: '{"name": "John"}'
        })
      );
    });

    test('should handle invalid URL', async () => {
      const invalidRequest: HttpRequest = {
        ...mockRequest,
        url: 'invalid-url'
      };

      await expect(requestExecutor.execute(invalidRequest))
        .rejects.toThrow(RequestError);
    });

    test('should handle server not responding', async () => {
      const networkError = new Error('Network Error');

      (axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>)
        .mockReturnValue(true);

      mockAxiosInstance.head.mockRejectedValueOnce(networkError);

      await expect(requestExecutor.execute(mockRequest))
        .rejects.toThrow(RequestError);
    });

    test('should handle axios request error', async () => {
      const axiosError = {
        isAxiosError: true,
        request: {},
        message: 'Network Error'
      };

      (axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>)
        .mockReturnValue(true);

      mockAxiosInstance.mockRejectedValueOnce(axiosError);

      await expect(requestExecutor.execute(mockRequest))
        .rejects.toThrow(RequestError);
    });

    test('should handle axios response error', async () => {
      const errorResponse = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: { error: 'User not found' }
      };

      const axiosError = {
        isAxiosError: true,
        response: errorResponse,
        message: 'Request failed with status code 404'
      };

      (axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>)
        .mockReturnValue(true);

      mockAxiosInstance.mockRejectedValueOnce(axiosError);

      const result = await requestExecutor.execute(mockRequest);

      expect(result.status).toBe(404);
      expect(result.data).toEqual({ error: 'User not found' });
    });
  });

  describe('form data handling', () => {
    test('should handle multipart form data', async () => {
      const formRequest: HttpRequest = {
        name: 'form-test',
        method: 'POST',
        url: 'http://localhost:3000/upload',
        headers: { 'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
        body: `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="field1"\r\n\r\nvalue1\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--`,
        tests: [],
        variableUpdates: [],
        expectError: false
      };

      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true }
      };

      mockAxiosInstance.mockResolvedValueOnce(mockAxiosResponse);

      const result = await requestExecutor.execute(formRequest);

      expect(result.status).toBe(200);
      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:3000/upload'
        })
      );
    });
  });

  describe('configuration', () => {
    test('should use custom configuration', () => {
      const customConfig = {
        timeouts: {
          serverCheck: 2000,
          request: 5000,
          response: 10000
        },
        security: {
          rejectUnauthorized: true,
          allowInsecureConnections: false
        }
      };

      const customExecutor = new RequestExecutor(variableManager, baseDir, customConfig);

      expect(customExecutor).toBeInstanceOf(RequestExecutor);
    });
  });

  describe('JSON parsing', () => {
    test('should handle invalid JSON in request body', async () => {
      const invalidJsonRequest: HttpRequest = {
        ...mockRequest,
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      };

      await expect(requestExecutor.execute(invalidJsonRequest))
        .rejects.toThrow();
    });

    test('should handle valid JSON arrays', async () => {
      const arrayRequest: HttpRequest = {
        name: 'array-request',
        method: 'POST',
        url: 'http://localhost:3000/users',
        headers: { 'Content-Type': 'application/json' },
        body: '[{"id": 1}, {"id": 2}]',
        tests: [],
        variableUpdates: [],
        expectError: false
      };

      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { received: true }
      };

      mockAxiosInstance.mockResolvedValueOnce(mockAxiosResponse);

      const result = await requestExecutor.execute(arrayRequest);

      expect(result.status).toBe(200);
      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ id: 1 }, { id: 2 }]
        })
      );
    });
  });

  describe('timeout handling', () => {
    test('should handle request timeout', async () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      };

      (axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>)
        .mockReturnValue(true);

      mockAxiosInstance.mockRejectedValueOnce(timeoutError);

      await expect(requestExecutor.execute(mockRequest))
        .rejects.toThrow(RequestError);
    });
  });

  describe('URL validation', () => {
    test('should validate HTTP URLs', async () => {
      const httpRequest: HttpRequest = {
        ...mockRequest,
        url: 'http://example.com/api'
      };

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {}
      };

      mockAxiosInstance.mockResolvedValueOnce(mockResponse);

      await expect(requestExecutor.execute(httpRequest)).resolves.toBeDefined();
    });

    test('should validate HTTPS URLs', async () => {
      const httpsRequest: HttpRequest = {
        ...mockRequest,
        url: 'https://example.com/api'
      };

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {}
      };

      mockAxiosInstance.mockResolvedValueOnce(mockResponse);

      await expect(requestExecutor.execute(httpsRequest)).resolves.toBeDefined();
    });

    test('should reject malformed URLs', async () => {
      const malformedRequest: HttpRequest = {
        ...mockRequest,
        url: 'not-a-url'
      };

      await expect(requestExecutor.execute(malformedRequest))
        .rejects.toThrow(RequestError);
    });
  });
});
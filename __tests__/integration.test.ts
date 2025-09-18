import { HttpFileParser } from '../src/core/HttpFileParser';
import { TestManager } from '../src/core/TestManager';
import { VariableManager } from '../src/core/VariableManager';
import { RequestExecutor } from '../src/core/RequestExecutor';
import { AssertionEngine } from '../src/core/AssertionEngine';
import { ResponseProcessor } from '../src/core/ResponseProcessor';
import { TestResultCollector } from '../src/core/TestResultCollector';
import { TestParser } from '../src/core/TestParser';
import { HttpRequestParser } from '../src/core/HttpRequestParser';
import axios from 'axios';
import { readFile } from '../src/utils/fileUtils';

// Mock dependencies
jest.mock('axios');
jest.mock('../src/utils/fileUtils');

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Integration Tests', () => {
  let variableManager: VariableManager;
  let testManager: TestManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    testManager = new TestManager('/test/dir/test.http');

    // Setup axios mocks
    mockedAxios.create.mockReturnValue(mockedAxios as any);
    mockedAxios.head.mockResolvedValue({ status: 200 });
    mockedAxios.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { message: 'success' }
    });
  });

  describe('TestManager', () => {
    test('should initialize with default values', () => {
      expect(testManager).toBeInstanceOf(TestManager);
    });

    test('should execute empty test list', async () => {
      const results = await testManager.run([]);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('TestResultCollector', () => {
    test('should collect test results', () => {
      const collector = new TestResultCollector();

      const result1 = {
        name: 'Test 1',
        passed: true,
        executionTime: 100
      };

      const result2 = {
        name: 'Test 2',
        passed: false,
        error: new Error('Test failed'),
        executionTime: 200
      };

      collector.addResult(result1);
      collector.addResult(result2);

      const summary = collector.getSummary();
      expect(summary.totalTests).toBe(2);
      expect(summary.passedTests).toBe(1);
      expect(summary.failedTests).toBe(1);
      expect(summary.results).toHaveLength(2);
    });
  });

  describe('TestParser', () => {
    test('should parse test lines', () => {
      const parser = new TestParser(variableManager);
      const testLines = [
        '#### Test Status Code',
        'status: 200'
      ];

      const result = parser.parse(testLines);
      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].type).toBe('Assert');
      expect(result.tests[0].name).toBe('Test Status Code');
    });
  });

  describe('HttpRequestParser', () => {
    test('should parse HTTP request', () => {
      const parser = new HttpRequestParser(variableManager);
      const requestSection = `### Test Request
GET http://localhost:3000/users
Content-Type: application/json
Authorization: Bearer token123

{"name": "test"}`;

      const request = parser.parse(requestSection);
      expect(request.name).toBe('Test Request');
      expect(request.method).toBe('GET');
      expect(request.url).toBe('http://localhost:3000/users');
      expect(request.headers['Content-Type']).toBe('application/json');
      expect(request.headers['Authorization']).toBe('Bearer token123');
    });
  });

  describe('ResponseProcessor', () => {
    test('should process response and update variables', async () => {
      const processor = new ResponseProcessor(variableManager);
      const response = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { id: 123, name: 'John' }
      };

      const variableUpdates = [
        { key: 'userId', value: '$.id' },
        { key: 'userName', value: '$.name' }
      ];

      await processor.process(response, variableUpdates);

      expect(variableManager.getVariable('userId')).toBe(123);
      expect(variableManager.getVariable('userName')).toBe('John');
    });
  });

  describe('Full workflow integration', () => {
    test('should parse and execute simple HTTP request', async () => {
      const httpContent = `### Test request
GET http://localhost:3000/test
Content-Type: application/json

#### Test Status
status: 200
`;

      mockedReadFile.mockResolvedValue(httpContent);

      const parser = new HttpFileParser(variableManager);
      const requests = await parser.parse('/test/file.http');

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('GET');
      expect(requests[0].url).toBe('http://localhost:3000/test');
      expect(requests[0].name).toBe('Test request');
      expect(requests[0].tests).toHaveLength(1);
    });
  });

  describe('Error scenarios', () => {
    test('should handle request executor errors gracefully', async () => {
      const executor = new RequestExecutor(variableManager, '/test');
      const invalidRequest = {
        name: 'Invalid Request',
        method: 'GET' as const,
        url: 'invalid-url',
        headers: {},
        tests: [],
        variableUpdates: [],
        expectError: false
      };

      await expect(executor.execute(invalidRequest)).rejects.toThrow();
    });

    test('should handle assertion errors', async () => {
      const engine = new AssertionEngine(variableManager);
      const response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: null
      };

      const assertion = {
        type: 'status' as const,
        value: 200
      };

      await expect(engine.assert(assertion, response)).rejects.toThrow();
    });
  });

  describe('Variable integration', () => {
    test('should maintain variables across multiple requests', () => {
      // Set initial variables
      variableManager.setVariable('baseUrl', 'http://localhost:3000');
      variableManager.setVariable('version', 'v1');

      // Use variables in template
      const template = '{{baseUrl}}/api/{{version}}/users';
      const result = variableManager.replaceVariables(template);

      expect(result).toBe('http://localhost:3000/api/v1/users');

      // Update variables
      variableManager.setVariable('version', 'v2');
      const updatedResult = variableManager.replaceVariables(template);

      expect(updatedResult).toBe('http://localhost:3000/api/v2/users');
    });
  });
});
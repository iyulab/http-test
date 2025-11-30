/**
 * Execution Pipeline Tests
 *
 * TDD tests for the request/response execution pipeline.
 */
import { HttpRequest, HttpResponse } from '../../src/types';
import {
  IPipelineStage,
  PipelineContext,
  RequestPreprocessor,
  ResponsePostprocessor,
  ExecutionPipeline
} from '../../src/pipeline';

describe('IPipelineStage Contract', () => {
  const createRequest = (): HttpRequest => ({
    name: 'Test Request',
    method: 'GET',
    url: 'http://example.com/api/{{path}}',
    headers: { 'X-Token': '{{token}}' },
    tests: [],
    variableUpdates: []
  });

  const createResponse = (): HttpResponse => ({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data: { id: 1, token: 'new_token' },
    time: 100
  });

  const createContext = (vars: Record<string, string> = {}): PipelineContext => ({
    variables: {
      get: (key: string) => vars[key],
      set: jest.fn(),
      replace: (content: string) => {
        return content.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key.trim()] || `{{${key}}}`);
      }
    },
    globals: new Map<string, any>()
  });

  describe('RequestPreprocessor', () => {
    let preprocessor: RequestPreprocessor;

    beforeEach(() => {
      preprocessor = new RequestPreprocessor();
    });

    it('should have correct name', () => {
      expect(preprocessor.name).toBe('request-preprocessor');
    });

    it('should replace variables in URL', async () => {
      const request = createRequest();
      const context = createContext({ path: 'users', token: 'abc123' });

      const result = await preprocessor.processRequest(request, context);

      expect(result.url).toBe('http://example.com/api/users');
    });

    it('should replace variables in headers', async () => {
      const request = createRequest();
      const context = createContext({ path: 'users', token: 'abc123' });

      const result = await preprocessor.processRequest(request, context);

      expect(result.headers['X-Token']).toBe('abc123');
    });

    it('should replace variables in body', async () => {
      const request: HttpRequest = {
        ...createRequest(),
        body: '{"userId": "{{userId}}"}'
      };
      const context = createContext({ userId: '42', path: 'x', token: 'x' });

      const result = await preprocessor.processRequest(request, context);

      expect(result.body).toBe('{"userId": "42"}');
    });

    it('should not modify request without variables', async () => {
      const request: HttpRequest = {
        name: 'Test',
        method: 'GET',
        url: 'http://example.com/api',
        headers: {},
        tests: [],
        variableUpdates: []
      };
      const context = createContext();

      const result = await preprocessor.processRequest(request, context);

      expect(result.url).toBe('http://example.com/api');
    });
  });

  describe('ResponsePostprocessor', () => {
    let postprocessor: ResponsePostprocessor;

    beforeEach(() => {
      postprocessor = new ResponsePostprocessor();
    });

    it('should have correct name', () => {
      expect(postprocessor.name).toBe('response-postprocessor');
    });

    it('should extract variables from JSONPath', async () => {
      const request: HttpRequest = {
        ...createRequest(),
        variableUpdates: [
          { key: 'userId', value: '$.id' },
          { key: 'newToken', value: '$.token' }
        ]
      };
      const response = createResponse();
      const context = createContext();

      await postprocessor.processResponse(request, response, context);

      expect(context.variables.set).toHaveBeenCalledWith('userId', 1);
      expect(context.variables.set).toHaveBeenCalledWith('newToken', 'new_token');
    });

    it('should handle missing JSONPath gracefully', async () => {
      const request: HttpRequest = {
        ...createRequest(),
        variableUpdates: [
          { key: 'missing', value: '$.nonexistent' }
        ]
      };
      const response = createResponse();
      const context = createContext();

      // Should not throw
      await postprocessor.processResponse(request, response, context);

      expect(context.variables.set).not.toHaveBeenCalledWith('missing', expect.anything());
    });

    it('should handle string response body', async () => {
      const request: HttpRequest = {
        ...createRequest(),
        variableUpdates: [
          { key: 'id', value: '$.id' }
        ]
      };
      const response: HttpResponse = {
        ...createResponse(),
        data: '{"id": 123}'
      };
      const context = createContext();

      await postprocessor.processResponse(request, response, context);

      expect(context.variables.set).toHaveBeenCalledWith('id', 123);
    });
  });

  describe('ExecutionPipeline', () => {
    let pipeline: ExecutionPipeline;

    beforeEach(() => {
      pipeline = new ExecutionPipeline();
    });

    it('should add stages', () => {
      pipeline.addStage(new RequestPreprocessor());
      pipeline.addStage(new ResponsePostprocessor());

      expect(pipeline.getStageCount()).toBe(2);
    });

    it('should execute request stages in order', async () => {
      const executionOrder: string[] = [];

      const stage1: IPipelineStage = {
        name: 'stage1',
        processRequest: async (request, context) => {
          executionOrder.push('stage1');
          return request;
        }
      };

      const stage2: IPipelineStage = {
        name: 'stage2',
        processRequest: async (request, context) => {
          executionOrder.push('stage2');
          return request;
        }
      };

      pipeline.addStage(stage1);
      pipeline.addStage(stage2);

      const request = createRequest();
      const context = createContext();

      await pipeline.processRequest(request, context);

      expect(executionOrder).toEqual(['stage1', 'stage2']);
    });

    it('should pass modified request through stages', async () => {
      const stage1: IPipelineStage = {
        name: 'stage1',
        processRequest: async (request, context) => {
          return { ...request, url: request.url + '/modified' };
        }
      };

      const stage2: IPipelineStage = {
        name: 'stage2',
        processRequest: async (request, context) => {
          return { ...request, url: request.url + '/again' };
        }
      };

      pipeline.addStage(stage1);
      pipeline.addStage(stage2);

      const request: HttpRequest = {
        name: 'Test',
        method: 'GET',
        url: 'http://example.com',
        headers: {},
        tests: [],
        variableUpdates: []
      };
      const context = createContext();

      const result = await pipeline.processRequest(request, context);

      expect(result.url).toBe('http://example.com/modified/again');
    });

    it('should execute response stages in order', async () => {
      const executionOrder: string[] = [];

      const stage1: IPipelineStage = {
        name: 'stage1',
        processResponse: async (request, response, context) => {
          executionOrder.push('stage1');
        }
      };

      const stage2: IPipelineStage = {
        name: 'stage2',
        processResponse: async (request, response, context) => {
          executionOrder.push('stage2');
        }
      };

      pipeline.addStage(stage1);
      pipeline.addStage(stage2);

      const request = createRequest();
      const response = createResponse();
      const context = createContext();

      await pipeline.processResponse(request, response, context);

      expect(executionOrder).toEqual(['stage1', 'stage2']);
    });

    it('should skip stages without processRequest method', async () => {
      const responseOnlyStage: IPipelineStage = {
        name: 'response-only',
        processResponse: async () => {}
      };

      pipeline.addStage(responseOnlyStage);

      const request = createRequest();
      const context = createContext();

      const result = await pipeline.processRequest(request, context);

      expect(result).toEqual(request);
    });

    it('should skip stages without processResponse method', async () => {
      const requestOnlyStage: IPipelineStage = {
        name: 'request-only',
        processRequest: async (request) => request
      };

      pipeline.addStage(requestOnlyStage);

      const request = createRequest();
      const response = createResponse();
      const context = createContext();

      // Should not throw
      await pipeline.processResponse(request, response, context);
    });
  });

  describe('Default Pipeline', () => {
    it('should create pipeline with default stages', () => {
      const pipeline = ExecutionPipeline.createDefault();

      expect(pipeline.getStageCount()).toBeGreaterThan(0);
    });

    it('should process request and response with defaults', async () => {
      const pipeline = ExecutionPipeline.createDefault();

      const request: HttpRequest = {
        name: 'Test',
        method: 'GET',
        url: 'http://example.com/{{path}}',
        headers: {},
        tests: [],
        variableUpdates: [{ key: 'resultId', value: '$.id' }]
      };

      const setMock = jest.fn();
      const context: PipelineContext = {
        variables: {
          get: (key: string) => key === 'path' ? 'users' : undefined,
          set: setMock,
          replace: (content: string) => content.replace('{{path}}', 'users')
        },
        globals: new Map()
      };

      const processedRequest = await pipeline.processRequest(request, context);
      expect(processedRequest.url).toBe('http://example.com/users');

      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: { id: 42 }
      };

      await pipeline.processResponse(request, response, context);
      expect(setMock).toHaveBeenCalledWith('resultId', 42);
    });
  });
});

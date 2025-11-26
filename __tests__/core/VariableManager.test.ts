import { VariableManager } from '../../src/core/VariableManager';

describe('VariableManager', () => {
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
  });

  describe('setVariable', () => {
    test('should set a string variable', () => {
      variableManager.setVariable('test', 'value');
      expect(variableManager.getVariable('test')).toBe('value');
    });

    test('should set a number variable', () => {
      variableManager.setVariable('count', 42);
      expect(variableManager.getVariable('count')).toBe(42);
    });

    test('should set a boolean variable', () => {
      variableManager.setVariable('flag', true);
      expect(variableManager.getVariable('flag')).toBe(true);
    });

    test('should overwrite existing variable', () => {
      variableManager.setVariable('test', 'old');
      variableManager.setVariable('test', 'new');
      expect(variableManager.getVariable('test')).toBe('new');
    });
  });

  describe('getVariable', () => {
    test('should return undefined for non-existent variable', () => {
      expect(variableManager.getVariable('nonexistent')).toBeUndefined();
    });

    test('should return correct value for existing variable', () => {
      variableManager.setVariable('test', 'value');
      expect(variableManager.getVariable('test')).toBe('value');
    });
  });

  describe('setVariables', () => {
    test('should set multiple variables', () => {
      const variables = {
        str: 'string',
        num: 123,
        bool: false
      };

      variableManager.setVariables(variables);

      expect(variableManager.getVariable('str')).toBe('string');
      expect(variableManager.getVariable('num')).toBe(123);
      expect(variableManager.getVariable('bool')).toBe(false);
    });

    test('should merge with existing variables', () => {
      variableManager.setVariable('existing', 'value');

      variableManager.setVariables({
        new: 'newValue',
        existing: 'updated'
      });

      expect(variableManager.getVariable('existing')).toBe('updated');
      expect(variableManager.getVariable('new')).toBe('newValue');
    });
  });

  describe('getAllVariables', () => {
    test('should return empty object initially', () => {
      expect(variableManager.getAllVariables()).toEqual({});
    });

    test('should return all variables', () => {
      variableManager.setVariable('a', 1);
      variableManager.setVariable('b', 'test');
      variableManager.setVariable('c', true);

      const allVars = variableManager.getAllVariables();
      expect(allVars).toEqual({
        a: 1,
        b: 'test',
        c: true
      });
    });
  });

  describe('replaceVariables', () => {
    beforeEach(() => {
      variableManager.setVariable('baseUrl', 'http://localhost:3000');
      variableManager.setVariable('userId', '123');
      variableManager.setVariable('token', 'abc123');
    });

    test('should replace single variable', () => {
      const result = variableManager.replaceVariables('{{baseUrl}}/users');
      expect(result).toBe('http://localhost:3000/users');
    });

    test('should replace multiple variables', () => {
      const result = variableManager.replaceVariables('{{baseUrl}}/users/{{userId}}');
      expect(result).toBe('http://localhost:3000/users/123');
    });

    test('should handle nested variables (single level only)', () => {
      // Note: Deep nested variable resolution is not supported
      // This matches REST Client behavior which also doesn't resolve nested references
      variableManager.setVariable('endpoint', '/users/{{userId}}');
      const result = variableManager.replaceVariables('{{baseUrl}}{{endpoint}}');
      // Nested {{userId}} inside endpoint value is not resolved (expected behavior)
      expect(result).toBe('http://localhost:3000/users/{{userId}}');
    });

    test('should return original string if no variables', () => {
      const input = '/users/static';
      expect(variableManager.replaceVariables(input)).toBe(input);
    });

    test('should handle missing variables gracefully', () => {
      const result = variableManager.replaceVariables('{{baseUrl}}/{{missing}}');
      expect(result).toBe('http://localhost:3000/{{missing}}');
    });

    test('should handle malformed variable syntax', () => {
      const result = variableManager.replaceVariables('{{baseUrl}/users');
      expect(result).toBe('{{baseUrl}/users');
    });

    test('should handle empty variable name', () => {
      const result = variableManager.replaceVariables('{{}}');
      expect(result).toBe('{{}}');
    });

    test('should handle variables in JSON body', () => {
      const jsonBody = JSON.stringify({
        name: '{{userName}}',
        token: '{{token}}'
      });

      variableManager.setVariable('userName', 'John');

      const result = variableManager.replaceVariables(jsonBody);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('John');
      expect(parsed.token).toBe('abc123');
    });

    test('should handle boolean and number variables', () => {
      variableManager.setVariable('count', 42);
      variableManager.setVariable('enabled', true);

      const result = variableManager.replaceVariables('count: {{count}}, enabled: {{enabled}}');
      expect(result).toBe('count: 42, enabled: true');
    });
  });

  describe('edge cases', () => {
    test('should handle circular variable references', () => {
      variableManager.setVariable('a', '{{b}}');
      variableManager.setVariable('b', '{{a}}');

      const result = variableManager.replaceVariables('{{a}}');
      // Should prevent infinite recursion
      expect(result).toBe('{{b}}');
    });

    test('should handle complex nested structure (single level only)', () => {
      // Note: Deep nested variable resolution is not supported
      // Variables containing other variable references are returned as-is
      variableManager.setVariable('protocol', 'https');
      variableManager.setVariable('domain', 'api.example.com');
      variableManager.setVariable('version', 'v1');
      variableManager.setVariable('baseUrl', '{{protocol}}://{{domain}}/{{version}}');

      const result = variableManager.replaceVariables('{{baseUrl}}/users');
      // The value of baseUrl contains nested references that are not resolved
      expect(result).toBe('{{protocol}}://{{domain}}/{{version}}/users');
    });
  });

  describe('Named Request Response Storage', () => {
    beforeEach(() => {
      variableManager.clearNamedResponses();
    });

    test('should store and retrieve named response', () => {
      const response = {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        data: '{"token": "abc123", "userId": 42}'
      };

      variableManager.storeNamedResponse('login', response);
      const stored = variableManager.getNamedResponse('login');

      expect(stored).toBeDefined();
      expect(stored!.status).toBe(200);
      expect(stored!.headers['Content-Type']).toBe('application/json');
      expect(stored!.body).toEqual({ token: 'abc123', userId: 42 });
    });

    test('should parse JSON string body', () => {
      const response = {
        status: 200,
        headers: {},
        data: '{"nested": {"value": "test"}}'
      };

      variableManager.storeNamedResponse('test', response);
      const stored = variableManager.getNamedResponse('test');

      expect(stored!.body).toEqual({ nested: { value: 'test' } });
    });

    test('should keep non-JSON body as string', () => {
      const response = {
        status: 200,
        headers: {},
        data: 'plain text response'
      };

      variableManager.storeNamedResponse('text', response);
      const stored = variableManager.getNamedResponse('text');

      expect(stored!.body).toBe('plain text response');
    });

    test('should return undefined for non-existent named response', () => {
      expect(variableManager.getNamedResponse('nonexistent')).toBeUndefined();
    });

    test('should clear named responses', () => {
      variableManager.storeNamedResponse('test', {
        status: 200,
        headers: {},
        data: '{}'
      });

      variableManager.clearNamedResponses();
      expect(variableManager.getNamedResponse('test')).toBeUndefined();
    });
  });

  describe('Named Request Reference Syntax', () => {
    beforeEach(() => {
      variableManager.clearNamedResponses();

      // Store a sample response
      const loginResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': 'req-123'
        },
        data: JSON.stringify({
          token: 'jwt-token-abc',
          user: {
            id: 42,
            name: 'John Doe',
            roles: ['admin', 'user']
          },
          metadata: {
            createdAt: '2024-01-01'
          }
        })
      };

      variableManager.storeNamedResponse('login', loginResponse);
    });

    test('should replace response.status', () => {
      const result = variableManager.replaceVariables('Status: {{login.response.status}}');
      expect(result).toBe('Status: 200');
    });

    test('should replace response.statusText', () => {
      const result = variableManager.replaceVariables('Text: {{login.response.statusText}}');
      expect(result).toBe('Text: OK');
    });

    test('should replace response.headers', () => {
      const result = variableManager.replaceVariables('Type: {{login.response.headers.Content-Type}}');
      expect(result).toBe('Type: application/json');
    });

    test('should handle case-insensitive header lookup', () => {
      const result = variableManager.replaceVariables('{{login.response.headers.content-type}}');
      expect(result).toBe('application/json');
    });

    test('should replace response.body for entire body', () => {
      const result = variableManager.replaceVariables('{{login.response.body}}');
      const parsed = JSON.parse(result);
      expect(parsed.token).toBe('jwt-token-abc');
    });

    test('should replace response.body.field for simple field', () => {
      const result = variableManager.replaceVariables('Token: {{login.response.body.token}}');
      expect(result).toBe('Token: jwt-token-abc');
    });

    test('should replace nested body fields', () => {
      const result = variableManager.replaceVariables('User: {{login.response.body.user.name}}');
      expect(result).toBe('User: John Doe');
    });

    test('should replace deeply nested fields', () => {
      const result = variableManager.replaceVariables('Created: {{login.response.body.metadata.createdAt}}');
      expect(result).toBe('Created: 2024-01-01');
    });

    test('should handle array access with bracket notation', () => {
      const result = variableManager.replaceVariables('Role: {{login.response.body.user.roles[0]}}');
      expect(result).toBe('Role: admin');
    });

    test('should keep original if named request not found', () => {
      const result = variableManager.replaceVariables('{{unknown.response.body.field}}');
      expect(result).toBe('{{unknown.response.body.field}}');
    });

    test('should keep original if path not found', () => {
      const result = variableManager.replaceVariables('{{login.response.body.nonexistent}}');
      expect(result).toBe('{{login.response.body.nonexistent}}');
    });

    test('should handle multiple named request references', () => {
      // Store another response
      variableManager.storeNamedResponse('getUser', {
        status: 200,
        headers: {},
        data: JSON.stringify({ userId: 99 })
      });

      const result = variableManager.replaceVariables(
        'Login token: {{login.response.body.token}}, User: {{getUser.response.body.userId}}'
      );
      expect(result).toBe('Login token: jwt-token-abc, User: 99');
    });

    test('should work with regular variables', () => {
      variableManager.setVariable('baseUrl', 'http://localhost:3000');

      const result = variableManager.replaceVariables(
        '{{baseUrl}}/users/{{login.response.body.user.id}}'
      );
      expect(result).toBe('http://localhost:3000/users/42');
    });

    test('should handle JSONPath expression in body', () => {
      const result = variableManager.replaceVariables('{{login.response.body.$.user.id}}');
      expect(result).toBe('42');
    });

    test('should return object as JSON string', () => {
      const result = variableManager.replaceVariables('{{login.response.body.user}}');
      const parsed = JSON.parse(result);
      expect(parsed.id).toBe(42);
      expect(parsed.name).toBe('John Doe');
    });
  });
});
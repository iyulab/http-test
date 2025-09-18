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

    test('should handle nested variables', () => {
      variableManager.setVariable('endpoint', '/users/{{userId}}');
      const result = variableManager.replaceVariables('{{baseUrl}}{{endpoint}}');
      expect(result).toBe('http://localhost:3000/users/123');
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

    test('should handle complex nested structure', () => {
      variableManager.setVariable('protocol', 'https');
      variableManager.setVariable('domain', 'api.example.com');
      variableManager.setVariable('version', 'v1');
      variableManager.setVariable('baseUrl', '{{protocol}}://{{domain}}/{{version}}');

      const result = variableManager.replaceVariables('{{baseUrl}}/users');
      expect(result).toBe('https://api.example.com/v1/users');
    });
  });
});
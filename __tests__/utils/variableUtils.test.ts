import { replaceVariables } from '../../src/utils/variableUtils';

describe('VariableUtils', () => {
  describe('replaceVariables', () => {
    const variables = {
      baseUrl: 'http://localhost:3000',
      userId: '123',
      token: 'abc123token',
      version: 'v1',
      enable: 'true',
      count: '42'
    };

    test('should replace single variable', () => {
      const template = 'API endpoint: {{baseUrl}}/api';
      const result = replaceVariables(template, variables);
      expect(result).toBe('API endpoint: http://localhost:3000/api');
    });

    test('should replace multiple variables', () => {
      const template = '{{baseUrl}}/{{version}}/users/{{userId}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('http://localhost:3000/v1/users/123');
    });

    test('should handle variables in different parts of string', () => {
      const template = 'Bearer {{token}} for user {{userId}} on {{baseUrl}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('Bearer abc123token for user 123 on http://localhost:3000');
    });

    test('should leave unknown variables unchanged', () => {
      const template = '{{baseUrl}}/{{unknown}}/{{userId}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('http://localhost:3000/{{unknown}}/123');
    });

    test('should handle empty template', () => {
      const result = replaceVariables('', variables);
      expect(result).toBe('');
    });

    test('should handle template without variables', () => {
      const template = 'No variables here';
      const result = replaceVariables(template, variables);
      expect(result).toBe('No variables here');
    });

    test('should handle empty variables object', () => {
      const template = '{{baseUrl}}/{{userId}}';
      const result = replaceVariables(template, {});
      expect(result).toBe('{{baseUrl}}/{{userId}}');
    });

    test('should handle malformed variable syntax', () => {
      const template = 'Malformed {baseUrl} and {{unclosed and }}extra}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('Malformed {baseUrl} and {{unclosed and }}extra}}');
    });

    test('should handle nested braces', () => {
      const template = 'Test {{{baseUrl}}} with extra braces';
      const result = replaceVariables(template, variables);
      expect(result).toBe('Test {http://localhost:3000} with extra braces');
    });

    test('should handle consecutive variables', () => {
      const template = '{{baseUrl}}{{version}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('http://localhost:3000v1');
    });

    test('should handle variables with spaces around names', () => {
      const template = '{{ baseUrl }}/{{ userId }}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('{{ baseUrl }}/{{ userId }}'); // Should not match due to spaces
    });

    test('should handle duplicate variables', () => {
      const template = '{{userId}}-{{userId}}-{{userId}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('123-123-123');
    });

    test('should handle variables in JSON-like strings', () => {
      const template = '{"user": "{{userId}}", "token": "{{token}}", "enabled": {{enable}}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('{"user": "123", "token": "abc123token", "enabled": true}');
    });

    test('should handle variables in URLs', () => {
      const template = '{{baseUrl}}/api/{{version}}/users/{{userId}}?token={{token}}&count={{count}}';
      const result = replaceVariables(template, variables);
      expect(result).toBe('http://localhost:3000/api/v1/users/123?token=abc123token&count=42');
    });

    test('should handle case-sensitive variable names', () => {
      const caseVariables = {
        UserId: '123',
        userid: '456',
        USERID: '789'
      };

      const template = '{{UserId}}-{{userid}}-{{USERID}}';
      const result = replaceVariables(template, caseVariables);
      expect(result).toBe('123-456-789');
    });

    test('should handle special characters in variable values', () => {
      const specialVariables = {
        special: 'hello@world.com',
        encoded: 'value%20with%20spaces',
        symbols: '!@#$%^&*()',
        unicode: '🚀🌟💻'
      };

      const template = 'Email: {{special}}, Encoded: {{encoded}}, Symbols: {{symbols}}, Unicode: {{unicode}}';
      const result = replaceVariables(template, specialVariables);
      expect(result).toBe('Email: hello@world.com, Encoded: value%20with%20spaces, Symbols: !@#$%^&*(), Unicode: 🚀🌟💻');
    });

    test('should handle very long variable names', () => {
      const longVariables = {
        thisIsAVeryLongVariableNameThatSomeoneDecidedToUseForSomeReason: 'longValue'
      };

      const template = 'Value: {{thisIsAVeryLongVariableNameThatSomeoneDecidedToUseForSomeReason}}';
      const result = replaceVariables(template, longVariables);
      expect(result).toBe('Value: longValue');
    });

    test('should handle empty variable values', () => {
      const emptyVariables = {
        empty: '',
        baseUrl: 'http://localhost'
      };

      const template = '{{baseUrl}}/{{empty}}/path';
      const result = replaceVariables(template, emptyVariables);
      expect(result).toBe('http://localhost//path');
    });

    test('should handle numeric and boolean-like variable values', () => {
      const mixedVariables = {
        zero: '0',
        negative: '-42',
        float: '3.14',
        boolTrue: 'true',
        boolFalse: 'false',
        nullish: 'null'
      };

      const template = 'Zero: {{zero}}, Negative: {{negative}}, Float: {{float}}, True: {{boolTrue}}, False: {{boolFalse}}, Null: {{nullish}}';
      const result = replaceVariables(template, mixedVariables);
      expect(result).toBe('Zero: 0, Negative: -42, Float: 3.14, True: true, False: false, Null: null');
    });
  });
});
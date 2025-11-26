import { TestParser } from '../../src/core/TestParser';
import { VariableManager } from '../../src/core/VariableManager';

describe('TestParser', () => {
  let parser: TestParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new TestParser(variableManager);
  });

  test('should parse test with assertions', () => {
    const lines = [
      '#### Status Test',
      'status: 200',
      'header.content-type: application/json'
    ];

    const result = parser.parse(lines);

    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('Status Test');
    expect(result.tests[0].type).toBe('Assert');
    expect(result.tests[0].assertions).toHaveLength(2);
  });

  test('should parse multiple tests', () => {
    const lines = [
      '#### First Test',
      'status: 200',
      '#### Second Test',
      'status: 201',
      'header.location: /api/users/123'
    ];

    const result = parser.parse(lines);

    expect(result.tests).toHaveLength(2);
    expect(result.tests[0].name).toBe('First Test');
    expect(result.tests[1].name).toBe('Second Test');
    expect(result.tests[0].assertions).toHaveLength(1);
    expect(result.tests[1].assertions).toHaveLength(2);
  });

  test('should parse variable updates', () => {
    const lines = [
      '@userId = $.id',
      '@token = $.auth.token',
      '#### Test',
      'status: 200'
    ];

    const result = parser.parse(lines);

    expect(result.variableUpdates).toHaveLength(2);
    expect(result.variableUpdates[0].key).toBe('userId');
    expect(result.variableUpdates[0].value).toBe('$.id');
    expect(result.variableUpdates[1].key).toBe('token');
    expect(result.variableUpdates[1].value).toBe('$.auth.token');
    expect(result.tests).toHaveLength(1);
  });

  test('should handle empty lines', () => {
    const lines = [
      '',
      '#### Test',
      '',
      'status: 200',
      ''
    ];

    const result = parser.parse(lines);

    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].assertions).toHaveLength(1);
  });

  test('should handle lines without colons in tests', () => {
    const lines = [
      '#### Test',
      'status: 200',
      'some line without colon',
      'header.type: json'
    ];

    const result = parser.parse(lines);

    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].assertions).toHaveLength(2); // Only lines with colons are parsed as assertions
  });

  test('should replace variables in variable updates', () => {
    variableManager.setVariable('baseUrl', 'http://api.example.com');

    const lines = [
      '@endpoint = {{baseUrl}}/users'
    ];

    const result = parser.parse(lines);

    expect(result.variableUpdates).toHaveLength(1);
    expect(result.variableUpdates[0].value).toBe('http://api.example.com/users');
  });

  test('should handle malformed variable lines', () => {
    const lines = [
      '@malformed',
      '@=nokey',
      '@goodVar = value',
      '#### Test',
      'status: 200'
    ];

    const result = parser.parse(lines);

    expect(result.variableUpdates).toHaveLength(1);
    expect(result.variableUpdates[0].key).toBe('goodVar');
    expect(result.variableUpdates[0].value).toBe('value');
  });

  test('should parse status assertions', () => {
    const lines = [
      '#### Status Test',
      'status: 200'
    ];

    const result = parser.parse(lines);

    expect(result.tests[0].assertions[0].type).toBe('status');
    expect(result.tests[0].assertions[0].value).toBe(200);
  });

  test('should parse header assertions', () => {
    // Note: Current implementation uses 'content-type:' syntax for header assertions
    const lines = [
      '#### Header Test',
      'content-type: application/json'
    ];

    const result = parser.parse(lines);

    expect(result.tests[0].assertions[0].type).toBe('header');
    expect(result.tests[0].assertions[0].key).toBe('Content-Type');
    expect(result.tests[0].assertions[0].value).toBe('application/json');
  });

  test('should parse body assertions', () => {
    // Note: Current implementation uses '$.' prefix directly for body assertions
    const lines = [
      '#### Body Test',
      '$.id: 123',
      '$.name: John'
    ];

    const result = parser.parse(lines);

    expect(result.tests[0].assertions).toHaveLength(2);
    expect(result.tests[0].assertions[0].type).toBe('body');
    expect(result.tests[0].assertions[0].key).toBe('$.id');
    expect(result.tests[0].assertions[0].value).toBe(123);
    expect(result.tests[0].assertions[1].type).toBe('body');
    expect(result.tests[0].assertions[1].key).toBe('$.name');
    expect(result.tests[0].assertions[1].value).toBe('John');
  });

  test('should handle custom assertions', () => {
    // Note: Custom assertions use '_customassert:' prefix (file path to validator)
    const lines = [
      '#### Custom Test',
      '_customassert: ./validators/check.js'
    ];

    const result = parser.parse(lines);

    expect(result.tests[0].assertions[0].type).toBe('custom');
    expect(result.tests[0].assertions[0].value).toBe('./validators/check.js');
  });

  test('should return empty result for empty input', () => {
    const result = parser.parse([]);

    expect(result.tests).toHaveLength(0);
    expect(result.variableUpdates).toHaveLength(0);
  });
});
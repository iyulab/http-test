import { JsonParser } from '../../src/parsers/JsonParser';
import { VariableManager } from '../../src/core/VariableManager';

describe('JsonParser', () => {
  let parser: JsonParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new JsonParser({ variableManager });
  });

  test('should parse body with variable replacement', () => {
    variableManager.setVariable('name', 'John');
    const result = parser.parseBody('{"name": "{{name}}", "age": 30}');
    expect(result).toBe('{"name": "John", "age": 30}');
  });

  test('should identify JSON object start', () => {
    expect(parser.isBodyStart('{')).toBe(true);
    expect(parser.isBodyStart('[')).toBe(true);
    expect(parser.isBodyStart('test')).toBe(false);
  });

  test('should identify JSON object end', () => {
    expect(parser.isBodyEnd('}')).toBe(true);
    expect(parser.isBodyEnd(']')).toBe(true);
    expect(parser.isBodyEnd('test')).toBe(false);
  });

  test('should handle empty body', () => {
    const result = parser.parseBody('');
    expect(result).toBe('');
  });

  test('should handle body without variables', () => {
    const result = parser.parseBody('{"test": "value"}');
    expect(result).toBe('{"test": "value"}');
  });
});
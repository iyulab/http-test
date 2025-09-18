import { PlainTextParser } from '../../src/parsers/PlainTextParser';
import { VariableManager } from '../../src/core/VariableManager';

describe('PlainTextParser', () => {
  let parser: PlainTextParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new PlainTextParser({ variableManager });
  });

  test('should parse body with variable replacement', () => {
    variableManager.setVariable('name', 'John');
    const result = parser.parseBody('Hello, {{name}}!');
    expect(result).toBe('Hello, John!');
  });

  test('should handle empty string', () => {
    const result = parser.parseBody('');
    expect(result).toBe('');
  });

  test('should handle text without variables', () => {
    const result = parser.parseBody('Plain text content');
    expect(result).toBe('Plain text content');
  });

  test('should always return true for isBodyStart', () => {
    expect(parser.isBodyStart()).toBe(true);
    expect(parser.isBodyStart('any line')).toBe(true);
  });

  test('should always return false for isBodyEnd', () => {
    expect(parser.isBodyEnd()).toBe(false);
    expect(parser.isBodyEnd('any line')).toBe(false);
  });

  test('should handle multiline text with variables', () => {
    variableManager.setVariable('greeting', 'Hello');
    const text = '{{greeting}}\nWorld!';
    const result = parser.parseBody(text);
    expect(result).toBe('Hello\nWorld!');
  });
});
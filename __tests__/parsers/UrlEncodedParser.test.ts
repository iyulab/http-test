import { UrlEncodedParser } from '../../src/parsers/UrlEncodedParser';

describe('UrlEncodedParser', () => {
  let parser: UrlEncodedParser;

  beforeEach(() => {
    parser = new UrlEncodedParser();
  });

  test('should parse body and return JSON string', () => {
    const result = parser.parseBody('name=John&age=30');
    expect(result).toBe('{"name":"John","age":"30"}');
  });

  test('should handle URL encoded values', () => {
    const result = parser.parseBody('name=John%20Doe&email=john%40example.com');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({
      name: 'John Doe',
      email: 'john@example.com'
    });
  });

  test('should handle empty string', () => {
    const result = parser.parseBody('');
    expect(result).toBe('{}');
  });

  test('should always return true for isBodyStart', () => {
    expect(parser.isBodyStart()).toBe(true);
  });

  test('should always return false for isBodyEnd', () => {
    expect(parser.isBodyEnd()).toBe(false);
  });

  test('should handle complex URL encoded data', () => {
    const result = parser.parseBody('data=%7B%22key%22%3A%22value%22%7D&simple=test');
    const parsed = JSON.parse(result);
    expect(parsed.data).toBe('{"key":"value"}');
    expect(parsed.simple).toBe('test');
  });
});
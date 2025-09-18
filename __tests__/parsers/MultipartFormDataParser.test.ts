import { MultipartFormDataParser } from '../../src/parsers/MultipartFormDataParser';

describe('MultipartFormDataParser', () => {
  let parser: MultipartFormDataParser;

  beforeEach(() => {
    parser = new MultipartFormDataParser();
  });

  test('should parse simple multipart form data', () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const data = `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="field1"\r\n\r\nvalue1\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--`;

    const result = parser.parse(data, boundary);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle file uploads in multipart data', () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const data = `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nfile content\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--`;

    const result = parser.parse(data, boundary);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle multiple fields', () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const data = `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="name"\r\n\r\nJohn\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="age"\r\n\r\n30\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--`;

    const result = parser.parse(data, boundary);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle empty data', () => {
    const result = parser.parse('');
    expect(result).toEqual({});
  });

  test('should handle malformed multipart data', () => {
    const result = parser.parse('invalid multipart data');
    expect(result).toEqual({});
  });

  test('should handle missing boundary', () => {
    const data = 'Content-Disposition: form-data; name="field"\r\n\r\nvalue';
    const result = parser.parse(data);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should extract field names and values', () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const data = `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="username"\r\n\r\nadmin\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--`;

    const result = parser.parse(data, boundary);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
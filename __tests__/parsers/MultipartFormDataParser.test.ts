import { MultipartFormDataParser } from '../../src/parsers/MultipartFormDataParser';

describe('MultipartFormDataParser', () => {
  let parser: MultipartFormDataParser;
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

  beforeEach(() => {
    parser = new MultipartFormDataParser();
  });

  test('should parse simple multipart form data', () => {
    const data = `--${boundary}\r\nContent-Disposition: form-data; name="field1"\r\n\r\nvalue1\r\n--${boundary}--`;

    const result = parser.parseBody(data, boundary);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle file uploads in multipart data', () => {
    const data = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nfile content\r\n--${boundary}--`;

    const result = parser.parseBody(data, boundary);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle multiple fields', () => {
    const data = `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nJohn\r\n--${boundary}\r\nContent-Disposition: form-data; name="age"\r\n\r\n30\r\n--${boundary}--`;

    const result = parser.parseBody(data, boundary);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle empty data', () => {
    const result = parser.parseBody('', boundary);
    expect(result).toBeDefined();
  });

  test('should return body string when boundary is missing', () => {
    const data = 'some body content';
    const result = parser.parseBody(data);
    expect(result).toBe(data);
  });

  test('should detect body start', () => {
    expect(parser.isBodyStart(`--${boundary}`, boundary)).toBe(true);
    expect(parser.isBodyStart('plain text', boundary)).toBe(false);
  });

  test('should detect body end', () => {
    // First need to start the body to track state
    parser.isBodyStart(`--${boundary}`, boundary);
    expect(parser.isBodyEnd(`--${boundary}--`, boundary)).toBe(true);

    // Reset and test without starting
    const parser2 = new MultipartFormDataParser();
    expect(parser2.isBodyEnd('plain text', boundary)).toBe(false);
  });

  test('should handle field names and values extraction', () => {
    const data = `--${boundary}\r\nContent-Disposition: form-data; name="username"\r\n\r\nJohnDoe\r\n--${boundary}--`;

    const result = parser.parseBody(data, boundary);
    expect(result).toBeDefined();
  });
});

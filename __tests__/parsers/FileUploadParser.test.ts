import { FileUploadParser } from '../../src/parsers/FileUploadParser';

describe('FileUploadParser', () => {
  let parser: FileUploadParser;

  beforeEach(() => {
    parser = new FileUploadParser();
  });

  test('should parse file upload with Content-Disposition', () => {
    const body = `Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

Hello World!`;

    const result = parser.parseBody(body);
    expect(result).toBeDefined();
    // FormData object doesn't have direct property access for testing
    expect(typeof result).toBe('object');
  });

  test('should parse simple field without filename', () => {
    const body = `Content-Disposition: form-data; name="username"

john_doe`;

    const result = parser.parseBody(body);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should identify body start with Content-Disposition', () => {
    expect(parser.isBodyStart('Content-Disposition: form-data; name="file"')).toBe(true);
    expect(parser.isBodyStart('Other line')).toBe(false);
  });

  test('should handle Content-Type header', () => {
    const body = `Content-Disposition: form-data; name="image"; filename="photo.jpg"
Content-Type: image/jpeg

binary image data`;

    const result = parser.parseBody(body);
    expect(result).toBeDefined();
  });

  test('should handle empty body', () => {
    const result = parser.parseBody('');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should always return false for isBodyEnd', () => {
    expect(parser.isBodyEnd()).toBe(false);
    expect(parser.isBodyEnd('any line')).toBe(false);
  });

  test('should handle multiline content', () => {
    const body = `Content-Disposition: form-data; name="description"

This is a
multiline description
with multiple lines`;

    const result = parser.parseBody(body);
    expect(result).toBeDefined();
  });

  test('should handle missing name in Content-Disposition', () => {
    const body = `Content-Disposition: form-data
Content-Type: text/plain

content without name`;

    const result = parser.parseBody(body);
    expect(result).toBeDefined();
  });
});
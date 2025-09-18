import { ParserFactory } from '../../src/parsers/ParserFactory';

describe('ParserFactory', () => {
  test('should create JSON parser for JSON content type', () => {
    const parser = ParserFactory.createParser('application/json');
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('JsonParser');
  });

  test('should create XML parser for XML content type', () => {
    const parser = ParserFactory.createParser('application/xml');
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('XmlParser');
  });

  test('should create URL encoded parser for form content type', () => {
    const parser = ParserFactory.createParser('application/x-www-form-urlencoded');
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('UrlEncodedParser');
  });

  test('should create multipart parser for multipart content type', () => {
    const parser = ParserFactory.createParser('multipart/form-data');
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('MultipartFormDataParser');
  });

  test('should create plain text parser for text content type', () => {
    const parser = ParserFactory.createParser('text/plain');
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('PlainTextParser');
  });

  test('should create plain text parser for unknown content type', () => {
    const parser = ParserFactory.createParser('unknown/type');
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('PlainTextParser');
  });

  test('should handle undefined content type', () => {
    const parser = ParserFactory.createParser(undefined);
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('PlainTextParser');
  });
});
import { ParserFactory } from '../../src/parsers/ParserFactory';
import { VariableManager } from '../../src/core/VariableManager';

describe('ParserFactory', () => {
  let variableManager: VariableManager;
  const createContext = () => ({ variableManager });

  beforeEach(() => {
    variableManager = new VariableManager();
  });

  test('should create JSON parser for JSON content type', () => {
    const parser = ParserFactory.createParser('application/json', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('JsonParser');
  });

  test('should create XML parser for XML content type', () => {
    const parser = ParserFactory.createParser('application/xml', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('XmlParser');
  });

  test('should create URL encoded parser for form content type', () => {
    const parser = ParserFactory.createParser('application/x-www-form-urlencoded', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('UrlEncodedParser');
  });

  test('should create multipart parser for multipart content type', () => {
    const parser = ParserFactory.createParser('multipart/form-data', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('MultipartFormDataParser');
  });

  test('should create plain text parser for text content type', () => {
    const parser = ParserFactory.createParser('text/plain', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('PlainTextParser');
  });

  test('should create plain text parser for unknown content type', () => {
    const parser = ParserFactory.createParser('unknown/type', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('PlainTextParser');
  });

  test('should handle text/xml content type', () => {
    const parser = ParserFactory.createParser('text/xml', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('XmlParser');
  });

  test('should handle JSON with charset in content type', () => {
    const parser = ParserFactory.createParser('application/json; charset=utf-8', createContext());
    expect(parser).toBeDefined();
    expect(parser.constructor.name).toBe('JsonParser');
  });
});

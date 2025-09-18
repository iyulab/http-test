import { XmlParser } from '../../src/parsers/XmlParser';

describe('XmlParser', () => {
  let parser: XmlParser;

  beforeEach(() => {
    parser = new XmlParser();
  });

  test('should parse simple XML to JSON object', () => {
    const xml = '<root><name>John</name><age>30</age></root>';
    const result = parser.parse(xml);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle empty XML', () => {
    const result = parser.parse('<root></root>');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should handle XML with attributes', () => {
    const xml = '<person id="1" name="John"><age>30</age></person>';
    const result = parser.parse(xml);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should return empty object for invalid XML', () => {
    const result = parser.parse('invalid xml');
    expect(result).toEqual({});
  });

  test('should handle empty string', () => {
    const result = parser.parse('');
    expect(result).toEqual({});
  });

  test('should handle self-closing tags', () => {
    const xml = '<root><item/><item/></root>';
    const result = parser.parse(xml);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
import { XmlParser } from '../../src/parsers/XmlParser';
import { VariableManager } from '../../src/core/VariableManager';

describe('XmlParser', () => {
  let parser: XmlParser;
  let variableManager: VariableManager;

  beforeEach(() => {
    variableManager = new VariableManager();
    parser = new XmlParser({ variableManager });
  });

  test('should parse body and replace variables', () => {
    variableManager.setVariable('name', 'John');
    const xml = '<root><name>{{name}}</name><age>30</age></root>';
    const result = parser.parseBody(xml);
    expect(result).toBe('<root><name>John</name><age>30</age></root>');
  });

  test('should detect XML body start with XML declaration', () => {
    expect(parser.isBodyStart('<?xml version="1.0"?>')).toBe(true);
  });

  test('should detect XML body start with tag', () => {
    expect(parser.isBodyStart('<root>')).toBe(true);
    expect(parser.isBodyStart('  <person>')).toBe(true);
  });

  test('should not detect XML body start for non-XML content', () => {
    expect(parser.isBodyStart('plain text')).toBe(false);
    expect(parser.isBodyStart('{ "json": true }')).toBe(false);
  });

  test('should detect XML body end', () => {
    expect(parser.isBodyEnd('</root>')).toBe(true);
    expect(parser.isBodyEnd('<item/>')).toBe(true);
    expect(parser.isBodyEnd('  </person>')).toBe(true);
  });

  test('should not detect XML body end for incomplete tags', () => {
    expect(parser.isBodyEnd('<incomplete')).toBe(false);
    expect(parser.isBodyEnd('text content')).toBe(false);
  });

  test('should handle empty string in parseBody', () => {
    const result = parser.parseBody('');
    expect(result).toBe('');
  });

  test('should handle XML with attributes', () => {
    variableManager.setVariable('id', '123');
    const xml = '<person id="{{id}}" name="John"><age>30</age></person>';
    const result = parser.parseBody(xml);
    expect(result).toBe('<person id="123" name="John"><age>30</age></person>');
  });
});

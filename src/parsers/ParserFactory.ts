import { logVerbose } from '../utils/logger';
import { ContentTypeParser, ParserContext } from './ContentTypeParser';
import { JsonParser } from './JsonParser';
import { MultipartFormDataParser } from './MultipartFormDataParser';
import { PlainTextParser } from './PlainTextParser';
import { XmlParser } from './XmlParser';
import { UrlEncodedParser } from './UrlEncodedParser';

export class ParserFactory {
  static createParser(contentType: string, context: ParserContext): ContentTypeParser {
    logVerbose(`Creating parser for content-type: ${contentType}`);
    if (contentType.includes('application/json')) {
      return new JsonParser(context);
    } else if (contentType.includes('multipart/form-data')) {
      return new MultipartFormDataParser();
    } else if (contentType.includes('text/plain')) {
      return new PlainTextParser(context);
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return new XmlParser(context);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      return new UrlEncodedParser();
    }
    logVerbose(`Using default PlainTextParser for content-type: ${contentType}`);
    return new PlainTextParser(context);
  }
}
import { VariableManager } from '../types';

export interface ContentTypeParser {
  parseBody(body: string, boundary?: string): unknown;
  isBodyStart(line: string, boundary?: string): boolean;
  isBodyEnd(line: string, boundary?: string): boolean;
}

export interface ParserContext {
  variableManager: VariableManager;
}
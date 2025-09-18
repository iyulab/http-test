/**
 * HTTP file parsing options
 */
export interface ParseOptions {
  encoding?: BufferEncoding;
  variableFiles?: string[];
  strict?: boolean;
  allowEmpty?: boolean;
}

/**
 * Parser result with metadata
 */
export interface ParseResult<T> {
  data: T;
  metadata: ParseMetadata;
  warnings: string[];
  errors: string[];
}

/**
 * Parsing metadata
 */
export interface ParseMetadata {
  fileName: string;
  fileSize: number;
  lineCount: number;
  parseTime: number;
  parserVersion: string;
}

/**
 * Content type parser interface
 */
export interface ContentParser {
  canParse(contentType: string): boolean;
  parse(content: string): unknown;
  stringify(data: unknown): string;
}

/**
 * Variable context for parsing
 */
export interface VariableContext {
  variables: Record<string, string>;
  environmentVariables: Record<string, string>;
  systemVariables: Record<string, string>;
}

/**
 * File upload specification
 */
export interface FileUpload {
  fieldName: string;
  fileName: string;
  filePath: string;
  contentType?: string;
  size?: number;
}

/**
 * Form data field
 */
export interface FormField {
  name: string;
  value: string | FileUpload;
  contentType?: string;
}
/**
 * HTTP file parsing options
 */
export interface ParseOptions {
  encoding?: BufferEncoding;
  variableFiles?: string[];
  strict?: boolean;
  allowEmpty?: boolean;
}

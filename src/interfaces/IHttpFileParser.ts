/**
 * IHttpFileParser Interface
 *
 * Contract for .http file parsing implementations.
 * Parses HTTP request files into structured request objects.
 */
import { HttpRequest } from '../types';

export interface IHttpFileParser {
  /**
   * Parse an .http file and return an array of HTTP requests
   * @param filePath Path to the .http file
   * @returns Promise resolving to array of parsed HTTP requests
   * @throws Error if file cannot be read or parsed
   */
  parse(filePath: string): Promise<HttpRequest[]>;
}

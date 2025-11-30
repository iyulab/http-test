import { HttpRequestParser } from './HttpRequestParser';
import { HttpRequest } from "../types";
import { readFile } from "../utils/fileUtils";
import { logVerbose } from "../utils/logger";
import { VariableManager } from "./VariableManager";

export class HttpFileParser {
  private variableManager: VariableManager;

  constructor(variableManager: VariableManager) {
    this.variableManager = variableManager;
  }

  async parse(filePath: string): Promise<HttpRequest[]> {
    const content = await readFile(filePath);
    logVerbose(`File content loaded: ${filePath}`);
    const cleanedContent = this.removeComments(content);
    const sections = this.splitIntoSections(cleanedContent);
    return this.parseRequests(sections);
  }

  private removeComments(content: string): string {
    // Step 1: Remove block comments (/* ... */) and replace with empty string
    let processed = content.replace(/\/\*[\s\S]*?\*\//g, '');

    // Step 2: Filter line comments (# and //) and empty lines left by block comment removal
    const lines = processed.split('\n');
    const filteredLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Keep lines that start with ### or #### (request/test separators)
      if (trimmedLine.startsWith('###') || trimmedLine.startsWith('####')) {
        filteredLines.push(line);
        continue;
      }
      // Remove lines that start with # (single line comment)
      if (trimmedLine.startsWith('#')) {
        continue;
      }
      // Remove lines that start with // (single line comment)
      if (trimmedLine.startsWith('//')) {
        continue;
      }
      // Keep all other lines (including empty lines for body separation)
      filteredLines.push(line);
    }

    return filteredLines.join('\n');
  }

  private splitIntoSections(content: string): string[] {
    return content.split(/(?=^###\s)/m).filter(section => section.trim() !== '');
  }

  private parseRequests(sections: string[]): HttpRequest[] {
    const requestParser = new HttpRequestParser(this.variableManager);
    const requests: HttpRequest[] = [];

    for (const section of sections) {
      if (section.startsWith('@')) {
        this.handleGlobalVariables(section);
      } else {
        const request = requestParser.parse(section);
        // Skip requests without a valid URL (empty request separators)
        if (request.url && request.url.trim() !== '') {
          requests.push(request);
        } else {
          logVerbose(`Skipping empty request section: ${request.name || '(unnamed)'}`);
        }
      }
    }

    logVerbose(`Total parsed requests: ${requests.length}`);
    return requests;
  }

  private handleGlobalVariables(section: string): void {
    const lines = section.split('\n');
    for (const line of lines) {
      if (line.startsWith('@')) {
        const [key, value] = line.slice(1).split('=').map(s => s.trim());
        this.variableManager.setVariable(key, value);
        logVerbose(`Set global variable: ${key} = ${value}`);
      }
    }
  }
}

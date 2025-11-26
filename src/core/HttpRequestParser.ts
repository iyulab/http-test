import { HttpRequest, HttpMethod } from "../types";
import { logVerbose } from "../utils/logger";
import { VariableManager } from "./VariableManager";
import { TestParser } from "./TestParser";

export class HttpRequestParser {
  private variableManager: VariableManager;
  private testParser: TestParser;

  constructor(variableManager: VariableManager) {
    this.variableManager = variableManager;
    this.testParser = new TestParser(variableManager);
  }

  parse(section: string): HttpRequest {
    const lines = section.split('\n');
    const request = this.initializeRequest(lines[0]);
    
    const [requestLines, testLines] = this.splitRequestAndTestLines(lines.slice(1));
    
    this.parseRequestLines(requestLines, request);
    const { tests, variableUpdates } = this.testParser.parse(testLines);
    request.tests = tests;
    request.variableUpdates.push(...variableUpdates);

    return request;
  }

  private initializeRequest(firstLine: string): HttpRequest {
    return {
      name: firstLine.replace(/^###\s*/, '').trim(),
      method: 'GET',
      url: '',
      headers: {},
      tests: [],
      variableUpdates: [],
    };
  }

  private splitRequestAndTestLines(lines: string[]): [string[], string[]] {
    const testStartIndex = lines.findIndex(line => line.startsWith('####'));
    if (testStartIndex === -1) {
      return [lines, []];
    }
    return [lines.slice(0, testStartIndex), lines.slice(testStartIndex)];
  }

  private parseRequestLines(lines: string[], request: HttpRequest): void {
    let isParsingBody = false;
    let bodyContent = '';

    for (const line of lines) {
      if (line.trim() === '') {
        isParsingBody = true;
        continue;
      }

      if (isParsingBody) {
        bodyContent += line + '\n';
      } else if (line.startsWith('@')) {
        this.handleVariable(line, request);
      } else if (this.isHttpMethod(line)) {
        this.setRequestMethod(line, request);
      } else if (line.includes(':')) {
        this.handleHeader(line, request);
      }
    }

    if (bodyContent.trim()) {
      this.parseBody(bodyContent, request);
    }
  }

  private isHttpMethod(line: string): boolean {
    return /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\s/.test(line);
  }

  private setRequestMethod(line: string, request: HttpRequest): void {
    const [method, url] = line.split(/\s+/);
    request.method = method as HttpMethod;
    request.url = this.variableManager.replaceVariables(url.trim());
    logVerbose(`Set method: ${request.method}, URL: ${request.url}`);
  }

  private handleHeader(line: string, request: HttpRequest): void {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    request.headers[key.trim()] = this.variableManager.replaceVariables(value);
    logVerbose(`Added header: ${key.trim()}: ${request.headers[key.trim()]}`);
  }

  private handleVariable(line: string, request: HttpRequest): void {
    const trimmedLine = line.slice(1).trim();

    // Handle @name directive for named requests
    if (trimmedLine.toLowerCase().startsWith('name ')) {
      const requestId = trimmedLine.slice(5).trim();
      request.requestId = requestId;
      logVerbose(`Set request name/id: ${requestId}`);
      return;
    }

    // Handle regular variable assignment
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      logVerbose(`Invalid variable format: ${line}`);
      return;
    }

    const key = trimmedLine.slice(0, equalIndex).trim();
    const value = trimmedLine.slice(equalIndex + 1).trim();

    if (value.startsWith('$.')) {
      // JSONPath expression for variable update from response
      request.variableUpdates.push({ key, value });
    } else {
      // Regular variable assignment
      this.variableManager.setVariable(key, value);
    }
    logVerbose(`Added variable update: ${key} = ${value}`);
  }

  /**
   * Parse body content, detecting file reference syntax
   * REST Client supports: < filepath or < ./relative/path
   */
  private parseBody(bodyContent: string, request: HttpRequest): void {
    const trimmedBody = bodyContent.trim();

    // Check for file reference syntax: < filepath
    const fileRefMatch = trimmedBody.match(/^<\s+(.+)$/);
    if (fileRefMatch) {
      const filePath = fileRefMatch[1].trim();
      request.bodyFromFile = filePath;
      logVerbose(`Body from file: ${filePath}`);
      return;
    }

    // Regular body content
    request.body = trimmedBody;
  }
}
import { HttpRequest } from "../types";
import { logVerbose } from "../utils/logger";
import { VariableManager } from "./VariableManager";
import { TestParser } from "./TestParser";
import {
  ScriptBlockParser,
  VariableLineParser,
  RequestLineParser,
} from "../parsers";

export class HttpRequestParser {
  private variableManager: VariableManager;
  private testParser: TestParser;
  private scriptBlockParser: ScriptBlockParser;
  private variableLineParser: VariableLineParser;
  private requestLineParser: RequestLineParser;

  constructor(variableManager: VariableManager) {
    this.variableManager = variableManager;
    this.testParser = new TestParser(variableManager);
    this.scriptBlockParser = new ScriptBlockParser();
    this.variableLineParser = new VariableLineParser();
    this.requestLineParser = new RequestLineParser();
  }

  parse(section: string): HttpRequest {
    const lines = section.split('\n');
    const request = this.initializeRequest(lines[0]);

    // Parse scripts using ScriptBlockParser
    const scripts = this.scriptBlockParser.parseAllScripts(section);
    request.preRequestScripts = scripts.preRequestScripts;
    request.responseHandlers = scripts.responseHandlers;

    // Remove script blocks from lines before parsing request parts
    const cleanedSection = this.scriptBlockParser.removeScriptBlocks(section);
    const cleanedLines = cleanedSection.split('\n');

    const [requestLines, testLines] = this.splitRequestAndTestLines(cleanedLines.slice(1));

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
      preRequestScripts: [],
      responseHandlers: [],
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
    let hasSeenMethod = false;

    for (const line of lines) {
      if (line.trim() === '') {
        // Only switch to body parsing mode after we've seen the HTTP method
        // Empty lines before the method line should be skipped
        if (hasSeenMethod) {
          isParsingBody = true;
        }
        continue;
      }

      if (isParsingBody) {
        bodyContent += line + '\n';
      } else if (this.variableLineParser.isVariableLine(line)) {
        this.handleVariable(line, request);
      } else if (this.requestLineParser.isMethodLine(line)) {
        this.setRequestMethod(line, request);
        hasSeenMethod = true;
      } else if (this.requestLineParser.isHeaderLine(line)) {
        this.handleHeader(line, request);
      }
    }

    if (bodyContent.trim()) {
      this.parseBody(bodyContent, request);
    }
  }

  private setRequestMethod(line: string, request: HttpRequest): void {
    const result = this.requestLineParser.parseMethodLine(line);
    if (result) {
      request.method = result.method;
      request.url = this.variableManager.replaceVariables(result.url);
      logVerbose(`Set method: ${request.method}, URL: ${request.url}`);
    }
  }

  private handleHeader(line: string, request: HttpRequest): void {
    const result = this.requestLineParser.parseHeaderLine(line);
    if (result) {
      request.headers[result.key] = this.variableManager.replaceVariables(result.value);
      logVerbose(`Added header: ${result.key}: ${request.headers[result.key]}`);
    }
  }

  private handleVariable(line: string, request: HttpRequest): void {
    const result = this.variableLineParser.parse(line);

    switch (result.type) {
      case 'name':
        if (result.requestId) {
          request.requestId = result.requestId;
          logVerbose(`Set request name/id: ${result.requestId}`);
        }
        break;

      case 'jsonpath':
        if (result.key && result.value) {
          request.variableUpdates.push({ key: result.key, value: result.value });
          logVerbose(`Added variable update: ${result.key} = ${result.value}`);
        }
        break;

      case 'variable':
        if (result.key && result.value !== undefined) {
          this.variableManager.setVariable(result.key, result.value);
          logVerbose(`Set variable: ${result.key} = ${result.value}`);
        }
        break;

      case 'invalid':
        logVerbose(`Invalid variable format: ${line}`);
        break;
    }
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
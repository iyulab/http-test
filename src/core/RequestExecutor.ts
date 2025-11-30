import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
import { convertAxiosResponse } from "../utils/httpUtils";
import { logVerbose, logError } from "../utils/logger";
import { URL } from "url";
import { RequestError } from "../errors/RequestError";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import https from "https";
import { JsonUtils } from "../utils/jsonUtils";
import { HttpTestConfig, loadConfig } from "../config";
import { CookieJar } from "./CookieJar";

/**
 * Executes HTTP requests and processes responses.
 */
export class RequestExecutor {
  private config: HttpTestConfig;
  private axiosInstance;
  private cookieJar: CookieJar;

  /**
   * Creates an instance of RequestExecutor.
   * @param variableManager - The VariableManager instance to use.
   * @param baseDir - Base directory for resolving file paths.
   * @param customConfig - Optional custom configuration.
   * @param cookieJar - Optional CookieJar for automatic cookie management.
   */
  constructor(
    private variableManager: VariableManager,
    private baseDir: string,
    customConfig?: Partial<HttpTestConfig>,
    cookieJar?: CookieJar
  ) {
    this.config = loadConfig(customConfig);
    this.cookieJar = cookieJar || new CookieJar();

    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: this.config.security.rejectUnauthorized,
      }),
      timeout: this.config.timeouts.request,
    });
  }

  /**
   * Get the CookieJar instance
   */
  getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const processedRequest = this.applyVariables(request);
    logVerbose(
      `Executing request: ${processedRequest.method} ${processedRequest.url}`
    );

    try {
      await this.validateUrl(processedRequest.url);
      await this.checkServerStatus(processedRequest.url);
      const axiosResponse = await this.sendRequest(processedRequest);

      logVerbose("Full response:");
      logVerbose(`Status: ${axiosResponse.status}`);
      logVerbose(`Headers: ${JSON.stringify(axiosResponse.headers, null, 2)}`);
      logVerbose(`Data: ${JSON.stringify(axiosResponse.data, null, 2)}`);

      return convertAxiosResponse(axiosResponse);
    } catch (error) {
      return this.handleRequestError(error, processedRequest);
    }
  }

  private applyVariables(request: HttpRequest): HttpRequest {
    let body = request.body;

    // Handle body from file reference (REST Client < filepath syntax)
    if (request.bodyFromFile) {
      const filePath = this.variableManager.replaceVariables(request.bodyFromFile);
      const absolutePath = path.resolve(this.baseDir, filePath);

      if (!fs.existsSync(absolutePath)) {
        throw new RequestError(`Body file not found: ${absolutePath}`);
      }

      body = fs.readFileSync(absolutePath, 'utf-8');
      logVerbose(`Loaded body from file: ${absolutePath}`);
    }

    return {
      ...request,
      url: this.variableManager.replaceVariables(request.url),
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          this.variableManager.replaceVariables(value),
        ])
      ),
      body:
        typeof body === "string"
          ? this.variableManager.replaceVariables(body)
          : body,
    };
  }

  private async validateUrl(url: string): Promise<void> {
    try {
      new URL(url);
    } catch {
      throw new RequestError(`Invalid URL: ${url}`);
    }
  }

  private async checkServerStatus(url: string): Promise<void> {
    try {
      await this.axiosInstance.head(url, {
        timeout: this.config.timeouts.serverCheck,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new RequestError(
          `Server is not responding at ${url}. Please check if the server is running.`
        );
      }
    }
  }

  private async sendRequest(request: HttpRequest): Promise<AxiosResponse> {
    const { method, url, headers, body } = request;

    let data = body;
    let requestHeaders = { ...headers };

    // Add cookies from CookieJar
    const cookieHeader = this.cookieJar.getCookieHeader(url);
    if (cookieHeader) {
      // Merge with existing Cookie header if present
      const existingCookie = requestHeaders["Cookie"] || requestHeaders["cookie"];
      if (existingCookie) {
        requestHeaders["Cookie"] = `${existingCookie}; ${cookieHeader}`;
      } else {
        requestHeaders["Cookie"] = cookieHeader;
      }
      logVerbose(`Added cookies to request: ${cookieHeader}`);
    }

    const contentType = headers["Content-Type"] || headers["content-type"];
    if (contentType) {
      if (contentType.includes("application/json")) {
        data = this.parseJsonBody(body as string);
      } else if (contentType.includes("multipart/form-data")) {
        const formData = this.parseFormData(headers, body as string);
        data = formData;

        delete requestHeaders["Content-Type"];
        delete requestHeaders["content-type"];
        requestHeaders = {
          ...requestHeaders,
          ...formData.getHeaders(),
        };
      }
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: requestHeaders,
      data,
      timeout: this.config.timeouts.request,
      validateStatus: () => true,
    };

    const loggableConfig = { ...config, data: "[FormData]" };
    logVerbose(
      `Sending request with config: ${JSON.stringify(loggableConfig, null, 2)}`
    );

    const response = await this.axiosInstance(config);

    // Store cookies from response
    this.processCookiesFromResponse(response, url);

    return response;
  }

  private processCookiesFromResponse(response: AxiosResponse, requestUrl: string): void {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      if (Array.isArray(setCookieHeaders)) {
        this.cookieJar.setCookies(setCookieHeaders, requestUrl);
      } else {
        this.cookieJar.setCookie(setCookieHeaders, requestUrl);
      }
      logVerbose(`Stored ${Array.isArray(setCookieHeaders) ? setCookieHeaders.length : 1} cookie(s) from response`);
    }
  }

  private parseJsonBody(body: string | undefined): object | undefined {
    return JsonUtils.parseJson(body);
  }

  private parseFormData(
    headers: Record<string, string>,
    body: string
  ): FormData {
    const formData = new FormData();
    const contentType = headers["Content-Type"] || headers["content-type"];
    if (!contentType) {
      throw new Error("Content-Type header not found.");
    }
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      throw new Error("Boundary not found in Content-Type header.");
    }
    const boundary = boundaryMatch[1].trim();

    const parts = body.split(new RegExp(`--${boundary}`));
    parts.forEach((part) => {
      if (part.trim().length === 0 || part == "--") return;

      this.buildFormData(formData, part);
    });

    return formData;
  }

  private buildFormData(formData: FormData, part: string) {
    const lines = part.split("\r\n");
    const headers: Record<string, string> = {};
    let name: string | null = null;
    let filename: string | null = null;
    let contentType: string | null = null;
    let content: string | null = null;

    lines.forEach((line) => {
      if (line.trim().length === 0) return;

      const headerMatch = line.match(/(.+?): (.+)/);
      if (headerMatch) {
        headers[headerMatch[1].toLowerCase()] = headerMatch[2];
      } else {
        if (content == null) {
          content = line;
        } else {
          content += "\r\n" + line;
        }
      }
    });

    const contentDisposition = headers["content-disposition"];
    if (contentDisposition) {
      const match = contentDisposition.match(/name="(.+?)"/);
      if (match) {
        name = match[1];
      }
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const contentTypeHeader = headers["content-type"];
    if (contentTypeHeader) {
      contentType = contentTypeHeader;
    }

    if (!name) {
      throw new Error("Name not found in Content-Disposition header.");
    }

    let options: {
      filename?: string;
      contentType?: string;
    } = {};
    if (filename) {
      options.filename = filename;
    }
    if (contentType) {
      options.contentType = contentType;
    }

    if (filename && content) {
      const [, filePath] = (content as string).split(" ");

      if (filePath) {
        const absoluteFilePath = path.resolve(this.baseDir, filePath);
        if (!fs.existsSync(absoluteFilePath)) {
          throw new Error(filePath + " is not found.");
        }

        formData.append(name, fs.createReadStream(absoluteFilePath), options);
      } else {
        throw new Error("Invalid file path format.");
      }
    } else {
      const value = content!;
      formData.append(name, value, options);
    }
  }

  private async handleRequestError(
    error: unknown,
    request: HttpRequest
  ): Promise<HttpResponse> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        await logError(
          `Request failed with status ${axiosError.response.status}: ${axiosError.message}`
        );
        return convertAxiosResponse(axiosError.response);
      } else if (axiosError.request) {
        await logError(`No response received: ${axiosError.message}`);
        throw new RequestError(
          `No response received from ${request.url}. Please check your network connection and server status.`
        );
      }
    }
    logError(
      `Request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw new RequestError(
      `Request to ${request.url} failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

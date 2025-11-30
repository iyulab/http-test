/**
 * RequestPreprocessor
 *
 * Pipeline stage that preprocesses requests before execution.
 * Handles variable replacement in URL, headers, and body.
 */
import { HttpRequest } from '../types';
import { IPipelineStage, PipelineContext } from './IPipelineStage';

export class RequestPreprocessor implements IPipelineStage {
  readonly name = 'request-preprocessor';

  async processRequest(
    request: HttpRequest,
    context: PipelineContext
  ): Promise<HttpRequest> {
    const result: HttpRequest = {
      ...request,
      headers: { ...request.headers }
    };

    // Replace variables in URL
    result.url = context.variables.replace(request.url);

    // Replace variables in headers
    for (const [key, value] of Object.entries(result.headers)) {
      result.headers[key] = context.variables.replace(value);
    }

    // Replace variables in body
    if (typeof request.body === 'string') {
      result.body = context.variables.replace(request.body);
    } else if (request.body && typeof request.body === 'object' && !(request.body instanceof require('form-data'))) {
      // Handle object body - convert to string, replace, convert back
      const bodyStr = JSON.stringify(request.body);
      const replacedStr = context.variables.replace(bodyStr);
      try {
        result.body = JSON.parse(replacedStr);
      } catch {
        result.body = replacedStr;
      }
    }

    return result;
  }
}

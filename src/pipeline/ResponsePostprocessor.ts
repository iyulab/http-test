/**
 * ResponsePostprocessor
 *
 * Pipeline stage that processes responses after execution.
 * Handles variable extraction using JSONPath expressions.
 */
import { HttpRequest, HttpResponse } from '../types';
import { IPipelineStage, PipelineContext } from './IPipelineStage';
import { JSONPath } from 'jsonpath-plus';

export class ResponsePostprocessor implements IPipelineStage {
  readonly name = 'response-postprocessor';

  async processResponse(
    request: HttpRequest,
    response: HttpResponse,
    context: PipelineContext
  ): Promise<void> {
    // Process variable updates from JSONPath expressions
    if (request.variableUpdates && request.variableUpdates.length > 0) {
      await this.extractVariables(request, response, context);
    }
  }

  private async extractVariables(
    request: HttpRequest,
    response: HttpResponse,
    context: PipelineContext
  ): Promise<void> {
    let data = response.data;

    // Parse string response if needed
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // Not JSON, skip extraction
        return;
      }
    }

    if (data === null || data === undefined) {
      return;
    }

    for (const update of request.variableUpdates) {
      const { key, value } = update;

      // Check if value is a JSONPath expression
      if (value.startsWith('$.') || value.startsWith('$[')) {
        try {
          const result = JSONPath({ path: value, json: data });
          if (result.length > 0) {
            context.variables.set(key, result[0]);
          }
        } catch {
          // Invalid JSONPath, skip
        }
      }
    }
  }
}

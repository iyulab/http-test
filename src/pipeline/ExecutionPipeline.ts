/**
 * ExecutionPipeline
 *
 * Manages pipeline stages for request/response processing.
 * Executes stages in order for request preprocessing and response postprocessing.
 */
import { HttpRequest, HttpResponse } from '../types';
import { IPipelineStage, PipelineContext } from './IPipelineStage';
import { RequestPreprocessor } from './RequestPreprocessor';
import { ResponsePostprocessor } from './ResponsePostprocessor';

export class ExecutionPipeline {
  private stages: IPipelineStage[] = [];

  /**
   * Add a stage to the pipeline
   * @param stage The stage to add
   */
  addStage(stage: IPipelineStage): void {
    this.stages.push(stage);
  }

  /**
   * Get the number of stages in the pipeline
   */
  getStageCount(): number {
    return this.stages.length;
  }

  /**
   * Process a request through all stages
   * @param request The HTTP request
   * @param context Pipeline context
   * @returns Processed request
   */
  async processRequest(
    request: HttpRequest,
    context: PipelineContext
  ): Promise<HttpRequest> {
    let processedRequest = request;

    for (const stage of this.stages) {
      if (stage.processRequest) {
        processedRequest = await stage.processRequest(processedRequest, context);
      }
    }

    return processedRequest;
  }

  /**
   * Process a response through all stages
   * @param request The original request
   * @param response The HTTP response
   * @param context Pipeline context
   */
  async processResponse(
    request: HttpRequest,
    response: HttpResponse,
    context: PipelineContext
  ): Promise<void> {
    for (const stage of this.stages) {
      if (stage.processResponse) {
        await stage.processResponse(request, response, context);
      }
    }
  }

  /**
   * Create a pipeline with default stages
   */
  static createDefault(): ExecutionPipeline {
    const pipeline = new ExecutionPipeline();

    pipeline.addStage(new RequestPreprocessor());
    pipeline.addStage(new ResponsePostprocessor());

    return pipeline;
  }
}

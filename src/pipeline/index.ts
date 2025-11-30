/**
 * Pipeline Module
 *
 * Provides request/response execution pipeline.
 */

// Core types and interfaces
export type { IPipelineStage, PipelineContext } from './IPipelineStage';

// Pipeline
export { ExecutionPipeline } from './ExecutionPipeline';

// Built-in stages
export { RequestPreprocessor } from './RequestPreprocessor';
export { ResponsePostprocessor } from './ResponsePostprocessor';

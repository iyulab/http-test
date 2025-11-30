/**
 * Performance Module
 *
 * Provides parallel execution and performance optimization utilities.
 */

// ParallelExecutor
export { ParallelExecutor } from './ParallelExecutor';
export type {
  ParallelExecutionResult,
  ParallelExecutorOptions,
  ExecuteOptions
} from './ParallelExecutor';

// RequestCache
export { RequestCache } from './RequestCache';
export type {
  CacheEntry,
  CacheOptions,
  SetOptions,
  CacheStats
} from './RequestCache';

// DiagnosticReporter
export { DiagnosticReporter } from './DiagnosticReporter';
export type {
  DiagnosticEntry,
  DiagnosticLevel,
  DiagnosticFilter,
  DiagnosticReport,
  DiagnosticReporterOptions,
  TimingMetric,
  CustomMetric
} from './DiagnosticReporter';

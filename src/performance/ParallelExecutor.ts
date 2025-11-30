/**
 * ParallelExecutor
 *
 * Executes multiple HTTP requests in parallel with concurrency control.
 * Features:
 * - Configurable max concurrency
 * - Graceful error handling
 * - Request abort capability
 * - Progress tracking
 * - Execution time measurement
 */
import { HttpRequest, HttpResponse } from '../types';

/**
 * Result of a parallel execution
 */
export interface ParallelExecutionResult {
  /** The original request */
  request: HttpRequest;
  /** Whether the request succeeded */
  success: boolean;
  /** The response if successful */
  response?: HttpResponse;
  /** Error if failed */
  error?: Error;
  /** Whether the request was aborted */
  aborted?: boolean;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Options for parallel execution
 */
export interface ParallelExecutorOptions {
  /** Maximum number of concurrent requests (default: 5) */
  maxConcurrency?: number;
  /** Function to execute a single request */
  execute: (request: HttpRequest) => Promise<HttpResponse>;
}

/**
 * Execution options passed to execute method
 */
export interface ExecuteOptions {
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Parallel HTTP request executor with concurrency control
 */
export class ParallelExecutor {
  private readonly maxConcurrency: number;
  private readonly executeFn: (request: HttpRequest) => Promise<HttpResponse>;
  private aborted: boolean = false;

  constructor(options: ParallelExecutorOptions) {
    this.maxConcurrency = options.maxConcurrency ?? 5;
    this.executeFn = options.execute;
  }

  /**
   * Get the maximum concurrency setting
   */
  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Abort pending requests
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Execute multiple requests in parallel with concurrency control
   */
  async execute(
    requests: HttpRequest[],
    options?: ExecuteOptions
  ): Promise<ParallelExecutionResult[]> {
    if (requests.length === 0) {
      return [];
    }

    // Reset abort state for new execution
    this.aborted = false;

    const results: ParallelExecutionResult[] = new Array(requests.length);
    let completedCount = 0;
    let currentIndex = 0;

    const executeRequest = async (index: number): Promise<void> => {
      const request = requests[index];

      // Check if aborted before starting
      if (this.aborted) {
        results[index] = {
          request,
          success: false,
          aborted: true,
          executionTime: 0
        };
        return;
      }

      const startTime = Date.now();

      try {
        const response = await this.executeFn(request);
        const executionTime = Date.now() - startTime;

        // Check if aborted during execution
        if (this.aborted) {
          results[index] = {
            request,
            success: false,
            aborted: true,
            executionTime
          };
        } else {
          results[index] = {
            request,
            success: true,
            response,
            executionTime
          };
        }
      } catch (error) {
        const executionTime = Date.now() - startTime;
        results[index] = {
          request,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          executionTime
        };
      }

      completedCount++;
      options?.onProgress?.(completedCount, requests.length);
    };

    // Create worker pool
    const workers: Promise<void>[] = [];

    const worker = async (): Promise<void> => {
      while (currentIndex < requests.length) {
        const index = currentIndex++;
        if (index < requests.length) {
          await executeRequest(index);
        }
      }
    };

    // Start workers up to maxConcurrency
    const workerCount = Math.min(this.maxConcurrency, requests.length);
    for (let i = 0; i < workerCount; i++) {
      workers.push(worker());
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    return results;
  }
}

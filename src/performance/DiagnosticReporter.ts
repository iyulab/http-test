/**
 * DiagnosticReporter
 *
 * Collects and reports execution diagnostics.
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Timing metrics tracking
 * - Custom metrics recording
 * - Filtering and querying
 * - Export to JSON/text formats
 * - Event handlers for real-time monitoring
 */

/**
 * Log levels
 */
export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Level priority for filtering
 */
const LEVEL_PRIORITY: Record<DiagnosticLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * A single diagnostic entry
 */
export interface DiagnosticEntry {
  /** Log level */
  level: DiagnosticLevel;
  /** Log message */
  message: string;
  /** Timestamp when logged */
  timestamp: number;
  /** Optional context data */
  context?: Record<string, unknown>;
  /** Optional source identifier */
  source?: string;
}

/**
 * Filter options for querying entries
 */
export interface DiagnosticFilter {
  /** Filter by exact level */
  level?: DiagnosticLevel;
  /** Filter by multiple levels */
  levels?: DiagnosticLevel[];
  /** Filter by minimum level */
  minLevel?: DiagnosticLevel;
  /** Filter by source */
  source?: string;
  /** Filter entries since timestamp */
  since?: number;
  /** Filter entries until timestamp */
  until?: number;
}

/**
 * Timing metric data
 */
export interface TimingMetric {
  /** Number of timing samples */
  count: number;
  /** Total duration in ms */
  total: number;
  /** Average duration */
  average: number;
  /** Minimum duration */
  min: number;
  /** Maximum duration */
  max: number;
  /** Most recent duration */
  duration: number;
}

/**
 * Custom metric data
 */
export interface CustomMetric {
  /** Number of samples */
  count: number;
  /** Total of all values */
  total: number;
  /** Average value */
  average: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
}

/**
 * Diagnostic report summary
 */
export interface DiagnosticReport {
  /** Total number of entries */
  totalEntries: number;
  /** Count by level */
  countByLevel: Record<DiagnosticLevel, number>;
  /** Earliest entry timestamp */
  startTime: number;
  /** Latest entry timestamp */
  endTime: number;
  /** Duration from first to last entry */
  duration: number;
  /** Breakdown by source */
  sourceBreakdown?: Record<string, number>;
}

/**
 * Reporter configuration options
 */
export interface DiagnosticReporterOptions {
  /** Maximum number of entries to keep (default: 1000) */
  maxEntries?: number;
}

/**
 * Entry event handler
 */
type EntryHandler = (entry: DiagnosticEntry) => void;

/**
 * Custom entry formatter
 */
type EntryFormatter = (entry: DiagnosticEntry) => string;

/**
 * Active timing entry
 */
interface ActiveTiming {
  startTime: number;
}

/**
 * Diagnostic reporter for collecting and analyzing execution data
 */
export class DiagnosticReporter {
  private entries: DiagnosticEntry[] = [];
  private readonly maxEntries: number;
  private timingMetrics: Map<string, TimingMetric> = new Map();
  private customMetrics: Map<string, CustomMetric> = new Map();
  private activeTimings: Map<string, ActiveTiming> = new Map();
  private handlers: Set<EntryHandler> = new Set();

  constructor(options: DiagnosticReporterOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('debug', message, context, source);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('info', message, context, source);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('warn', message, context, source);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('error', message, context, source);
  }

  /**
   * Log a message at specified level
   */
  private log(
    level: DiagnosticLevel,
    message: string,
    context?: Record<string, unknown>,
    source?: string
  ): void {
    const entry: DiagnosticEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      source
    };

    this.entries.push(entry);

    // Enforce max entries limit
    while (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Notify handlers
    for (const handler of this.handlers) {
      try {
        handler(entry);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Get entries with optional filtering
   */
  getEntries(filter?: DiagnosticFilter): DiagnosticEntry[] {
    if (!filter) {
      return [...this.entries];
    }

    return this.entries.filter(entry => {
      // Filter by exact level
      if (filter.level && entry.level !== filter.level) {
        return false;
      }

      // Filter by multiple levels
      if (filter.levels && !filter.levels.includes(entry.level)) {
        return false;
      }

      // Filter by minimum level
      if (filter.minLevel) {
        const minPriority = LEVEL_PRIORITY[filter.minLevel];
        const entryPriority = LEVEL_PRIORITY[entry.level];
        if (entryPriority < minPriority) {
          return false;
        }
      }

      // Filter by source
      if (filter.source && entry.source !== filter.source) {
        return false;
      }

      // Filter by time range
      if (filter.since && entry.timestamp < filter.since) {
        return false;
      }
      if (filter.until && entry.timestamp > filter.until) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate a summary report
   */
  generateReport(): DiagnosticReport {
    const countByLevel: Record<DiagnosticLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };

    const sourceBreakdown: Record<string, number> = {};

    let startTime = Infinity;
    let endTime = -Infinity;

    for (const entry of this.entries) {
      countByLevel[entry.level]++;

      if (entry.source) {
        sourceBreakdown[entry.source] = (sourceBreakdown[entry.source] || 0) + 1;
      }

      if (entry.timestamp < startTime) {
        startTime = entry.timestamp;
      }
      if (entry.timestamp > endTime) {
        endTime = entry.timestamp;
      }
    }

    // Handle empty entries
    if (this.entries.length === 0) {
      startTime = 0;
      endTime = 0;
    }

    return {
      totalEntries: this.entries.length,
      countByLevel,
      startTime,
      endTime,
      duration: endTime - startTime,
      sourceBreakdown: Object.keys(sourceBreakdown).length > 0 ? sourceBreakdown : undefined
    };
  }

  /**
   * Start timing for a key
   */
  startTiming(key: string): void {
    this.activeTimings.set(key, { startTime: Date.now() });
  }

  /**
   * End timing for a key
   */
  endTiming(key: string): void {
    const active = this.activeTimings.get(key);
    if (!active) {
      return;
    }

    const duration = Date.now() - active.startTime;
    this.activeTimings.delete(key);

    const existing = this.timingMetrics.get(key);
    if (existing) {
      existing.count++;
      existing.total += duration;
      existing.average = existing.total / existing.count;
      existing.min = Math.min(existing.min, duration);
      existing.max = Math.max(existing.max, duration);
      existing.duration = duration;
    } else {
      this.timingMetrics.set(key, {
        count: 1,
        total: duration,
        average: duration,
        min: duration,
        max: duration,
        duration
      });
    }
  }

  /**
   * Get timing metrics
   */
  getTimingMetrics(): Record<string, TimingMetric> {
    const result: Record<string, TimingMetric> = {};
    for (const [key, value] of this.timingMetrics) {
      result[key] = { ...value };
    }
    return result;
  }

  /**
   * Record a custom metric value
   */
  recordMetric(key: string, value: number): void {
    const existing = this.customMetrics.get(key);
    if (existing) {
      existing.count++;
      existing.total += value;
      existing.average = existing.total / existing.count;
      existing.min = Math.min(existing.min, value);
      existing.max = Math.max(existing.max, value);
    } else {
      this.customMetrics.set(key, {
        count: 1,
        total: value,
        average: value,
        min: value,
        max: value
      });
    }
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics(): Record<string, CustomMetric> {
    const result: Record<string, CustomMetric> = {};
    for (const [key, value] of this.customMetrics) {
      result[key] = { ...value };
    }
    return result;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.timingMetrics.clear();
    this.customMetrics.clear();
    this.activeTimings.clear();
  }

  /**
   * Export entries to JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      entries: this.entries,
      timingMetrics: this.getTimingMetrics(),
      customMetrics: this.getCustomMetrics(),
      report: this.generateReport()
    }, null, 2);
  }

  /**
   * Export entries to plain text
   */
  exportToText(): string {
    return this.entries.map(entry => {
      const timestamp = new Date(entry.timestamp).toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      const source = entry.source ? `[${entry.source}] ` : '';
      const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      return `${timestamp} ${level} ${source}${entry.message}${context}`;
    }).join('\n');
  }

  /**
   * Export with custom formatter
   */
  export(formatter: EntryFormatter): string {
    return this.entries.map(formatter).join('\n');
  }

  /**
   * Register an entry handler
   */
  onEntry(handler: EntryHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

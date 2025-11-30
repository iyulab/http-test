/**
 * DiagnosticReporter Tests
 *
 * TDD tests for execution diagnostics and reporting.
 */
import { DiagnosticReporter, DiagnosticEntry, DiagnosticLevel, DiagnosticReport } from '../../src/performance/DiagnosticReporter';

describe('DiagnosticReporter', () => {
  let reporter: DiagnosticReporter;

  beforeEach(() => {
    reporter = new DiagnosticReporter();
  });

  describe('logging entries', () => {
    it('should log info entry', () => {
      reporter.info('Test message');

      const entries = reporter.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('info');
      expect(entries[0].message).toBe('Test message');
    });

    it('should log warning entry', () => {
      reporter.warn('Warning message');

      const entries = reporter.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('warn');
      expect(entries[0].message).toBe('Warning message');
    });

    it('should log error entry', () => {
      reporter.error('Error message');

      const entries = reporter.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('error');
      expect(entries[0].message).toBe('Error message');
    });

    it('should log debug entry', () => {
      reporter.debug('Debug message');

      const entries = reporter.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('debug');
      expect(entries[0].message).toBe('Debug message');
    });

    it('should include timestamp in entries', () => {
      const before = Date.now();
      reporter.info('Test');
      const after = Date.now();

      const entries = reporter.getEntries();
      expect(entries[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(entries[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should support context data', () => {
      reporter.info('Request completed', { requestId: 123, duration: 500 });

      const entries = reporter.getEntries();
      expect(entries[0].context).toEqual({ requestId: 123, duration: 500 });
    });

    it('should support source location', () => {
      reporter.info('Test', undefined, 'TestComponent');

      const entries = reporter.getEntries();
      expect(entries[0].source).toBe('TestComponent');
    });
  });

  describe('filtering entries', () => {
    beforeEach(() => {
      reporter.debug('Debug 1');
      reporter.info('Info 1');
      reporter.warn('Warning 1');
      reporter.error('Error 1');
      reporter.info('Info 2');
    });

    it('should filter by level', () => {
      const errors = reporter.getEntries({ level: 'error' });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Error 1');
    });

    it('should filter by multiple levels', () => {
      const entries = reporter.getEntries({ levels: ['warn', 'error'] });
      expect(entries).toHaveLength(2);
    });

    it('should filter by minimum level', () => {
      const entries = reporter.getEntries({ minLevel: 'warn' });
      expect(entries).toHaveLength(2); // warn and error
    });

    it('should filter by source', () => {
      reporter.info('From A', undefined, 'ComponentA');
      reporter.info('From B', undefined, 'ComponentB');

      const entries = reporter.getEntries({ source: 'ComponentA' });
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('From A');
    });

    it('should filter by time range', async () => {
      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const startTime = Date.now();
      reporter.info('After start');

      const entries = reporter.getEntries({ since: startTime });
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('After start');
    });
  });

  describe('report generation', () => {
    it('should generate summary report', () => {
      reporter.info('Info 1');
      reporter.info('Info 2');
      reporter.warn('Warning 1');
      reporter.error('Error 1');

      const report = reporter.generateReport();

      expect(report.totalEntries).toBe(4);
      expect(report.countByLevel.info).toBe(2);
      expect(report.countByLevel.warn).toBe(1);
      expect(report.countByLevel.error).toBe(1);
      expect(report.countByLevel.debug).toBe(0);
    });

    it('should include time range in report', () => {
      const before = Date.now();
      reporter.info('First');
      reporter.info('Last');
      const after = Date.now();

      const report = reporter.generateReport();

      expect(report.startTime).toBeGreaterThanOrEqual(before);
      expect(report.endTime).toBeLessThanOrEqual(after);
    });

    it('should include duration in report', () => {
      reporter.info('First');
      reporter.info('Last');

      const report = reporter.generateReport();

      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    it('should identify most common sources', () => {
      reporter.info('A1', undefined, 'ComponentA');
      reporter.info('A2', undefined, 'ComponentA');
      reporter.info('A3', undefined, 'ComponentA');
      reporter.info('B1', undefined, 'ComponentB');

      const report = reporter.generateReport();

      expect(report.sourceBreakdown?.['ComponentA']).toBe(3);
      expect(report.sourceBreakdown?.['ComponentB']).toBe(1);
    });
  });

  describe('performance metrics', () => {
    it('should track timing metrics', () => {
      reporter.startTiming('request-1');
      // Simulate some work
      reporter.endTiming('request-1');

      const metrics = reporter.getTimingMetrics();
      expect(metrics['request-1']).toBeDefined();
      expect(metrics['request-1'].duration).toBeGreaterThanOrEqual(0);
    });

    it('should track multiple timing metrics', async () => {
      reporter.startTiming('fast');
      reporter.endTiming('fast');

      reporter.startTiming('slow');
      await new Promise(resolve => setTimeout(resolve, 50));
      reporter.endTiming('slow');

      const metrics = reporter.getTimingMetrics();
      expect(metrics['slow'].duration).toBeGreaterThan(metrics['fast'].duration);
    });

    it('should track aggregate metrics for same key', () => {
      reporter.startTiming('request');
      reporter.endTiming('request');
      reporter.startTiming('request');
      reporter.endTiming('request');
      reporter.startTiming('request');
      reporter.endTiming('request');

      const metrics = reporter.getTimingMetrics();
      expect(metrics['request'].count).toBe(3);
      expect(metrics['request'].average).toBeDefined();
      expect(metrics['request'].min).toBeDefined();
      expect(metrics['request'].max).toBeDefined();
    });

    it('should record custom metrics', () => {
      reporter.recordMetric('memory', 1024);
      reporter.recordMetric('memory', 2048);
      reporter.recordMetric('memory', 512);

      const metrics = reporter.getCustomMetrics();
      expect(metrics['memory'].count).toBe(3);
      expect(metrics['memory'].total).toBe(3584);
      expect(metrics['memory'].average).toBeCloseTo(1194.67, 1);
      expect(metrics['memory'].min).toBe(512);
      expect(metrics['memory'].max).toBe(2048);
    });
  });

  describe('clearing and limits', () => {
    it('should clear all entries', () => {
      reporter.info('Test 1');
      reporter.info('Test 2');

      reporter.clear();

      expect(reporter.getEntries()).toHaveLength(0);
    });

    it('should respect max entries limit', () => {
      reporter = new DiagnosticReporter({ maxEntries: 3 });

      reporter.info('1');
      reporter.info('2');
      reporter.info('3');
      reporter.info('4');

      const entries = reporter.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('2'); // Oldest removed
      expect(entries[2].message).toBe('4');
    });

    it('should clear timing metrics', () => {
      reporter.startTiming('test');
      reporter.endTiming('test');

      reporter.clearMetrics();

      expect(Object.keys(reporter.getTimingMetrics())).toHaveLength(0);
    });
  });

  describe('export formats', () => {
    beforeEach(() => {
      reporter.info('Test message', { key: 'value' }, 'TestSource');
    });

    it('should export to JSON', () => {
      const json = reporter.exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].message).toBe('Test message');
    });

    it('should export to plain text', () => {
      const text = reporter.exportToText();

      expect(text).toContain('Test message');
      expect(text).toContain('INFO');
      expect(text).toContain('TestSource');
    });

    it('should export with custom formatter', () => {
      const formatted = reporter.export((entry) => {
        return `[${entry.level.toUpperCase()}] ${entry.message}`;
      });

      expect(formatted).toBe('[INFO] Test message');
    });
  });

  describe('event handlers', () => {
    it('should call handler on new entry', () => {
      const handler = jest.fn();
      reporter.onEntry(handler);

      reporter.info('Test');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        level: 'info',
        message: 'Test'
      }));
    });

    it('should support multiple handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      reporter.onEntry(handler1);
      reporter.onEntry(handler2);

      reporter.info('Test');

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should allow removing handlers', () => {
      const handler = jest.fn();
      const unsubscribe = reporter.onEntry(handler);

      reporter.info('First');
      unsubscribe();
      reporter.info('Second');

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

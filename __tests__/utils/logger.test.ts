import { log, logInfo, logWarning, logError, logVerbose, setVerbose, logPlain } from '../../src/utils/logger';
import { LogLevel } from '../../src/types';

describe('Logger', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    // Reset verbose mode before each test
    setVerbose(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log function', () => {
    test('should log info messages', () => {
      log('Test info message', LogLevel.INFO);
      expect(mockConsoleLog).toHaveBeenCalled();
      // Check that the message was logged (chalk wraps with color codes)
      const call = mockConsoleLog.mock.calls[0];
      expect(call[0]).toContain('[INFO]');
      expect(call[0]).toContain('Test info message');
    });

    test('should log warning messages', () => {
      log('Test warning message', LogLevel.WARNING);
      expect(mockConsoleWarn).toHaveBeenCalled();
      const call = mockConsoleWarn.mock.calls[0];
      expect(call[0]).toContain('[WARNING]');
      expect(call[0]).toContain('Test warning message');
    });

    test('should log error messages', () => {
      log('Test error message', LogLevel.ERROR);
      expect(mockConsoleError).toHaveBeenCalled();
      const call = mockConsoleError.mock.calls[0];
      expect(call[0]).toContain('[ERROR]');
      expect(call[0]).toContain('Test error message');
    });

    test('should log verbose messages when verbose is enabled', () => {
      setVerbose(true);
      log('Test verbose message', LogLevel.VERBOSE);
      expect(mockConsoleLog).toHaveBeenCalled();
      const call = mockConsoleLog.mock.calls[0];
      expect(call[0]).toContain('[VERBOSE]');
      expect(call[0]).toContain('Test verbose message');
    });

    test('should not log verbose messages when verbose is disabled', () => {
      setVerbose(false);
      log('Test verbose message', LogLevel.VERBOSE);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test('should log plain messages without formatting', () => {
      log('Test plain message', LogLevel.PLAIN);
      expect(mockConsoleLog).toHaveBeenCalledWith('Test plain message');
    });

    test('should handle additional parameters', () => {
      log('Message with params', LogLevel.INFO, { data: 'test' }, 123);
      expect(mockConsoleLog).toHaveBeenCalled();
      const call = mockConsoleLog.mock.calls[0];
      expect(call[0]).toContain('Message with params');
      expect(call[1]).toEqual({ data: 'test' });
      expect(call[2]).toBe(123);
    });

    test('should default to INFO level when level not provided', () => {
      log('Default level message');
      expect(mockConsoleLog).toHaveBeenCalled();
      const call = mockConsoleLog.mock.calls[0];
      expect(call[0]).toContain('[INFO]');
    });
  });

  describe('convenience functions', () => {
    test('logInfo should call log with INFO level', () => {
      logInfo('Info message');
      expect(mockConsoleLog).toHaveBeenCalled();
      const call = mockConsoleLog.mock.calls[0];
      expect(call[0]).toContain('[INFO]');
      expect(call[0]).toContain('Info message');
    });

    test('logWarning should call log with WARNING level', () => {
      logWarning('Warning message');
      expect(mockConsoleWarn).toHaveBeenCalled();
      const call = mockConsoleWarn.mock.calls[0];
      expect(call[0]).toContain('[WARNING]');
      expect(call[0]).toContain('Warning message');
    });

    test('logError should call log with ERROR level', () => {
      logError('Error message');
      expect(mockConsoleError).toHaveBeenCalled();
      const call = mockConsoleError.mock.calls[0];
      expect(call[0]).toContain('[ERROR]');
      expect(call[0]).toContain('Error message');
    });

    test('logVerbose should call log with VERBOSE level', () => {
      setVerbose(true);
      logVerbose('Verbose message');
      expect(mockConsoleLog).toHaveBeenCalled();
      const call = mockConsoleLog.mock.calls[0];
      expect(call[0]).toContain('[VERBOSE]');
      expect(call[0]).toContain('Verbose message');
    });

    test('logPlain should call log with PLAIN level', () => {
      logPlain('Plain message');
      expect(mockConsoleLog).toHaveBeenCalledWith('Plain message');
    });
  });

  describe('setVerbose function', () => {
    test('should exist and be callable', () => {
      expect(typeof setVerbose).toBe('function');
      expect(() => setVerbose(true)).not.toThrow();
      expect(() => setVerbose(false)).not.toThrow();
    });

    test('should enable verbose logging when set to true', () => {
      setVerbose(true);
      logVerbose('Should be logged');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should disable verbose logging when set to false', () => {
      setVerbose(false);
      logVerbose('Should not be logged');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle null messages gracefully', () => {
      expect(() => log(null as any, LogLevel.INFO)).not.toThrow();
    });

    test('should handle undefined messages gracefully', () => {
      expect(() => log(undefined, LogLevel.INFO)).not.toThrow();
    });

    test('should handle empty messages', () => {
      log('', LogLevel.INFO);
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should handle no arguments', () => {
      expect(() => log()).not.toThrow();
    });
  });
});

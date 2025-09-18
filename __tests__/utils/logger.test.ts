import { log, logInfo, logWarning, logError, logVerbose, setLogLevel, logPlain, logAssertion } from '../../src/utils/logger';
import { LogLevel } from '../../src/types';

// Mock console methods
const originalConsole = { ...console };

describe('Logger', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log function', () => {
    test('should log info messages with green color', () => {
      log(LogLevel.INFO, 'Test info message');
      expect(mockConsoleLog).toHaveBeenCalledWith('[GREEN][INFO] Test info message[/GREEN]');
    });

    test('should log warning messages with yellow color', () => {
      log(LogLevel.WARNING, 'Test warning message');
      expect(mockConsoleWarn).toHaveBeenCalledWith('[YELLOW][WARNING] Test warning message[/YELLOW]');
    });

    test('should log error messages with red color', () => {
      log(LogLevel.ERROR, 'Test error message');
      expect(mockConsoleError).toHaveBeenCalledWith('[RED][ERROR] Test error message[/RED]');
    });

    test('should log verbose messages with blue color', () => {
      log(LogLevel.VERBOSE, 'Test verbose message');
      expect(mockConsoleLog).toHaveBeenCalledWith('[BLUE][VERBOSE] Test verbose message[/BLUE]');
    });

    test('should log plain messages without formatting', () => {
      log(LogLevel.PLAIN, 'Test plain message');
      expect(mockConsoleLog).toHaveBeenCalledWith('Test plain message');
    });

    test('should handle additional parameters', () => {
      log(LogLevel.INFO, 'Message with params', { data: 'test' }, 123);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[GREEN][INFO] Message with params[/GREEN]',
        { data: 'test' },
        123
      );
    });
  });

  describe('convenience functions', () => {
    test('logInfo should call log with INFO level', () => {
      logInfo('Info message');
      expect(mockConsoleLog).toHaveBeenCalledWith('[GREEN][INFO] Info message[/GREEN]');
    });

    test('logWarning should call log with WARNING level', () => {
      logWarning('Warning message');
      expect(mockConsoleWarn).toHaveBeenCalledWith('[YELLOW][WARNING] Warning message[/YELLOW]');
    });

    test('logError should call log with ERROR level', () => {
      logError('Error message');
      expect(mockConsoleError).toHaveBeenCalledWith('[RED][ERROR] Error message[/RED]');
    });

    test('logVerbose should call log with VERBOSE level', () => {
      logVerbose('Verbose message');
      expect(mockConsoleLog).toHaveBeenCalledWith('[BLUE][VERBOSE] Verbose message[/BLUE]');
    });

    test('logPlain should call log with PLAIN level', () => {
      logPlain('Plain message');
      expect(mockConsoleLog).toHaveBeenCalledWith('Plain message');
    });
  });

  describe('logAssertion', () => {
    test('should log assertion with proper formatting', () => {
      const assertion = {
        type: 'status',
        value: 200
      };

      logAssertion(assertion);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[GREEN][INFO] Assertion: {"type":"status","value":200}[/GREEN]'
      );
    });

    test('should handle assertion without value', () => {
      const assertion = {
        type: 'custom'
      };

      logAssertion(assertion);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[GREEN][INFO] Assertion: {"type":"custom"}[/GREEN]'
      );
    });
  });

  describe('setLogLevel function', () => {
    test('should exist and be callable', () => {
      expect(typeof setLogLevel).toBe('function');
      expect(() => setLogLevel(LogLevel.VERBOSE)).not.toThrow();
    });
  });

  describe('error handling', () => {
    test('should handle null messages gracefully', () => {
      expect(() => log(LogLevel.INFO, null as any)).not.toThrow();
    });

    test('should handle undefined messages gracefully', () => {
      expect(() => log(LogLevel.INFO, undefined as any)).not.toThrow();
    });

    test('should handle empty messages', () => {
      log(LogLevel.INFO, '');
      expect(mockConsoleLog).toHaveBeenCalledWith('[GREEN][INFO] [/GREEN]');
    });
  });
});
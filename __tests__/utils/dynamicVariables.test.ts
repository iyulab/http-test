import {
  generateGuid,
  generateTimestamp,
  generateRandomInt,
  generateDatetime,
  generateLocalDatetime,
  processDynamicVariables,
  getDotenvValue,
  getProcessEnvValue,
  setDotenvBasePath,
  clearDotenvCache,
} from '../../src/utils/dynamicVariables';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Dynamic Variables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearDotenvCache();
  });

  describe('generateGuid', () => {
    test('should generate valid UUID v4 format', () => {
      const guid = generateGuid();
      expect(guid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('should generate unique values', () => {
      const guids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        guids.add(generateGuid());
      }
      expect(guids.size).toBe(100);
    });
  });

  describe('generateTimestamp', () => {
    test('should generate Unix timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const timestamp = generateTimestamp();
      const after = Math.floor(Date.now() / 1000);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test('should return number type', () => {
      expect(typeof generateTimestamp()).toBe('number');
    });
  });

  describe('generateRandomInt', () => {
    test('should generate random integer within default range', () => {
      for (let i = 0; i < 100; i++) {
        const value = generateRandomInt();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1000);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    test('should generate random integer within custom range', () => {
      for (let i = 0; i < 100; i++) {
        const value = generateRandomInt(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(20);
      }
    });

    test('should handle min equals max', () => {
      const value = generateRandomInt(5, 5);
      expect(value).toBe(5);
    });
  });

  describe('generateDatetime', () => {
    test('should generate ISO8601 format by default', () => {
      const datetime = generateDatetime();
      expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    test('should generate RFC1123 format', () => {
      const datetime = generateDatetime('rfc1123');
      expect(datetime).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/);
    });

    test('should apply positive offset', () => {
      const now = new Date();
      const datetime = generateDatetime('iso8601', '1 day');
      const result = new Date(datetime);
      expect(result.getTime()).toBeGreaterThan(now.getTime());
    });

    test('should apply negative offset', () => {
      const now = new Date();
      const datetime = generateDatetime('iso8601', '-1 hour');
      const result = new Date(datetime);
      expect(result.getTime()).toBeLessThan(now.getTime());
    });

    test('should support custom format', () => {
      const datetime = generateDatetime('YYYY-MM-DD');
      expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('generateLocalDatetime', () => {
    test('should generate local datetime without timezone Z', () => {
      const datetime = generateLocalDatetime();
      expect(datetime).not.toContain('Z');
      expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}$/);
    });

    test('should support custom format', () => {
      const datetime = generateLocalDatetime('YYYY/MM/DD HH:mm:ss');
      expect(datetime).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('processDynamicVariables', () => {
    test('should process $guid variable', () => {
      const result = processDynamicVariables('id: {{$guid}}');
      expect(result).toMatch(/^id: [0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('should process $uuid variable (alias)', () => {
      const result = processDynamicVariables('id: {{$uuid}}');
      expect(result).toMatch(/^id: [0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('should process $timestamp variable', () => {
      const result = processDynamicVariables('time: {{$timestamp}}');
      expect(result).toMatch(/^time: \d+$/);
    });

    test('should process $randomInt variable with args', () => {
      const result = processDynamicVariables('num: {{$randomInt 1 10}}');
      const match = result.match(/^num: (\d+)$/);
      expect(match).not.toBeNull();
      const num = parseInt(match![1], 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });

    test('should process $datetime variable', () => {
      const result = processDynamicVariables('date: {{$datetime iso8601}}');
      expect(result).toMatch(/^date: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    test('should process $localDatetime variable', () => {
      const result = processDynamicVariables('date: {{$localDatetime}}');
      expect(result).toMatch(/^date: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}$/);
    });

    test('should process multiple dynamic variables', () => {
      const result = processDynamicVariables('{{$guid}} - {{$timestamp}}');
      expect(result).toMatch(/^[0-9a-f-]+ - \d+$/);
    });

    test('should preserve unknown dynamic variables', () => {
      const result = processDynamicVariables('{{$unknown}}');
      expect(result).toBe('{{$unknown}}');
    });

    test('should handle whitespace in variable syntax', () => {
      const result = processDynamicVariables('{{ $guid }}');
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('$dotenv variable', () => {
    test('should read value from .env file', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('API_KEY=secret123\nDB_HOST=localhost');

      const result = processDynamicVariables('key: {{$dotenv API_KEY}}');
      expect(result).toBe('key: secret123');
    });

    test('should handle quoted values in .env', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('VALUE="quoted value"');

      clearDotenvCache();
      const result = processDynamicVariables('{{$dotenv VALUE}}');
      expect(result).toBe('quoted value');
    });

    test('should preserve variable if not found in .env', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('OTHER=value');

      clearDotenvCache();
      const result = processDynamicVariables('{{$dotenv MISSING}}');
      expect(result).toBe('{{$dotenv MISSING}}');
    });

    test('should preserve variable if no .env file exists', () => {
      mockedFs.existsSync.mockReturnValue(false);

      clearDotenvCache();
      const result = processDynamicVariables('{{$dotenv API_KEY}}');
      expect(result).toBe('{{$dotenv API_KEY}}');
    });
  });

  describe('$processEnv variable', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should read value from process environment', () => {
      process.env.TEST_VAR = 'test_value';
      const result = processDynamicVariables('{{$processEnv TEST_VAR}}');
      expect(result).toBe('test_value');
    });

    test('should preserve variable if not found in environment', () => {
      delete process.env.MISSING_VAR;
      const result = processDynamicVariables('{{$processEnv MISSING_VAR}}');
      expect(result).toBe('{{$processEnv MISSING_VAR}}');
    });
  });

  describe('setDotenvBasePath', () => {
    test('should set custom base path for .env lookup', () => {
      mockedFs.existsSync.mockImplementation((p) => {
        return p === path.join('/custom/path', '.env');
      });
      mockedFs.readFileSync.mockReturnValue('CUSTOM=value');

      setDotenvBasePath('/custom/path');
      clearDotenvCache();

      const result = processDynamicVariables('{{$dotenv CUSTOM}}');
      expect(result).toBe('value');
    });
  });
});

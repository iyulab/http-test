/**
 * DynamicVariableResolver Tests
 *
 * TDD tests for dynamic variable resolution.
 */
import { DynamicVariableResolver } from '../../src/variables/DynamicVariableResolver';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DynamicVariableResolver', () => {
  let resolver: DynamicVariableResolver;
  let tempDir: string;

  beforeEach(() => {
    resolver = new DynamicVariableResolver();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamic-var-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    resolver.clearCache();
  });

  describe('$guid', () => {
    it('should generate valid UUID v4', () => {
      const result = resolver.resolve('{{$guid}}');
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result).toMatch(uuidPattern);
    });

    it('should generate different GUIDs each time', () => {
      const guid1 = resolver.resolve('{{$guid}}');
      const guid2 = resolver.resolve('{{$guid}}');
      expect(guid1).not.toBe(guid2);
    });

    it('should support $uuid alias', () => {
      const result = resolver.resolve('{{$uuid}}');
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result).toMatch(uuidPattern);
    });
  });

  describe('$timestamp', () => {
    it('should generate Unix timestamp', () => {
      const result = resolver.resolve('{{$timestamp}}');
      const timestamp = parseInt(result, 10);
      const now = Math.floor(Date.now() / 1000);
      expect(timestamp).toBeGreaterThan(now - 10);
      expect(timestamp).toBeLessThanOrEqual(now + 1);
    });
  });

  describe('$randomInt', () => {
    it('should generate random integer with default range', () => {
      const result = resolver.resolve('{{$randomInt}}');
      const num = parseInt(result, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(1000);
    });

    it('should generate random integer within specified range', () => {
      const result = resolver.resolve('{{$randomInt 10 20}}');
      const num = parseInt(result, 10);
      expect(num).toBeGreaterThanOrEqual(10);
      expect(num).toBeLessThanOrEqual(20);
    });

    it('should handle min only', () => {
      const result = resolver.resolve('{{$randomInt 100}}');
      const num = parseInt(result, 10);
      expect(num).toBeGreaterThanOrEqual(100);
      expect(num).toBeLessThanOrEqual(1000);
    });
  });

  describe('$datetime', () => {
    it('should generate ISO8601 datetime by default', () => {
      const result = resolver.resolve('{{$datetime}}');
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(result).toMatch(isoPattern);
    });

    it('should generate RFC1123 datetime', () => {
      const result = resolver.resolve('{{$datetime rfc1123}}');
      // RFC1123 format: Wed, 21 Oct 2015 07:28:00 GMT
      expect(result).toMatch(/\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT/);
    });

    it('should support custom format', () => {
      const result = resolver.resolve('{{$datetime YYYY-MM-DD}}');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should support offset', () => {
      const tomorrow = resolver.resolve('{{$datetime iso8601 1 day}}');
      const today = resolver.resolve('{{$datetime iso8601}}');
      expect(new Date(tomorrow).getTime()).toBeGreaterThan(new Date(today).getTime());
    });
  });

  describe('$localDatetime', () => {
    it('should generate local datetime', () => {
      const result = resolver.resolve('{{$localDatetime}}');
      // Local ISO format without timezone
      const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/;
      expect(result).toMatch(pattern);
    });

    it('should support custom format', () => {
      const result = resolver.resolve('{{$localDatetime YYYY/MM/DD}}');
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    });
  });

  describe('$dotenv', () => {
    it('should read value from .env file', () => {
      // Create .env file
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'TEST_VAR=hello_world\n');

      resolver.setDotenvPath(tempDir);
      const result = resolver.resolve('{{$dotenv TEST_VAR}}');

      expect(result).toBe('hello_world');
    });

    it('should handle quoted values', () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'QUOTED="value with spaces"\n');

      resolver.setDotenvPath(tempDir);
      const result = resolver.resolve('{{$dotenv QUOTED}}');

      expect(result).toBe('value with spaces');
    });

    it('should return original if variable not found', () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'OTHER_VAR=value\n');

      resolver.setDotenvPath(tempDir);
      const result = resolver.resolve('{{$dotenv NONEXISTENT}}');

      expect(result).toBe('{{$dotenv NONEXISTENT}}');
    });

    it('should skip comments in .env file', () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, '# This is a comment\nACTUAL=value\n');

      resolver.setDotenvPath(tempDir);
      const result = resolver.resolve('{{$dotenv ACTUAL}}');

      expect(result).toBe('value');
    });
  });

  describe('$processEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should read value from process environment', () => {
      process.env.TEST_PROCESS_VAR = 'process_value';

      const result = resolver.resolve('{{$processEnv TEST_PROCESS_VAR}}');

      expect(result).toBe('process_value');
    });

    it('should return original if variable not found', () => {
      delete process.env.NONEXISTENT_VAR;

      const result = resolver.resolve('{{$processEnv NONEXISTENT_VAR}}');

      expect(result).toBe('{{$processEnv NONEXISTENT_VAR}}');
    });
  });

  describe('multiple variables', () => {
    it('should resolve multiple dynamic variables in one string', () => {
      const result = resolver.resolve('id={{$guid}}&time={{$timestamp}}');

      expect(result).toMatch(/^id=[0-9a-f-]+&time=\d+$/);
    });

    it('should handle mixed dynamic and regular text', () => {
      const result = resolver.resolve('Hello {{$guid}} World');

      expect(result).toMatch(/^Hello [0-9a-f-]+ World$/);
    });
  });

  describe('unknown variables', () => {
    it('should keep unknown dynamic variables unchanged', () => {
      const result = resolver.resolve('{{$unknownVar}}');

      expect(result).toBe('{{$unknownVar}}');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = resolver.resolve('');

      expect(result).toBe('');
    });

    it('should handle string without variables', () => {
      const result = resolver.resolve('no variables here');

      expect(result).toBe('no variables here');
    });

    it('should handle whitespace around variable name', () => {
      const result = resolver.resolve('{{ $guid }}');
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result).toMatch(uuidPattern);
    });
  });
});

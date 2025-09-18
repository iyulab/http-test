import { loadCustomValidator } from '../../src/validators/customValidator';
import { readFile } from '../../src/utils/fileUtils';
import { fileExists } from '../../src/utils/fileUtils';

jest.mock('../../src/utils/fileUtils');
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockedFileExists = fileExists as jest.MockedFunction<typeof fileExists>;

describe('customValidator', () => {
  const mockBaseDir = '/test/dir';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and execute custom validator from file', async () => {
    const validatorCode = `
      module.exports = function(context) {
        return context.response.status === 200;
      };
    `;

    mockedFileExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue(validatorCode);

    const mockContext = {
      response: { status: 200, data: {}, headers: {} },
      variables: {},
      request: { name: 'test', method: 'GET' as const, url: 'http://test.com', headers: {}, tests: [], variableUpdates: [] }
    };

    const result = await loadCustomValidator('test-validator.js', mockBaseDir, mockContext);
    expect(result).toBe(true);
  });

  test('should handle validator that returns false', async () => {
    const validatorCode = `
      module.exports = function(context) {
        return context.response.status === 404;
      };
    `;

    mockedFileExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue(validatorCode);

    const mockContext = {
      response: { status: 200, data: {}, headers: {} },
      variables: {},
      request: { name: 'test', method: 'GET' as const, url: 'http://test.com', headers: {}, tests: [], variableUpdates: [] }
    };

    const result = await loadCustomValidator('test-validator.js', mockBaseDir, mockContext);
    expect(result).toBe(false);
  });

  test('should throw error when validator file does not exist', async () => {
    mockedFileExists.mockResolvedValue(false);

    const mockContext = {
      response: { status: 200, data: {}, headers: {} },
      variables: {},
      request: { name: 'test', method: 'GET' as const, url: 'http://test.com', headers: {}, tests: [], variableUpdates: [] }
    };

    await expect(loadCustomValidator('nonexistent.js', mockBaseDir, mockContext))
      .rejects.toThrow('Custom validator file not found');
  });

  test('should handle validator with syntax errors', async () => {
    const invalidValidatorCode = `
      module.exports = function(context) {
        return invalid_syntax here;
      };
    `;

    mockedFileExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue(invalidValidatorCode);

    const mockContext = {
      response: { status: 200, data: {}, headers: {} },
      variables: {},
      request: { name: 'test', method: 'GET' as const, url: 'http://test.com', headers: {}, tests: [], variableUpdates: [] }
    };

    await expect(loadCustomValidator('invalid-validator.js', mockBaseDir, mockContext))
      .rejects.toThrow();
  });

  test('should handle validator that throws runtime error', async () => {
    const errorValidatorCode = `
      module.exports = function(context) {
        throw new Error('Validation failed');
      };
    `;

    mockedFileExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue(errorValidatorCode);

    const mockContext = {
      response: { status: 200, data: {}, headers: {} },
      variables: {},
      request: { name: 'test', method: 'GET' as const, url: 'http://test.com', headers: {}, tests: [], variableUpdates: [] }
    };

    await expect(loadCustomValidator('error-validator.js', mockBaseDir, mockContext))
      .rejects.toThrow('Validation failed');
  });

  test('should handle validator that accesses context properties', async () => {
    const contextValidatorCode = `
      module.exports = function(context) {
        return context.variables.testVar === 'expected' &&
               context.response.data.success === true;
      };
    `;

    mockedFileExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue(contextValidatorCode);

    const mockContext = {
      response: { status: 200, data: { success: true }, headers: {} },
      variables: { testVar: 'expected' },
      request: { name: 'test', method: 'GET' as const, url: 'http://test.com', headers: {}, tests: [], variableUpdates: [] }
    };

    const result = await loadCustomValidator('context-validator.js', mockBaseDir, mockContext);
    expect(result).toBe(true);
  });
});
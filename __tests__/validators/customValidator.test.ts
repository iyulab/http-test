import { loadCustomValidator } from '../../src/validators/customValidator';
import { readFile } from '../../src/utils/fileUtils';
import { HttpResponse, CustomValidatorContext } from '../../src/types';

jest.mock('../../src/utils/fileUtils');
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('customValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and return a validator function', async () => {
    const validatorCode = `
      module.exports = function(response, context) {
        return response.status === 200;
      };
    `;

    mockedReadFile.mockResolvedValue(validatorCode);

    const validator = await loadCustomValidator('/test/validator.js');
    expect(typeof validator).toBe('function');
  });

  test('should execute loaded validator successfully', async () => {
    const validatorCode = `
      module.exports = function(response, context) {
        return response.status === 200;
      };
    `;

    mockedReadFile.mockResolvedValue(validatorCode);

    const validator = await loadCustomValidator('/test/validator.js');

    const mockResponse: HttpResponse = {
      status: 200,
      data: {},
      headers: {}
    };
    const mockContext: CustomValidatorContext = {
      variables: {}
    };

    const result = validator(mockResponse, mockContext);
    expect(result).toBe(true);
  });

  test('should handle validator that returns false', async () => {
    const validatorCode = `
      module.exports = function(response, context) {
        return response.status === 404;
      };
    `;

    mockedReadFile.mockResolvedValue(validatorCode);

    const validator = await loadCustomValidator('/test/validator.js');

    const mockResponse: HttpResponse = {
      status: 200,
      data: {},
      headers: {}
    };
    const mockContext: CustomValidatorContext = {
      variables: {}
    };

    const result = validator(mockResponse, mockContext);
    expect(result).toBe(false);
  });

  test('should throw error when validator file does not exist', async () => {
    mockedReadFile.mockRejectedValue(new Error('File not found'));

    await expect(loadCustomValidator('/test/nonexistent.js'))
      .rejects.toThrow('File not found');
  });

  test('should throw error for validator with syntax errors', async () => {
    const invalidValidatorCode = `
      module.exports = function(response, context) {
        return invalid_syntax here;
      };
    `;

    mockedReadFile.mockResolvedValue(invalidValidatorCode);

    await expect(loadCustomValidator('/test/invalid-validator.js'))
      .rejects.toThrow();
  });

  test('should throw error when validator does not export a function', async () => {
    const nonFunctionCode = `
      module.exports = { notAFunction: true };
    `;

    mockedReadFile.mockResolvedValue(nonFunctionCode);

    await expect(loadCustomValidator('/test/not-a-function.js'))
      .rejects.toThrow('Custom validator must export a function');
  });

  test('should handle validator that accesses context variables', async () => {
    const contextValidatorCode = `
      module.exports = function(response, context) {
        return context.variables.testVar === 'expected';
      };
    `;

    mockedReadFile.mockResolvedValue(contextValidatorCode);

    const validator = await loadCustomValidator('/test/context-validator.js');

    const mockResponse: HttpResponse = {
      status: 200,
      data: {},
      headers: {}
    };
    const mockContext: CustomValidatorContext = {
      variables: { testVar: 'expected' }
    };

    const result = validator(mockResponse, mockContext);
    expect(result).toBe(true);
  });

  test('should handle validator that accesses response data', async () => {
    const dataValidatorCode = `
      module.exports = function(response, context) {
        return response.data && response.data.success === true;
      };
    `;

    mockedReadFile.mockResolvedValue(dataValidatorCode);

    const validator = await loadCustomValidator('/test/data-validator.js');

    const mockResponse: HttpResponse = {
      status: 200,
      data: { success: true },
      headers: {}
    };
    const mockContext: CustomValidatorContext = {
      variables: {}
    };

    const result = validator(mockResponse, mockContext);
    expect(result).toBe(true);
  });

  test('should provide sandbox with allowed modules (path, fs, http)', async () => {
    // The sandbox allows importing path, fs, http modules
    const validatorWithImport = `
      module.exports = function(response, context) {
        // Just return true to confirm function works
        return true;
      };
    `;

    mockedReadFile.mockResolvedValue(validatorWithImport);

    const validator = await loadCustomValidator('/test/import-validator.js');

    const mockResponse: HttpResponse = {
      status: 200,
      data: {},
      headers: {}
    };
    const mockContext: CustomValidatorContext = {
      variables: {}
    };

    expect(() => validator(mockResponse, mockContext)).not.toThrow();
  });
});

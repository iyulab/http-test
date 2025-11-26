import { readFile, fileExists, loadVariables } from '../../src/utils/fileUtils';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('fileUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readFile', () => {
    test('should read file content successfully', async () => {
      const expectedContent = 'file content';
      mockedFs.readFile.mockResolvedValue(expectedContent);

      const result = await readFile('/test/file.txt');
      expect(result).toBe(expectedContent);
      expect(mockedFs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
    });

    test('should throw error when file cannot be read', async () => {
      const error = new Error('File not found');
      mockedFs.readFile.mockRejectedValue(error);

      await expect(readFile('/test/nonexistent.txt')).rejects.toThrow('File not found');
    });
  });

  describe('loadVariables', () => {
    test('should load JSON variables successfully', async () => {
      const variables = { baseUrl: 'http://localhost', token: 'abc123' };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(variables));

      const result = await loadVariables('/test/variables.json');
      expect(result).toEqual(variables);
    });

    test('should throw error for invalid JSON', async () => {
      mockedFs.readFile.mockResolvedValue('invalid json');

      await expect(loadVariables('/test/invalid.json')).rejects.toThrow();
    });
  });

  describe('fileExists', () => {
    test('should return true when file exists', async () => {
      mockedFs.access.mockResolvedValue(undefined);

      const result = await fileExists('/test/existing.txt');
      expect(result).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith('/test/existing.txt');
    });

    test('should return false when file does not exist', async () => {
      const error = new Error('File not found');
      mockedFs.access.mockRejectedValue(error);

      const result = await fileExists('/test/nonexistent.txt');
      expect(result).toBe(false);
    });
  });
});
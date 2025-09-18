import { readFile, writeFile, fileExists } from '../../src/utils/fileUtils';
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

  describe('writeFile', () => {
    test('should write file content successfully', async () => {
      mockedFs.writeFile.mockResolvedValue(undefined);

      await writeFile('/test/output.txt', 'content to write');
      expect(mockedFs.writeFile).toHaveBeenCalledWith('/test/output.txt', 'content to write', 'utf-8');
    });

    test('should throw error when file cannot be written', async () => {
      const error = new Error('Permission denied');
      mockedFs.writeFile.mockRejectedValue(error);

      await expect(writeFile('/test/readonly.txt', 'content')).rejects.toThrow('Permission denied');
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
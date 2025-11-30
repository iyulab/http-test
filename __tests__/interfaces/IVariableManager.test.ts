/**
 * IVariableManager Contract Tests
 *
 * These tests define the contract that any IVariableManager implementation must fulfill.
 */
import { IVariableManager } from '../../src/interfaces/IVariableManager';
import { VariableManager } from '../../src/core/VariableManager';

describe('IVariableManager Contract', () => {
  let manager: IVariableManager;

  beforeEach(() => {
    manager = new VariableManager();
  });

  describe('setVariable() and getVariable()', () => {
    it('should store and retrieve string values', () => {
      manager.setVariable('host', 'http://localhost:3000');
      expect(manager.getVariable('host')).toBe('http://localhost:3000');
    });

    it('should store and retrieve numeric values', () => {
      manager.setVariable('port', 8080);
      expect(manager.getVariable('port')).toBe(8080);
    });

    it('should store and retrieve boolean values', () => {
      manager.setVariable('debug', true);
      expect(manager.getVariable('debug')).toBe(true);
    });

    it('should return undefined for non-existent keys', () => {
      expect(manager.getVariable('nonexistent')).toBeUndefined();
    });
  });

  describe('setVariables()', () => {
    it('should set multiple variables at once', () => {
      manager.setVariables({
        host: 'http://api.example.com',
        apiKey: 'secret123',
        timeout: 5000
      });

      expect(manager.getVariable('host')).toBe('http://api.example.com');
      expect(manager.getVariable('apiKey')).toBe('secret123');
      expect(manager.getVariable('timeout')).toBe(5000);
    });
  });

  describe('replaceVariables()', () => {
    it('should replace {{variable}} placeholders', () => {
      manager.setVariable('host', 'http://localhost:3000');
      manager.setVariable('endpoint', '/api/users');

      const result = manager.replaceVariables('{{host}}{{endpoint}}');
      expect(result).toBe('http://localhost:3000/api/users');
    });

    it('should return original string if no variables found', () => {
      const result = manager.replaceVariables('plain text');
      expect(result).toBe('plain text');
    });
  });

  describe('getAllVariables()', () => {
    it('should return all stored variables', () => {
      manager.setVariable('a', '1');
      manager.setVariable('b', '2');

      const all = manager.getAllVariables();
      expect(all).toHaveProperty('a', '1');
      expect(all).toHaveProperty('b', '2');
    });
  });

  describe('Interface Type Checking', () => {
    it('should satisfy IVariableManager interface', () => {
      const typedManager: IVariableManager = manager;
      expect(typeof typedManager.setVariable).toBe('function');
      expect(typeof typedManager.getVariable).toBe('function');
      expect(typeof typedManager.setVariables).toBe('function');
      expect(typeof typedManager.replaceVariables).toBe('function');
      expect(typeof typedManager.getAllVariables).toBe('function');
    });
  });
});

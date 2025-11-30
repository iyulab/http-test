/**
 * VariableScope Tests
 *
 * TDD tests for hierarchical variable scoping system.
 */
import {
  VariableScope,
  ScopeType,
  createScopeChain,
  ScopePriority
} from '../../src/variables/VariableScope';

describe('VariableScope', () => {
  describe('single scope', () => {
    it('should get and set variables', () => {
      const scope = new VariableScope(ScopeType.REQUEST);

      scope.set('name', 'John');
      scope.set('age', 30);

      expect(scope.get('name')).toBe('John');
      expect(scope.get('age')).toBe(30);
    });

    it('should return undefined for non-existent variable', () => {
      const scope = new VariableScope(ScopeType.REQUEST);

      expect(scope.get('nonexistent')).toBeUndefined();
    });

    it('should check if variable exists', () => {
      const scope = new VariableScope(ScopeType.REQUEST);

      scope.set('exists', 'value');

      expect(scope.has('exists')).toBe(true);
      expect(scope.has('nonexistent')).toBe(false);
    });

    it('should get all variables in scope', () => {
      const scope = new VariableScope(ScopeType.REQUEST);

      scope.set('a', 1);
      scope.set('b', 2);

      expect(scope.getAll()).toEqual({ a: 1, b: 2 });
    });

    it('should clear all variables', () => {
      const scope = new VariableScope(ScopeType.REQUEST);

      scope.set('a', 1);
      scope.set('b', 2);
      scope.clear();

      expect(scope.getAll()).toEqual({});
    });

    it('should have correct scope type', () => {
      const scope = new VariableScope(ScopeType.FILE);

      expect(scope.type).toBe(ScopeType.FILE);
    });
  });

  describe('scope chain', () => {
    it('should resolve variable from parent scope', () => {
      const fileScope = new VariableScope(ScopeType.FILE);
      const requestScope = new VariableScope(ScopeType.REQUEST, fileScope);

      fileScope.set('baseUrl', 'http://api.example.com');

      expect(requestScope.resolve('baseUrl')).toBe('http://api.example.com');
    });

    it('should shadow parent variable with same name', () => {
      const fileScope = new VariableScope(ScopeType.FILE);
      const requestScope = new VariableScope(ScopeType.REQUEST, fileScope);

      fileScope.set('env', 'production');
      requestScope.set('env', 'development');

      expect(requestScope.resolve('env')).toBe('development');
      expect(fileScope.get('env')).toBe('production');
    });

    it('should resolve through multiple parent levels', () => {
      const envScope = new VariableScope(ScopeType.ENVIRONMENT);
      const fileScope = new VariableScope(ScopeType.FILE, envScope);
      const requestScope = new VariableScope(ScopeType.REQUEST, fileScope);

      envScope.set('apiKey', 'secret-key');

      expect(requestScope.resolve('apiKey')).toBe('secret-key');
    });

    it('should return undefined if variable not found in any scope', () => {
      const fileScope = new VariableScope(ScopeType.FILE);
      const requestScope = new VariableScope(ScopeType.REQUEST, fileScope);

      expect(requestScope.resolve('nonexistent')).toBeUndefined();
    });

    it('should get all resolved variables including parent scopes', () => {
      const fileScope = new VariableScope(ScopeType.FILE);
      const requestScope = new VariableScope(ScopeType.REQUEST, fileScope);

      fileScope.set('fileVar', 'fileValue');
      fileScope.set('shared', 'fromFile');
      requestScope.set('requestVar', 'requestValue');
      requestScope.set('shared', 'fromRequest');

      const all = requestScope.resolveAll();

      expect(all).toEqual({
        fileVar: 'fileValue',
        shared: 'fromRequest',
        requestVar: 'requestValue'
      });
    });
  });

  describe('scope priorities', () => {
    it('should have correct priority order', () => {
      expect(ScopePriority[ScopeType.REQUEST]).toBeGreaterThan(ScopePriority[ScopeType.FILE]);
      expect(ScopePriority[ScopeType.FILE]).toBeGreaterThan(ScopePriority[ScopeType.RUNTIME]);
      expect(ScopePriority[ScopeType.RUNTIME]).toBeGreaterThan(ScopePriority[ScopeType.ENVIRONMENT]);
      expect(ScopePriority[ScopeType.ENVIRONMENT]).toBeGreaterThan(ScopePriority[ScopeType.SCRIPT_GLOBAL]);
      expect(ScopePriority[ScopeType.SCRIPT_GLOBAL]).toBeGreaterThan(ScopePriority[ScopeType.DYNAMIC]);
      expect(ScopePriority[ScopeType.DYNAMIC]).toBeGreaterThan(ScopePriority[ScopeType.SYSTEM]);
    });
  });

  describe('createScopeChain', () => {
    it('should create proper scope chain with all levels', () => {
      const chain = createScopeChain();

      expect(chain.system.type).toBe(ScopeType.SYSTEM);
      expect(chain.dynamic.type).toBe(ScopeType.DYNAMIC);
      expect(chain.scriptGlobal.type).toBe(ScopeType.SCRIPT_GLOBAL);
      expect(chain.environment.type).toBe(ScopeType.ENVIRONMENT);
      expect(chain.runtime.type).toBe(ScopeType.RUNTIME);
      expect(chain.file.type).toBe(ScopeType.FILE);
      expect(chain.request.type).toBe(ScopeType.REQUEST);
    });

    it('should resolve variables in correct priority order', () => {
      const chain = createScopeChain();

      chain.system.set('var', 'system');
      chain.dynamic.set('var', 'dynamic');
      chain.environment.set('var', 'environment');
      chain.file.set('var', 'file');
      chain.request.set('var', 'request');

      // Request scope has highest priority
      expect(chain.request.resolve('var')).toBe('request');

      // Remove from request scope, should get from file
      chain.request.clear();
      expect(chain.request.resolve('var')).toBe('file');
    });

    it('should resolve through entire chain', () => {
      const chain = createScopeChain();

      chain.system.set('systemVar', 'fromSystem');
      chain.environment.set('envVar', 'fromEnv');
      chain.file.set('fileVar', 'fromFile');
      chain.request.set('requestVar', 'fromRequest');

      const all = chain.request.resolveAll();

      expect(all.systemVar).toBe('fromSystem');
      expect(all.envVar).toBe('fromEnv');
      expect(all.fileVar).toBe('fromFile');
      expect(all.requestVar).toBe('fromRequest');
    });
  });

  describe('immutable operations', () => {
    it('should not mutate when getting all variables', () => {
      const scope = new VariableScope(ScopeType.REQUEST);

      scope.set('original', 'value');
      const all = scope.getAll();

      all['modified'] = 'new';

      expect(scope.has('modified')).toBe(false);
    });

    it('should not mutate parent when setting in child', () => {
      const parent = new VariableScope(ScopeType.FILE);
      const child = new VariableScope(ScopeType.REQUEST, parent);

      parent.set('shared', 'parent');
      child.set('shared', 'child');

      expect(parent.get('shared')).toBe('parent');
      expect(child.get('shared')).toBe('child');
    });
  });
});

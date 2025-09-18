import { JsonUtils } from '../../src/utils/jsonUtils';

describe('JsonUtils', () => {
  describe('parseJson', () => {
    test('should parse valid JSON string', () => {
      const jsonString = '{"name": "test", "value": 123}';
      const result = JsonUtils.parseJson(jsonString);

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    test('should parse JSON array', () => {
      const jsonString = '[{"id": 1}, {"id": 2}]';
      const result = JsonUtils.parseJson(jsonString);

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test('should parse primitive values', () => {
      expect(JsonUtils.parseJson('123')).toBe(123);
      expect(JsonUtils.parseJson('"hello"')).toBe('hello');
      expect(JsonUtils.parseJson('true')).toBe(true);
      expect(JsonUtils.parseJson('false')).toBe(false);
      expect(JsonUtils.parseJson('null')).toBe(null);
    });

    test('should throw error for invalid JSON', () => {
      expect(() => JsonUtils.parseJson('{')).toThrow();
      expect(() => JsonUtils.parseJson('invalid json')).toThrow();
      expect(() => JsonUtils.parseJson('{"unclosed": ')).toThrow();
    });

    test('should handle empty string', () => {
      expect(() => JsonUtils.parseJson('')).toThrow();
    });

    test('should handle undefined input', () => {
      expect(() => JsonUtils.parseJson(undefined as any)).toThrow();
    });

    test('should handle null input', () => {
      expect(() => JsonUtils.parseJson(null as any)).toThrow();
    });

    test('should parse complex nested objects', () => {
      const complexJson = `{
        "user": {
          "id": 1,
          "profile": {
            "name": "John",
            "preferences": ["dark_mode", "notifications"]
          }
        },
        "posts": [
          {"title": "First Post", "tags": ["tech", "programming"]},
          {"title": "Second Post", "tags": ["life"]}
        ]
      }`;

      const result = JsonUtils.parseJson(complexJson);

      expect(result.user.id).toBe(1);
      expect(result.user.profile.name).toBe('John');
      expect(result.user.profile.preferences).toEqual(['dark_mode', 'notifications']);
      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].title).toBe('First Post');
    });

    test('should handle JSON with special characters', () => {
      const jsonWithSpecialChars = '{"message": "Hello\\nWorld\\t!", "emoji": "🚀", "unicode": "\\u0048\\u0065\\u006C\\u006C\\u006F"}';
      const result = JsonUtils.parseJson(jsonWithSpecialChars);

      expect(result.message).toBe('Hello\nWorld\t!');
      expect(result.emoji).toBe('🚀');
      expect(result.unicode).toBe('Hello');
    });

    test('should handle JSON with numbers', () => {
      const jsonWithNumbers = '{"int": 123, "float": 45.67, "negative": -89, "exponential": 1.23e10}';
      const result = JsonUtils.parseJson(jsonWithNumbers);

      expect(result.int).toBe(123);
      expect(result.float).toBe(45.67);
      expect(result.negative).toBe(-89);
      expect(result.exponential).toBe(1.23e10);
    });

    test('should preserve object property order when possible', () => {
      const orderedJson = '{"first": 1, "second": 2, "third": 3}';
      const result = JsonUtils.parseJson(orderedJson);

      const keys = Object.keys(result);
      expect(keys).toEqual(['first', 'second', 'third']);
    });
  });

  describe('edge cases', () => {
    test('should handle whitespace in JSON', () => {
      const jsonWithWhitespace = `  {
        "name"  :  "test"  ,
        "value" : 123
      }  `;

      const result = JsonUtils.parseJson(jsonWithWhitespace);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    test('should handle escaped quotes', () => {
      const jsonWithEscapedQuotes = '{"message": "He said \\"Hello\\" to me"}';
      const result = JsonUtils.parseJson(jsonWithEscapedQuotes);

      expect(result.message).toBe('He said "Hello" to me');
    });

    test('should handle very large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const jsonWithLargeNumber = `{"large": ${largeNumber}}`;
      const result = JsonUtils.parseJson(jsonWithLargeNumber);

      expect(result.large).toBe(largeNumber);
    });

    test('should handle very deep nesting', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep'
                }
              }
            }
          }
        }
      };

      const jsonString = JSON.stringify(deepObject);
      const result = JsonUtils.parseJson(jsonString);

      expect(result.level1.level2.level3.level4.level5.value).toBe('deep');
    });

    test('should handle empty objects and arrays', () => {
      expect(JsonUtils.parseJson('{}')).toEqual({});
      expect(JsonUtils.parseJson('[]')).toEqual([]);
      expect(JsonUtils.parseJson('{"empty": {}, "array": []}')).toEqual({ empty: {}, array: [] });
    });
  });
});
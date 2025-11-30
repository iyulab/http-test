/**
 * CookieJar Tests
 *
 * Tests for automatic cookie management:
 * - Storing cookies from Set-Cookie headers
 * - Sending cookies with subsequent requests
 * - Cookie expiration and domain/path matching
 * - Secure and HttpOnly cookie handling
 */

import { CookieJar, Cookie } from '../../src/core/CookieJar';

describe('CookieJar', () => {
  let jar: CookieJar;

  beforeEach(() => {
    jar = new CookieJar();
  });

  describe('Basic Cookie Operations', () => {
    it('should store a simple cookie', () => {
      jar.setCookie('sessionId=abc123', 'https://example.com/api');

      const cookies = jar.getCookies('https://example.com/api');
      expect(cookies).toContain('sessionId=abc123');
    });

    it('should store multiple cookies', () => {
      jar.setCookie('sessionId=abc123', 'https://example.com/api');
      jar.setCookie('userId=user1', 'https://example.com/api');

      const cookies = jar.getCookies('https://example.com/api');
      expect(cookies).toContain('sessionId=abc123');
      expect(cookies).toContain('userId=user1');
    });

    it('should update existing cookie with same name', () => {
      jar.setCookie('sessionId=abc123', 'https://example.com/api');
      jar.setCookie('sessionId=xyz789', 'https://example.com/api');

      const cookies = jar.getCookies('https://example.com/api');
      expect(cookies).not.toContain('sessionId=abc123');
      expect(cookies).toContain('sessionId=xyz789');
    });

    it('should return cookie header string', () => {
      jar.setCookie('sessionId=abc123', 'https://example.com/api');
      jar.setCookie('userId=user1', 'https://example.com/api');

      const cookieHeader = jar.getCookieHeader('https://example.com/api');
      expect(cookieHeader).toMatch(/sessionId=abc123/);
      expect(cookieHeader).toMatch(/userId=user1/);
      expect(cookieHeader).toMatch(/; /); // Cookies joined with "; "
    });

    it('should return empty string when no cookies', () => {
      const cookieHeader = jar.getCookieHeader('https://example.com/api');
      expect(cookieHeader).toBe('');
    });
  });

  describe('Domain Matching', () => {
    it('should match exact domain', () => {
      jar.setCookie('token=abc; Domain=example.com', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/path')).toContain('token=abc');
    });

    it('should match subdomains when Domain attribute is set', () => {
      jar.setCookie('token=abc; Domain=example.com', 'https://example.com/api');

      expect(jar.getCookies('https://api.example.com/path')).toContain('token=abc');
      expect(jar.getCookies('https://sub.api.example.com/path')).toContain('token=abc');
    });

    it('should not match different domains', () => {
      jar.setCookie('token=abc; Domain=example.com', 'https://example.com/api');

      expect(jar.getCookies('https://other.com/path')).not.toContain('token=abc');
    });

    it('should not match parent domain when cookie set on subdomain', () => {
      jar.setCookie('token=abc', 'https://api.example.com/api');

      expect(jar.getCookies('https://example.com/path')).not.toContain('token=abc');
    });

    it('should use request domain when no Domain attribute', () => {
      jar.setCookie('token=abc', 'https://api.example.com/api');

      expect(jar.getCookies('https://api.example.com/path')).toContain('token=abc');
      expect(jar.getCookies('https://other.example.com/path')).not.toContain('token=abc');
    });
  });

  describe('Path Matching', () => {
    it('should match exact path', () => {
      jar.setCookie('token=abc; Path=/api', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('token=abc');
    });

    it('should match sub-paths', () => {
      jar.setCookie('token=abc; Path=/api', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api/users')).toContain('token=abc');
      expect(jar.getCookies('https://example.com/api/users/123')).toContain('token=abc');
    });

    it('should not match different paths', () => {
      jar.setCookie('token=abc; Path=/api', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/other')).not.toContain('token=abc');
    });

    it('should default to root path', () => {
      jar.setCookie('token=abc', 'https://example.com/api/users');

      // Default path should be derived from request URL
      expect(jar.getCookies('https://example.com/api/users')).toContain('token=abc');
    });
  });

  describe('Cookie Expiration', () => {
    it('should honor Max-Age attribute', () => {
      // Set a cookie that expires immediately
      jar.setCookie('token=abc; Max-Age=0', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).not.toContain('token=abc');
    });

    it('should honor future Max-Age', () => {
      jar.setCookie('token=abc; Max-Age=3600', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('token=abc');
    });

    it('should honor Expires attribute in the past', () => {
      const pastDate = new Date(Date.now() - 10000).toUTCString();
      jar.setCookie(`token=abc; Expires=${pastDate}`, 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).not.toContain('token=abc');
    });

    it('should honor future Expires attribute', () => {
      const futureDate = new Date(Date.now() + 3600000).toUTCString();
      jar.setCookie(`token=abc; Expires=${futureDate}`, 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('token=abc');
    });

    it('should treat session cookies as non-expiring within session', () => {
      jar.setCookie('sessionToken=abc', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('sessionToken=abc');
    });
  });

  describe('Secure Cookies', () => {
    it('should send Secure cookies only over HTTPS', () => {
      jar.setCookie('token=abc; Secure', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('token=abc');
      expect(jar.getCookies('http://example.com/api')).not.toContain('token=abc');
    });

    it('should send non-secure cookies over both HTTP and HTTPS', () => {
      jar.setCookie('token=abc', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('token=abc');
      expect(jar.getCookies('http://example.com/api')).toContain('token=abc');
    });
  });

  describe('Cookie Deletion', () => {
    it('should delete cookie when Max-Age=0 is set', () => {
      jar.setCookie('token=abc', 'https://example.com/api');
      expect(jar.getCookies('https://example.com/api')).toContain('token=abc');

      jar.setCookie('token=; Max-Age=0', 'https://example.com/api');
      expect(jar.getCookies('https://example.com/api')).not.toContain('token=abc');
    });

    it('should clear all cookies', () => {
      jar.setCookie('token1=abc', 'https://example.com/api');
      jar.setCookie('token2=xyz', 'https://other.com/api');

      jar.clear();

      expect(jar.getCookies('https://example.com/api')).toEqual([]);
      expect(jar.getCookies('https://other.com/api')).toEqual([]);
    });

    it('should clear cookies for specific domain', () => {
      jar.setCookie('token1=abc', 'https://example.com/api');
      jar.setCookie('token2=xyz', 'https://other.com/api');

      jar.clearDomain('example.com');

      expect(jar.getCookies('https://example.com/api')).toEqual([]);
      expect(jar.getCookies('https://other.com/api')).toContain('token2=xyz');
    });
  });

  describe('Multiple Set-Cookie Headers', () => {
    it('should process array of Set-Cookie headers', () => {
      jar.setCookies([
        'sessionId=abc123',
        'userId=user1',
        'token=xyz789'
      ], 'https://example.com/api');

      const cookies = jar.getCookies('https://example.com/api');
      expect(cookies).toContain('sessionId=abc123');
      expect(cookies).toContain('userId=user1');
      expect(cookies).toContain('token=xyz789');
    });
  });

  describe('Cookie Parsing', () => {
    it('should parse complex cookie string', () => {
      jar.setCookie(
        'sessionId=abc123; Domain=example.com; Path=/api; Secure; HttpOnly; Max-Age=3600',
        'https://example.com/api'
      );

      expect(jar.getCookies('https://example.com/api')).toContain('sessionId=abc123');
      expect(jar.getCookies('http://example.com/api')).not.toContain('sessionId=abc123'); // Secure
    });

    it('should handle cookies with special characters in value', () => {
      jar.setCookie('data=hello%20world', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('data=hello%20world');
    });

    it('should handle cookies with equals sign in value', () => {
      jar.setCookie('data=key=value', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('data=key=value');
    });

    it('should handle cookies with empty value', () => {
      jar.setCookie('empty=', 'https://example.com/api');

      expect(jar.getCookies('https://example.com/api')).toContain('empty=');
    });
  });

  describe('Cookie Inspection', () => {
    it('should list all stored cookies', () => {
      jar.setCookie('sessionId=abc123', 'https://example.com/api');
      jar.setCookie('userId=user1', 'https://other.com/api');

      const allCookies = jar.getAllCookies();
      expect(allCookies.length).toBe(2);
    });

    it('should get cookie by name', () => {
      jar.setCookie('sessionId=abc123', 'https://example.com/api');
      jar.setCookie('userId=user1', 'https://example.com/api');

      const cookie = jar.getCookieByName('sessionId', 'https://example.com/api');
      expect(cookie?.value).toBe('abc123');
    });

    it('should return undefined for non-existent cookie name', () => {
      const cookie = jar.getCookieByName('nonExistent', 'https://example.com/api');
      expect(cookie).toBeUndefined();
    });
  });

  describe('SameSite Attribute', () => {
    it('should handle SameSite=Strict', () => {
      jar.setCookie('token=abc; SameSite=Strict', 'https://example.com/api');

      const cookie = jar.getCookieByName('token', 'https://example.com/api');
      expect(cookie?.sameSite).toBe('Strict');
    });

    it('should handle SameSite=Lax', () => {
      jar.setCookie('token=abc; SameSite=Lax', 'https://example.com/api');

      const cookie = jar.getCookieByName('token', 'https://example.com/api');
      expect(cookie?.sameSite).toBe('Lax');
    });

    it('should handle SameSite=None', () => {
      jar.setCookie('token=abc; SameSite=None; Secure', 'https://example.com/api');

      const cookie = jar.getCookieByName('token', 'https://example.com/api');
      expect(cookie?.sameSite).toBe('None');
    });
  });
});

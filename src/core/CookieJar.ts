/**
 * CookieJar - Automatic Cookie Management
 *
 * Supports:
 * - Storing cookies from Set-Cookie headers
 * - Domain and path matching
 * - Cookie expiration (Max-Age, Expires)
 * - Secure and HttpOnly flags
 * - SameSite attribute
 */

import { logVerbose } from '../utils/logger';

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: Date;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  hostOnly: boolean; // True if no Domain attribute was specified
}

export class CookieJar {
  private cookies: Cookie[] = [];

  /**
   * Set a cookie from a Set-Cookie header value
   */
  setCookie(setCookieHeader: string, requestUrl: string): void {
    const cookie = this.parseCookie(setCookieHeader, requestUrl);
    if (!cookie) return;

    // Check if cookie is expired
    if (cookie.expires && cookie.expires <= new Date()) {
      // Remove existing cookie with same name/domain/path
      this.removeCookie(cookie.name, cookie.domain, cookie.path);
      return;
    }

    // Update or add cookie
    const existingIndex = this.findCookieIndex(cookie.name, cookie.domain, cookie.path);
    if (existingIndex >= 0) {
      this.cookies[existingIndex] = cookie;
    } else {
      this.cookies.push(cookie);
    }

    logVerbose(`Cookie set: ${cookie.name}=${cookie.value} for ${cookie.domain}${cookie.path}`);
  }

  /**
   * Set multiple cookies from an array of Set-Cookie headers
   */
  setCookies(setCookieHeaders: string[], requestUrl: string): void {
    for (const header of setCookieHeaders) {
      this.setCookie(header, requestUrl);
    }
  }

  /**
   * Get all cookies that match the given URL
   */
  getCookies(requestUrl: string): string[] {
    const url = new URL(requestUrl);
    const matchingCookies = this.getMatchingCookies(url);
    return matchingCookies.map(c => `${c.name}=${c.value}`);
  }

  /**
   * Get cookie header string for a request URL
   */
  getCookieHeader(requestUrl: string): string {
    const cookies = this.getCookies(requestUrl);
    return cookies.join('; ');
  }

  /**
   * Get a specific cookie by name for a URL
   */
  getCookieByName(name: string, requestUrl: string): Cookie | undefined {
    const url = new URL(requestUrl);
    const matchingCookies = this.getMatchingCookies(url);
    return matchingCookies.find(c => c.name === name);
  }

  /**
   * Get all stored cookies
   */
  getAllCookies(): Cookie[] {
    return [...this.cookies];
  }

  /**
   * Clear all cookies
   */
  clear(): void {
    this.cookies = [];
    logVerbose('Cookie jar cleared');
  }

  /**
   * Clear cookies for a specific domain
   */
  clearDomain(domain: string): void {
    this.cookies = this.cookies.filter(c => !this.domainMatches(c, domain));
    logVerbose(`Cookies cleared for domain: ${domain}`);
  }

  private parseCookie(setCookieHeader: string, requestUrl: string): Cookie | null {
    const url = new URL(requestUrl);
    const parts = setCookieHeader.split(';').map(p => p.trim());

    if (parts.length === 0 || !parts[0]) return null;

    // Parse name=value
    const firstEquals = parts[0].indexOf('=');
    if (firstEquals === -1) return null;

    const name = parts[0].substring(0, firstEquals).trim();
    const value = parts[0].substring(firstEquals + 1).trim();

    if (!name) return null;

    // Default values
    const cookie: Cookie = {
      name,
      value,
      domain: url.hostname,
      path: this.getDefaultPath(url.pathname),
      secure: false,
      httpOnly: false,
      hostOnly: true
    };

    // Parse attributes
    for (let i = 1; i < parts.length; i++) {
      const attr = parts[i];
      const attrEquals = attr.indexOf('=');
      const attrName = (attrEquals === -1 ? attr : attr.substring(0, attrEquals)).toLowerCase();
      const attrValue = attrEquals === -1 ? '' : attr.substring(attrEquals + 1);

      switch (attrName) {
        case 'domain':
          cookie.domain = attrValue.startsWith('.') ? attrValue.substring(1) : attrValue;
          cookie.hostOnly = false;
          break;
        case 'path':
          cookie.path = attrValue || '/';
          break;
        case 'expires':
          cookie.expires = new Date(attrValue);
          break;
        case 'max-age':
          const maxAge = parseInt(attrValue, 10);
          if (!isNaN(maxAge)) {
            if (maxAge <= 0) {
              cookie.expires = new Date(0); // Expired
            } else {
              cookie.expires = new Date(Date.now() + maxAge * 1000);
            }
          }
          break;
        case 'secure':
          cookie.secure = true;
          break;
        case 'httponly':
          cookie.httpOnly = true;
          break;
        case 'samesite':
          const sameSiteValue = attrValue.toLowerCase();
          if (sameSiteValue === 'strict') cookie.sameSite = 'Strict';
          else if (sameSiteValue === 'lax') cookie.sameSite = 'Lax';
          else if (sameSiteValue === 'none') cookie.sameSite = 'None';
          break;
      }
    }

    return cookie;
  }

  private getDefaultPath(pathname: string): string {
    // Default path is the path up to (but not including) the last /
    const lastSlash = pathname.lastIndexOf('/');
    if (lastSlash <= 0) return '/';
    return pathname.substring(0, lastSlash);
  }

  private getMatchingCookies(url: URL): Cookie[] {
    const now = new Date();
    const isSecure = url.protocol === 'https:';

    return this.cookies.filter(cookie => {
      // Check expiration
      if (cookie.expires && cookie.expires <= now) {
        return false;
      }

      // Check secure
      if (cookie.secure && !isSecure) {
        return false;
      }

      // Check domain
      if (!this.domainMatches(cookie, url.hostname)) {
        return false;
      }

      // Check path
      if (!this.pathMatches(cookie.path, url.pathname)) {
        return false;
      }

      return true;
    });
  }

  private domainMatches(cookie: Cookie, hostname: string): boolean {
    const cookieDomain = cookie.domain.toLowerCase();
    const requestHost = hostname.toLowerCase();

    if (cookie.hostOnly) {
      // Host-only cookie must match exactly
      return cookieDomain === requestHost;
    }

    // Domain cookie can match subdomains
    if (requestHost === cookieDomain) {
      return true;
    }

    // Check if request host is a subdomain
    return requestHost.endsWith('.' + cookieDomain);
  }

  private pathMatches(cookiePath: string, requestPath: string): boolean {
    // Exact match
    if (requestPath === cookiePath) {
      return true;
    }

    // Cookie path is a prefix of request path
    if (requestPath.startsWith(cookiePath)) {
      // Must be followed by / or end of path
      if (cookiePath.endsWith('/')) {
        return true;
      }
      if (requestPath[cookiePath.length] === '/') {
        return true;
      }
    }

    return false;
  }

  private findCookieIndex(name: string, domain: string, path: string): number {
    return this.cookies.findIndex(
      c => c.name === name && c.domain === domain && c.path === path
    );
  }

  private removeCookie(name: string, domain: string, path: string): void {
    const index = this.findCookieIndex(name, domain, path);
    if (index >= 0) {
      this.cookies.splice(index, 1);
    }
  }
}

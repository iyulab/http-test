/**
 * RequestCache
 *
 * Caches HTTP responses with configurable TTL and LRU eviction.
 * Features:
 * - Time-based expiration (TTL)
 * - LRU eviction when max size reached
 * - Cache statistics (hits, misses, hit rate)
 * - Conditional caching (by method, status code)
 * - Per-entry TTL override
 */
import { HttpRequest, HttpResponse } from '../types';
import * as crypto from 'crypto';

/**
 * Cached entry data
 */
export interface CacheEntry {
  /** The cached response */
  response: HttpResponse;
  /** Timestamp when entry was created */
  timestamp: number;
  /** When the entry expires (timestamp) */
  expiresAt: number;
  /** Last access time for LRU */
  lastAccess: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum number of cached entries (default: 100) */
  maxSize?: number;
  /** HTTP methods to cache (default: ['GET']) */
  cacheableMethods?: string[];
  /** HTTP status codes to cache (default: [200, 201, 204, 301, 304]) */
  cacheableStatusCodes?: number[];
}

/**
 * Per-entry cache options
 */
export interface SetOptions {
  /** Override TTL for this entry */
  ttl?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Hit rate (hits / total requests) */
  hitRate: number;
}

/**
 * Internal cache entry with all metadata
 */
interface InternalCacheEntry extends CacheEntry {
  key: string;
}

/**
 * HTTP request cache with TTL and LRU eviction
 */
export class RequestCache {
  private readonly cache = new Map<string, InternalCacheEntry>();
  private readonly ttl: number;
  private readonly maxSize: number;
  private readonly cacheableMethods: Set<string>;
  private readonly cacheableStatusCodes: Set<number>;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize ?? 100;
    this.cacheableMethods = new Set(
      (options.cacheableMethods ?? ['GET', 'HEAD']).map(m => m.toUpperCase())
    );
    this.cacheableStatusCodes = new Set(
      options.cacheableStatusCodes ?? [200, 201, 204, 301, 304]
    );
  }

  /**
   * Get a cached response
   */
  get(request: HttpRequest): CacheEntry | undefined {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update last access for LRU
    entry.lastAccess = Date.now();
    this.hits++;

    return {
      response: entry.response,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      lastAccess: entry.lastAccess
    };
  }

  /**
   * Store a response in the cache
   */
  set(request: HttpRequest, response: HttpResponse, options?: SetOptions): void {
    // Check if method is cacheable
    if (!this.cacheableMethods.has(request.method.toUpperCase())) {
      return;
    }

    // Check if status code is cacheable
    if (!this.cacheableStatusCodes.has(response.status)) {
      return;
    }

    const key = this.generateKey(request);
    const now = Date.now();
    const entryTtl = options?.ttl ?? this.ttl;

    // Evict if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: InternalCacheEntry = {
      key,
      response,
      timestamp: now,
      expiresAt: now + entryTtl,
      lastAccess: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete a cached entry
   */
  delete(request: HttpRequest): boolean {
    const key = this.generateKey(request);
    return this.cache.delete(key);
  }

  /**
   * Check if a request is cached
   */
  has(request: HttpRequest): boolean {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate a cache key for a request
   */
  private generateKey(request: HttpRequest): string {
    const keyParts = [
      request.method.toUpperCase(),
      request.url,
      JSON.stringify(this.sortObject(request.headers)),
      request.body ?? ''
    ];

    const keyString = keyParts.join('|');
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Sort object keys for consistent hashing
   */
  private sortObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

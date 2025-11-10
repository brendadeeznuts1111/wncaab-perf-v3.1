/**
 * Caching Utilities
 * 
 * Performance-optimized in-memory cache with TTL support for Bun.
 * Used for API response caching, ETag caching, and model caching.
 * 
 * @module lib/cache
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Cache entry with expiration timestamp
 */
interface CacheEntry<T> {
  data: T;
  expires: number;
}

// ============================================================================
// SimpleCache Class
// ============================================================================

/**
 * Performance-Optimized Caching System
 * In-memory cache with TTL support for Bun
 * 
 * Features:
 * - Automatic expiration based on TTL
 * - Type-safe generic implementation
 * - Zero dependencies
 * - Bun-optimized Map operations
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  
  /**
   * Set a cache entry with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (default: 60)
   */
  set(key: string, value: T, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }
  
  /**
   * Get a cache entry (returns null if expired or not found)
   * @param key - Cache key
   * @returns Cached value or null
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get current cache size
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Delete a specific cache entry
   * @param key - Cache key to delete
   * @returns true if entry was deleted, false if not found
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Check if a key exists in cache (and is not expired)
   * @param key - Cache key to check
   * @returns true if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}


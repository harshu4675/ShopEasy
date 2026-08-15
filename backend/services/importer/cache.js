/**
 * Simple in-memory TTL cache for import results.
 *
 * Prevents repeated fetches of the same URL within a short window.
 * Never caches for longer than the configured TTL (default 5 minutes).
 */

const cache = new Map();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a cached value.
 * Returns undefined if not found or expired.
 */
function get(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Set a cached value with TTL.
 */
function set(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Clear all cached entries.
 */
function clear() {
  cache.clear();
}

/**
 * Remove a single entry.
 */
function remove(key) {
  cache.delete(key);
}

/**
 * Get cache stats.
 */
function stats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

module.exports = { get, set, clear, remove, stats };
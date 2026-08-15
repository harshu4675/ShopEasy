/**
 * GET cache with request de-duplication, stale-while-revalidate, and optional
 * persistence across reloads.
 *
 * The persistence layer matters specifically because the API runs on a free
 * tier that idles: after a period of inactivity the first request can take
 * tens of seconds. Serving the previous payload from localStorage lets the
 * page render real content immediately while the slow request completes in the
 * background, so a cold start costs freshness rather than a blank screen.
 *
 * Two lifetimes per entry:
 *   ttl      how long the value is considered fresh
 *   maxAge   how long it may still be served as stale while revalidating
 */

const DEFAULT_TTL = 60_000;
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 150;
const STORAGE_PREFIX = "talish:cache:";
const STORAGE_VERSION = "v1";

const cache = new Map();
const inFlight = new Map();
const subscribers = new Map();
let invalidationVersion = 0;

const now = () => Date.now();

export const buildKey = (url, params) => {
  if (!params) return url;
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return sorted ? `${url}?${sorted}` : url;
};

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

const storageKey = (key) => `${STORAGE_PREFIX}${STORAGE_VERSION}:${key}`;

const readPersisted = (key) => {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return undefined;
    const entry = JSON.parse(raw);
    if (!entry || entry.maxAgeAt < now()) {
      localStorage.removeItem(storageKey(key));
      return undefined;
    }
    return entry;
  } catch {
    return undefined;
  }
};

const writePersisted = (key, entry) => {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Quota exceeded or private mode. Drop the oldest persisted entries and
    // give up quietly if it still fails; the memory cache is unaffected.
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith(STORAGE_PREFIX),
      );
      keys
        .slice(0, Math.ceil(keys.length / 2))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(storageKey(key), JSON.stringify(entry));
    } catch {
      /* nothing more we can do */
    }
  }
};

/* ------------------------------------------------------------------ *
 * Memory cache
 * ------------------------------------------------------------------ */

const prune = () => {
  if (cache.size <= MAX_ENTRIES) return;
  const excess = cache.size - MAX_ENTRIES;
  let i = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    if (++i >= excess) break;
  }
};

const readEntry = (key) => {
  const entry = cache.get(key);
  if (entry) return entry;

  const persisted = readPersisted(key);
  if (persisted) {
    cache.set(key, persisted);
    return persisted;
  }
  return undefined;
};

export const getCached = (key) => {
  const entry = readEntry(key);
  if (!entry) return undefined;
  if (entry.expiresAt < now()) return undefined;
  return entry.data;
};

export const setCached = (key, data, ttl = DEFAULT_TTL, options = {}) => {
  const { persist = false, maxAge = DEFAULT_MAX_AGE } = options;
  const entry = {
    data,
    expiresAt: now() + ttl,
    maxAgeAt: now() + Math.max(ttl, maxAge),
  };
  cache.set(key, entry);
  prune();
  if (persist) writePersisted(key, entry);
};

/**
 * Clears cached entries. Accepts a string prefix or a RegExp; with no argument
 * it clears everything, including anything persisted. Persisted entries are
 * scanned independently because an admin can mutate a product before a cache
 * left by an earlier storefront visit has been loaded into memory.
 */
export const invalidate = (matcher) => {
  invalidationVersion += 1;

  const matches = (key) => {
    if (!matcher) return true;
    if (typeof matcher === "string") {
      return key === matcher || key.startsWith(matcher);
    }
    matcher.lastIndex = 0;
    return matcher.test(key);
  };

  for (const key of [...cache.keys()]) {
    if (matches(key)) cache.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (matches(key)) inFlight.delete(key);
  }

  try {
    const currentPrefix = `${STORAGE_PREFIX}${STORAGE_VERSION}:`;
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => {
        if (!matcher) {
          localStorage.removeItem(key);
          return;
        }
        if (!key.startsWith(currentPrefix)) return;
        const logicalKey = key.slice(currentPrefix.length);
        if (matches(logicalKey)) localStorage.removeItem(key);
      });
  } catch {
    /* ignore */
  }
};

/**
 * Subscribe to background revalidations for a key. Used by hooks that render
 * stale data first and want to update when the fresh payload lands.
 */
export const subscribe = (key, listener) => {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(listener);
  return () => {
    const set = subscribers.get(key);
    if (!set) return;
    set.delete(listener);
    if (!set.size) subscribers.delete(key);
  };
};

const notify = (key, data) => {
  const set = subscribers.get(key);
  if (!set) return;
  set.forEach((fn) => {
    try {
      fn(data);
    } catch {
      /* a bad listener must not break revalidation */
    }
  });
};

/**
 * Cache-aware request.
 *
 * @param {string} key
 * @param {() => Promise<any>} factory
 * @param {object} [opts]
 * @param {number}  [opts.ttl]      freshness window
 * @param {boolean} [opts.force]    bypass the cached value, still de-duplicates
 * @param {boolean} [opts.persist]  survive a reload via localStorage
 * @param {boolean} [opts.swr]      return stale immediately and revalidate
 * @param {number}  [opts.maxAge]   how long stale data may still be served
 */
export const cachedRequest = async (key, factory, opts = {}) => {
  const {
    ttl = DEFAULT_TTL,
    force = false,
    persist = false,
    swr = false,
    maxAge = DEFAULT_MAX_AGE,
  } = opts;

  const entry = readEntry(key);
  const isFresh = entry && entry.expiresAt >= now();
  const requestVersion = invalidationVersion;

  if (!force && isFresh) return entry.data;

  // Stale-while-revalidate: hand back the old payload now, refresh behind it.
  if (!force && swr && entry) {
    if (!inFlight.has(key)) {
      let refresh;
      refresh = (async () => {
        try {
          const data = await Promise.resolve().then(factory);
          if (requestVersion === invalidationVersion) {
            setCached(key, data, ttl, { persist, maxAge });
            notify(key, data);
          }
          return data;
        } finally {
          if (inFlight.get(key) === refresh) inFlight.delete(key);
        }
      })();
      inFlight.set(key, refresh);
      refresh.catch(() => {
        // A failed background refresh keeps the stale value in place, which is
        // the desired behaviour when the API is cold or offline.
      });
    }
    return entry.data;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  let promise;
  promise = (async () => {
    try {
      const data = await Promise.resolve().then(factory);
      // A create/edit/delete can finish while an older listing request is in
      // flight. Never let that older response repopulate the invalidated cache.
      if (requestVersion === invalidationVersion) {
        setCached(key, data, ttl, { persist, maxAge });
        notify(key, data);
      }
      return data;
    } catch (error) {
      // Last resort during a cold start or an offline moment: serve stale data
      // rather than failing, as long as it is inside maxAge.
      if (entry && entry.maxAgeAt >= now()) return entry.data;
      throw error;
    } finally {
      // Invalidating a key permits a fresh request before this one settles. An
      // older request must not remove that newer request from the dedupe map.
      if (inFlight.get(key) === promise) inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
};

export default cachedRequest;

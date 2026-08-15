/**
 * Tests for the request cache.
 *
 * The stale-while-revalidate and offline-fallback paths are what keep the site
 * usable while the free-tier API cold-starts, so they are covered explicitly,
 * including the failure cases where the network never responds.
 */

import test from "node:test";
import assert from "node:assert/strict";

// Minimal localStorage so the persistence layer can be exercised in Node.
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(k) {
    return this.store.has(k) ? this.store.get(k) : null;
  }
  setItem(k, v) {
    this.store.set(k, String(v));
  }
  removeItem(k) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return [...this.store.keys()][i] ?? null;
  }
}

const storage = new MemoryStorage();
globalThis.localStorage = new Proxy(storage, {
  ownKeys: (t) => [...t.store.keys()],
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  get: (t, prop) =>
    typeof t[prop] === "function"
      ? t[prop].bind(t)
      : (t[prop] ?? t.store.get(prop)),
});

const { cachedRequest, buildKey, invalidate, getCached, setCached, subscribe } =
  await import("../src/utils/requestCache.js");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Emulates a page reload: drops the in-memory layer while keeping whatever was
 * persisted, which is exactly the state a returning visitor starts from.
 */
const simulateReload = () => {
  const persisted = [...storage.store.entries()];
  invalidate();
  persisted.forEach(([k, v]) => storage.store.set(k, v));
};

test.beforeEach(() => {
  invalidate();
  storage.clear();
});

test("key building is order independent and skips empty values", () => {
  assert.equal(buildKey("/p", { b: 2, a: 1 }), buildKey("/p", { a: 1, b: 2 }));
  assert.equal(buildKey("/p", { a: 1, b: undefined }), "/p?a=1");
  assert.equal(buildKey("/p"), "/p");
});

test("concurrent callers share one request", async () => {
  let calls = 0;
  const factory = async () => {
    calls += 1;
    await sleep(20);
    return { v: calls };
  };

  const results = await Promise.all(
    Array.from({ length: 25 }, () => cachedRequest("/dedupe", factory)),
  );

  assert.equal(calls, 1, "25 concurrent callers cause one request");
  assert.ok(results.every((r) => r.v === 1));
});

test("fresh values are served from cache", async () => {
  let calls = 0;
  const factory = async () => ({ n: ++calls });

  await cachedRequest("/fresh", factory, { ttl: 5000 });
  await cachedRequest("/fresh", factory, { ttl: 5000 });

  assert.equal(calls, 1);
});

test("values are refetched once the ttl expires", async () => {
  let calls = 0;
  const factory = async () => ({ n: ++calls });

  await cachedRequest("/ttl", factory, { ttl: 40 });
  await sleep(70);
  await cachedRequest("/ttl", factory, { ttl: 40 });

  assert.equal(calls, 2);
});

test("force bypasses a fresh value", async () => {
  let calls = 0;
  const factory = async () => ({ n: ++calls });

  await cachedRequest("/force", factory, { ttl: 5000 });
  await cachedRequest("/force", factory, { ttl: 5000, force: true });

  assert.equal(calls, 2);
});

test("prefix invalidation removes product lists and details but not unrelated data", () => {
  setCached("/products?sort=newest", [{ _id: "p1" }]);
  setCached("/products/p1", { _id: "p1" });
  setCached("/categories", ["Clothing"]);

  invalidate("/products");

  assert.equal(getCached("/products?sort=newest"), undefined);
  assert.equal(getCached("/products/p1"), undefined);
  assert.deepEqual(getCached("/categories"), ["Clothing"]);
});

test("prefix invalidation clears persisted entries not loaded in memory", () => {
  setCached("/products?sort=newest", [{ _id: "deleted" }], 60_000, {
    persist: true,
  });
  setCached("/categories", ["Clothing"], 60_000, { persist: true });
  simulateReload();

  invalidate("/products");

  assert.equal(getCached("/products?sort=newest"), undefined);
  assert.deepEqual(getCached("/categories"), ["Clothing"]);
});

test("an invalidated in-flight response cannot restore stale product data", async () => {
  let releaseOld;
  const oldRequest = cachedRequest(
    "/products",
    () =>
      new Promise((resolve) => {
        releaseOld = resolve;
      }),
    { ttl: 60_000, persist: true },
  );
  await Promise.resolve();

  invalidate("/products");
  const freshRequest = cachedRequest(
    "/products",
    async () => ({ products: ["fresh"] }),
    { ttl: 60_000, persist: true },
  );
  releaseOld({ products: ["deleted"] });

  await Promise.all([oldRequest, freshRequest]);
  assert.deepEqual(getCached("/products"), { products: ["fresh"] });
});

test("stale-while-revalidate returns instantly and refreshes behind", async () => {
  let calls = 0;
  const factory = async () => {
    calls += 1;
    await sleep(30);
    return { version: calls };
  };

  // Seed, then let it go stale.
  const first = await cachedRequest("/swr", factory, { ttl: 20, swr: true });
  assert.equal(first.version, 1);
  await sleep(40);

  const started = Date.now();
  const stale = await cachedRequest("/swr", factory, { ttl: 20, swr: true });
  const elapsed = Date.now() - started;

  assert.equal(stale.version, 1, "stale value served immediately");
  assert.ok(
    elapsed < 15,
    `returned without waiting for the network (${elapsed}ms)`,
  );

  await sleep(60);
  const refreshed = await cachedRequest("/swr", factory, {
    ttl: 20,
    swr: true,
  });
  assert.equal(refreshed.version, 2, "background refresh replaced the value");
});

test("subscribers are notified when a background refresh lands", async () => {
  let calls = 0;
  const factory = async () => {
    calls += 1;
    await sleep(10);
    return { n: calls };
  };

  await cachedRequest("/notify", factory, { ttl: 10, swr: true });
  await sleep(30);

  const seen = [];
  const unsubscribe = subscribe("/notify", (d) => seen.push(d));

  await cachedRequest("/notify", factory, { ttl: 10, swr: true });
  await sleep(50);
  unsubscribe();

  assert.equal(seen.length, 1, "listener fired once");
  assert.equal(seen[0].n, 2);
});

test("stale data is served when the request fails", async () => {
  let attempt = 0;
  const factory = async () => {
    attempt += 1;
    if (attempt === 1) return { ok: true };
    throw new Error("Network Error");
  };

  await cachedRequest("/offline", factory, { ttl: 20, maxAge: 60_000 });
  await sleep(40);

  // Second call fails, but the entry is still inside maxAge.
  const result = await cachedRequest("/offline", factory, {
    ttl: 20,
    maxAge: 60_000,
  });

  assert.deepEqual(
    result,
    { ok: true },
    "stale value used instead of throwing",
  );
});

test("a synchronous request error propagates without poisoning retries", async () => {
  let attempts = 0;
  const factory = () => {
    attempts += 1;
    if (attempts === 1) throw new Error("Network Error");
    return { recovered: true };
  };

  await assert.rejects(
    () => cachedRequest("/nothing", factory, { ttl: 1000 }),
    /Network Error/,
  );
  assert.deepEqual(await cachedRequest("/nothing", factory, { ttl: 1000 }), {
    recovered: true,
  });
  assert.equal(attempts, 2);
});

test("persisted entries survive a cold start", async () => {
  const factory = async () => ({ persisted: true });
  await cachedRequest("/persist", factory, { ttl: 50, persist: true });

  // Simulate a reload: memory is gone, localStorage remains.
  simulateReload();

  let called = false;
  const value = await cachedRequest(
    "/persist",
    async () => {
      called = true;
      return { persisted: false };
    },
    { ttl: 50_000, persist: true },
  );

  assert.equal(value.persisted, true, "value came from storage");
  assert.equal(called, false, "no network request was needed");
});

test("invalidate clears by prefix", async () => {
  await cachedRequest("/cart", async () => ({ a: 1 }), { ttl: 5000 });
  await cachedRequest("/products?x=1", async () => ({ b: 2 }), { ttl: 5000 });

  invalidate("/cart");

  assert.equal(getCached("/cart"), undefined);
  assert.notEqual(getCached("/products?x=1"), undefined);
});

test("invalidate with no argument clears everything including storage", async () => {
  await cachedRequest("/a", async () => ({ a: 1 }), {
    ttl: 5000,
    persist: true,
  });
  await cachedRequest("/b", async () => ({ b: 1 }), {
    ttl: 5000,
    persist: true,
  });

  invalidate();

  assert.equal(getCached("/a"), undefined);
  assert.equal(getCached("/b"), undefined);
  const remaining = [...storage.store.keys()].filter((k) =>
    k.startsWith("talish:cache:"),
  );
  assert.equal(remaining.length, 0, "persisted entries cleared too");
});

test("the cache is bounded", async () => {
  for (let i = 0; i < 200; i += 1) {
    setCached(`/bulk/${i}`, { i }, 60_000);
  }
  // The oldest entries are evicted; the newest must still be present.
  assert.notEqual(getCached("/bulk/199"), undefined);
  assert.equal(getCached("/bulk/0"), undefined);
});

/**
 * Minimal in-memory stand-in for the Mongoose operations the wallet ledger
 * uses. It exists so the concurrency guarantees can be tested without a live
 * mongod (the sandbox has no MongoDB binary available).
 *
 * What it models faithfully, because the tests depend on it:
 *
 *  - `findOneAndUpdate` evaluates its filter and applies `$inc`/`$set` as one
 *    indivisible step. Node is single-threaded, so performing the match and
 *    the mutation without an intervening `await` reproduces the atomicity
 *    MongoDB gives us for a single-document update.
 *  - Comparison operators `$gte` and `$in`, which are what the balance guards
 *    are built from.
 *  - Unique index violations on `create`, surfaced as `err.code = 11000`,
 *    which is the mechanism the idempotency claim relies on.
 *  - `await` boundaries between operations, so two concurrent callers really
 *    do interleave and a broken implementation actually fails the test.
 */

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

let idCounter = 0;
const nextId = () => `id_${++idCounter}`;

const matches = (doc, filter) => {
  for (const [key, cond] of Object.entries(filter)) {
    const actual = doc[key];

    if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
      if ("$gte" in cond && !(actual >= cond.$gte)) return false;
      if ("$gt" in cond && !(actual > cond.$gt)) return false;
      if ("$lte" in cond && !(actual <= cond.$lte)) return false;
      if ("$in" in cond && !cond.$in.includes(actual)) return false;
      if ("$ne" in cond && actual === cond.$ne) return false;
      continue;
    }

    if (String(actual) !== String(cond)) return false;
  }
  return true;
};

const applyUpdate = (doc, update) => {
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      doc[k] = (doc[k] || 0) + v;
    }
  }
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      // Support the one dotted path the ledger writes.
      if (k.includes(".")) {
        const [head, tail] = k.split(".");
        doc[head] = doc[head] || {};
        doc[head][tail] = v;
      } else {
        doc[k] = v;
      }
    }
  }
  if (update.$setOnInsert) {
    for (const [k, v] of Object.entries(update.$setOnInsert)) {
      if (doc[k] === undefined) doc[k] = v;
    }
  }
  return doc;
};

class Collection {
  constructor(name, { uniqueKeys = [], defaults = {} } = {}) {
    this.name = name;
    this.docs = [];
    this.uniqueKeys = uniqueKeys;
    this.defaults = defaults;
  }

  _checkUnique(doc) {
    for (const key of this.uniqueKeys) {
      if (doc[key] === undefined || doc[key] === null) continue;
      if (this.docs.some((d) => d[key] === doc[key])) {
        const err = new Error(`E11000 duplicate key: ${key}`);
        err.code = 11000;
        throw err;
      }
    }
  }

  async create(input) {
    await Promise.resolve();
    const doc = { _id: nextId(), ...clone(this.defaults), ...clone(input) };
    this._checkUnique(doc);
    this.docs.push(doc);
    return { ...clone(doc), toObject: () => clone(doc) };
  }

  async findOne(filter) {
    await Promise.resolve();
    const found = this.docs.find((d) => matches(d, filter));
    if (!found) return null;
    return { ...clone(found), select: () => clone(found) };
  }

  async findById(id) {
    await Promise.resolve();
    const found = this.docs.find((d) => String(d._id) === String(id));
    return found ? clone(found) : null;
  }

  async exists(filter) {
    await Promise.resolve();
    return this.docs.some((d) => matches(d, filter));
  }

  /**
   * Atomic match-and-mutate. No `await` between the match and the write, which
   * is what makes this a valid model of a single-document Mongo update.
   */
  async findOneAndUpdate(filter, update, options = {}) {
    await Promise.resolve();

    const idx = this.docs.findIndex((d) => matches(d, filter));

    if (idx === -1) {
      if (!options.upsert) return null;
      const seed = {};
      for (const [k, v] of Object.entries(filter)) {
        if (typeof v !== "object") seed[k] = v;
      }
      const doc = { _id: nextId(), ...clone(this.defaults), ...seed };
      applyUpdate(doc, update);
      this._checkUnique(doc);
      this.docs.push(doc);
      return clone(doc);
    }

    applyUpdate(this.docs[idx], update);
    return options.new === false ? null : clone(this.docs[idx]);
  }

  async updateOne(filter, update) {
    await Promise.resolve();
    const idx = this.docs.findIndex((d) => matches(d, filter));
    if (idx === -1) return { modifiedCount: 0 };
    applyUpdate(this.docs[idx], update);
    return { modifiedCount: 1 };
  }

  async find(filter = {}) {
    await Promise.resolve();
    return this.docs.filter((d) => matches(d, filter)).map(clone);
  }

  reset() {
    this.docs = [];
  }
}

/** Wires model-shaped fakes into require.cache so the service picks them up. */
const installWalletFakes = () => {
  const path = require("path");
  const modelsDir = path.resolve(__dirname, "..", "..", "models");

  const wallets = new Collection("wallets", {
    uniqueKeys: ["reseller"],
    defaults: {
      availableBalance: 0,
      pendingBalance: 0,
      lockedBalance: 0,
      lifetimeEarnings: 0,
      totalWithdrawn: 0,
      version: 0,
    },
  });

  const transactions = new Collection("transactions", {
    uniqueKeys: ["idempotencyKey"],
  });

  const stub = (file, exports) => {
    const full = path.join(modelsDir, file);
    require.cache[full] = { id: full, filename: full, loaded: true, exports };
  };

  // Mongoose chains `.select(...)` onto findOne; mirror just enough of it.
  const wrapSelectable = (collection) => ({
    ...collection,
    create: (...a) => collection.create(...a),
    findById: (id) => {
      const p = collection.findById(id);
      p.select = () => p;
      return p;
    },
    findOne: (filter) => {
      const p = collection.findOne(filter);
      p.select = () => p;
      return p;
    },
    findOneAndUpdate: (...a) => collection.findOneAndUpdate(...a),
    updateOne: (...a) => collection.updateOne(...a),
    exists: (...a) => collection.exists(...a),
    find: (...a) => collection.find(...a),
  });

  stub("Wallet.js", wrapSelectable(wallets));
  stub("Transaction.js", wrapSelectable(transactions));

  return { wallets, transactions };
};

module.exports = { Collection, installWalletFakes };

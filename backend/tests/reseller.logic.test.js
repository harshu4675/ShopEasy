/**
 * Unit tests for the reseller money maths and input hardening.
 *
 * These cover the pure, deterministic logic — pricing, commission splits and
 * the Mongo-injection sanitiser — which is where a bug would silently cost
 * real money. Runs with the built-in Node test runner, no DB required:
 *
 *   npm test            (from backend/)
 *   node --test tests/
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const resellerService = require("../services/resellerService");
const { round2 } = require("../services/walletService");
const { mongoSanitize } = require("../middleware/security");
const { parsePagination, buildSort, paginated } = require("../middleware/validate");

/* -------------------------------------------------------------------------- *
 * Pricing
 * -------------------------------------------------------------------------- */
test("computePricing applies the margin on top of the base price", () => {
  const p = resellerService.computePricing(1000, 20);
  assert.equal(p.basePrice, 1000);
  assert.equal(p.marginPercent, 20);
  assert.equal(p.marginAmount, 200);
  assert.equal(p.sellingPrice, 1200);
});

test("computePricing handles a zero margin", () => {
  const p = resellerService.computePricing(499, 0);
  assert.equal(p.marginAmount, 0);
  assert.equal(p.sellingPrice, 499);
});

test("computePricing rounds to two decimals (no floating point drift)", () => {
  const p = resellerService.computePricing(333.33, 15);
  assert.equal(p.marginAmount, 50);
  assert.equal(p.sellingPrice, 383.33);
  assert.ok(Number.isFinite(p.sellingPrice));
});

test("computePricing treats negative/garbage margins as zero", () => {
  assert.equal(resellerService.computePricing(500, -10).marginAmount, 0);
  assert.equal(resellerService.computePricing(500, "abc").sellingPrice, 500);
  assert.equal(resellerService.computePricing(500, undefined).sellingPrice, 500);
});

/* -------------------------------------------------------------------------- *
 * Commission split
 * -------------------------------------------------------------------------- */
test("computeCommission splits margin and platform fee correctly", () => {
  // 2 units: base 1000, sold at 1200 => gross margin 400
  // platform fee = 10% of base amount (2000) = 200 => net 200
  const items = [
    { quantity: 2, basePrice: 1000, price: 1200, name: "Kurti", product: "p1" },
  ];
  const r = resellerService.computeCommission(items, 10);

  assert.equal(r.baseAmount, 2000);
  assert.equal(r.sellingAmount, 2400);
  assert.equal(r.grossMargin, 400);
  assert.equal(r.platformFee, 200);
  assert.equal(r.netCommission, 200);
});

test("computeCommission never returns a negative commission", () => {
  // Margin smaller than the platform fee would otherwise go negative.
  const items = [{ quantity: 1, basePrice: 1000, price: 1020, name: "X" }];
  const r = resellerService.computeCommission(items, 10);

  assert.equal(r.grossMargin, 20);
  assert.equal(r.platformFee, 100);
  assert.equal(r.netCommission, 0, "commission is floored at zero");
});

test("computeCommission aggregates a multi-line order", () => {
  const items = [
    { quantity: 1, basePrice: 500, price: 600, name: "A" },
    { quantity: 3, basePrice: 200, price: 260, name: "B" },
  ];
  const r = resellerService.computeCommission(items, 5);

  assert.equal(r.baseAmount, 1100); // 500 + 600
  assert.equal(r.sellingAmount, 1380); // 600 + 780
  assert.equal(r.grossMargin, 280);
  assert.equal(r.platformFee, 55); // 5% of 1100
  assert.equal(r.netCommission, 225);
  assert.equal(r.lines.length, 2);
  assert.equal(r.lines[1].lineMargin, 180); // (260-200)*3
});

test("computeCommission falls back to price when basePrice is missing", () => {
  const items = [{ quantity: 1, price: 700, name: "Legacy" }];
  const r = resellerService.computeCommission(items, 10);

  assert.equal(r.grossMargin, 0, "no margin when base == selling");
  assert.equal(r.netCommission, 0);
});

test("computeCommission reports the effective margin percent per line", () => {
  const items = [{ quantity: 1, basePrice: 1000, price: 1250, name: "A" }];
  const r = resellerService.computeCommission(items, 0);
  assert.equal(r.lines[0].marginPercent, 25);
});

/* -------------------------------------------------------------------------- *
 * Rounding helper
 * -------------------------------------------------------------------------- */
test("round2 keeps currency amounts exact to the paisa", () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(1234.5678), 1234.57);
  assert.equal(round2(null), 0);
  assert.equal(round2(undefined), 0);
  assert.equal(round2("12.345"), 12.35);
});

/* -------------------------------------------------------------------------- *
 * NoSQL-injection sanitiser
 * -------------------------------------------------------------------------- */
const runSanitizer = (req) =>
  new Promise((resolve) => mongoSanitize(req, {}, () => resolve(req)));

test("mongoSanitize strips $-prefixed operators from the body", async () => {
  const req = { body: { phone: { $ne: null }, password: "x" }, params: {}, query: {} };
  await runSanitizer(req);

  assert.deepEqual(req.body.phone, {}, "$ne removed");
  assert.equal(req.body.password, "x", "legit values survive");
});

test("mongoSanitize strips dotted keys used for path traversal", async () => {
  const req = { body: { "user.role": "admin", name: "ok" }, params: {}, query: {} };
  await runSanitizer(req);

  assert.equal(req.body["user.role"], undefined);
  assert.equal(req.body.name, "ok");
});

test("mongoSanitize recurses into nested objects and arrays", async () => {
  const req = {
    body: { filter: { nested: { $gt: 5 }, list: [{ $where: "1" }, { ok: 1 }] } },
    params: {},
    query: {},
  };
  await runSanitizer(req);

  assert.deepEqual(req.body.filter.nested, {});
  assert.deepEqual(req.body.filter.list[0], {});
  assert.deepEqual(req.body.filter.list[1], { ok: 1 });
});

test("mongoSanitize cleans query and params too", async () => {
  const req = {
    body: {},
    params: { id: { $ne: "" } },
    query: { search: { $regex: ".*" }, page: "2" },
  };
  await runSanitizer(req);

  assert.deepEqual(req.params.id, {});
  assert.deepEqual(req.query.search, {});
  assert.equal(req.query.page, "2");
});

test("mongoSanitize tolerates null/undefined containers", async () => {
  const req = { body: null, params: undefined, query: {} };
  await assert.doesNotReject(runSanitizer(req));
});

/* -------------------------------------------------------------------------- *
 * Pagination & sorting guards
 * -------------------------------------------------------------------------- */
test("parsePagination applies defaults and caps the page size", () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(parsePagination({ page: "3", limit: "10" }), {
    page: 3,
    limit: 10,
    skip: 20,
  });
  assert.equal(parsePagination({ limit: "99999" }).limit, 100, "capped at maxLimit");
  assert.equal(parsePagination({ page: "-5" }).page, 1, "no negative pages");
  assert.equal(parsePagination({ page: "abc" }).page, 1);
});

test("buildSort only allows whitelisted fields", () => {
  const allowed = ["createdAt", "price"];
  assert.deepEqual(buildSort("price", allowed), { price: 1 });
  assert.deepEqual(buildSort("-price", allowed), { price: -1 });
  assert.deepEqual(
    buildSort("secretField", allowed),
    { createdAt: -1 },
    "unknown field falls back",
  );
  assert.deepEqual(buildSort(undefined, allowed), { createdAt: -1 });
});

test("paginated builds a consistent envelope", () => {
  const res = paginated([1, 2], 25, { page: 2, limit: 10 });
  assert.equal(res.success, true);
  assert.equal(res.pagination.pages, 3);
  assert.equal(res.pagination.hasNext, true);
  assert.equal(res.pagination.hasPrev, true);

  const last = paginated([], 25, { page: 3, limit: 10 });
  assert.equal(last.pagination.hasNext, false);
});

/* -------------------------------------------------------------------------- *
 * CSV export escaping (formula-injection guard)
 * -------------------------------------------------------------------------- */
test("CSV escaping neutralises spreadsheet formula injection", () => {
  // Mirrors the `escape` helper used by /reseller/reports/export.
  const escape = (v) => {
    const s = String(v ?? "");
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  assert.equal(escape("=SUM(A1:A9)"), `"'=SUM(A1:A9)"`);
  assert.equal(escape("+1234"), `"'+1234"`);
  assert.equal(escape("@cmd"), `"'@cmd"`);
  assert.equal(escape('He said "hi"'), `"He said ""hi"""`);
  assert.equal(escape("normal"), `"normal"`);
  assert.equal(escape(null), `""`);
});

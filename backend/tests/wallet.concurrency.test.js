/**
 * Money-safety tests for the wallet ledger.
 *
 * These target the failure modes that cost real money: double credits from
 * retried webhooks, double-spend from concurrent withdrawals, balances driven
 * negative by repeated unlocks, and clawbacks computed from stale reads.
 *
 * The tests deliberately run operations concurrently with `Promise.all` so a
 * non-atomic implementation actually fails rather than passing by luck.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { installWalletFakes } = require("./helpers/fakeMongo");

const { wallets, transactions } = installWalletFakes();
const walletService = require("../services/walletService");

const RESELLER = "reseller_1";
const USER = "user_1";

const resetAll = async () => {
  wallets.reset();
  transactions.reset();
  await walletService.getOrCreateWallet(RESELLER, USER);
};

const balances = async () => {
  const w = await wallets.findOne({ reseller: RESELLER });
  return {
    available: w.availableBalance,
    pending: w.pendingBalance,
    locked: w.lockedBalance,
    lifetime: w.lifetimeEarnings,
    withdrawn: w.totalWithdrawn,
  };
};

/* -------------------------------------------------------------------------- *
 * Idempotency
 * -------------------------------------------------------------------------- */

test("concurrent credits with the same key credit exactly once", async () => {
  await resetAll();

  // Ten simultaneous retries of the same commission webhook.
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      walletService.creditPending({
        resellerId: RESELLER,
        userId: USER,
        amount: 250,
        description: "Commission",
        idempotencyKey: "commission:order_1",
      }),
    ),
  );

  const applied = results.filter(Boolean);
  assert.equal(applied.length, 1, "exactly one credit should be applied");

  const b = await balances();
  assert.equal(b.pending, 250, "pending must not be multiplied by retries");

  const rows = await transactions.find({ idempotencyKey: "commission:order_1" });
  assert.equal(rows.length, 1, "exactly one ledger row");
});

test("sequential retry of the same credit is also a no-op", async () => {
  await resetAll();

  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 100,
    idempotencyKey: "k1",
  });
  const second = await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 100,
    idempotencyKey: "k1",
  });

  assert.equal(second, null);
  assert.equal((await balances()).pending, 100);
});

test("different keys credit independently", async () => {
  await resetAll();

  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 100, idempotencyKey: "a",
  });
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 50, idempotencyKey: "b",
  });

  assert.equal((await balances()).pending, 150);
});

/* -------------------------------------------------------------------------- *
 * Release
 * -------------------------------------------------------------------------- */

test("release moves pending to available and counts lifetime once", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 400, idempotencyKey: "c1",
  });

  await walletService.releasePending({
    resellerId: RESELLER, amount: 400, idempotencyKey: "release:c1",
  });

  const b = await balances();
  assert.equal(b.pending, 0);
  assert.equal(b.available, 400);
  assert.equal(b.lifetime, 400);
});

test("concurrent releases of the same commission release once", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 300, idempotencyKey: "c2",
  });

  const results = await Promise.all([
    walletService.releasePending({ resellerId: RESELLER, amount: 300, idempotencyKey: "release:c2" }),
    walletService.releasePending({ resellerId: RESELLER, amount: 300, idempotencyKey: "release:c2" }),
    walletService.releasePending({ resellerId: RESELLER, amount: 300, idempotencyKey: "release:c2" }),
  ]);

  assert.equal(results.filter(Boolean).length, 1);
  const b = await balances();
  assert.equal(b.available, 300);
  assert.equal(b.pending, 0);
  assert.equal(b.lifetime, 300, "lifetime must not be inflated");
});

test("release cannot exceed the pending balance", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 100, idempotencyKey: "c3",
  });

  // Attempt to release more than was ever credited.
  const res = await walletService.releasePending({
    resellerId: RESELLER, amount: 5000, idempotencyKey: "release:c3",
  });

  assert.equal(res, null, "over-release must be refused");
  const b = await balances();
  assert.equal(b.pending, 100, "pending untouched");
  assert.equal(b.available, 0, "no money created");
});

/* -------------------------------------------------------------------------- *
 * Withdrawal locking — the double-spend case
 * -------------------------------------------------------------------------- */

test("concurrent withdrawals cannot double-spend the same balance", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 1000, idempotencyKey: "c4",
  });
  await walletService.releasePending({
    resellerId: RESELLER, amount: 1000, idempotencyKey: "r4",
  });

  // Two requests for the full balance, fired together.
  const outcomes = await Promise.allSettled([
    walletService.lockForWithdrawal({ resellerId: RESELLER, amount: 1000 }),
    walletService.lockForWithdrawal({ resellerId: RESELLER, amount: 1000 }),
  ]);

  const ok = outcomes.filter((o) => o.status === "fulfilled");
  const failed = outcomes.filter((o) => o.status === "rejected");

  assert.equal(ok.length, 1, "only one lock may succeed");
  assert.equal(failed.length, 1, "the other must be rejected");
  assert.equal(failed[0].reason.statusCode, 400);

  const b = await balances();
  assert.equal(b.available, 0);
  assert.equal(b.locked, 1000, "exactly one lock held");
});

test("lock is refused when the balance is short", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 50, idempotencyKey: "c5",
  });
  await walletService.releasePending({
    resellerId: RESELLER, amount: 50, idempotencyKey: "r5",
  });

  await assert.rejects(
    () => walletService.lockForWithdrawal({ resellerId: RESELLER, amount: 500 }),
    /Insufficient available balance/,
  );
  assert.equal((await balances()).available, 50);
});

test("repeated unlock cannot mint money", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 600, idempotencyKey: "c6",
  });
  await walletService.releasePending({
    resellerId: RESELLER, amount: 600, idempotencyKey: "r6",
  });
  await walletService.lockForWithdrawal({ resellerId: RESELLER, amount: 600 });

  // First unlock is legitimate; the rest are duplicates.
  await walletService.unlockWithdrawal({ resellerId: RESELLER, amount: 600 });
  await walletService.unlockWithdrawal({ resellerId: RESELLER, amount: 600 });
  await walletService.unlockWithdrawal({ resellerId: RESELLER, amount: 600 });

  const b = await balances();
  assert.equal(b.available, 600, "balance must not grow on repeated unlock");
  assert.equal(b.locked, 0, "locked must not go negative");
});

test("settlement clears the lock and is idempotent", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 800, idempotencyKey: "c7",
  });
  await walletService.releasePending({
    resellerId: RESELLER, amount: 800, idempotencyKey: "r7",
  });
  await walletService.lockForWithdrawal({ resellerId: RESELLER, amount: 800 });

  const first = await walletService.settleWithdrawal({
    resellerId: RESELLER, withdrawalId: "wd_1", amount: 800,
  });
  const second = await walletService.settleWithdrawal({
    resellerId: RESELLER, withdrawalId: "wd_1", amount: 800,
  });

  assert.ok(first, "first settlement applies");
  assert.equal(second, null, "repeat settlement is a no-op");

  const b = await balances();
  assert.equal(b.locked, 0);
  assert.equal(b.withdrawn, 800, "withdrawn counted once");
  assert.equal(b.available, 0);
});

/* -------------------------------------------------------------------------- *
 * Reversal
 * -------------------------------------------------------------------------- */

test("reversal takes from pending first", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 500, idempotencyKey: "c8",
  });

  await walletService.reverseCommission({
    resellerId: RESELLER, amount: 500, idempotencyKey: "rev:c8",
  });

  const b = await balances();
  assert.equal(b.pending, 0);
  assert.equal(b.available, 0);
});

test("reversal spills into available when pending is short", async () => {
  await resetAll();
  // 300 released to available, 200 still pending.
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 300, idempotencyKey: "c9a",
  });
  await walletService.releasePending({
    resellerId: RESELLER, amount: 300, idempotencyKey: "r9a",
  });
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 200, idempotencyKey: "c9b",
  });

  // Claw back 400: 200 from pending, 200 from available.
  await walletService.reverseCommission({
    resellerId: RESELLER, amount: 400, idempotencyKey: "rev:c9",
  });

  const b = await balances();
  assert.equal(b.pending, 0, "pending drained first");
  assert.equal(b.available, 100, "remainder taken from available");
});

test("reversal never drives a balance negative", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 100, idempotencyKey: "c10",
  });

  // Reverse far more than exists.
  await walletService.reverseCommission({
    resellerId: RESELLER, amount: 99999, idempotencyKey: "rev:c10",
  });

  const b = await balances();
  assert.ok(b.pending >= 0, "pending must not be negative");
  assert.ok(b.available >= 0, "available must not be negative");
  assert.ok(b.lifetime >= 0, "lifetime must not be negative");
});

test("concurrent reversals with the same key reverse once", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 700, idempotencyKey: "c11",
  });
  await walletService.releasePending({
    resellerId: RESELLER, amount: 700, idempotencyKey: "r11",
  });

  await Promise.all([
    walletService.reverseCommission({ resellerId: RESELLER, amount: 700, idempotencyKey: "rev:c11" }),
    walletService.reverseCommission({ resellerId: RESELLER, amount: 700, idempotencyKey: "rev:c11" }),
  ]);

  const b = await balances();
  assert.equal(b.available, 0, "reversed exactly once, not twice");
});

/* -------------------------------------------------------------------------- *
 * Full lifecycle
 * -------------------------------------------------------------------------- */

test("end-to-end: earn, mature, withdraw, settle", async () => {
  await resetAll();

  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 1200, idempotencyKey: "life:c",
  });
  assert.deepEqual(
    { p: (await balances()).pending, a: (await balances()).available },
    { p: 1200, a: 0 },
  );

  await walletService.releasePending({
    resellerId: RESELLER, amount: 1200, idempotencyKey: "life:r",
  });
  assert.equal((await balances()).available, 1200);

  await walletService.lockForWithdrawal({ resellerId: RESELLER, amount: 1000 });
  let b = await balances();
  assert.equal(b.available, 200);
  assert.equal(b.locked, 1000);

  await walletService.settleWithdrawal({
    resellerId: RESELLER, withdrawalId: "wd_life", amount: 1000,
  });
  b = await balances();
  assert.equal(b.locked, 0);
  assert.equal(b.available, 200);
  assert.equal(b.withdrawn, 1000);
  assert.equal(b.lifetime, 1200, "lifetime tracks earnings, not withdrawals");
});

test("ledger rows are written for every mutation", async () => {
  await resetAll();
  await walletService.creditPending({
    resellerId: RESELLER, userId: USER, amount: 500, idempotencyKey: "led:1",
  });
  await walletService.releasePending({
    resellerId: RESELLER, amount: 500, idempotencyKey: "led:2",
  });
  await walletService.lockForWithdrawal({ resellerId: RESELLER, amount: 500 });
  await walletService.settleWithdrawal({
    resellerId: RESELLER, withdrawalId: "wd_led", amount: 500,
  });

  const rows = await transactions.find({ reseller: RESELLER });
  const types = rows.map((r) => `${r.type}:${r.direction}`);
  assert.ok(types.includes("commission:credit"));
  assert.ok(types.includes("withdrawal:debit"));
  assert.ok(rows.every((r) => typeof r.balanceAfter === "number"),
    "every row records the resulting balance");
});

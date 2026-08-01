const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

/**
 * Wallet ledger.
 *
 * Correctness rules enforced here:
 *
 * 1. The Transaction row is written BEFORE the balance moves. The unique
 *    `idempotencyKey` index makes that insert the concurrency claim: if two
 *    callers race, exactly one insert succeeds and the loser exits without
 *    touching the wallet. Writing the balance first (the previous behaviour)
 *    meant a duplicate could inflate the wallet and then fail to record it.
 *
 * 2. Every balance mutation is a single conditional `findOneAndUpdate` with
 *    `$inc`. Guards live in the query filter, never in JavaScript, so a
 *    balance can never be computed from a stale read.
 *
 * 3. If a balance update is rejected by its guard, the already-written
 *    Transaction is marked `failed` rather than deleted, so the audit trail
 *    keeps the attempt.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const DUPLICATE_KEY = 11000;

/** Fetches, or creates, the wallet for a reseller. */
const getOrCreateWallet = async (resellerId, userId) => {
  const wallet = await Wallet.findOneAndUpdate(
    { reseller: resellerId },
    { $setOnInsert: { reseller: resellerId, user: userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return wallet;
};

/**
 * Reserves an idempotency key by inserting the ledger row up front.
 * Returns null when the key already exists, which means another caller (or an
 * earlier retry) has already performed this operation.
 */
const claimLedgerEntry = async (doc) => {
  try {
    return await Transaction.create(doc);
  } catch (err) {
    if (err?.code === DUPLICATE_KEY) return null;
    throw err;
  }
};

const markFailed = (txnId, reason) =>
  Transaction.updateOne(
    { _id: txnId },
    { $set: { status: "failed", description: reason } },
  ).catch(() => {});

/**
 * Credits commission into the pending bucket. Funds become withdrawable only
 * once `releasePending` runs, after delivery and the return window.
 */
const creditPending = async ({
  resellerId,
  userId,
  amount,
  type = "commission",
  description,
  orderId,
  commissionId,
  referredResellerId,
  idempotencyKey,
}) => {
  const value = round2(amount);
  if (value <= 0) return null;

  const wallet = await getOrCreateWallet(resellerId, userId);

  const txn = await claimLedgerEntry({
    reseller: resellerId,
    wallet: wallet._id,
    type,
    direction: "credit",
    amount: value,
    status: "pending",
    description,
    order: orderId,
    commission: commissionId,
    referredReseller: referredResellerId,
    idempotencyKey,
  });

  if (!txn) return null;

  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id },
    { $inc: { pendingBalance: value, version: 1 }, $set: { lastCreditedAt: new Date() } },
    { new: true },
  );

  await Transaction.updateOne(
    { _id: txn._id },
    { $set: { balanceAfter: updated.availableBalance } },
  );

  return txn;
};

/**
 * Moves matured commission from pending to available.
 *
 * The `pendingBalance: { $gte: value }` filter is the guard: if the funds are
 * not actually pending (already released, or clawed back), the update matches
 * nothing and no money is created.
 */
const releasePending = async ({
  resellerId,
  amount,
  description,
  orderId,
  commissionId,
  idempotencyKey,
}) => {
  const value = round2(amount);
  if (value <= 0) return null;

  const wallet = await Wallet.findOne({ reseller: resellerId }).select("_id");
  if (!wallet) return null;

  const txn = await claimLedgerEntry({
    reseller: resellerId,
    wallet: wallet._id,
    type: "commission",
    direction: "credit",
    amount: value,
    status: "completed",
    description: description || "Commission released",
    order: orderId,
    commission: commissionId,
    idempotencyKey,
    completedAt: new Date(),
  });

  if (!txn) return null;

  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id, pendingBalance: { $gte: value } },
    {
      $inc: {
        pendingBalance: -value,
        availableBalance: value,
        lifetimeEarnings: value,
        version: 1,
      },
    },
    { new: true },
  );

  if (!updated) {
    await markFailed(txn._id, "Release skipped: insufficient pending balance");
    return null;
  }

  await Transaction.updateOne(
    { _id: txn._id },
    { $set: { balanceAfter: updated.availableBalance } },
  );

  return txn;
};

/**
 * Claws a commission back after a cancellation or return.
 *
 * Takes from pending first, then available, in two guarded steps. Each step
 * only removes what is actually there, so a balance can never go negative and
 * a partially-spent commission is reclaimed as far as possible.
 */
const reverseCommission = async ({
  resellerId,
  amount,
  description,
  orderId,
  commissionId,
  idempotencyKey,
}) => {
  const value = round2(amount);
  if (value <= 0) return null;

  const wallet = await Wallet.findOne({ reseller: resellerId }).select("_id");
  if (!wallet) return null;

  const txn = await claimLedgerEntry({
    reseller: resellerId,
    wallet: wallet._id,
    type: "reversal",
    direction: "debit",
    amount: value,
    status: "completed",
    description: description || "Commission reversed",
    order: orderId,
    commission: commissionId,
    idempotencyKey,
    completedAt: new Date(),
  });

  if (!txn) return null;

  let remaining = value;

  // Step 1: take the whole amount from pending if it is all there, otherwise
  // drain pending to zero.
  const fromPending = await Wallet.findOneAndUpdate(
    { _id: wallet._id, pendingBalance: { $gte: remaining } },
    { $inc: { pendingBalance: -remaining, version: 1 } },
    { new: true },
  );

  if (fromPending) {
    remaining = 0;
  } else {
    const current = await Wallet.findById(wallet._id).select("pendingBalance");
    const drain = Math.min(remaining, current?.pendingBalance || 0);
    if (drain > 0) {
      const drained = await Wallet.findOneAndUpdate(
        { _id: wallet._id, pendingBalance: { $gte: drain } },
        { $inc: { pendingBalance: -drain, version: 1 } },
        { new: true },
      );
      if (drained) remaining = round2(remaining - drain);
    }
  }

  // Step 2: recover the shortfall from the available balance, capped so it
  // cannot go negative.
  let reclaimedFromAvailable = 0;
  if (remaining > 0) {
    const current = await Wallet.findById(wallet._id).select(
      "availableBalance lifetimeEarnings",
    );
    const take = Math.min(remaining, current?.availableBalance || 0);
    if (take > 0) {
      const debited = await Wallet.findOneAndUpdate(
        { _id: wallet._id, availableBalance: { $gte: take } },
        {
          $inc: {
            availableBalance: -take,
            lifetimeEarnings: -Math.min(take, current.lifetimeEarnings || 0),
            version: 1,
          },
        },
        { new: true },
      );
      if (debited) reclaimedFromAvailable = take;
    }
  }

  const recovered = round2(value - remaining + reclaimedFromAvailable);
  const finalWallet = await Wallet.findById(wallet._id).select("availableBalance");

  await Transaction.updateOne(
    { _id: txn._id },
    {
      $set: {
        amount: recovered > 0 ? recovered : value,
        balanceAfter: finalWallet?.availableBalance ?? 0,
        ...(recovered < value
          ? { description: `${description || "Commission reversed"} (partial)` }
          : {}),
      },
    },
  );

  return txn;
};

/**
 * Locks funds against a withdrawal request.
 *
 * The `availableBalance: { $gte: value }` filter is what prevents a
 * double-spend when two requests arrive together: only one can match.
 */
const lockForWithdrawal = async ({ resellerId, amount }) => {
  const value = round2(amount);

  const wallet = await Wallet.findOneAndUpdate(
    { reseller: resellerId, availableBalance: { $gte: value } },
    { $inc: { availableBalance: -value, lockedBalance: value, version: 1 } },
    { new: true },
  );

  if (!wallet) {
    const err = new Error("Insufficient available balance");
    err.statusCode = 400;
    throw err;
  }
  return wallet;
};

/**
 * Releases a lock back to available, for a rejected or cancelled withdrawal.
 * Guarded on `lockedBalance` so a repeated call cannot mint money.
 */
const unlockWithdrawal = async ({ resellerId, amount }) => {
  const value = round2(amount);

  return Wallet.findOneAndUpdate(
    { reseller: resellerId, lockedBalance: { $gte: value } },
    { $inc: { lockedBalance: -value, availableBalance: value, version: 1 } },
    { new: true },
  );
};

/** Settles a paid withdrawal: clears the lock and records the debit. */
const settleWithdrawal = async ({
  resellerId,
  withdrawalId,
  amount,
  description,
}) => {
  const value = round2(amount);

  const wallet = await Wallet.findOne({ reseller: resellerId }).select("_id");
  if (!wallet) return null;

  const txn = await claimLedgerEntry({
    reseller: resellerId,
    wallet: wallet._id,
    type: "withdrawal",
    direction: "debit",
    amount: value,
    status: "completed",
    description: description || "Withdrawal paid",
    withdrawal: withdrawalId,
    idempotencyKey: `withdrawal-paid:${withdrawalId}`,
    completedAt: new Date(),
  });

  if (!txn) return null;

  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id, lockedBalance: { $gte: value } },
    {
      $inc: { lockedBalance: -value, totalWithdrawn: value, version: 1 },
      $set: { lastWithdrawalAt: new Date() },
    },
    { new: true },
  );

  if (!updated) {
    await markFailed(txn._id, "Settlement skipped: funds not locked");
    return null;
  }

  await Transaction.updateOne(
    { _id: txn._id },
    { $set: { balanceAfter: updated.availableBalance } },
  );

  return txn;
};

/** Manual admin credit or debit. */
const adjust = async ({
  resellerId,
  userId,
  amount,
  direction = "credit",
  description,
  idempotencyKey,
}) => {
  const value = round2(Math.abs(amount));
  if (value <= 0) return null;

  const wallet = await getOrCreateWallet(resellerId, userId);

  const txn = await claimLedgerEntry({
    reseller: resellerId,
    wallet: wallet._id,
    type: "adjustment",
    direction,
    amount: value,
    status: "completed",
    description: description || "Manual adjustment",
    idempotencyKey,
    completedAt: new Date(),
  });

  if (!txn) return null;

  const filter =
    direction === "credit"
      ? { _id: wallet._id }
      : { _id: wallet._id, availableBalance: { $gte: value } };

  const update =
    direction === "credit"
      ? { $inc: { availableBalance: value, lifetimeEarnings: value, version: 1 } }
      : { $inc: { availableBalance: -value, version: 1 } };

  const updated = await Wallet.findOneAndUpdate(filter, update, { new: true });

  if (!updated) {
    await markFailed(txn._id, "Adjustment skipped: insufficient balance");
    return null;
  }

  await Transaction.updateOne(
    { _id: txn._id },
    { $set: { balanceAfter: updated.availableBalance } },
  );

  return txn;
};

module.exports = {
  getOrCreateWallet,
  creditPending,
  releasePending,
  reverseCommission,
  lockForWithdrawal,
  unlockWithdrawal,
  settleWithdrawal,
  adjust,
  round2,
};

const Commission = require("../models/Commission");
const Reseller = require("../models/Reseller");
const walletService = require("./walletService");

/**
 * Commission maturation.
 *
 * A commission is credited to `pendingBalance` when the order is placed and
 * becomes withdrawable only after the order is delivered AND the return window
 * has closed. Those two events happen at different times, and delivery always
 * precedes maturity, so settling purely on the delivery transition left every
 * commission stuck in `pending` forever.
 *
 * This module closes that gap with two complementary mechanisms:
 *
 *   1. `sweepMaturedCommissions` — a periodic sweep that releases everything
 *      whose window has elapsed. This is the primary path.
 *   2. `settleMaturedForReseller` — an on-read settlement invoked when a
 *      reseller opens their wallet, so the balance is correct immediately even
 *      if the sweep has not fired yet (relevant on hosts that idle the process).
 *
 * Both are idempotent: releases are keyed per commission, so a commission
 * touched by both paths is still only ever released once.
 */

const BATCH_SIZE = 200;

/** Releases a single approved, matured commission. Safe to call repeatedly. */
const releaseCommission = async (commission) => {
  const released = await walletService.releasePending({
    resellerId: commission.reseller,
    amount: commission.netCommission,
    description: `Commission released for order ${commission.order}`,
    orderId: commission.order,
    commissionId: commission._id,
    idempotencyKey: `release:${commission._id}`,
  });

  if (commission.referralPayout?.amount && !commission.referralPayout.settled) {
    await walletService.releasePending({
      resellerId: commission.referralPayout.reseller,
      amount: commission.referralPayout.amount,
      description: "Referral earning released",
      orderId: commission.order,
      commissionId: commission._id,
      idempotencyKey: `release-ref:${commission._id}`,
    });
  }

  // Flip to paid only if still approved, so a concurrent reversal wins.
  const updated = await Commission.findOneAndUpdate(
    { _id: commission._id, status: "approved" },
    {
      $set: {
        status: "paid",
        paidAt: new Date(),
        "referralPayout.settled": true,
      },
    },
    { new: true },
  );

  if (updated) {
    await Reseller.updateOne(
      { _id: commission.reseller },
      { $inc: { "stats.lifetimeEarnings": commission.netCommission } },
    );
  }

  return released;
};

/**
 * Releases every commission that is approved and past its maturity date.
 * Returns the number released.
 */
const sweepMaturedCommissions = async () => {
  const due = await Commission.find({
    status: "approved",
    maturesAt: { $lte: new Date() },
  })
    .limit(BATCH_SIZE)
    .lean();

  let released = 0;
  for (const commission of due) {
    try {
      await releaseCommission(commission);
      released += 1;
    } catch (err) {
      console.error(
        `Commission ${commission._id} release failed:`,
        err.message,
      );
    }
  }

  return released;
};

/** Settles matured commissions for one reseller, used on wallet read. */
const settleMaturedForReseller = async (resellerId) => {
  const due = await Commission.find({
    reseller: resellerId,
    status: "approved",
    maturesAt: { $lte: new Date() },
  })
    .limit(50)
    .lean();

  for (const commission of due) {
    try {
      await releaseCommission(commission);
    } catch (err) {
      console.error(`Commission ${commission._id} release failed:`, err.message);
    }
  }

  return due.length;
};

/**
 * Starts the periodic sweep. Returns a stop function.
 * `unref()` keeps the timer from holding the process open during shutdown.
 */
const startMaturitySweeper = (intervalMs = 15 * 60 * 1000) => {
  const tick = () => {
    sweepMaturedCommissions().catch((err) =>
      console.error("Commission sweep failed:", err.message),
    );
  };

  // Run shortly after boot to catch anything that matured while the process
  // was asleep, then on a fixed interval.
  const initial = setTimeout(tick, 30_000);
  const timer = setInterval(tick, intervalMs);
  initial.unref?.();
  timer.unref?.();

  return () => {
    clearTimeout(initial);
    clearInterval(timer);
  };
};

module.exports = {
  releaseCommission,
  sweepMaturedCommissions,
  settleMaturedForReseller,
  startMaturitySweeper,
};

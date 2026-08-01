const Reseller = require("../models/Reseller");
const ResellerProduct = require("../models/ResellerProduct");
const Commission = require("../models/Commission");
const Referral = require("../models/Referral");
const ResellerAnalytics = require("../models/ResellerAnalytics");
const walletService = require("./walletService");

/**
 * Reseller business rules: commission maths, order attribution, analytics
 * roll-ups and fraud heuristics.
 *
 * Route handlers stay thin; anything that touches money lives here so the
 * arithmetic exists in exactly one place.
 */

const round2 = walletService.round2;

/** Days a delivered order must age before its commission is withdrawable. */
const RETURN_WINDOW_DAYS = Number(process.env.RESELLER_RETURN_WINDOW_DAYS || 7);

/**
 * Computes the selling price for a given base price + margin.
 * Single source of truth shared by the catalog, share pages and checkout.
 */
const computePricing = (basePrice, marginPercent) => {
  const base = round2(basePrice);
  const pct = Math.max(0, Number(marginPercent) || 0);
  const marginAmount = round2((base * pct) / 100);
  return {
    basePrice: base,
    marginPercent: pct,
    marginAmount,
    sellingPrice: round2(base + marginAmount),
  };
};

/**
 * Splits an order's reseller items into the commission breakdown.
 *
 *   grossMargin   = Σ (sellingPrice - basePrice) * qty
 *   platformFee   = baseAmount * commissionRate / 100
 *   netCommission = grossMargin - platformFee   (floored at 0)
 */
const computeCommission = (items, commissionRate) => {
  let baseAmount = 0;
  let sellingAmount = 0;

  const lines = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const base = round2(item.basePrice ?? item.price);
    const selling = round2(item.price);
    baseAmount += base * qty;
    sellingAmount += selling * qty;

    return {
      product: item.product?._id || item.product,
      resellerProduct: item.resellerProduct,
      name: item.name,
      quantity: qty,
      basePrice: base,
      sellingPrice: selling,
      marginPercent: base > 0 ? round2(((selling - base) / base) * 100) : 0,
      lineMargin: round2((selling - base) * qty),
    };
  });

  baseAmount = round2(baseAmount);
  sellingAmount = round2(sellingAmount);

  const grossMargin = round2(sellingAmount - baseAmount);
  const platformFee = round2((baseAmount * (Number(commissionRate) || 0)) / 100);
  const netCommission = round2(Math.max(0, grossMargin - platformFee));

  return { lines, baseAmount, sellingAmount, grossMargin, platformFee, netCommission };
};

/**
 * Creates the Commission record for a reseller-attributed order and credits the
 * reseller's pending balance. Idempotent: safe to call more than once per order.
 */
const recordOrderCommission = async (order) => {
  if (!order?.reseller) return null;
  if (order.commissionProcessed) return null;

  const reseller = await Reseller.findById(order.reseller);
  if (!reseller) return null;

  const resellerItems = (order.items || []).filter(
    (i) => i.basePrice != null && i.basePrice !== i.price,
  );
  const items = resellerItems.length ? resellerItems : order.items || [];
  if (!items.length) return null;

  const breakdown = computeCommission(items, reseller.commissionRate);

  const existing = await Commission.findOne({
    reseller: reseller._id,
    order: order._id,
  });
  if (existing) return existing;

  const maturesAt = new Date(
    Date.now() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const commission = await Commission.create({
    reseller: reseller._id,
    order: order._id,
    customer: order.user,
    items: breakdown.lines,
    baseAmount: breakdown.baseAmount,
    sellingAmount: breakdown.sellingAmount,
    grossMargin: breakdown.grossMargin,
    commissionRate: reseller.commissionRate,
    platformFee: breakdown.platformFee,
    netCommission: breakdown.netCommission,
    status: "pending",
    maturesAt,
  });

  await walletService.creditPending({
    resellerId: reseller._id,
    userId: reseller.user,
    amount: breakdown.netCommission,
    type: "commission",
    description: `Commission for order ${order.orderId || order._id}`,
    orderId: order._id,
    commissionId: commission._id,
    idempotencyKey: `commission:${order._id}`,
  });

  // Referral share: a slice of the referee's net commission.
  if (reseller.referredBy) {
    const referral = await Referral.findOne({
      referrer: reseller.referredBy,
      referee: reseller._id,
      status: "active",
    });

    if (referral && !referral.flaggedAsSelfReferral) {
      const referralAmount = round2(
        (breakdown.netCommission * referral.commissionRate) / 100,
      );

      if (referralAmount > 0) {
        const referrer = await Reseller.findById(reseller.referredBy);
        if (referrer && referrer.status === "approved") {
          await walletService.creditPending({
            resellerId: referrer._id,
            userId: referrer.user,
            amount: referralAmount,
            type: "referral",
            description: `Referral earning from ${reseller.storeName}`,
            orderId: order._id,
            commissionId: commission._id,
            referredResellerId: reseller._id,
            idempotencyKey: `referral:${order._id}:${referrer._id}`,
          });

          commission.referralPayout = {
            reseller: referrer._id,
            rate: referral.commissionRate,
            amount: referralAmount,
            settled: false,
          };
          await commission.save();

          referral.totalEarnings = round2(
            referral.totalEarnings + referralAmount,
          );
          referral.ordersGenerated += 1;
          await referral.save();
        }
      }
    }
  }

  // Denormalised counters used by the dashboard and leaderboard.
  await Reseller.findByIdAndUpdate(reseller._id, {
    $inc: {
      "stats.totalOrders": 1,
      "stats.totalSales": breakdown.sellingAmount,
    },
  });

  await Promise.all(
    breakdown.lines
      .filter((l) => l.resellerProduct)
      .map((l) =>
        ResellerProduct.findByIdAndUpdate(l.resellerProduct, {
          $inc: {
            "stats.orders": 1,
            "stats.unitsSold": l.quantity,
            "stats.revenue": round2(l.sellingPrice * l.quantity),
            "stats.earnings": l.lineMargin,
          },
        }),
      ),
  );

  await recordAnalytics(reseller._id, {
    orders: 1,
    unitsSold: breakdown.lines.reduce((s, l) => s + l.quantity, 0),
    revenue: breakdown.sellingAmount,
    earnings: breakdown.netCommission,
  });

  order.commissionProcessed = true;
  await order.save();

  return commission;
};

/**
 * Moves a commission to `approved` and releases the money once the order is
 * delivered and matured. Called from the order status transition handler.
 */
const settleCommissionForOrder = async (order) => {
  if (!order?.reseller) return null;

  // Approve on delivery. Release is handled by the maturity sweeper once the
  // return window closes, so this transition never has to wait on the clock.
  const commission = await Commission.findOneAndUpdate(
    {
      reseller: order.reseller,
      order: order._id,
      status: "pending",
    },
    { $set: { status: "approved", approvedAt: new Date() } },
    { new: true },
  );

  if (!commission) return null;

  await Reseller.updateOne(
    { _id: commission.reseller },
    { $inc: { "stats.deliveredOrders": 1 } },
  );

  // If the window has already elapsed (short window, or a late status update),
  // release immediately instead of waiting for the next sweep.
  if (!commission.maturesAt || commission.maturesAt <= new Date()) {
    const { releaseCommission } = require("./commissionMaturity");
    await releaseCommission(commission.toObject());
  }

  return commission;
};

/** Reverses a commission when an order is cancelled or returned. */
const reverseCommissionForOrder = async (order, reason = "Order cancelled") => {
  if (!order?.reseller) return null;

  const commission = await Commission.findOne({
    reseller: order.reseller,
    order: order._id,
  });
  if (!commission || commission.status === "reversed") return commission;

  await walletService.reverseCommission({
    resellerId: commission.reseller,
    amount: commission.netCommission,
    description: `${reason} — order ${order.orderId || order._id}`,
    orderId: order._id,
    commissionId: commission._id,
    idempotencyKey: `reverse:${commission._id}`,
  });

  if (commission.referralPayout?.amount) {
    await walletService.reverseCommission({
      resellerId: commission.referralPayout.reseller,
      amount: commission.referralPayout.amount,
      description: "Referral earning reversed",
      orderId: order._id,
      commissionId: commission._id,
      idempotencyKey: `reverse-ref:${commission._id}`,
    });
  }

  commission.status = "reversed";
  commission.reversedAt = new Date();
  commission.reversalReason = reason;
  await commission.save();

  const isReturn = /return/i.test(reason);
  await Reseller.findByIdAndUpdate(commission.reseller, {
    $inc: {
      "stats.cancelledOrders": isReturn ? 0 : 1,
      "stats.returnedOrders": isReturn ? 1 : 0,
    },
  });

  await recordAnalytics(commission.reseller, {
    cancelled: isReturn ? 0 : 1,
    returned: isReturn ? 1 : 0,
    earnings: -commission.netCommission,
  });

  return commission;
};

/** Upserts today's analytics bucket with the supplied deltas. */
const recordAnalytics = async (resellerId, deltas = {}) => {
  const date = ResellerAnalytics.dayKey();
  const inc = {};

  ["clicks", "orders", "unitsSold", "revenue", "earnings", "cancelled", "returned", "newCustomers"].forEach(
    (field) => {
      if (deltas[field]) inc[field] = deltas[field];
    },
  );

  if (!Object.keys(inc).length) return null;

  const bucket = await ResellerAnalytics.findOneAndUpdate(
    { reseller: resellerId, date },
    { $inc: inc, $setOnInsert: { reseller: resellerId, date } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (bucket && bucket.clicks > 0) {
    bucket.conversionRate = round2((bucket.orders / bucket.clicks) * 100);
    await bucket.save();
  }

  return bucket;
};

/** Records a click on a shared link (used for conversion tracking). */
const trackClick = async (resellerId, resellerProductId) => {
  await Promise.all([
    Reseller.findByIdAndUpdate(resellerId, { $inc: { "stats.linkClicks": 1 } }),
    resellerProductId
      ? ResellerProduct.findByIdAndUpdate(resellerProductId, {
          $inc: { "stats.clicks": 1 },
        })
      : Promise.resolve(),
    recordAnalytics(resellerId, { clicks: 1 }),
  ]);
};

/**
 * Heuristic fraud scan.
 *
 * Deliberately advisory: it raises flags and a 0-100 risk score for the admin
 * queue rather than auto-suspending anyone, so a false positive can never lock
 * an honest reseller out of their earnings.
 */
const evaluateFraudSignals = async (resellerId) => {
  const reseller = await Reseller.findById(resellerId).populate("user", "phone email");
  if (!reseller) return null;

  const flags = [];
  let score = 0;

  // 1. Self-referral: same device/IP fingerprint at signup.
  const referral = await Referral.findOne({ referee: reseller._id }).populate({
    path: "referrer",
    select: "user",
    populate: { path: "user", select: "phone email" },
  });

  if (referral?.referrer?.user) {
    const sameUser =
      referral.referrer.user._id?.toString() === reseller.user?._id?.toString();
    if (sameUser) {
      flags.push({ type: "self_referral", severity: "high", note: "Referrer and referee share an account" });
      score += 40;
    }
  }

  // 2. Abnormal cancellation / return ratio.
  const { totalOrders, cancelledOrders, returnedOrders } = reseller.stats;
  if (totalOrders >= 10) {
    const badRatio = (cancelledOrders + returnedOrders) / totalOrders;
    if (badRatio > 0.5) {
      flags.push({
        type: "high_cancellation",
        severity: "high",
        note: `${Math.round(badRatio * 100)}% of orders cancelled or returned`,
      });
      score += 30;
    } else if (badRatio > 0.3) {
      flags.push({
        type: "high_cancellation",
        severity: "medium",
        note: `${Math.round(badRatio * 100)}% of orders cancelled or returned`,
      });
      score += 15;
    }
  }

  // 3. Payout details shared with another reseller account.
  if (reseller.payout?.upiId || reseller.payout?.accountNumber) {
    const duplicateQuery = { _id: { $ne: reseller._id }, $or: [] };
    if (reseller.payout.upiId) {
      duplicateQuery.$or.push({ "payout.upiId": reseller.payout.upiId });
    }
    if (reseller.payout.accountNumber) {
      duplicateQuery.$or.push({
        "payout.accountNumber": reseller.payout.accountNumber,
      });
    }
    if (duplicateQuery.$or.length) {
      const duplicates = await Reseller.countDocuments(duplicateQuery);
      if (duplicates > 0) {
        flags.push({
          type: "duplicate_payout",
          severity: "high",
          note: `Payout details shared with ${duplicates} other account(s)`,
        });
        score += 35;
      }
    }
  }

  // 4. Referral velocity: a burst of signups in 24h.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentReferrals = await Referral.countDocuments({
    referrer: reseller._id,
    createdAt: { $gte: dayAgo },
  });
  if (recentReferrals >= 10) {
    flags.push({
      type: "velocity",
      severity: "medium",
      note: `${recentReferrals} referrals in the last 24 hours`,
    });
    score += 20;
  }

  const riskScore = Math.min(100, score);

  await Reseller.findByIdAndUpdate(reseller._id, {
    $set: {
      riskScore,
      fraudFlags: flags.map((f) => ({ ...f, flaggedAt: new Date(), resolved: false })),
    },
  });

  return { riskScore, flags };
};

module.exports = {
  computePricing,
  computeCommission,
  recordOrderCommission,
  settleCommissionForOrder,
  reverseCommissionForOrder,
  recordAnalytics,
  trackClick,
  evaluateFraudSignals,
  RETURN_WINDOW_DAYS,
};

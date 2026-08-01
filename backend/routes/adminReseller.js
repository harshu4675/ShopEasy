const express = require("express");
const { body, param, query } = require("express-validator");

const router = express.Router();

const Reseller = require("../models/Reseller");
const Withdrawal = require("../models/Withdrawal");
const Commission = require("../models/Commission");
const Referral = require("../models/Referral");
const Wallet = require("../models/Wallet");
const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
  validate,
  parsePagination,
  paginated,
  buildSort,
} = require("../middleware/validate");
const walletService = require("../services/walletService");
const resellerService = require("../services/resellerService");

/** Every route in this file is admin-only. */
router.use(auth, admin);

/** Best-effort in-app notification; never fails the surrounding request. */
const notify = async (userId, title, message, type = "system") => {
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch {
    /* non-critical */
  }
};

/* ========================================================================== *
 * RESELLER MANAGEMENT
 * ========================================================================== */

/** GET /api/admin/resellers — searchable, filterable queue. */
router.get(
  "/resellers",
  [
    query("status")
      .optional()
      .isIn(["pending", "approved", "rejected", "suspended", "all"]),
    query("page").optional().isInt({ min: 1 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const { status, search, minRisk } = req.query;

      const filter = {};
      if (status && status !== "all") filter.status = status;
      if (minRisk) filter.riskScore = { $gte: Number(minRisk) };
      if (search) {
        const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { storeName: { $regex: safe, $options: "i" } },
          { resellerCode: { $regex: safe, $options: "i" } },
          { referralCode: { $regex: safe, $options: "i" } },
        ];
      }

      const sortSpec = buildSort(
        req.query.sort,
        ["createdAt", "riskScore", "stats.lifetimeEarnings", "stats.totalSales"],
        { createdAt: -1 },
      );

      const [items, total] = await Promise.all([
        Reseller.find(filter)
          .populate("user", "name email phone createdAt")
          .sort(sortSpec)
          .skip(skip)
          .limit(limit)
          .lean(),
        Reseller.countDocuments(filter),
      ]);

      res.json(paginated(items, total, { page, limit }));
    } catch (error) {
      console.error("Admin list resellers error:", error);
      res.status(500).json({ success: false, message: "Unable to load resellers" });
    }
  },
);

/** GET /api/admin/resellers/stats/overview — headline counters. */
router.get("/resellers/stats/overview", async (req, res) => {
  try {
    const [byStatus, walletTotals, withdrawalQueue, commissionTotals] =
      await Promise.all([
        Reseller.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Wallet.aggregate([
          {
            $group: {
              _id: null,
              available: { $sum: "$availableBalance" },
              pending: { $sum: "$pendingBalance" },
              locked: { $sum: "$lockedBalance" },
              lifetime: { $sum: "$lifetimeEarnings" },
              withdrawn: { $sum: "$totalWithdrawn" },
            },
          },
        ]),
        Withdrawal.aggregate([
          { $match: { status: { $in: ["pending", "approved", "processing"] } } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
        ]),
        Commission.aggregate([
          {
            $group: {
              _id: null,
              gross: { $sum: "$grossMargin" },
              platformFee: { $sum: "$platformFee" },
              net: { $sum: "$netCommission" },
              orders: { $sum: 1 },
            },
          },
        ]),
      ]);

    res.json({
      success: true,
      data: {
        resellers: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        totalResellers: byStatus.reduce((sum, s) => sum + s.count, 0),
        wallet: walletTotals[0] || {
          available: 0,
          pending: 0,
          locked: 0,
          lifetime: 0,
          withdrawn: 0,
        },
        pendingWithdrawals: withdrawalQueue[0] || { count: 0, amount: 0 },
        commissions: commissionTotals[0] || {
          gross: 0,
          platformFee: 0,
          net: 0,
          orders: 0,
        },
      },
    });
  } catch (error) {
    console.error("Reseller stats error:", error);
    res.status(500).json({ success: false, message: "Unable to load stats" });
  }
});

/** GET /api/admin/resellers/stats/leaderboard — top performers. */
router.get("/resellers/stats/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const metric = ["totalSales", "lifetimeEarnings", "totalOrders"].includes(
      req.query.metric,
    )
      ? req.query.metric
      : "lifetimeEarnings";

    const leaders = await Reseller.find({ status: "approved" })
      .populate("user", "name phone")
      .select("storeName resellerCode stats riskScore createdAt")
      .sort({ [`stats.${metric}`]: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: leaders.map((r, i) => ({ rank: i + 1, ...r })),
      metric,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ success: false, message: "Unable to load leaderboard" });
  }
});

/** GET /api/admin/resellers/fraud — accounts carrying risk flags. */
router.get("/resellers/fraud", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const minRisk = Number(req.query.minRisk) || 1;

    const filter = {
      $or: [{ riskScore: { $gte: minRisk } }, { "fraudFlags.0": { $exists: true } }],
    };

    const [items, total] = await Promise.all([
      Reseller.find(filter)
        .populate("user", "name email phone")
        .select("storeName resellerCode status riskScore fraudFlags stats payout")
        .sort({ riskScore: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reseller.countDocuments(filter),
    ]);

    res.json(paginated(items, total, { page, limit }));
  } catch (error) {
    console.error("Fraud list error:", error);
    res.status(500).json({ success: false, message: "Unable to load fraud signals" });
  }
});

/** GET /api/admin/resellers/:id — full profile with wallet + recent activity. */
router.get("/resellers/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const reseller = await Reseller.findById(req.params.id)
      .populate("user", "name email phone createdAt")
      .populate("referredBy", "storeName resellerCode");

    if (!reseller) {
      return res.status(404).json({ success: false, message: "Reseller not found" });
    }

    const [wallet, recentOrders, commissionSummary, referrals] = await Promise.all([
      Wallet.findOne({ reseller: reseller._id }).lean(),
      Order.find({ reseller: reseller._id })
        .select("orderId totalAmount orderStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Commission.aggregate([
        { $match: { reseller: reseller._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$netCommission" },
          },
        },
      ]),
      Referral.countDocuments({ referrer: reseller._id }),
    ]);

    res.json({
      success: true,
      data: {
        reseller,
        wallet,
        recentOrders,
        commissionSummary,
        referralCount: referrals,
      },
    });
  } catch (error) {
    console.error("Reseller detail error:", error);
    res.status(500).json({ success: false, message: "Unable to load reseller" });
  }
});

/** PATCH /api/admin/resellers/:id/approve */
router.patch(
  "/resellers/:id/approve",
  [
    param("id").isMongoId(),
    body("commissionRate").optional().isFloat({ min: 0, max: 100 }),
    body("maxMarginPercent").optional().isFloat({ min: 0, max: 500 }),
  ],
  validate,
  async (req, res) => {
    try {
      const reseller = await Reseller.findById(req.params.id);
      if (!reseller) {
        return res.status(404).json({ success: false, message: "Reseller not found" });
      }
      if (reseller.status === "approved") {
        return res.status(400).json({ success: false, message: "Already approved" });
      }

      reseller.status = "approved";
      reseller.approvedAt = new Date();
      reseller.approvedBy = req.user._id;
      reseller.statusReason = undefined;
      if (req.body.commissionRate !== undefined) {
        reseller.commissionRate = req.body.commissionRate;
      }
      if (req.body.maxMarginPercent !== undefined) {
        reseller.maxMarginPercent = req.body.maxMarginPercent;
      }
      await reseller.save();

      await Promise.all([
        User.findByIdAndUpdate(reseller.user, {
          $set: { isReseller: true, resellerProfile: reseller._id },
        }),
        walletService.getOrCreateWallet(reseller._id, reseller.user),
        // Activate the referral edge now that the referee is a real reseller.
        Referral.findOneAndUpdate(
          { referee: reseller._id, status: "pending" },
          { $set: { status: "active", activatedAt: new Date() } },
        ),
        notify(
          reseller.user,
          "Reseller application approved",
          `Your store "${reseller.storeName}" is live. Start sharing products and earning.`,
        ),
      ]);

      res.json({ success: true, message: "Reseller approved", data: reseller });
    } catch (error) {
      console.error("Approve reseller error:", error);
      res.status(500).json({ success: false, message: "Unable to approve reseller" });
    }
  },
);

/** PATCH /api/admin/resellers/:id/reject */
router.patch(
  "/resellers/:id/reject",
  [param("id").isMongoId(), body("reason").trim().isLength({ min: 3, max: 300 })],
  validate,
  async (req, res) => {
    try {
      const reseller = await Reseller.findByIdAndUpdate(
        req.params.id,
        { $set: { status: "rejected", statusReason: req.body.reason } },
        { new: true },
      );
      if (!reseller) {
        return res.status(404).json({ success: false, message: "Reseller not found" });
      }

      await Promise.all([
        User.findByIdAndUpdate(reseller.user, { $set: { isReseller: false } }),
        notify(
          reseller.user,
          "Reseller application update",
          `Your application was not approved. Reason: ${req.body.reason}`,
        ),
      ]);

      res.json({ success: true, message: "Reseller rejected", data: reseller });
    } catch (error) {
      console.error("Reject reseller error:", error);
      res.status(500).json({ success: false, message: "Unable to reject reseller" });
    }
  },
);

/** PATCH /api/admin/resellers/:id/suspend */
router.patch(
  "/resellers/:id/suspend",
  [param("id").isMongoId(), body("reason").trim().isLength({ min: 3, max: 300 })],
  validate,
  async (req, res) => {
    try {
      const reseller = await Reseller.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status: "suspended",
            statusReason: req.body.reason,
            suspendedAt: new Date(),
          },
        },
        { new: true },
      );
      if (!reseller) {
        return res.status(404).json({ success: false, message: "Reseller not found" });
      }

      await Promise.all([
        User.findByIdAndUpdate(reseller.user, { $set: { isReseller: false } }),
        notify(
          reseller.user,
          "Reseller account suspended",
          `Your reseller account has been suspended. Reason: ${req.body.reason}`,
        ),
      ]);

      res.json({ success: true, message: "Reseller suspended", data: reseller });
    } catch (error) {
      console.error("Suspend reseller error:", error);
      res.status(500).json({ success: false, message: "Unable to suspend reseller" });
    }
  },
);

/** PATCH /api/admin/resellers/:id/reinstate */
router.patch(
  "/resellers/:id/reinstate",
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    try {
      const reseller = await Reseller.findByIdAndUpdate(
        req.params.id,
        {
          $set: { status: "approved", statusReason: undefined },
          $unset: { suspendedAt: 1 },
        },
        { new: true },
      );
      if (!reseller) {
        return res.status(404).json({ success: false, message: "Reseller not found" });
      }

      await Promise.all([
        User.findByIdAndUpdate(reseller.user, { $set: { isReseller: true } }),
        notify(
          reseller.user,
          "Reseller account reinstated",
          "Your reseller account is active again. Welcome back!",
        ),
      ]);

      res.json({ success: true, message: "Reseller reinstated", data: reseller });
    } catch (error) {
      console.error("Reinstate reseller error:", error);
      res.status(500).json({ success: false, message: "Unable to reinstate reseller" });
    }
  },
);

/** PATCH /api/admin/resellers/:id/limits — commission rate & margin ceiling. */
router.patch(
  "/resellers/:id/limits",
  [
    param("id").isMongoId(),
    body("commissionRate").optional().isFloat({ min: 0, max: 100 }),
    body("maxMarginPercent").optional().isFloat({ min: 0, max: 500 }),
    body("referralCommissionRate").optional().isFloat({ min: 0, max: 50 }),
  ],
  validate,
  async (req, res) => {
    try {
      const updates = {};
      ["commissionRate", "maxMarginPercent", "referralCommissionRate"].forEach((f) => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });

      const reseller = await Reseller.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true },
      );
      if (!reseller) {
        return res.status(404).json({ success: false, message: "Reseller not found" });
      }

      res.json({ success: true, message: "Limits updated", data: reseller });
    } catch (error) {
      console.error("Update limits error:", error);
      res.status(500).json({ success: false, message: "Unable to update limits" });
    }
  },
);

/** POST /api/admin/resellers/:id/rescan — re-run the fraud heuristics. */
router.post(
  "/resellers/:id/rescan",
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    try {
      const result = await resellerService.evaluateFraudSignals(req.params.id);
      if (!result) {
        return res.status(404).json({ success: false, message: "Reseller not found" });
      }
      res.json({ success: true, message: "Fraud scan complete", data: result });
    } catch (error) {
      console.error("Fraud rescan error:", error);
      res.status(500).json({ success: false, message: "Unable to run fraud scan" });
    }
  },
);

/* ========================================================================== *
 * WITHDRAWALS
 * ========================================================================== */

/** GET /api/admin/withdrawals — payout queue. */
router.get("/withdrawals", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }
    if (req.query.method) filter.method = req.query.method;

    const [items, total, summary] = await Promise.all([
      Withdrawal.find(filter)
        .populate("user", "name email phone")
        .populate("reseller", "storeName resellerCode riskScore")
        .sort({ requestedAt: 1 }) // oldest first: fair queue
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(filter),
      Withdrawal.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      ...paginated(items, total, { page, limit }),
      summary: summary.reduce(
        (acc, s) => ({ ...acc, [s._id]: { count: s.count, amount: s.amount } }),
        {},
      ),
    });
  } catch (error) {
    console.error("Admin withdrawals error:", error);
    res.status(500).json({ success: false, message: "Unable to load withdrawals" });
  }
});

/** PATCH /api/admin/withdrawals/:id/approve */
router.patch(
  "/withdrawals/:id/approve",
  [param("id").isMongoId(), body("note").optional().trim().isLength({ max: 300 })],
  validate,
  async (req, res) => {
    try {
      const withdrawal = await Withdrawal.findOneAndUpdate(
        { _id: req.params.id, status: "pending" },
        {
          $set: {
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: req.user._id,
            adminNote: req.body.note,
          },
        },
        { new: true },
      );

      if (!withdrawal) {
        const exists = await Withdrawal.exists({ _id: req.params.id });
        return res.status(exists ? 400 : 404).json({
          success: false,
          message: exists
            ? "This withdrawal is no longer pending"
            : "Withdrawal not found",
        });
      }

      await notify(
        withdrawal.user,
        "Withdrawal approved",
        `Your withdrawal of ₹${withdrawal.amount} has been approved and will be paid shortly.`,
      );

      res.json({ success: true, message: "Withdrawal approved", data: withdrawal });
    } catch (error) {
      console.error("Approve withdrawal error:", error);
      res.status(500).json({ success: false, message: "Unable to approve withdrawal" });
    }
  },
);

/** PATCH /api/admin/withdrawals/:id/reject — releases the locked funds. */
router.patch(
  "/withdrawals/:id/reject",
  [param("id").isMongoId(), body("reason").trim().isLength({ min: 3, max: 300 })],
  validate,
  async (req, res) => {
    try {
      // Claim the rejection before moving money: only one caller can win the
      // status transition, so the funds can only be unlocked once.
      const withdrawal = await Withdrawal.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ["pending", "approved"] } },
        {
          $set: {
            status: "rejected",
            rejectionReason: req.body.reason,
            reviewedAt: new Date(),
            reviewedBy: req.user._id,
          },
        },
        { new: true },
      );

      if (!withdrawal) {
        const exists = await Withdrawal.exists({ _id: req.params.id });
        return res.status(exists ? 400 : 404).json({
          success: false,
          message: exists
            ? "This withdrawal can no longer be rejected"
            : "Withdrawal not found",
        });
      }

      // Money goes straight back to the reseller's available balance.
      await walletService.unlockWithdrawal({
        resellerId: withdrawal.reseller,
        amount: withdrawal.amount,
      });

      await notify(
        withdrawal.user,
        "Withdrawal rejected",
        `Your withdrawal of ₹${withdrawal.amount} was rejected: ${req.body.reason}. The amount is back in your wallet.`,
      );

      res.json({ success: true, message: "Withdrawal rejected", data: withdrawal });
    } catch (error) {
      console.error("Reject withdrawal error:", error);
      res.status(500).json({ success: false, message: "Unable to reject withdrawal" });
    }
  },
);

/** PATCH /api/admin/withdrawals/:id/paid — settle and clear the lock. */
router.patch(
  "/withdrawals/:id/paid",
  [
    param("id").isMongoId(),
    body("transactionReference").trim().isLength({ min: 3, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const withdrawal = await Withdrawal.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ["approved", "processing"] } },
        {
          $set: {
            status: "paid",
            paidAt: new Date(),
            transactionReference: req.body.transactionReference,
            paymentProofUrl: req.body.paymentProofUrl,
          },
        },
        { new: true },
      );

      if (!withdrawal) {
        const exists = await Withdrawal.exists({ _id: req.params.id });
        return res.status(exists ? 400 : 404).json({
          success: false,
          message: exists
            ? "Withdrawal must be approved before it can be marked paid"
            : "Withdrawal not found",
        });
      }

      // Settlement is idempotent on withdrawal id, so a retry cannot
      // double-debit the locked funds.
      await walletService.settleWithdrawal({
        resellerId: withdrawal.reseller,
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount,
        description: `Withdrawal ${withdrawal.withdrawalId} paid`,
      });

      await notify(
        withdrawal.user,
        "Payout sent",
        `₹${withdrawal.netAmount} has been transferred. Reference: ${req.body.transactionReference}`,
      );

      res.json({ success: true, message: "Withdrawal marked as paid", data: withdrawal });
    } catch (error) {
      console.error("Mark paid error:", error);
      res.status(500).json({ success: false, message: "Unable to settle withdrawal" });
    }
  },
);

/* ========================================================================== *
 * REFERRALS & COMMISSION RULES
 * ========================================================================== */

/** GET /api/admin/referrals */
router.get("/referrals", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.flagged === "true") filter.flaggedAsSelfReferral = true;

    const [items, total] = await Promise.all([
      Referral.find(filter)
        .populate("referrer", "storeName resellerCode")
        .populate("referee", "storeName resellerCode status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments(filter),
    ]);

    res.json(paginated(items, total, { page, limit }));
  } catch (error) {
    console.error("Admin referrals error:", error);
    res.status(500).json({ success: false, message: "Unable to load referrals" });
  }
});

/** PATCH /api/admin/referrals/:id/revoke */
router.patch(
  "/referrals/:id/revoke",
  [param("id").isMongoId(), body("reason").trim().isLength({ min: 3, max: 300 })],
  validate,
  async (req, res) => {
    try {
      const referral = await Referral.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status: "revoked",
            revokedAt: new Date(),
            revokedReason: req.body.reason,
          },
        },
        { new: true },
      );
      if (!referral) {
        return res.status(404).json({ success: false, message: "Referral not found" });
      }
      res.json({ success: true, message: "Referral revoked", data: referral });
    } catch (error) {
      console.error("Revoke referral error:", error);
      res.status(500).json({ success: false, message: "Unable to revoke referral" });
    }
  },
);

/**
 * GET /api/admin/commission-rules — current platform defaults.
 * Stored as env-backed defaults; per-reseller overrides live on the profile.
 */
router.get("/commission-rules", async (req, res) => {
  try {
    const [avg] = await Reseller.aggregate([
      {
        $group: {
          _id: null,
          avgCommission: { $avg: "$commissionRate" },
          avgMaxMargin: { $avg: "$maxMarginPercent" },
          avgReferral: { $avg: "$referralCommissionRate" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        defaults: {
          commissionRate: Number(process.env.RESELLER_COMMISSION_RATE || 10),
          maxMarginPercent: Number(process.env.RESELLER_MAX_MARGIN || 50),
          referralCommissionRate: Number(process.env.RESELLER_REFERRAL_RATE || 5),
          returnWindowDays: resellerService.RETURN_WINDOW_DAYS,
          minWithdrawal: 100,
        },
        current: avg || {},
      },
    });
  } catch (error) {
    console.error("Commission rules error:", error);
    res.status(500).json({ success: false, message: "Unable to load commission rules" });
  }
});

/**
 * PUT /api/admin/commission-rules
 * Bulk-applies new rates. `applyToExisting` decides whether current resellers
 * are re-rated or only future signups.
 */
router.put(
  "/commission-rules",
  [
    body("commissionRate").optional().isFloat({ min: 0, max: 100 }),
    body("maxMarginPercent").optional().isFloat({ min: 0, max: 500 }),
    body("referralCommissionRate").optional().isFloat({ min: 0, max: 50 }),
    body("applyToExisting").optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const { commissionRate, maxMarginPercent, referralCommissionRate, applyToExisting } =
        req.body;

      let modified = 0;
      if (applyToExisting) {
        const updates = {};
        if (commissionRate !== undefined) updates.commissionRate = commissionRate;
        if (maxMarginPercent !== undefined) updates.maxMarginPercent = maxMarginPercent;
        if (referralCommissionRate !== undefined) {
          updates.referralCommissionRate = referralCommissionRate;
        }
        if (Object.keys(updates).length) {
          const result = await Reseller.updateMany({}, { $set: updates });
          modified = result.modifiedCount;
        }
      }

      res.json({
        success: true,
        message: applyToExisting
          ? `Rules updated. ${modified} reseller(s) re-rated.`
          : "Rules updated for new resellers.",
        data: { commissionRate, maxMarginPercent, referralCommissionRate, modified },
      });
    } catch (error) {
      console.error("Update commission rules error:", error);
      res.status(500).json({ success: false, message: "Unable to update rules" });
    }
  },
);

module.exports = router;

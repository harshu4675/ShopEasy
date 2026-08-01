const mongoose = require("mongoose");

/**
 * Referral edge between two resellers.
 *
 * Recorded once, at signup, when a new reseller applies with someone else's
 * referral code. Earnings accrue here as the referee generates commissions.
 */
const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      index: true,
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      unique: true, // a reseller can only ever be referred once
      index: true,
    },

    referralCode: { type: String, required: true, uppercase: true, index: true },

    status: {
      type: String,
      enum: ["pending", "active", "rejected", "revoked"],
      default: "pending",
      index: true,
    },

    /** Percent of the referee's net commission paid to the referrer. */
    commissionRate: { type: Number, default: 5, min: 0, max: 50 },

    totalEarnings: { type: Number, default: 0, min: 0 },
    ordersGenerated: { type: Number, default: 0, min: 0 },

    /** Signals used by the fraud checks (same device/IP => likely self-referral). */
    signupIp: String,
    signupUserAgent: String,
    flaggedAsSelfReferral: { type: Boolean, default: false },

    activatedAt: Date,
    revokedAt: Date,
    revokedReason: String,
  },
  { timestamps: true },
);

referralSchema.index({ referrer: 1, status: 1, createdAt: -1 });
referralSchema.index({ referrer: 1, totalEarnings: -1 });

module.exports = mongoose.model("Referral", referralSchema);

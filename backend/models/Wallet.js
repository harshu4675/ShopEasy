const mongoose = require("mongoose");

/**
 * Reseller wallet.
 *
 * Balance semantics:
 *   pendingBalance   – earned but not yet releasable (order not delivered /
 *                      still inside the return window)
 *   availableBalance – withdrawable right now
 *   lockedBalance    – reserved against an in-flight withdrawal request
 *   lifetimeEarnings – cumulative credited commission, never decremented
 *
 * All mutations go through `Transaction` documents so the ledger is auditable;
 * these fields are the denormalised running totals.
 */
const walletSchema = new mongoose.Schema(
  {
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    availableBalance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },

    lifetimeEarnings: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },

    currency: { type: String, default: "INR" },

    /** Guards against double-spend when two withdrawals race. */
    version: { type: Number, default: 0 },

    lastCreditedAt: Date,
    lastWithdrawalAt: Date,
  },
  { timestamps: true },
);

walletSchema.virtual("totalBalance").get(function () {
  return this.availableBalance + this.pendingBalance + this.lockedBalance;
});

walletSchema.set("toJSON", { virtuals: true });
walletSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Wallet", walletSchema);

const mongoose = require("mongoose");

/**
 * Immutable wallet ledger entry.
 *
 * Every balance change on a `Wallet` is accompanied by exactly one Transaction,
 * so a wallet can always be reconciled by replaying its ledger. Documents are
 * never edited except to move `status` forward.
 */
const transactionSchema = new mongoose.Schema(
  {
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      index: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "commission", // profit on a sale
        "referral", // cut of a referee's commission
        "bonus", // manual/admin credit
        "withdrawal", // payout to the reseller
        "reversal", // order cancelled/returned -> claw back
        "adjustment", // manual correction
      ],
      index: true,
    },

    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "pending",
      index: true,
    },

    /** Running balance after this entry — makes statements cheap to render. */
    balanceAfter: { type: Number, min: 0 },

    description: { type: String, trim: true },

    /* Polymorphic source reference */
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    commission: { type: mongoose.Schema.Types.ObjectId, ref: "Commission" },
    withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: "Withdrawal" },
    referredReseller: { type: mongoose.Schema.Types.ObjectId, ref: "Reseller" },

    /** Prevents duplicate credits if a webhook/handler retries. */
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },

    metadata: { type: mongoose.Schema.Types.Mixed },

    completedAt: Date,
  },
  { timestamps: true },
);

transactionSchema.index({ reseller: 1, createdAt: -1 });
transactionSchema.index({ reseller: 1, type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);

const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * Payout request raised by a reseller against their available balance.
 *
 * Requesting a withdrawal immediately moves money from `availableBalance` to
 * `lockedBalance`, so the same rupees can never be requested twice. Rejection
 * or cancellation releases the lock; marking it paid clears it.
 */
const withdrawalSchema = new mongoose.Schema(
  {
    withdrawalId: { type: String, unique: true, index: true },

    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      index: true,
    },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    amount: {
      type: Number,
      required: true,
      min: [100, "Minimum withdrawal amount is Rs.100"],
    },
    /** Optional processing fee withheld by the platform. */
    fee: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },

    method: {
      type: String,
      enum: ["UPI", "BANK"],
      required: true,
    },

    /** Payout target snapshot — kept even if the profile changes later. */
    payoutDetails: {
      upiId: String,
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "processing", "paid", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    requestedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paidAt: Date,

    /** Bank/UPI reference supplied by the admin when settling. */
    transactionReference: String,
    paymentProofUrl: String,
    adminNote: String,
    rejectionReason: String,
  },
  { timestamps: true },
);

withdrawalSchema.index({ reseller: 1, status: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, requestedAt: 1 });

withdrawalSchema.pre("validate", function (next) {
  if (!this.withdrawalId) {
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    this.withdrawalId = `WD${Date.now().toString(36).toUpperCase()}${rand}`;
  }
  if (this.netAmount === undefined || this.netAmount === null) {
    this.netAmount = Math.max(0, this.amount - (this.fee || 0));
  }
  next();
});

module.exports = mongoose.model("Withdrawal", withdrawalSchema);

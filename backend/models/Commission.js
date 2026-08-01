const mongoose = require("mongoose");

/**
 * Per-order commission record for a reseller.
 *
 * Money breakdown for one order (sum over its items):
 *   sellingAmount = what the customer paid
 *   baseAmount    = catalogue value of the same items
 *   grossMargin   = sellingAmount - baseAmount            (reseller's markup)
 *   platformFee   = baseAmount * commissionRate / 100     (platform's cut)
 *   netCommission = grossMargin - platformFee             (paid to reseller)
 *
 * Lifecycle: pending -> approved -> paid, or -> reversed when the order is
 * cancelled/returned.
 */
const commissionItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    resellerProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResellerProduct",
    },
    name: String,
    quantity: { type: Number, min: 1 },
    basePrice: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    marginPercent: { type: Number, min: 0 },
    lineMargin: { type: Number, min: 0 },
  },
  { _id: false },
);

const commissionSchema = new mongoose.Schema(
  {
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    items: [commissionItemSchema],

    baseAmount: { type: Number, required: true, min: 0 },
    sellingAmount: { type: Number, required: true, min: 0 },
    grossMargin: { type: Number, required: true },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    platformFee: { type: Number, required: true, min: 0 },
    netCommission: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "paid", "reversed", "cancelled"],
      default: "pending",
      index: true,
    },

    /** Commission becomes withdrawable after the return window closes. */
    maturesAt: Date,
    approvedAt: Date,
    paidAt: Date,
    reversedAt: Date,
    reversalReason: String,

    /** Referral share generated from this commission, if any. */
    referralPayout: {
      reseller: { type: mongoose.Schema.Types.ObjectId, ref: "Reseller" },
      rate: Number,
      amount: Number,
      settled: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

/* One commission per reseller per order. */
commissionSchema.index({ reseller: 1, order: 1 }, { unique: true });
commissionSchema.index({ reseller: 1, status: 1, createdAt: -1 });
commissionSchema.index({ status: 1, maturesAt: 1 });
commissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Commission", commissionSchema);

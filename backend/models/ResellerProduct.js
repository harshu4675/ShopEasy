const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * A product a reseller has picked up, with their own margin.
 *
 * Pricing model (all amounts in INR):
 *   basePrice    = catalogue price snapshot at listing time
 *   marginAmount = basePrice * marginPercent / 100  (reseller's profit)
 *   sellingPrice = basePrice + marginAmount         (what the buyer pays)
 *
 * The snapshot means an admin repricing a product never silently changes a
 * reseller's advertised price; `isPriceStale` surfaces the drift instead.
 */
const resellerProductSchema = new mongoose.Schema(
  {
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    /** Public share slug used by /s/:slug links. */
    shareSlug: {
      type: String,
      unique: true,
      index: true,
      lowercase: true,
    },

    basePrice: { type: Number, required: true, min: 0 },
    marginPercent: { type: Number, required: true, min: 0, max: 500 },
    marginAmount: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },

    /** Optional reseller-authored copy shown on the shared page. */
    customTitle: { type: String, trim: true, maxlength: 120 },
    customDescription: { type: String, trim: true, maxlength: 1000 },

    isActive: { type: Boolean, default: true, index: true },

    stats: {
      clicks: { type: Number, default: 0, min: 0 },
      orders: { type: Number, default: 0, min: 0 },
      unitsSold: { type: Number, default: 0, min: 0 },
      revenue: { type: Number, default: 0, min: 0 },
      earnings: { type: Number, default: 0, min: 0 },
    },

    lastSharedAt: Date,
  },
  { timestamps: true },
);

/* One listing per product per reseller. */
resellerProductSchema.index({ reseller: 1, product: 1 }, { unique: true });
resellerProductSchema.index({ reseller: 1, isActive: 1, createdAt: -1 });
resellerProductSchema.index({ "stats.unitsSold": -1 });

/** Recomputes derived pricing. Call before saving whenever inputs change. */
resellerProductSchema.methods.recalculatePricing = function () {
  const margin = (this.basePrice * this.marginPercent) / 100;
  this.marginAmount = Math.round(margin * 100) / 100;
  this.sellingPrice = Math.round((this.basePrice + this.marginAmount) * 100) / 100;
  return this;
};

resellerProductSchema.pre("validate", async function (next) {
  try {
    if (!this.shareSlug) {
      const Model = this.constructor;
      let slug;
      /* eslint-disable no-await-in-loop */
      do {
        slug = crypto.randomBytes(6).toString("hex");
      } while (await Model.exists({ shareSlug: slug }));
      /* eslint-enable no-await-in-loop */
      this.shareSlug = slug;
    }

    if (this.isModified("basePrice") || this.isModified("marginPercent")) {
      this.recalculatePricing();
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("ResellerProduct", resellerProductSchema);

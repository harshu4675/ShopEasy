const mongoose = require("mongoose");

/**
 * Pre-aggregated daily analytics bucket, one document per reseller per day.
 *
 * Charts on the reseller dashboard read from here instead of scanning the
 * orders collection, which keeps the dashboard O(days) rather than O(orders)
 * and makes the 30/90-day views fast without any aggregation pipeline.
 */
const resellerAnalyticsSchema = new mongoose.Schema(
  {
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
      index: true,
    },

    /** UTC midnight for the bucket's day. */
    date: { type: Date, required: true, index: true },

    clicks: { type: Number, default: 0, min: 0 },
    orders: { type: Number, default: 0, min: 0 },
    unitsSold: { type: Number, default: 0, min: 0 },
    revenue: { type: Number, default: 0, min: 0 },
    earnings: { type: Number, default: 0, min: 0 },
    cancelled: { type: Number, default: 0, min: 0 },
    returned: { type: Number, default: 0, min: 0 },
    newCustomers: { type: Number, default: 0, min: 0 },

    /** clicks -> orders, stored so the chart doesn't recompute it. */
    conversionRate: { type: Number, default: 0, min: 0 },

    topProducts: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        units: Number,
        revenue: Number,
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

/* One bucket per reseller per day; also the lookup index for range queries. */
resellerAnalyticsSchema.index({ reseller: 1, date: -1 }, { unique: true });

/** Normalises any timestamp to the UTC midnight used as the bucket key. */
resellerAnalyticsSchema.statics.dayKey = function (input = new Date()) {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

module.exports = mongoose.model("ResellerAnalytics", resellerAnalyticsSchema);

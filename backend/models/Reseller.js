const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * Reseller profile.
 *
 * A reseller is always backed by a regular `User` (1:1). Keeping the
 * programme data in its own collection means the hot `users` collection stays
 * small and the reseller documents can carry their own indexes for the
 * leaderboard / admin queues.
 */

const kycSchema = new mongoose.Schema(
  {
    panNumber: { type: String, trim: true, uppercase: true },
    aadhaarLast4: { type: String, trim: true, match: /^[0-9]{4}$/ },
    gstin: { type: String, trim: true, uppercase: true },
    documentUrl: String,
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const payoutSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["UPI", "BANK"],
      default: "UPI",
    },
    upiId: {
      type: String,
      trim: true,
      match: [/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, "Invalid UPI ID"],
    },
    accountHolderName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"],
    },
    bankName: { type: String, trim: true },
  },
  { _id: false },
);

const resellerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    /** Public, shareable store identifier used in /store/:code links. */
    resellerCode: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },

    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: [60, "Store name cannot exceed 60 characters"],
    },
    storeSlug: { type: String, unique: true, sparse: true, lowercase: true },
    storeLogo: String,
    bio: { type: String, trim: true, maxlength: 300 },
    whatsappNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Enter a valid 10-digit WhatsApp number"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    statusReason: String,
    appliedAt: { type: Date, default: Date.now },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    suspendedAt: Date,

    kyc: kycSchema,
    payout: payoutSchema,

    /** Platform commission on the base price, in percent. Admin-controlled. */
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    /** Upper bound on the margin a reseller may add, in percent. */
    maxMarginPercent: {
      type: Number,
      default: 50,
      min: 0,
      max: 500,
    },
    defaultMarginPercent: {
      type: Number,
      default: 15,
      min: 0,
      max: 500,
    },

    /* ---------------- referrals ---------------- */
    referralCode: { type: String, unique: true, index: true, uppercase: true },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      index: true,
    },
    referralCount: { type: Number, default: 0, min: 0 },
    /** Percent of a referee's commission paid to the referrer. */
    referralCommissionRate: { type: Number, default: 5, min: 0, max: 50 },

    /* ---------------- denormalised counters (fast dashboards) ------------ */
    stats: {
      totalOrders: { type: Number, default: 0, min: 0 },
      deliveredOrders: { type: Number, default: 0, min: 0 },
      cancelledOrders: { type: Number, default: 0, min: 0 },
      returnedOrders: { type: Number, default: 0, min: 0 },
      totalSales: { type: Number, default: 0, min: 0 },
      lifetimeEarnings: { type: Number, default: 0, min: 0 },
      totalCustomers: { type: Number, default: 0, min: 0 },
      productsListed: { type: Number, default: 0, min: 0 },
      linkClicks: { type: Number, default: 0, min: 0 },
    },

    /* ---------------- risk / fraud ---------------- */
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    fraudFlags: [
      {
        type: {
          type: String,
          enum: [
            "self_referral",
            "duplicate_payout",
            "high_cancellation",
            "velocity",
            "duplicate_device",
            "manual",
          ],
        },
        note: String,
        severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
        flaggedAt: { type: Date, default: Date.now },
        resolved: { type: Boolean, default: false },
      },
    ],

    lastActiveAt: Date,
  },
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/* Indexes — every admin list / leaderboard query is covered.                  */
/* -------------------------------------------------------------------------- */
resellerSchema.index({ status: 1, createdAt: -1 });
resellerSchema.index({ "stats.lifetimeEarnings": -1 });
resellerSchema.index({ "stats.totalSales": -1 });
resellerSchema.index({ riskScore: -1, status: 1 });
resellerSchema.index({ storeName: "text", resellerCode: "text" });

/** Generates a short, human-friendly, collision-checked code. */
const randomCode = (prefix, length = 6) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let out = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `${prefix}${out}`;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

resellerSchema.pre("validate", async function (next) {
  try {
    const Model = this.constructor;

    if (!this.resellerCode) {
      let code;
      // Retry on the astronomically unlikely collision.
      /* eslint-disable no-await-in-loop */
      do {
        code = randomCode("TR");
      } while (await Model.exists({ resellerCode: code }));
      /* eslint-enable no-await-in-loop */
      this.resellerCode = code;
    }

    if (!this.referralCode) {
      let code;
      /* eslint-disable no-await-in-loop */
      do {
        code = randomCode("REF");
      } while (await Model.exists({ referralCode: code }));
      /* eslint-enable no-await-in-loop */
      this.referralCode = code;
    }

    if (!this.storeSlug && this.storeName) {
      const base = slugify(this.storeName) || "store";
      let slug = base;
      let n = 1;
      /* eslint-disable no-await-in-loop */
      while (await Model.exists({ storeSlug: slug, _id: { $ne: this._id } })) {
        slug = `${base}-${n}`;
        n += 1;
      }
      /* eslint-enable no-await-in-loop */
      this.storeSlug = slug;
    }

    next();
  } catch (err) {
    next(err);
  }
});

resellerSchema.virtual("isActive").get(function () {
  return this.status === "approved";
});

resellerSchema.set("toJSON", { virtuals: true });
resellerSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Reseller", resellerSchema);

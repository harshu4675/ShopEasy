const mongoose = require("mongoose");
const crypto = require("crypto");

/** Newsletter mailing list. */
const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
      index: true,
    },

    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed",
      index: true,
    },

    /** Where the signup came from (footer, popup, checkout…). */
    source: { type: String, default: "footer", trim: true },

    /** Set when a logged-in user subscribes. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    /** Opaque token used by one-click unsubscribe links. */
    unsubscribeToken: { type: String, index: true },

    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: Date,
  },
  { timestamps: true },
);

newsletterSubscriberSchema.pre("validate", function (next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(24).toString("hex");
  }
  next();
});

module.exports = mongoose.model(
  "NewsletterSubscriber",
  newsletterSubscriberSchema,
);

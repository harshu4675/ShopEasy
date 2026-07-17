const mongoose = require("mongoose");
const crypto = require("crypto");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["register", "reset-password"],
      required: true,
    },
    userData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

otpSchema.statics.hashOTP = function (otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

otpSchema.statics.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

otpSchema.methods.verifyOTP = function (otp) {
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  return this.otpHash === hashed;
};

otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model("OTP", otpSchema);

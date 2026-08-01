const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  size: String,
  color: String,
  image: String,

  /* --- Reseller attribution (optional; absent on ordinary orders) --- */
  resellerProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ResellerProduct",
  },
  /** Catalogue price at order time — the reseller margin is price - basePrice. */
  basePrice: Number,
});

const deliveryUpdateSchema = new mongoose.Schema({
  status: String,
  location: String,
  description: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const refundBankDetailsSchema = new mongoose.Schema({
  accountHolderName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  ifscCode: {
    type: String,
    required: true,
  },
  bankName: String,
  upiId: String,
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["COD", "Razorpay", "UPI", "Card"],
    },

    razorpayPaymentId: String,
    razorpayOrderId: String,

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refund Requested", "Refunded"],
      default: "Pending",
    },

    orderStatus: {
      type: String,
      enum: [
        "Placed",
        "Confirmed",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Placed",
    },
    refundDetails: {
      bankDetails: refundBankDetailsSchema,
      refundAmount: Number,
      refundInitiatedAt: Date,
      refundCompletedAt: Date,
      refundTransactionId: String,
      refundNotes: String,
      paymentMethod: {
        type: String,
        enum: ["Bank Transfer", "UPI", "Wallet", "Original Payment", "Other"],
      },
      paymentProofUrl: String,
      paymentProofPublicId: String,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      additionalDetails: String,
    },

    deliveryUpdates: [deliveryUpdateSchema],
    expectedDelivery: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    couponApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },

    /* ---------------- Reseller attribution ---------------- */
    /**
     * Set when the order originated from a reseller's shared link or store.
     * Nullable and indexed sparsely, so existing orders and normal storefront
     * orders are completely unaffected.
     */
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      index: true,
    },
    resellerCode: String,
    /** Sum of reseller markup across items, computed at order creation. */
    resellerMargin: { type: Number, default: 0, min: 0 },
    /** Guard so commission is credited exactly once per order. */
    commissionProcessed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

/* Reseller dashboards filter by reseller + status + recency. */
orderSchema.index({ reseller: 1, createdAt: -1 });
orderSchema.index({ reseller: 1, orderStatus: 1, createdAt: -1 });
/* Speeds up "my orders" and the admin order queue. */
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderId = `SE${Date.now()}${(count + 1).toString().padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);

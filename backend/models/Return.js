const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema({
  returnId: {
    type: String,
    unique: true,
    sparse: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      name: String,
      price: Number,
      quantity: Number,
      size: String,
      color: String,
      image: String,
      reason: {
        type: String,
        required: true,
      },
    },
  ],
  returnReason: {
    type: String,
    required: true,
    enum: [
      "Defective Product",
      "Wrong Item Received",
      "Not as Described",
      "Size/Fit Issue",
      "Changed Mind",
      "Better Price Available",
      "Other",
    ],
  },
  additionalComments: String,
  images: [String],
  returnStatus: {
    type: String,
    enum: [
      "Pending",
      "Approved",
      "Rejected",
      "Pickup Scheduled",
      "Item Received",
      "Refund Processing",
      "Refund Completed",
    ],
    default: "Pending",
  },
  refundAmount: {
    type: Number,
    required: true,
  },
  refundMethod: {
    type: String,
    enum: ["Original Payment Method", "Bank Transfer", "Store Credit"],
    default: "Original Payment Method",
  },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
  },
  adminNotes: String,
  rejectionReason: String,
  pickupAddress: {
    fullName: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
  },
  timeline: [
    {
      status: String,
      description: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

returnSchema.pre("validate", async function (next) {
  if (!this.returnId) {
    const count = await mongoose.model("Return").countDocuments();
    this.returnId = `RET${Date.now()}${(count + 1).toString().padStart(4, "0")}`;
  }
  next();
});

// Update timeline on status change
returnSchema.pre("validate", function (next) {
  if (this.isModified("returnStatus")) {
    this.timeline.push({
      status: this.returnStatus,
      description: `Return status updated to ${this.returnStatus}`,
      timestamp: new Date(),
    });
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Return", returnSchema);

const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    buttonText: {
      type: String,
      trim: true,
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "/products",
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    mediaType: {
      type: String,
      enum: ["image", "gif"],
      default: "image",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    textPosition: {
      type: String,
      enum: ["left", "center", "right"],
      default: "left",
    },
    textColor: {
      type: String,
      default: "#ffffff",
    },
    overlayOpacity: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.35,
    },
  },
  { timestamps: true },
);

bannerSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model("Banner", bannerSchema);

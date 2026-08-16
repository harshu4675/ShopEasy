const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Men's Clothing",
      "Women's Clothing",
      "Kids' Clothing",
      "Perfumes",
      "Watches",
      "Sunglasses",
      "Bags & Wallets",
      "Jewelry",
      "Footwear",
      "Accessories",
    ],
  },
  subCategory: {
    type: String,
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
  },
  sizes: [
    {
      type: String,
      enum: [
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "XXL",
        "Free Size",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ],
    },
  ],
  colors: [
    {
      name: String,
      code: String,
    },
  ],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  tags: [String],

  salesCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  trendingOrder: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/*
 * Indexes are shaped around the queries in routes/products.js. The listing
 * endpoint filters on category/subCategory/price/sizes and sorts by one of
 * createdAt, price, rating or discount; without these, every homepage request
 * ran a full collection scan followed by an in-memory sort.
 */
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ subCategory: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ discount: -1 });
productSchema.index({ sizes: 1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ isTrending: 1, trendingOrder: 1 });

/*
 * Text index for keyword search. Weighted so a name match outranks a hit in
 * the description, and it replaces the previous four-field $regex $or, which
 * could not use an index at all.
 */
productSchema.index(
  { name: "text", brand: "text", subCategory: "text", description: "text" },
  {
    weights: { name: 10, brand: 5, subCategory: 3, description: 1 },
    name: "product_search",
  },
);

module.exports = mongoose.model("Product", productSchema);

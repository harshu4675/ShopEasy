const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const pinned = await Product.find({ isTrending: true })
      .sort({ trendingOrder: 1, salesCount: -1 })
      .limit(limit);

    let combined = [...pinned];

    if (pinned.length < limit) {
      const remaining = limit - pinned.length;
      const pinnedIds = pinned.map((p) => p._id);

      const bestSellers = await Product.find({
        _id: { $nin: pinnedIds },
        stock: { $gt: 0 },
        salesCount: { $gt: 0 },
      })
        .sort({ salesCount: -1, rating: -1 })
        .limit(remaining);

      combined = [...combined, ...bestSellers];

      if (combined.length < limit) {
        const finalRemaining = limit - combined.length;
        const existingIds = combined.map((p) => p._id);

        const fallback = await Product.find({
          _id: { $nin: existingIds },
          stock: { $gt: 0 },
        })
          .sort({ rating: -1, numReviews: -1, createdAt: -1 })
          .limit(finalRemaining);

        combined = [...combined, ...fallback];
      }
    }

    res.json(combined);
  } catch (error) {
    console.error("Error fetching trending products:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/best-sellers", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 30;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const bestSellersAgg = await Order.aggregate([
      {
        $match: {
          orderStatus: "Delivered",
          deliveredAt: { $gte: dateThreshold },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          revenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]);

    const productIds = bestSellersAgg.map((b) => b._id);
    const products = await Product.find({ _id: { $in: productIds } });

    const result = bestSellersAgg
      .map((b) => {
        const product = products.find(
          (p) => p._id.toString() === b._id.toString(),
        );
        if (!product) return null;
        return {
          ...product.toObject(),
          soldInPeriod: b.totalSold,
          revenueInPeriod: b.revenue,
        };
      })
      .filter(Boolean);

    res.json(result);
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/admin/all", auth, admin, async (req, res) => {
  try {
    const trending = await Product.find({ isTrending: true }).sort({
      trendingOrder: 1,
    });

    const bestSellers = await Product.find({
      isTrending: false,
      salesCount: { $gt: 0 },
    })
      .sort({ salesCount: -1 })
      .limit(20);

    res.json({
      pinned: trending,
      bestSellers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:productId/toggle", auth, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isTrending = !product.isTrending;

    if (product.isTrending) {
      const maxOrder = await Product.findOne({ isTrending: true }).sort({
        trendingOrder: -1,
      });
      product.trendingOrder = maxOrder ? maxOrder.trendingOrder + 1 : 0;
    } else {
      product.trendingOrder = 0;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/reorder", auth, admin, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res
        .status(400)
        .json({ message: "orders must be an array of { id, order }" });
    }

    await Promise.all(
      orders.map(({ id, order }) =>
        Product.findByIdAndUpdate(id, { trendingOrder: Number(order) }),
      ),
    );

    const trending = await Product.find({ isTrending: true }).sort({
      trendingOrder: 1,
    });
    res.json(trending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/recalculate-sales", auth, admin, async (req, res) => {
  try {
    const salesAgg = await Order.aggregate([
      { $match: { orderStatus: "Delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
        },
      },
    ]);

    await Product.updateMany({}, { salesCount: 0 });

    await Promise.all(
      salesAgg.map(({ _id, totalSold }) =>
        Product.findByIdAndUpdate(_id, { salesCount: totalSold }),
      ),
    );

    res.json({
      message: "Sales count recalculated successfully",
      updated: salesAgg.length,
    });
  } catch (error) {
    console.error("Error recalculating sales:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

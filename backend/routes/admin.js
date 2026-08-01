const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// Get all users
router.get("/users", auth, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders
router.get("/orders", auth, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status
router.put("/orders/:id/status", auth, admin, async (req, res) => {
  try {
    const { orderStatus, paymentStatus, location, description } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;

      // Add delivery update
      order.deliveryUpdates.push({
        status: orderStatus,
        location: location || "",
        description: description || `Order ${orderStatus.toLowerCase()}`,
        timestamp: new Date(),
      });

      if (orderStatus === "Delivered") {
        order.deliveredAt = new Date();
        if (order.paymentMethod === "COD") {
          order.paymentStatus = "Paid";
        }
      }

      // Create notification for user
      await Notification.create({
        user: order.user,
        type: "delivery",
        title: `Order ${orderStatus}`,
        message: `Your order #${order.orderId} is now ${orderStatus.toLowerCase()}`,
        orderId: order._id,
      });
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add delivery update
router.post("/orders/:id/delivery-update", auth, admin, async (req, res) => {
  try {
    const { status, location, description } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.deliveryUpdates.push({
      status,
      location,
      description,
      timestamp: new Date(),
    });

    await order.save();

    // Create notification
    await Notification.create({
      user: order.user,
      type: "delivery",
      title: "Delivery Update",
      message: `${status}${location ? " - " + location : ""}: ${description}`,
      orderId: order._id,
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dashboard stats - UPDATED WITH REFUND STATS
router.get("/dashboard", auth, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.paymentStatus === "Paid" || order.orderStatus === "Delivered") {
        return sum + order.totalAmount;
      }
      return sum;
    }, 0);

    const pendingOrders = await Order.countDocuments({ orderStatus: "Placed" });
    const processingOrders = await Order.countDocuments({
      orderStatus: {
        $in: ["Confirmed", "Processing", "Shipped", "Out for Delivery"],
      },
    });
    const deliveredOrders = await Order.countDocuments({
      orderStatus: "Delivered",
    });
    const cancelledOrders = await Order.countDocuments({
      orderStatus: "Cancelled",
    });

    // NEW: Refund stats
    const refundRequested = await Order.countDocuments({
      paymentStatus: "Refund Requested",
    });
    const refunded = await Order.countDocuments({
      paymentStatus: "Refunded",
    });

    const totalRefunded = await Order.aggregate([
      { $match: { paymentStatus: "Refunded" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const recentOrders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    const lowStockProducts = await Product.find({ stock: { $lte: 10 } })
      .sort({ stock: 1 })
      .limit(10);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      refundRequested, // NEW
      refunded, // NEW
      totalRefunded: totalRefunded[0]?.total || 0, // NEW
      recentOrders,
      lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send notification to user
router.post("/send-notification", auth, admin, async (req, res) => {
  try {
    const { userId, type, title, message } = req.body;

    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send notification to all users
router.post("/send-notification-all", auth, admin, async (req, res) => {
  try {
    const { type, title, message } = req.body;

    const users = await User.find({ role: "user" }).select("_id");

    const notifications = users.map((user) => ({
      user: user._id,
      type,
      title,
      message,
    }));

    await Notification.insertMany(notifications);

    res.json({ message: `Notification sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

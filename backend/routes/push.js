const express = require("express");
const router = express.Router();
const PushSubscription = require("../models/PushSubscription");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { sendPushToAllUsers } = require("../utils/pushService");

router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

router.post("/subscribe", auth, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: req.user._id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent || "",
      },
      { upsert: true, new: true },
    );

    res.json({ success: true, message: "Subscribed to push notifications" });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/unsubscribe", auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/broadcast", auth, admin, async (req, res) => {
  try {
    const { title, message, link } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message required" });
    }

    await sendPushToAllUsers({
      title,
      body: message,
      icon: "/logo192.png",
      badge: "/logo192.png",
      url: link || "/",
    });

    res.json({ success: true, message: "Broadcast sent" });
  } catch (error) {
    console.error("Broadcast error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

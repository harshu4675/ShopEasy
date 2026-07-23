const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      forAdmin: false,
    })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      forAdmin: false,
      isRead: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/admin", auth, admin, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      forAdmin: true,
    })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/admin/unread-count", auth, admin, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      forAdmin: true,
      isRead: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/admin/read-all", auth, admin, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, forAdmin: true, isRead: false },
      { isRead: true },
    );
    res.json({ message: "All admin notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, forAdmin: false, isRead: false },
      { isRead: true },
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

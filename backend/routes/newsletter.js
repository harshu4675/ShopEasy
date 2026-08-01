const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");

const router = express.Router();

const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const { validate } = require("../middleware/validate");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { parsePagination, paginated } = require("../middleware/validate");

/** Signup is unauthenticated, so it needs its own tight limit. */
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many subscription attempts. Please try again later.",
  },
});

/** POST /api/newsletter/subscribe */
router.post(
  "/subscribe",
  subscribeLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail()
      .isLength({ max: 254 }),
    body("source").optional().trim().isLength({ max: 40 }).escape(),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, source = "footer" } = req.body;

      const existing = await NewsletterSubscriber.findOne({ email });

      if (existing) {
        if (existing.status === "subscribed") {
          // Idempotent + doesn't leak whether the address is already on the list.
          return res.json({
            success: true,
            message: "You're already subscribed. Thanks for being with us!",
          });
        }
        existing.status = "subscribed";
        existing.subscribedAt = new Date();
        existing.unsubscribedAt = undefined;
        existing.source = source;
        await existing.save();

        return res.json({
          success: true,
          message: "Welcome back! You're subscribed again.",
        });
      }

      await NewsletterSubscriber.create({ email, source });

      res.status(201).json({
        success: true,
        message: "You're subscribed! Watch your inbox for new drops.",
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.json({ success: true, message: "You're already subscribed." });
      }
      console.error("Newsletter subscribe error:", error);
      res.status(500).json({ success: false, message: "Unable to subscribe right now" });
    }
  },
);

/** POST /api/newsletter/unsubscribe */
router.post(
  "/unsubscribe",
  subscribeLimiter,
  [body("email").isEmail().normalizeEmail()],
  validate,
  async (req, res) => {
    try {
      await NewsletterSubscriber.findOneAndUpdate(
        { email: req.body.email },
        { $set: { status: "unsubscribed", unsubscribedAt: new Date() } },
      );
      // Always the same response — never reveals list membership.
      res.json({ success: true, message: "You've been unsubscribed." });
    } catch (error) {
      console.error("Newsletter unsubscribe error:", error);
      res.status(500).json({ success: false, message: "Unable to unsubscribe" });
    }
  },
);

/** GET /api/newsletter/subscribers — admin only. */
router.get("/subscribers", auth, admin, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      NewsletterSubscriber.find(filter)
        .select("-unsubscribeToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NewsletterSubscriber.countDocuments(filter),
    ]);

    res.json(paginated(items, total, { page, limit }));
  } catch (error) {
    console.error("Newsletter list error:", error);
    res.status(500).json({ success: false, message: "Unable to load subscribers" });
  }
});

module.exports = router;

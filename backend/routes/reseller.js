const express = require("express");
const { body, query, param } = require("express-validator");

const router = express.Router();

const Reseller = require("../models/Reseller");
const ResellerProduct = require("../models/ResellerProduct");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Commission = require("../models/Commission");
const Withdrawal = require("../models/Withdrawal");
const Referral = require("../models/Referral");
const ResellerAnalytics = require("../models/ResellerAnalytics");
const User = require("../models/User");

const auth = require("../middleware/auth");
const { requireReseller, attachReseller } = require("../middleware/reseller");
const {
  validate,
  parsePagination,
  paginated,
  buildSort,
} = require("../middleware/validate");
const resellerService = require("../services/resellerService");
const walletService = require("../services/walletService");
const { settleMaturedForReseller } = require("../services/commissionMaturity");

const APP_URL = process.env.APP_URL || "https://talishclothes.netlify.app";

/* ========================================================================== *
 * PUBLIC — shareable storefront (no auth)
 * ========================================================================== */

/**
 * GET /api/reseller/public/:slug
 * Resolves a shared product link. Also records the click for conversion stats.
 */
router.get(
  "/public/:slug",
  param("slug").isString().trim().isLength({ min: 4, max: 64 }),
  validate,
  async (req, res) => {
    try {
      const listing = await ResellerProduct.findOne({
        shareSlug: req.params.slug.toLowerCase(),
        isActive: true,
      })
        .populate("product")
        .populate({
          path: "reseller",
          select: "storeName storeSlug storeLogo bio resellerCode status whatsappNumber",
        });

      if (!listing || !listing.product || listing.reseller?.status !== "approved") {
        return res
          .status(404)
          .json({ success: false, message: "This product link is no longer available" });
      }

      // Non-blocking analytics.
      resellerService
        .trackClick(listing.reseller._id, listing._id)
        .catch(() => {});

      const product = listing.product.toObject();

      res.json({
        success: true,
        data: {
          // Buyer-facing price is the reseller's price, not the catalogue price.
          product: { ...product, price: listing.sellingPrice, originalPrice: product.originalPrice || product.price },
          listing: {
            _id: listing._id,
            shareSlug: listing.shareSlug,
            sellingPrice: listing.sellingPrice,
            customTitle: listing.customTitle,
            customDescription: listing.customDescription,
          },
          store: listing.reseller,
        },
      });
    } catch (error) {
      console.error("Public share page error:", error);
      res.status(500).json({ success: false, message: "Unable to load product" });
    }
  },
);

/**
 * GET /api/reseller/public/store/:code
 * Full storefront listing for a reseller.
 */
router.get(
  "/public/store/:code",
  param("code").isString().trim().isLength({ min: 3, max: 32 }),
  validate,
  async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      const reseller = await Reseller.findOne({
        $or: [{ resellerCode: code }, { storeSlug: req.params.code.toLowerCase() }],
        status: "approved",
      }).select("storeName storeSlug storeLogo bio resellerCode whatsappNumber stats");

      if (!reseller) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24 });

      const [listings, total] = await Promise.all([
        ResellerProduct.find({ reseller: reseller._id, isActive: true })
          .populate("product")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ResellerProduct.countDocuments({ reseller: reseller._id, isActive: true }),
      ]);

      const items = listings
        .filter((l) => l.product)
        .map((l) => ({
          ...l.product,
          price: l.sellingPrice,
          shareSlug: l.shareSlug,
          listingId: l._id,
        }));

      resellerService.trackClick(reseller._id).catch(() => {});

      res.json({ ...paginated(items, total, { page, limit }), store: reseller });
    } catch (error) {
      console.error("Public store error:", error);
      res.status(500).json({ success: false, message: "Unable to load store" });
    }
  },
);

/* ========================================================================== *
 * ONBOARDING
 * ========================================================================== */

/**
 * POST /api/reseller/apply
 * Creates a pending reseller application for the signed-in user.
 */
router.post(
  "/apply",
  auth,
  attachReseller,
  [
    body("storeName")
      .trim()
      .isLength({ min: 3, max: 60 })
      .withMessage("Store name must be 3-60 characters"),
    body("whatsappNumber")
      .optional({ checkFalsy: true })
      .matches(/^[0-9]{10}$/)
      .withMessage("Enter a valid 10-digit WhatsApp number"),
    body("bio").optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
    body("referralCode").optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body("payout.method").optional().isIn(["UPI", "BANK"]),
    body("payout.upiId")
      .optional({ checkFalsy: true })
      .matches(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/)
      .withMessage("Enter a valid UPI ID"),
    body("payout.ifscCode")
      .optional({ checkFalsy: true })
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i)
      .withMessage("Enter a valid IFSC code"),
    body("kyc.panNumber")
      .optional({ checkFalsy: true })
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/i)
      .withMessage("Enter a valid PAN number"),
  ],
  validate,
  async (req, res) => {
    try {
      if (req.reseller) {
        return res.status(409).json({
          success: false,
          message: `You already have a reseller account (${req.reseller.status})`,
          data: { status: req.reseller.status },
        });
      }

      const { storeName, whatsappNumber, bio, referralCode, payout, kyc } = req.body;

      let referrer = null;
      if (referralCode) {
        referrer = await Reseller.findOne({
          referralCode: referralCode.toUpperCase().trim(),
          status: "approved",
        });
        if (!referrer) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid or inactive referral code" });
        }
        // Block the obvious self-referral case up front.
        if (referrer.user.toString() === req.user._id.toString()) {
          return res
            .status(400)
            .json({ success: false, message: "You cannot refer yourself" });
        }
      }

      const reseller = await Reseller.create({
        user: req.user._id,
        storeName: storeName.trim(),
        whatsappNumber,
        bio,
        payout,
        kyc,
        referredBy: referrer?._id,
        status: "pending",
      });

      await walletService.getOrCreateWallet(reseller._id, req.user._id);

      if (referrer) {
        await Referral.create({
          referrer: referrer._id,
          referee: reseller._id,
          referralCode: referrer.referralCode,
          commissionRate: referrer.referralCommissionRate,
          status: "pending",
          signupIp: req.ip,
          signupUserAgent: req.headers["user-agent"],
        });
        await Reseller.findByIdAndUpdate(referrer._id, {
          $inc: { referralCount: 1 },
        });
      }

      await User.findByIdAndUpdate(req.user._id, {
        $set: { resellerProfile: reseller._id },
      });

      resellerService.evaluateFraudSignals(reseller._id).catch(() => {});

      res.status(201).json({
        success: true,
        message: "Application submitted. We'll review it shortly.",
        data: reseller,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ success: false, message: "A reseller account already exists for you" });
      }
      console.error("Reseller apply error:", error);
      res.status(500).json({ success: false, message: "Unable to submit application" });
    }
  },
);

/** GET /api/reseller/me — profile + onboarding status. */
router.get("/me", auth, attachReseller, async (req, res) => {
  try {
    if (!req.reseller) {
      return res.json({ success: true, data: null, isReseller: false });
    }

    const wallet = await walletService.getOrCreateWallet(
      req.reseller._id,
      req.user._id,
    );

    res.json({
      success: true,
      isReseller: true,
      data: {
        ...req.reseller.toObject(),
        wallet: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          lockedBalance: wallet.lockedBalance,
          lifetimeEarnings: wallet.lifetimeEarnings,
        },
        shareBaseUrl: `${APP_URL}/store/${req.reseller.resellerCode}`,
      },
    });
  } catch (error) {
    console.error("Reseller me error:", error);
    res.status(500).json({ success: false, message: "Unable to load profile" });
  }
});

/** PUT /api/reseller/me — update store profile / payout details. */
router.put(
  "/me",
  auth,
  requireReseller,
  [
    body("storeName").optional().trim().isLength({ min: 3, max: 60 }),
    body("bio").optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
    body("whatsappNumber").optional({ checkFalsy: true }).matches(/^[0-9]{10}$/),
    body("defaultMarginPercent").optional().isFloat({ min: 0, max: 500 }),
    body("payout.upiId")
      .optional({ checkFalsy: true })
      .matches(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/),
    body("payout.ifscCode")
      .optional({ checkFalsy: true })
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i),
  ],
  validate,
  async (req, res) => {
    try {
      const allowed = [
        "storeName",
        "storeLogo",
        "bio",
        "whatsappNumber",
        "payout",
        "kyc",
        "defaultMarginPercent",
      ];
      const updates = {};
      allowed.forEach((f) => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });

      // Commission rate and margin ceiling are admin-controlled only.
      if (
        updates.defaultMarginPercent !== undefined &&
        updates.defaultMarginPercent > req.reseller.maxMarginPercent
      ) {
        return res.status(400).json({
          success: false,
          message: `Default margin cannot exceed ${req.reseller.maxMarginPercent}%`,
        });
      }

      const reseller = await Reseller.findByIdAndUpdate(
        req.reseller._id,
        { $set: updates },
        { new: true, runValidators: true },
      );

      if (updates.payout) {
        resellerService.evaluateFraudSignals(reseller._id).catch(() => {});
      }

      res.json({ success: true, message: "Profile updated", data: reseller });
    } catch (error) {
      console.error("Reseller update error:", error);
      res.status(500).json({ success: false, message: "Unable to update profile" });
    }
  },
);

/* ========================================================================== *
 * CATALOG & LISTINGS
 * ========================================================================== */

/**
 * GET /api/reseller/catalog
 * Browsable catalogue with the reseller's suggested pricing pre-computed.
 */
router.get(
  "/catalog",
  auth,
  requireReseller,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24 });
      const { search, category, minPrice, maxPrice, sort } = req.query;

      const filter = {};
      if (category) filter.category = category;
      if (search) {
        // Escape regex metacharacters to avoid ReDoS / injection via $regex.
        const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { name: { $regex: safe, $options: "i" } },
          { brand: { $regex: safe, $options: "i" } },
        ];
      }
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
      }

      const sortSpec = buildSort(
        sort,
        ["price", "createdAt", "salesCount", "rating"],
        { createdAt: -1 },
      );

      const [products, total, existing] = await Promise.all([
        Product.find(filter).sort(sortSpec).skip(skip).limit(limit).lean(),
        Product.countDocuments(filter),
        ResellerProduct.find({ reseller: req.reseller._id }).select("product").lean(),
      ]);

      const listedIds = new Set(existing.map((e) => e.product.toString()));
      const defaultMargin = req.reseller.defaultMarginPercent;

      const data = products.map((p) => ({
        ...p,
        isListed: listedIds.has(p._id.toString()),
        suggested: resellerService.computePricing(p.price, defaultMargin),
        maxMarginPercent: req.reseller.maxMarginPercent,
      }));

      res.json(paginated(data, total, { page, limit }));
    } catch (error) {
      console.error("Reseller catalog error:", error);
      res.status(500).json({ success: false, message: "Unable to load catalog" });
    }
  },
);

/** GET /api/reseller/products — the reseller's own listings. */
router.get("/products", auth, requireReseller, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { reseller: req.reseller._id };
    if (req.query.active !== undefined) filter.isActive = req.query.active === "true";

    const sortSpec = buildSort(
      req.query.sort,
      ["createdAt", "sellingPrice", "stats.unitsSold", "stats.revenue"],
      { createdAt: -1 },
    );

    const [items, total] = await Promise.all([
      ResellerProduct.find(filter)
        .populate("product", "name images category stock price rating")
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      ResellerProduct.countDocuments(filter),
    ]);

    const withLinks = items.map((i) => ({
      ...i,
      shareUrl: `${APP_URL}/s/${i.shareSlug}`,
    }));

    res.json(paginated(withLinks, total, { page, limit }));
  } catch (error) {
    console.error("Reseller products error:", error);
    res.status(500).json({ success: false, message: "Unable to load your products" });
  }
});

/** POST /api/reseller/products — list a catalogue product with a margin. */
router.post(
  "/products",
  auth,
  requireReseller,
  [
    body("productId").isMongoId().withMessage("Invalid product"),
    body("marginPercent")
      .isFloat({ min: 0, max: 500 })
      .withMessage("Margin must be between 0 and 500%"),
    body("customTitle").optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    body("customDescription")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 1000 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { productId, marginPercent, customTitle, customDescription } = req.body;

      if (marginPercent > req.reseller.maxMarginPercent) {
        return res.status(400).json({
          success: false,
          message: `Margin cannot exceed ${req.reseller.maxMarginPercent}%`,
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const pricing = resellerService.computePricing(product.price, marginPercent);

      const listing = await ResellerProduct.create({
        reseller: req.reseller._id,
        product: product._id,
        ...pricing,
        customTitle,
        customDescription,
      });

      await Reseller.findByIdAndUpdate(req.reseller._id, {
        $inc: { "stats.productsListed": 1 },
      });

      res.status(201).json({
        success: true,
        message: "Product added to your store",
        data: { ...listing.toObject(), shareUrl: `${APP_URL}/s/${listing.shareSlug}` },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ success: false, message: "This product is already in your store" });
      }
      console.error("Add reseller product error:", error);
      res.status(500).json({ success: false, message: "Unable to add product" });
    }
  },
);

/** PUT /api/reseller/products/:id — change margin / copy / visibility. */
router.put(
  "/products/:id",
  auth,
  requireReseller,
  [
    param("id").isMongoId(),
    body("marginPercent").optional().isFloat({ min: 0, max: 500 }),
    body("isActive").optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const listing = await ResellerProduct.findOne({
        _id: req.params.id,
        reseller: req.reseller._id, // ownership check
      }).populate("product", "price");

      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      const { marginPercent, customTitle, customDescription, isActive } = req.body;

      if (marginPercent !== undefined) {
        if (marginPercent > req.reseller.maxMarginPercent) {
          return res.status(400).json({
            success: false,
            message: `Margin cannot exceed ${req.reseller.maxMarginPercent}%`,
          });
        }
        // Re-snapshot the base price so pricing reflects the live catalogue.
        listing.basePrice = listing.product?.price ?? listing.basePrice;
        listing.marginPercent = marginPercent;
        listing.recalculatePricing();
      }

      if (customTitle !== undefined) listing.customTitle = customTitle;
      if (customDescription !== undefined) listing.customDescription = customDescription;
      if (isActive !== undefined) listing.isActive = isActive;

      await listing.save();

      res.json({
        success: true,
        message: "Listing updated",
        data: { ...listing.toObject(), shareUrl: `${APP_URL}/s/${listing.shareSlug}` },
      });
    } catch (error) {
      console.error("Update reseller product error:", error);
      res.status(500).json({ success: false, message: "Unable to update listing" });
    }
  },
);

/** DELETE /api/reseller/products/:id */
router.delete(
  "/products/:id",
  auth,
  requireReseller,
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    try {
      const removed = await ResellerProduct.findOneAndDelete({
        _id: req.params.id,
        reseller: req.reseller._id,
      });

      if (!removed) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      await Reseller.findByIdAndUpdate(req.reseller._id, {
        $inc: { "stats.productsListed": -1 },
      });

      res.json({ success: true, message: "Product removed from your store" });
    } catch (error) {
      console.error("Delete reseller product error:", error);
      res.status(500).json({ success: false, message: "Unable to remove product" });
    }
  },
);

/**
 * GET /api/reseller/products/:id/share
 * Ready-to-use share URLs for every supported channel.
 */
router.get(
  "/products/:id/share",
  auth,
  requireReseller,
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    try {
      const listing = await ResellerProduct.findOne({
        _id: req.params.id,
        reseller: req.reseller._id,
      }).populate("product", "name images");

      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      const url = `${APP_URL}/s/${listing.shareSlug}?ref=${req.reseller.resellerCode}`;
      const title = listing.customTitle || listing.product?.name || "Check this out";
      const text = `${title} — only ₹${listing.sellingPrice}! Shop now:`;
      const encodedUrl = encodeURIComponent(url);
      const encodedText = encodeURIComponent(text);

      listing.lastSharedAt = new Date();
      await listing.save();

      res.json({
        success: true,
        data: {
          url,
          title,
          text,
          image: listing.product?.images?.[0],
          price: listing.sellingPrice,
          channels: {
            whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
            // Instagram has no web share intent — the client copies the caption
            // and opens the app instead.
            instagram: {
              copyText: `${text} ${url}`,
              deepLink: "https://www.instagram.com/",
            },
            email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%20${encodedUrl}`,
            copy: url,
          },
        },
      });
    } catch (error) {
      console.error("Share links error:", error);
      res.status(500).json({ success: false, message: "Unable to generate share links" });
    }
  },
);

/* ========================================================================== *
 * ORDERS
 * ========================================================================== */

/** GET /api/reseller/orders — orders attributed to this reseller. */
router.get(
  "/orders",
  auth,
  requireReseller,
  query("status").optional().isString(),
  validate,
  async (req, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const filter = { reseller: req.reseller._id };

      // Maps the reseller-facing vocabulary onto the storefront statuses.
      const STATUS_MAP = {
        pending: ["Placed"],
        confirmed: ["Confirmed"],
        packed: ["Processing"],
        shipped: ["Shipped", "Out for Delivery"],
        delivered: ["Delivered"],
        cancelled: ["Cancelled"],
        returned: ["Returned"],
      };

      const { status } = req.query;
      if (status && status !== "all") {
        const mapped = STATUS_MAP[String(status).toLowerCase()];
        filter.orderStatus = mapped ? { $in: mapped } : status;
      }

      const [orders, total, commissions] = await Promise.all([
        Order.find(filter)
          .select(
            "orderId items totalAmount orderStatus paymentStatus paymentMethod shippingAddress.fullName shippingAddress.city createdAt deliveredAt resellerMargin",
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(filter),
        Commission.find({ reseller: req.reseller._id })
          .select("order netCommission status grossMargin platformFee")
          .lean(),
      ]);

      const byOrder = new Map(commissions.map((c) => [c.order.toString(), c]));

      const data = orders.map((o) => ({
        ...o,
        commission: byOrder.get(o._id.toString()) || null,
      }));

      res.json(paginated(data, total, { page, limit }));
    } catch (error) {
      console.error("Reseller orders error:", error);
      res.status(500).json({ success: false, message: "Unable to load orders" });
    }
  },
);

/** GET /api/reseller/orders/:id */
router.get(
  "/orders/:id",
  auth,
  requireReseller,
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        reseller: req.reseller._id,
      }).lean();

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const commission = await Commission.findOne({
        reseller: req.reseller._id,
        order: order._id,
      }).lean();

      res.json({ success: true, data: { ...order, commission } });
    } catch (error) {
      console.error("Reseller order detail error:", error);
      res.status(500).json({ success: false, message: "Unable to load order" });
    }
  },
);

/* ========================================================================== *
 * WALLET & WITHDRAWALS
 * ========================================================================== */

/** GET /api/reseller/wallet — balances plus today's / this month's earnings. */
router.get("/wallet", auth, requireReseller, async (req, res) => {
  try {
    // Release anything whose return window closed since the last sweep, so the
    // balance shown is always current even if the process was idle.
    await settleMaturedForReseller(req.reseller._id).catch(() => {});

    const wallet = await walletService.getOrCreateWallet(
      req.reseller._id,
      req.user._id,
    );

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      1,
    );

    const [todayAgg, monthAgg, pendingWithdrawals] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            reseller: req.reseller._id,
            direction: "credit",
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            reseller: req.reseller._id,
            direction: "credit",
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Withdrawal.countDocuments({
        reseller: req.reseller._id,
        status: { $in: ["pending", "approved", "processing"] },
      }),
    ]);

    res.json({
      success: true,
      data: {
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        lockedBalance: wallet.lockedBalance,
        lifetimeEarnings: wallet.lifetimeEarnings,
        totalWithdrawn: wallet.totalWithdrawn,
        todayEarnings: todayAgg[0]?.total || 0,
        monthEarnings: monthAgg[0]?.total || 0,
        pendingWithdrawals,
        currency: wallet.currency,
        minWithdrawal: 100,
      },
    });
  } catch (error) {
    console.error("Wallet error:", error);
    res.status(500).json({ success: false, message: "Unable to load wallet" });
  }
});

/** GET /api/reseller/wallet/transactions — paginated ledger. */
router.get("/wallet/transactions", auth, requireReseller, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { reseller: req.reseller._id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json(paginated(items, total, { page, limit }));
  } catch (error) {
    console.error("Transactions error:", error);
    res.status(500).json({ success: false, message: "Unable to load transactions" });
  }
});

/** POST /api/reseller/withdrawals — request a payout. */
router.post(
  "/withdrawals",
  auth,
  requireReseller,
  [
    body("amount").isFloat({ min: 100 }).withMessage("Minimum withdrawal is Rs.100"),
    body("method").isIn(["UPI", "BANK"]).withMessage("Choose UPI or Bank Transfer"),
    body("upiId")
      .if(body("method").equals("UPI"))
      .matches(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/)
      .withMessage("Enter a valid UPI ID"),
    body("accountNumber")
      .if(body("method").equals("BANK"))
      .isLength({ min: 6, max: 20 })
      .withMessage("Enter a valid account number"),
    body("ifscCode")
      .if(body("method").equals("BANK"))
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i)
      .withMessage("Enter a valid IFSC code"),
  ],
  validate,
  async (req, res) => {
    try {
      const { amount, method, upiId, accountHolderName, accountNumber, ifscCode, bankName } =
        req.body;

      // One open request at a time keeps the payout queue unambiguous.
      const open = await Withdrawal.findOne({
        reseller: req.reseller._id,
        status: { $in: ["pending", "approved", "processing"] },
      });
      if (open) {
        return res.status(409).json({
          success: false,
          message: "You already have a withdrawal in progress",
        });
      }

      const wallet = await walletService.getOrCreateWallet(
        req.reseller._id,
        req.user._id,
      );

      if (wallet.availableBalance < amount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Available: ₹${wallet.availableBalance}`,
        });
      }

      // Locks the funds atomically; throws if another request beat us to it.
      await walletService.lockForWithdrawal({
        resellerId: req.reseller._id,
        amount,
      });

      let withdrawal;
      try {
        withdrawal = await Withdrawal.create({
          reseller: req.reseller._id,
          wallet: wallet._id,
          user: req.user._id,
          amount,
          fee: 0,
          netAmount: amount,
          method,
          payoutDetails:
            method === "UPI"
              ? { upiId }
              : { accountHolderName, accountNumber, ifscCode, bankName },
        });
      } catch (createError) {
        // Never strand locked funds if the record could not be written.
        await walletService.unlockWithdrawal({
          resellerId: req.reseller._id,
          amount,
        });
        throw createError;
      }

      res.status(201).json({
        success: true,
        message: "Withdrawal requested. We'll process it within 3 working days.",
        data: withdrawal,
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("Withdrawal request error:", error);
      res.status(500).json({ success: false, message: "Unable to request withdrawal" });
    }
  },
);

/** GET /api/reseller/withdrawals — withdrawal history. */
router.get("/withdrawals", auth, requireReseller, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { reseller: req.reseller._id };
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      Withdrawal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Withdrawal.countDocuments(filter),
    ]);

    res.json(paginated(items, total, { page, limit }));
  } catch (error) {
    console.error("Withdrawals error:", error);
    res.status(500).json({ success: false, message: "Unable to load withdrawals" });
  }
});

/** DELETE /api/reseller/withdrawals/:id — cancel a request that's still pending. */
router.delete(
  "/withdrawals/:id",
  auth,
  requireReseller,
  param("id").isMongoId(),
  validate,
  async (req, res) => {
    try {
      // Claim the cancellation atomically: only a still-pending request can be
      // transitioned, so this can never race an admin approval into a double
      // unlock of the same funds.
      const withdrawal = await Withdrawal.findOneAndUpdate(
        {
          _id: req.params.id,
          reseller: req.reseller._id,
          status: "pending",
        },
        { $set: { status: "cancelled" } },
        { new: true },
      );

      if (!withdrawal) {
        const exists = await Withdrawal.exists({
          _id: req.params.id,
          reseller: req.reseller._id,
        });
        return res.status(exists ? 400 : 404).json({
          success: false,
          message: exists
            ? "This withdrawal can no longer be cancelled"
            : "Withdrawal not found",
        });
      }

      await walletService.unlockWithdrawal({
        resellerId: req.reseller._id,
        amount: withdrawal.amount,
      });

      res.json({ success: true, message: "Withdrawal cancelled", data: withdrawal });
    } catch (error) {
      console.error("Cancel withdrawal error:", error);
      res.status(500).json({ success: false, message: "Unable to cancel withdrawal" });
    }
  },
);

/* ========================================================================== *
 * ANALYTICS, COMMISSIONS, REFERRALS, CUSTOMERS
 * ========================================================================== */

/** GET /api/reseller/analytics?days=30 — chart series + top lists. */
router.get(
  "/analytics",
  auth,
  requireReseller,
  query("days").optional().isInt({ min: 1, max: 365 }),
  validate,
  async (req, res) => {
    try {
      const days = Number(req.query.days) || 30;
      const since = ResellerAnalytics.dayKey(Date.now() - days * 86400000);

      const [series, topProducts, topCustomers, monthly] = await Promise.all([
        ResellerAnalytics.find({ reseller: req.reseller._id, date: { $gte: since } })
          .sort({ date: 1 })
          .lean(),

        ResellerProduct.find({ reseller: req.reseller._id })
          .sort({ "stats.unitsSold": -1 })
          .limit(10)
          .populate("product", "name images")
          .select("stats sellingPrice product")
          .lean(),

        Order.aggregate([
          { $match: { reseller: req.reseller._id } },
          {
            $group: {
              _id: "$user",
              orders: { $sum: 1 },
              spent: { $sum: "$totalAmount" },
              lastOrder: { $max: "$createdAt" },
            },
          },
          { $sort: { spent: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              orders: 1,
              spent: 1,
              lastOrder: 1,
              name: "$user.name",
              // Never expose full contact details of a shared customer.
              phone: {
                $concat: [
                  "******",
                  { $substrCP: [{ $ifNull: ["$user.phone", "0000000000"] }, 6, 4] },
                ],
              },
            },
          },
        ]),

        Commission.aggregate([
          {
            $match: {
              reseller: req.reseller._id,
              status: { $in: ["approved", "paid"] },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              earnings: { $sum: "$netCommission" },
              orders: { $sum: 1 },
              revenue: { $sum: "$sellingAmount" },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
          { $limit: 12 },
        ]),
      ]);

      const totals = series.reduce(
        (acc, d) => ({
          clicks: acc.clicks + d.clicks,
          orders: acc.orders + d.orders,
          revenue: acc.revenue + d.revenue,
          earnings: acc.earnings + d.earnings,
          unitsSold: acc.unitsSold + d.unitsSold,
        }),
        { clicks: 0, orders: 0, revenue: 0, earnings: 0, unitsSold: 0 },
      );

      res.json({
        success: true,
        data: {
          range: { days, since },
          totals: {
            ...totals,
            conversionRate: totals.clicks
              ? Math.round((totals.orders / totals.clicks) * 10000) / 100
              : 0,
            averageOrderValue: totals.orders
              ? Math.round((totals.revenue / totals.orders) * 100) / 100
              : 0,
          },
          series,
          topProducts,
          topCustomers,
          monthly: monthly.map((m) => ({
            year: m._id.year,
            month: m._id.month,
            earnings: m.earnings,
            orders: m.orders,
            revenue: m.revenue,
          })),
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ success: false, message: "Unable to load analytics" });
    }
  },
);

/** GET /api/reseller/commissions — commission history with a totals summary. */
router.get("/commissions", auth, requireReseller, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { reseller: req.reseller._id };
    if (req.query.status) filter.status = req.query.status;

    const [items, total, summary] = await Promise.all([
      Commission.find(filter)
        .populate("order", "orderId orderStatus createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Commission.countDocuments(filter),
      Commission.aggregate([
        { $match: { reseller: req.reseller._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$netCommission" },
          },
        },
      ]),
    ]);

    res.json({
      ...paginated(items, total, { page, limit }),
      summary: summary.reduce(
        (acc, s) => ({ ...acc, [s._id]: { count: s.count, amount: s.amount } }),
        {},
      ),
    });
  } catch (error) {
    console.error("Commissions error:", error);
    res.status(500).json({ success: false, message: "Unable to load commissions" });
  }
});

/** GET /api/reseller/referrals — referral network + earnings. */
router.get("/referrals", auth, requireReseller, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [items, total, earnings] = await Promise.all([
      Referral.find({ referrer: req.reseller._id })
        .populate("referee", "storeName resellerCode status stats.totalSales createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments({ referrer: req.reseller._id }),
      Transaction.aggregate([
        {
          $match: {
            reseller: req.reseller._id,
            type: "referral",
            direction: "credit",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      ...paginated(items, total, { page, limit }),
      summary: {
        referralCode: req.reseller.referralCode,
        shareUrl: `${APP_URL}/reseller/apply?ref=${req.reseller.referralCode}`,
        totalReferrals: total,
        activeReferrals: items.filter((i) => i.status === "active").length,
        totalEarnings: earnings[0]?.total || 0,
        commissionRate: req.reseller.referralCommissionRate,
      },
    });
  } catch (error) {
    console.error("Referrals error:", error);
    res.status(500).json({ success: false, message: "Unable to load referrals" });
  }
});

/** GET /api/reseller/customers — customers acquired through this reseller. */
router.get("/customers", auth, requireReseller, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const pipeline = [
      { $match: { reseller: req.reseller._id } },
      {
        $group: {
          _id: "$user",
          orders: { $sum: 1 },
          spent: { $sum: "$totalAmount" },
          firstOrder: { $min: "$createdAt" },
          lastOrder: { $max: "$createdAt" },
          delivered: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "Delivered"] }, 1, 0] },
          },
        },
      },
      { $sort: { lastOrder: -1 } },
    ];

    const [rows, countRows] = await Promise.all([
      Order.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            orders: 1,
            spent: 1,
            firstOrder: 1,
            lastOrder: 1,
            delivered: 1,
            name: "$user.name",
            // Masked: a reseller sees enough to recognise a repeat buyer,
            // not enough to exfiltrate the customer list.
            phone: {
              $concat: [
                "******",
                { $substrCP: [{ $ifNull: ["$user.phone", "0000000000"] }, 6, 4] },
              ],
            },
          },
        },
      ]),
      Order.aggregate([...pipeline, { $count: "total" }]),
    ]);

    res.json(paginated(rows, countRows[0]?.total || 0, { page, limit }));
  } catch (error) {
    console.error("Customers error:", error);
    res.status(500).json({ success: false, message: "Unable to load customers" });
  }
});

/** GET /api/reseller/reports/export — CSV export of orders or commissions. */
router.get(
  "/reports/export",
  auth,
  requireReseller,
  query("type").optional().isIn(["orders", "commissions", "transactions"]),
  validate,
  async (req, res) => {
    try {
      const type = req.query.type || "commissions";
      let rows = [];
      let headers = [];

      if (type === "orders") {
        headers = ["Order ID", "Date", "Status", "Amount", "Margin"];
        const orders = await Order.find({ reseller: req.reseller._id })
          .select("orderId createdAt orderStatus totalAmount resellerMargin")
          .sort({ createdAt: -1 })
          .limit(5000)
          .lean();
        rows = orders.map((o) => [
          o.orderId,
          new Date(o.createdAt).toISOString().slice(0, 10),
          o.orderStatus,
          o.totalAmount,
          o.resellerMargin || 0,
        ]);
      } else if (type === "transactions") {
        headers = ["Date", "Type", "Direction", "Amount", "Status", "Description"];
        const txns = await Transaction.find({ reseller: req.reseller._id })
          .sort({ createdAt: -1 })
          .limit(5000)
          .lean();
        rows = txns.map((t) => [
          new Date(t.createdAt).toISOString().slice(0, 10),
          t.type,
          t.direction,
          t.amount,
          t.status,
          t.description || "",
        ]);
      } else {
        headers = [
          "Date",
          "Order",
          "Base Amount",
          "Selling Amount",
          "Gross Margin",
          "Platform Fee",
          "Net Commission",
          "Status",
        ];
        const commissions = await Commission.find({ reseller: req.reseller._id })
          .populate("order", "orderId")
          .sort({ createdAt: -1 })
          .limit(5000)
          .lean();
        rows = commissions.map((c) => [
          new Date(c.createdAt).toISOString().slice(0, 10),
          c.order?.orderId || "",
          c.baseAmount,
          c.sellingAmount,
          c.grossMargin,
          c.platformFee,
          c.netCommission,
          c.status,
        ]);
      }

      // Prefix risky leading characters so spreadsheets can't execute a cell.
      const escape = (v) => {
        const s = String(v ?? "");
        const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
        return `"${safe.replace(/"/g, '""')}"`;
      };

      const csv = [headers, ...rows]
        .map((r) => r.map(escape).join(","))
        .join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="reseller-${type}-${Date.now()}.csv"`,
      );
      res.send(`\uFEFF${csv}`); // BOM so Excel reads UTF-8 correctly
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ success: false, message: "Unable to export report" });
    }
  },
);

module.exports = router;

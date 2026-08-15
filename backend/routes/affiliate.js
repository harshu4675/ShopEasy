const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const affiliateService = require("../services/affiliateService");
const { ImportError } = require("../services/affiliate/errors");
const { deleteProduct } = require("../services/productDeletion");

const CATEGORIES = affiliateService.CATEGORY_ENUM;

const AFFILIATE_FILTER = { productType: "AFFILIATE" };

/** Maps an ImportError (or anything else) to a useful HTTP response. */
const sendImportError = (res, err) => {
  if (err instanceof ImportError) {
    return res.status(err.httpStatus || 400).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }
  console.error("Affiliate import error:", err);
  return res.status(500).json({
    success: false,
    code: "IMPORT_ERROR",
    message:
      "Product information could not be retrieved from the selected source.",
  });
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const recomputeDiscount = (price, originalPrice) => {
  const p = Number(price) || 0;
  const o = Number(originalPrice) || 0;
  if (o > p) return Math.round(((o - p) / o) * 100);
  return 0;
};

/**
 * POST /api/admin/affiliate/import
 * Paste a product URL → extract publicly available metadata → create a draft
 * product (or refresh an existing one) for review.
 *
 * No marketplace API credentials are required. A page-access failure or
 * missing fields never prevents draft creation: the admin completes whatever
 * the page did not expose.
 */
router.post("/import", auth, admin, async (req, res) => {
  try {
    const { url } = req.body;
    const outcome = await affiliateService.importFromUrl(url);
    const fields = affiliateService.toProductFields(outcome.product);

    const importStatus = outcome.fetchFailed
      ? "error"
      : outcome.missing.length > 0
        ? "partial"
        : "imported";
    const importError = outcome.fetchFailed
      ? outcome.errorMessage
      : outcome.missing.length > 0
        ? "Some product information could not be automatically detected. Please review and complete the missing fields."
        : "";

    // Re-importing the same URL (or product id) updates the existing draft
    // instead of piling up duplicates. Only drafts are matched, so a published
    // product is never silently overwritten by a fresh import.
    let existing = null;
    if (fields.externalProductId && fields.sourcePlatform !== "unknown") {
      existing = await Product.findOne({
        productType: "AFFILIATE",
        status: "draft",
        sourcePlatform: fields.sourcePlatform,
        externalProductId: fields.externalProductId,
      });
    }
    if (!existing && fields.affiliateUrl) {
      existing = await Product.findOne({
        productType: "AFFILIATE",
        status: "draft",
        affiliateUrl: fields.affiliateUrl,
      });
    }

    if (existing) {
      Object.assign(existing, fields, {
        importStatus,
        importError,
        importedAt: new Date(),
      });
      await existing.save();
      return res.json({
        success: true,
        created: false,
        product: existing,
        missing: outcome.missing,
        warnings: outcome.warnings,
      });
    }

    const product = await Product.create({
      ...fields,
      productType: "AFFILIATE",
      status: "draft",
      importStatus,
      importError,
      importedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      created: true,
      product,
      missing: outcome.missing,
      warnings: outcome.warnings,
    });
  } catch (err) {
    sendImportError(res, err);
  }
});

/**
 * GET /api/admin/affiliate
 * List affiliate products with optional status filter and keyword search.
 */
router.get("/", auth, admin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { ...AFFILIATE_FILTER };

    if (status && ["draft", "published", "unpublished"].includes(status)) {
      query.status = status;
    }
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { brand: { $regex: safe, $options: "i" } },
        { externalProductId: { $regex: safe, $options: "i" } },
        { sourcePlatform: { $regex: safe, $options: "i" } },
      ];
    }

    const products = await Product.find(query)
      .select(
        "name price originalPrice discount category brand images rating numReviews " +
          "productType status sourcePlatform externalProductId originalUrl affiliateUrl " +
          "availability importStatus importError importedAt affiliateClicks isTrending createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json(products);
  } catch (err) {
    console.error("List affiliate products error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** GET /api/admin/affiliate/:id */
router.get("/:id", auth, admin, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      ...AFFILIATE_FILTER,
    }).lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Affiliate product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/affiliate/:id
 * Edit the imported product. Affiliate metadata (source, external id, original
 * URL, affiliate destination) is only touched when explicitly supplied, so
 * normal edits can never clobber the affiliate link.
 */
router.put("/:id", auth, admin, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      ...AFFILIATE_FILTER,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Affiliate product not found" });
    }

    const editable = [
      "name",
      "description",
      "price",
      "originalPrice",
      "category",
      "brand",
      "tags",
      "images",
      "availability",
      "isTrending",
      "trendingOrder",
    ];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "price") {
          product[field] = Number(req.body[field]) || 0;
        } else if (field === "originalPrice") {
          // An MRP is optional: fall back to the selling price so the price
          // block stays consistent instead of showing a ₹0 strike-through.
          product[field] = Number(req.body[field]) || product.price || 0;
        } else {
          product[field] = req.body[field];
        }
      }
    });

    if (req.body.category && !CATEGORIES.includes(req.body.category)) {
      return res.status(400).json({
        success: false,
        message: "Please choose a valid category.",
      });
    }

    if (req.body.affiliateUrl !== undefined) {
      const url = String(req.body.affiliateUrl).trim();
      if (url && !affiliateService.isSafeRedirectUrl(url)) {
        return res.status(400).json({
          success: false,
          message: "The affiliate URL must be a valid http(s) link.",
        });
      }
      product.affiliateUrl = url;
    }

    product.discount =
      req.body.discount !== undefined
        ? Math.min(100, Math.max(0, Number(req.body.discount) || 0))
        : recomputeDiscount(product.price, product.originalPrice);

    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** PATCH /api/admin/affiliate/:id/publish */
router.patch("/:id/publish", auth, admin, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      ...AFFILIATE_FILTER,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Affiliate product not found" });
    }
    if (!product.name || !product.images || product.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add a title and at least one image before publishing.",
      });
    }
    if (!product.price || product.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Add a selling price before publishing.",
      });
    }
    if (!product.affiliateUrl) {
      return res.status(400).json({
        success: false,
        message:
          "This product has no affiliate destination to send customers to.",
      });
    }
    product.status = "published";
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** PATCH /api/admin/affiliate/:id/unpublish */
router.patch("/:id/unpublish", auth, admin, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      ...AFFILIATE_FILTER,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Affiliate product not found" });
    }
    product.status = "unpublished";
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/affiliate/:id/reimport
 * Re-fetches the product data from the stored original URL where supported.
 */
router.post("/:id/reimport", auth, admin, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      ...AFFILIATE_FILTER,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Affiliate product not found" });
    }
    const sourceUrl = product.originalUrl;
    if (!sourceUrl) {
      return res.status(400).json({
        success: false,
        code: "IMPORT_ERROR",
        message: "This product has no source URL to re-import from.",
      });
    }

    try {
      const outcome = await affiliateService.importFromUrl(sourceUrl);
      const fields = affiliateService.toProductFields(outcome.product);
      Object.assign(product, fields, {
        importStatus: outcome.fetchFailed
          ? "error"
          : outcome.missing.length > 0
            ? "partial"
            : "updated",
        importError: outcome.fetchFailed
          ? outcome.errorMessage
          : outcome.missing.length > 0
            ? "Some product information could not be automatically detected. Please review and complete the missing fields."
            : "",
        importedAt: new Date(),
      });
      await product.save();
      res.json({
        success: true,
        product,
        missing: outcome.missing,
        warnings: outcome.warnings,
      });
    } catch (err) {
      // Persist the failure so the list can surface "import error" state.
      product.importStatus = "error";
      product.importError = err.message || "Re-import failed";
      await product.save().catch(() => {});
      throw err;
    }
  } catch (err) {
    sendImportError(res, err);
  }
});

/** DELETE /api/admin/affiliate/:id */
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id, AFFILIATE_FILTER);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Affiliate product not found",
      });
    }
    res.json({
      success: true,
      message: "Affiliate product deleted",
      cleanupWarnings: result.cleanupErrors,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

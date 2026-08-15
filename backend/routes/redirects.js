const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const affiliateService = require("../services/affiliateService");
const { ImportError } = require("../services/affiliate/errors");
const { withCanonicalOrigin } = require("../utils/productOrigin");

/**
 * GET /go/product/:id
 *
 * Controlled affiliate redirect. The destination is resolved server-side from
 * the stored affiliate URL and validated against the supported-platform
 * whitelist, so this route can never be used as an open redirect.
 */
router.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select(
        "name productType status affiliateUrl originalUrl sourceUrl sourcePlatform platform",
      )
      .lean();

    const url = affiliateService.resolveAffiliateUrl(
      withCanonicalOrigin(product),
    );

    // Fire-and-forget click counter: never fail the redirect over analytics.
    Product.findByIdAndUpdate(req.params.id, {
      $inc: { affiliateClicks: 1 },
    }).catch(() => {});

    // Never cache a redirect: the destination can change when an admin edits
    // or unpublishes the product.
    res.set("Cache-Control", "no-store");
    return res.redirect(302, url);
  } catch (err) {
    if (err instanceof ImportError) {
      return res.status(err.httpStatus || 400).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }
    console.error("Affiliate redirect error:", err);
    return res.status(500).json({
      success: false,
      code: "REDIRECT_ERROR",
      message: "Unable to resolve this product's destination.",
    });
  }
});

module.exports = router;

/**
 * Product Import Route.
 *
 * POST /api/import/preview  - Preview product data from a URL
 * POST /api/import/save     - Save imported product to database
 * GET  /api/import/providers - List available providers
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { importProduct, clearCache, detectPlatform } = require('../services/productImporter');
const { debugLog } = require('../services/productImporter/debug');
const Product = require('../models/Product');
const { extractPrice } = require('../services/productImporter/utils/price');

/**
 * POST /api/import/preview
 * Import and preview product data from a URL.
 */
router.post('/preview', auth, admin, async (req, res) => {
  try {
    const { url, useRendered } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        reason: 'INVALID_URL',
        message: 'Please provide a product URL.',
      });
    }

    const result = await importProduct(url, { useRendered: !!useRendered });

    // Log debug info on the server
    if (result.success) {
      debugLog(result);
    } else {
      console.log(`[Importer] Failed: ${result.reason} — ${result.message}`);
    }

    res.json(result);
  } catch (err) {
    console.error('[Importer] Unexpected error:', err);
    res.status(500).json({
      success: false,
      reason: 'NETWORK_ERROR',
      message: 'An unexpected error occurred during import.',
    });
  }
});

/**
 * POST /api/import/save
 * Save an imported product to the database.
 */
router.post('/save', auth, admin, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      originalPrice,
      category,
      subCategory,
      brand,
      sizes,
      colors,
      stock,
      images,
      tags,
      affiliateUrl,
      originalAffiliateUrl,
      sourceUrl,
      canonicalUrl,
      platform,
      currency,
      rating,
      reviewCount,
      specifications,
      features,
      sellerName,
      sku,
      productId,
    } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, price, and category are required.',
      });
    }

    // Calculate discount if not provided
    const priceInfo = extractPrice({
      price,
      originalPrice,
    });
    const discount = priceInfo?.discountPercentage || 0;

    const product = await Product.create({
      name: title,
      description: description || '',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : Number(price),
      discount,
      category,
      subCategory: subCategory || '',
      brand: brand || '',
      sizes: sizes || [],
      colors: colors || [],
      stock: Number(stock) || 0,
      images: images || [],
      tags: tags || [],
      // Affiliate link preservation: the exact URL the admin pasted must
      // survive as the outbound Buy Now target. Never overwrite it with the
      // canonical product URL.
      affiliateUrl: affiliateUrl || null,
      originalAffiliateUrl: originalAffiliateUrl || affiliateUrl || null,
      sourceUrl: sourceUrl || affiliateUrl || null,
      canonicalUrl: canonicalUrl || null,
      platform: platform || null,
      // Surface marketplace rating/count on the storefront product card
      rating: rating !== null && rating !== undefined ? Number(rating) : 0,
      numReviews: reviewCount ? Number(reviewCount) : 0,
      importMetadata: {
        currency: currency || 'INR',
        rating: rating || null,
        reviewCount: reviewCount || null,
        specifications: specifications || null,
        features: features || null,
        sellerName: sellerName || null,
        sku: sku || null,
        productId: productId || null,
        importedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      product,
    });
  } catch (err) {
    console.error('[Importer] Save error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Error saving product.',
    });
  }
});

/**
 * GET /api/import/providers
 * List available import providers.
 */
router.get('/providers', auth, admin, async (req, res) => {
  const { PROVIDERS } = require('../services/productImporter');
  const providers = PROVIDERS.map(p => ({
    name: p.name ? p.name.replace('Provider', '') : 'Generic',
    canHandle: p.canHandle.toString().slice(0, 100),
  }));

  res.json({
    success: true,
    providers,
  });
});

/**
 * POST /api/import/clear-cache
 * Clear import cache (admin only).
 */
router.post('/clear-cache', auth, admin, async (req, res) => {
  clearCache();
  res.json({ success: true, message: 'Import cache cleared.' });
});

module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const affiliateService = require("../services/affiliateService");
const { ImportError } = require("../services/affiliate/errors");
const { deleteProduct } = require("../services/productDeletion");
const {
  inferSourcePlatform,
  isSafeWebUrl,
  withCanonicalOrigin,
} = require("../utils/productOrigin");

// Configure multer to use memory storage instead of disk
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "shopeasy/products",
        resource_type: "auto",
        transformation: [
          { width: 1000, height: 1000, crop: "limit" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      },
    );
    uploadStream.end(fileBuffer);
  });
};

function publicProduct(product) {
  const normalized = withCanonicalOrigin(product);
  // Destinations are resolved through /affiliate-url so listing/detail payloads
  // expose affiliate identity without leaking or bypassing the controlled URL.
  delete normalized.affiliateUrl;
  delete normalized.originalUrl;
  delete normalized.sourceUrl;
  delete normalized.canonicalUrl;
  delete normalized.importMetadata;
  return normalized;
}

function parseJsonField(value, field, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    const error = new Error(`Invalid ${field}`);
    error.statusCode = 400;
    throw error;
  }
}

// Get all products with filters
router.get("/", async (req, res) => {
  try {
    const {
      category,
      subCategory,
      search,
      sort,
      brand,
      minPrice,
      maxPrice,
      size,
      limit,
    } = req.query;
    let query = {};

    // Only published products are visible on the storefront. Affiliate
    // imports stay `draft` until an admin publishes them, and unpublished
    // products are hidden without being deleted. Products created before this
    // field existed have no value in the database, so `$nin` (rather than an
    // equality match) keeps them visible too.
    query.status = { $nin: ["draft", "unpublished"] };

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (brand) query.brand = { $regex: brand, $options: "i" };
    if (search) {
      const term = String(search).trim();
      // Escape regex metacharacters: an unescaped user string is both a
      // correctness bug and a ReDoS vector.
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { brand: { $regex: safe, $options: "i" } },
        { subCategory: { $regex: safe, $options: "i" } },
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (size) query.sizes = size;

    const SORTS = {
      "price-asc": { price: 1 },
      "price-desc": { price: -1 },
      rating: { rating: -1 },
      newest: { createdAt: -1 },
      discount: { discount: -1 },
    };

    // Hard cap: without one a client can request the entire collection and
    // stall the instance.
    const pageSize = Math.min(Number(limit) || 40, 100);

    const result = await Product.find(query)
      .sort(SORTS[sort] || { createdAt: -1 })
      .limit(pageSize)
      // Only the fields the product grid renders. Dropping `description` alone
      // cuts the payload substantially on a 40-item response.
      .select(
        "name price originalPrice discount category subCategory brand images rating numReviews stock sizes colors isTrending salesCount createdAt productType status sourcePlatform affiliateUrl originalUrl sourceUrl platform",
      )
      .lean();

    res.json(result.map(publicProduct));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/products/:id/affiliate-url
 * Public resolution of an affiliate product's destination. Returns the URL
 * only when the product is a published affiliate product and its persisted
 * destination uses a safe HTTP(S) scheme.
 */
router.get("/:id/affiliate-url", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select(
        "name productType status affiliateUrl originalUrl sourceUrl sourcePlatform platform",
      )
      .lean();
    const normalized = withCanonicalOrigin(product);
    const url = affiliateService.resolveAffiliateUrl(normalized);
    res.json({
      url,
      platform: normalized.sourcePlatform,
      name: normalized.name,
    });
  } catch (error) {
    if (error instanceof ImportError) {
      return res.status(error.httpStatus || 400).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      status: { $nin: ["draft", "unpublished"] },
    }).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(publicProduct(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create product (Admin) - WITH CLOUDINARY
router.post("/", auth, admin, upload.array("images", 5), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      discount,
      category,
      subCategory,
      brand,
      stock,
      affiliateUrl: requestedAffiliateUrl,
      imageUrls: requestedImageUrls,
    } = req.body;

    const affiliateUrl = String(requestedAffiliateUrl || "").trim();
    const requestedType = String(req.body.productType || "")
      .trim()
      .toUpperCase();
    if (requestedType && !["INTERNAL", "AFFILIATE"].includes(requestedType)) {
      return res.status(400).json({ message: "Invalid product type" });
    }
    // Compatibility: the original Add Product importer sent affiliateUrl but
    // not productType. New clients send both explicitly.
    const productType =
      requestedType || (affiliateUrl ? "AFFILIATE" : "INTERNAL");
    if (productType === "AFFILIATE" && !isSafeWebUrl(affiliateUrl)) {
      return res.status(400).json({
        message: "Affiliate products require a valid http(s) destination",
      });
    }

    let productImages = [];
    if (req.files?.length) {
      productImages = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer)),
      );
    }

    const parsedImageUrls = parseJsonField(
      requestedImageUrls,
      "imported image URLs",
      [],
    );
    if (!Array.isArray(parsedImageUrls)) {
      return res.status(400).json({ message: "Invalid imported image URLs" });
    }
    const importedImageUrls = parsedImageUrls.filter(isSafeWebUrl).slice(0, 5);
    if (!productImages.length) productImages = importedImageUrls;
    if (!productImages.length) {
      return res.status(400).json({
        message: "At least one product image is required",
      });
    }

    const sizes = parseJsonField(req.body.sizes, "sizes", []);
    const colors = parseJsonField(req.body.colors, "colors", []);
    const tags = parseJsonField(req.body.tags, "tags", []);
    const importMetadata = parseJsonField(
      req.body.importMetadata,
      "import metadata",
      undefined,
    );
    if (
      !Array.isArray(sizes) ||
      !Array.isArray(colors) ||
      !Array.isArray(tags)
    ) {
      return res.status(400).json({ message: "Invalid product options" });
    }
    if (
      importMetadata !== undefined &&
      (!importMetadata ||
        Array.isArray(importMetadata) ||
        typeof importMetadata !== "object")
    ) {
      return res.status(400).json({ message: "Invalid import metadata" });
    }

    const sourcePlatform =
      productType === "AFFILIATE"
        ? String(
            req.body.sourcePlatform ||
              req.body.platform ||
              inferSourcePlatform(affiliateUrl),
          )
            .trim()
            .toLowerCase()
        : "";
    const originalUrl =
      productType === "AFFILIATE"
        ? String(
            req.body.originalUrl ||
              req.body.canonicalUrl ||
              req.body.sourceUrl ||
              affiliateUrl,
          ).trim()
        : "";

    const product = await Product.create({
      name,
      description,
      price,
      originalPrice: originalPrice || price,
      discount: discount || 0,
      category,
      subCategory,
      brand,
      sizes,
      colors,
      stock,
      images: productImages,
      tags,
      productType,
      affiliateUrl: productType === "AFFILIATE" ? affiliateUrl : "",
      sourcePlatform,
      externalProductId:
        req.body.externalProductId || req.body.productId || req.body.asin || "",
      originalUrl,
      // Keep populated legacy fields so older admin screens remain editable.
      sourceUrl:
        productType === "AFFILIATE" ? req.body.sourceUrl || originalUrl : "",
      canonicalUrl:
        productType === "AFFILIATE" ? req.body.canonicalUrl || originalUrl : "",
      platform: sourcePlatform,
      importMetadata,
      importedAt: productType === "AFFILIATE" ? new Date() : undefined,
    });

    res.status(201).json(withCanonicalOrigin(product.toObject()));
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

// Update product (Admin) - WITH CLOUDINARY
router.put("/:id", auth, admin, upload.array("images", 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updateFields = [
      "name",
      "description",
      "price",
      "originalPrice",
      "discount",
      "category",
      "subCategory",
      "brand",
      "stock",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        if (
          field === "price" ||
          field === "originalPrice" ||
          field === "discount" ||
          field === "stock"
        ) {
          product[field] = parseInt(req.body[field], 10) || 0;
        } else {
          product[field] = req.body[field];
        }
      }
    });

    for (const field of ["sizes", "colors", "tags"]) {
      if (req.body[field] === undefined || req.body[field] === "") continue;
      const parsed = parseJsonField(req.body[field], field, []);
      if (!Array.isArray(parsed)) {
        return res.status(400).json({ message: `Invalid ${field}` });
      }
      product[field] = parsed;
    }

    // If new images are uploaded, upload to Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer),
      );
      const imageUrls = await Promise.all(uploadPromises);
      product.images = imageUrls;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

// Delete product (Admin)
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id);
    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product deleted successfully",
      cleanupWarnings: result.cleanupErrors,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

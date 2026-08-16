const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { deleteProduct } = require("../services/productDeletion");

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

    // Defensive visibility guard: any legacy `draft`/`unpublished` records
    // that predate the store's own catalogue stay hidden. Store products are
    // unaffected because they never carry those statuses.
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
        "name price originalPrice discount category subCategory brand images rating numReviews stock sizes colors isTrending salesCount createdAt",
      )
      .lean();

    res.json(result);
  } catch (error) {
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
    res.json(product);
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
    } = req.body;

    let productImages = [];
    if (req.files?.length) {
      productImages = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer)),
      );
    }
    if (!productImages.length) {
      return res.status(400).json({
        message: "At least one product image is required",
      });
    }

    const sizes = parseJsonField(req.body.sizes, "sizes", []);
    const colors = parseJsonField(req.body.colors, "colors", []);
    const tags = parseJsonField(req.body.tags, "tags", []);
    if (
      !Array.isArray(sizes) ||
      !Array.isArray(colors) ||
      !Array.isArray(tags)
    ) {
      return res.status(400).json({ message: "Invalid product options" });
    }

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
    });

    res.status(201).json(product);
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

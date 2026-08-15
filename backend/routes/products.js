const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

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
    const product = await Product.findById(req.params.id).lean();
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
      sizes,
      colors,
      stock,
      tags,
      affiliateUrl,
      sourceUrl,
      canonicalUrl,
      platform,
      importMetadata,
      imageUrls: requestedImageUrls,
    } = req.body;

    // Upload images to Cloudinary
    let productImages = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer),
      );
      productImages = await Promise.all(uploadPromises);
    }

    let importedImageUrls = [];
    if (requestedImageUrls) {
      try {
        importedImageUrls = JSON.parse(requestedImageUrls).filter((url) => /^https?:\/\//i.test(url)).slice(0, 5);
      } catch {
        return res.status(400).json({ message: "Invalid imported image URLs" });
      }
    }
    if (!importedImageUrls.length && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: "At least one product image is required" });
    }

    if (!productImages.length) productImages = importedImageUrls;

    const product = await Product.create({
      name,
      description,
      price,
      originalPrice: originalPrice || price,
      discount: discount || 0,
      category,
      subCategory,
      brand,
      sizes: sizes ? JSON.parse(sizes) : [],
      colors: colors ? JSON.parse(colors) : [],
      stock,
      images: productImages,
      tags: tags ? JSON.parse(tags) : [],
      affiliateUrl,
      sourceUrl,
      canonicalUrl,
      platform,
      importMetadata: importMetadata ? JSON.parse(importMetadata) : undefined,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: error.message });
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

    if (req.body.sizes) product.sizes = JSON.parse(req.body.sizes);
    if (req.body.colors) product.colors = JSON.parse(req.body.colors);
    if (req.body.tags) product.tags = JSON.parse(req.body.tags);

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
    res.status(500).json({ message: error.message });
  }
});

// Delete product (Admin)
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Optional: Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map((imageUrl) => {
        // Extract public_id from Cloudinary URL
        const parts = imageUrl.split("/");
        const filename = parts[parts.length - 1].split(".")[0];
        const publicId = `shopeasy/products/${filename}`;
        return cloudinary.uploader.destroy(publicId);
      });
      await Promise.all(deletePromises);
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Banner = require("../models/Banner");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files (JPG, PNG, WebP, GIF) are allowed"));
  },
});

const uploadToCloudinary = (fileBuffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const isGif = mimetype === "image/gif";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "shopeasy/banners",
        resource_type: isGif ? "image" : "image",
        format: isGif ? "gif" : undefined,
        transformation: isGif
          ? [{ width: 1920, crop: "limit" }]
          : [
              { width: 1920, height: 800, crop: "fill", gravity: "auto" },
              { quality: "auto:good" },
              { fetch_format: "auto" },
            ],
      },
      (error, result) => {
        if (error) reject(error);
        else
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            mediaType: isGif ? "gif" : "image",
          });
      },
    );
    uploadStream.end(fileBuffer);
  });
};

const extractPublicId = (imageUrl) => {
  try {
    const parts = imageUrl.split("/");
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;
    const afterUpload = parts.slice(uploadIdx + 1);
    const withoutVersion = afterUpload[0].startsWith("v")
      ? afterUpload.slice(1)
      : afterUpload;
    const fullPath = withoutVersion.join("/");
    return fullPath.substring(0, fullPath.lastIndexOf("."));
  } catch (err) {
    return null;
  }
};

router.get("/active", async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", auth, admin, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", auth, admin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, admin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    const {
      title,
      subtitle,
      buttonText,
      link,
      order,
      isActive,
      textPosition,
      textColor,
      overlayOpacity,
    } = req.body;

    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
    );

    const banner = await Banner.create({
      title: title || "",
      subtitle: subtitle || "",
      buttonText: buttonText || "",
      link: link || "/products",
      image: uploadResult.url,
      mediaType: uploadResult.mediaType,
      order: order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? isActive === "true" : true,
      textPosition: textPosition || "left",
      textColor: textColor || "#ffffff",
      overlayOpacity:
        overlayOpacity !== undefined ? Number(overlayOpacity) : 0.35,
    });

    res.status(201).json(banner);
  } catch (error) {
    console.error("Error creating banner:", error);
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, admin, upload.single("image"), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    const {
      title,
      subtitle,
      buttonText,
      link,
      order,
      isActive,
      textPosition,
      textColor,
      overlayOpacity,
    } = req.body;

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (buttonText !== undefined) banner.buttonText = buttonText;
    if (link !== undefined) banner.link = link;
    if (order !== undefined) banner.order = Number(order);
    if (isActive !== undefined) banner.isActive = isActive === "true";
    if (textPosition !== undefined) banner.textPosition = textPosition;
    if (textColor !== undefined) banner.textColor = textColor;
    if (overlayOpacity !== undefined)
      banner.overlayOpacity = Number(overlayOpacity);

    if (req.file) {
      const oldPublicId = extractPublicId(banner.image);
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (err) {
          console.warn("Could not delete old banner image:", err.message);
        }
      }
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        req.file.mimetype,
      );
      banner.image = uploadResult.url;
      banner.mediaType = uploadResult.mediaType;
    }

    await banner.save();
    res.json(banner);
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/toggle", auth, admin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }
    banner.isActive = !banner.isActive;
    await banner.save();
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/reorder", auth, admin, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res
        .status(400)
        .json({ message: "orders must be an array of { id, order }" });
    }

    await Promise.all(
      orders.map(({ id, order }) =>
        Banner.findByIdAndUpdate(id, { order: Number(order) }),
      ),
    );

    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    const publicId = extractPublicId(banner.image);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn(
          "Could not delete banner image from cloudinary:",
          err.message,
        );
      }
    }

    await banner.deleteOne();
    res.json({ message: "Banner deleted successfully" });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

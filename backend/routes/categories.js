const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const query = activeOnly === "true" ? { isActive: true } : {};
    const categories = await Category.find(query).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isValidId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

    const category = isValidId
      ? await Category.findById(idOrSlug)
      : await Category.findOne({ slug: idOrSlug });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, admin, async (req, res) => {
  try {
    const { name, icon, image, order, isActive, subCategories } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const exists = await Category.findOne({ name: name.trim() });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name: name.trim(),
      icon: icon || "category",
      image: image || "",
      order: order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? isActive : true,
      subCategories: subCategories || [],
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { name, icon, image, order, isActive } = req.body;

    if (name !== undefined) category.name = name.trim();
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;
    if (order !== undefined) category.order = Number(order);
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/toggle", auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    category.isActive = !category.isActive;
    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    await category.deleteOne();
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/subcategories", auth, admin, async (req, res) => {
  try {
    const { name, image, order, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Sub-category name is required" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const exists = category.subCategories.find(
      (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (exists) {
      return res
        .status(400)
        .json({ message: "Sub-category already exists in this category" });
    }

    category.subCategories.push({
      name: name.trim(),
      slug: name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-"),
      image: image || "",
      order:
        order !== undefined ? Number(order) : category.subCategories.length,
      isActive: isActive !== undefined ? isActive : true,
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error("Add sub-category error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/subcategories/:subId", auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const sub = category.subCategories.id(req.params.subId);
    if (!sub) {
      return res.status(404).json({ message: "Sub-category not found" });
    }

    const { name, image, order, isActive } = req.body;
    if (name !== undefined) {
      sub.name = name.trim();
      sub.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    }
    if (image !== undefined) sub.image = image;
    if (order !== undefined) sub.order = Number(order);
    if (isActive !== undefined) sub.isActive = isActive;

    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id/subcategories/:subId", auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.subCategories = category.subCategories.filter(
      (s) => s._id.toString() !== req.params.subId,
    );

    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/seed", auth, admin, async (req, res) => {
  try {
    const seedData = [
      {
        name: "Men's Clothing",
        icon: "checkroom",
        order: 1,
        subCategories: [
          "T-Shirts",
          "Shirts",
          "Jeans",
          "Trousers",
          "Ethnic Wear",
          "Sweatshirts",
          "Jackets",
          "Innerwear",
          "Sleepwear",
        ],
      },
      {
        name: "Women's Clothing",
        icon: "woman",
        order: 2,
        subCategories: [
          "Sarees",
          "Kurtis",
          "Dresses",
          "Tops",
          "Jeans",
          "Ethnic Wear",
          "Western Wear",
          "Lingerie",
          "Nightwear",
        ],
      },
      {
        name: "Kids' Clothing",
        icon: "child_care",
        order: 3,
        subCategories: [
          "Boys T-Shirts",
          "Girls Dresses",
          "Boys Jeans",
          "Girls Tops",
          "Baby Rompers",
          "School Uniforms",
        ],
      },
      {
        name: "Perfumes",
        icon: "spa",
        order: 4,
        subCategories: [
          "Men's Perfumes",
          "Women's Perfumes",
          "Unisex",
          "Deodorants",
          "Body Mists",
        ],
      },
      {
        name: "Watches",
        icon: "watch",
        order: 5,
        subCategories: [
          "Men's Watches",
          "Women's Watches",
          "Kids Watches",
          "Smart Watches",
        ],
      },
      {
        name: "Sunglasses",
        icon: "sunny",
        order: 6,
        subCategories: ["Men's", "Women's", "Kids", "Aviators", "Sports"],
      },
      {
        name: "Bags & Wallets",
        icon: "backpack",
        order: 7,
        subCategories: [
          "Handbags",
          "Backpacks",
          "Wallets",
          "Clutches",
          "Laptop Bags",
        ],
      },
      {
        name: "Jewelry",
        icon: "diamond",
        order: 8,
        subCategories: [
          "Necklaces",
          "Earrings",
          "Rings",
          "Bracelets",
          "Bangles",
          "Anklets",
        ],
      },
      {
        name: "Footwear",
        icon: "footprint",
        order: 9,
        subCategories: [
          "Men's Shoes",
          "Women's Heels",
          "Sandals",
          "Sneakers",
          "Formal Shoes",
        ],
      },
      {
        name: "Accessories",
        icon: "auto_awesome",
        order: 10,
        subCategories: ["Belts", "Caps", "Scarves", "Ties", "Hair Accessories"],
      },
    ];

    const slugify = (str) =>
      str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

    const results = [];
    for (const cat of seedData) {
      const exists = await Category.findOne({ name: cat.name });
      if (exists) {
        results.push({ name: cat.name, status: "already exists" });
        continue;
      }

      await Category.create({
        name: cat.name,
        slug: slugify(cat.name),
        icon: cat.icon,
        order: cat.order,
        isActive: true,
        subCategories: cat.subCategories.map((sub, i) => ({
          name: sub,
          slug: slugify(sub),
          order: i,
          isActive: true,
        })),
      });
      results.push({ name: cat.name, status: "created" });
    }

    res.json({ message: "Seed complete", results });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

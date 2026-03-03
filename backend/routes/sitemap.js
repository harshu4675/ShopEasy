const express = require("express");
const router = express.Router();
const { SitemapStream, streamToPromise } = require("sitemap");
const { Readable } = require("stream");
const Product = require("../models/Product");

// Generate sitemap
router.get("/sitemap.xml", async (req, res) => {
  try {
    // Base URL of your frontend
    const hostname =
      process.env.FRONTEND_URL || "https://shopeasy-fashionstore.netlify.app";

    // Create sitemap stream
    const smStream = new SitemapStream({ hostname });

    // Static pages
    const staticPages = [
      { url: "/", changefreq: "daily", priority: 1.0 },
      { url: "/products", changefreq: "daily", priority: 0.9 },
      { url: "/coupons", changefreq: "weekly", priority: 0.7 },
      { url: "/contact", changefreq: "monthly", priority: 0.6 },
      { url: "/privacy", changefreq: "monthly", priority: 0.5 },
      { url: "/terms", changefreq: "monthly", priority: 0.5 },
      { url: "/login", changefreq: "monthly", priority: 0.4 },
      { url: "/register", changefreq: "monthly", priority: 0.4 },
    ];

    // Add static pages
    staticPages.forEach((page) => {
      smStream.write(page);
    });

    // Get all products
    const products = await Product.find().select("_id updatedAt");

    // Add product pages
    products.forEach((product) => {
      smStream.write({
        url: `/product/${product._id}`,
        changefreq: "weekly",
        priority: 0.8,
        lastmod: product.updatedAt,
      });
    });

    // Category pages
    const categories = [
      "Men's Clothing",
      "Women's Clothing",
      "Kids' Clothing",
      "Perfumes",
      "Watches",
      "Sunglasses",
      "Bags & Wallets",
      "Jewelry",
      "Footwear",
      "Accessories",
    ];

    categories.forEach((category) => {
      smStream.write({
        url: `/products?category=${encodeURIComponent(category)}`,
        changefreq: "daily",
        priority: 0.8,
      });
    });

    // End sitemap stream
    smStream.end();

    // Generate XML
    const sitemap = await streamToPromise(Readable.from(smStream)).then(
      (data) => data.toString(),
    );

    // Set headers
    res.header("Content-Type", "application/xml");
    res.header("Content-Encoding", "gzip");

    // Send sitemap
    res.send(sitemap);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// Robots.txt
router.get("/robots.txt", (req, res) => {
  const hostname =
    process.env.FRONTEND_URL || "https://shopeasy-fashionstore.netlify.app";
  const backendUrl =
    process.env.BACKEND_URL || "https://your-backend.railway.app";

  const robotsTxt = `User-agent: *
Allow: /

# Disallow admin pages
Disallow: /admin/
Disallow: /checkout
Disallow: /cart
Disallow: /my-orders
Disallow: /wishlist

# Sitemap location
Sitemap: ${backendUrl}/sitemap.xml
Sitemap: ${hostname}/sitemap.xml
`;

  res.type("text/plain");
  res.send(robotsTxt);
});

module.exports = router;

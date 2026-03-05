const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");

dotenv.config();

const returnRoutes = require("./routes/returnRoutes");
const paymentRoutes = require("./routes/payment");

const sitemapRoutes = require("./routes/sitemap");

const app = express();

// Connect to database
connectDB();

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  "https://shopeasy-fashionstore.netlify.app",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // ⚠️ In development, just warn but allow
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `⚠️  CORS Warning: Origin ${origin} not in whitelist, but allowing in dev mode`,
          );
          callback(null, true);
        } else {
          // ❌ In production, block
          console.error(`❌ CORS Error: Origin ${origin} is not allowed`);
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/", sitemapRoutes);
app.use("/api/returns", returnRoutes);
// ==================== ROUTES ====================

// Auth Routes (use only one - the updated one with OTP)
// Change this line in server.js:
app.use("/api/auth", require("./routes/auth")); // ✅ Use authRoutes instead// This should be your updated auth.js file

// Other Routes
app.use("/api/products", require("./routes/products"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/coupons", require("./routes/coupons"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/payment", paymentRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopEasy API is running",
    timestamp: new Date().toISOString(),
    config: {
      email: !!process.env.EMAIL_USER,
      razorpay: !!process.env.RAZORPAY_KEY_ID,
      nodeEnv: process.env.NODE_ENV || "development",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("\n========== ShopEasy Server ==========");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5000"}`,
  );
  console.log(
    `📧 Email service: ${process.env.EMAIL_USER ? `✅ ${process.env.EMAIL_USER}` : "❌ Not configured"}`,
  );
  console.log(
    `💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? "✅ Configured" : "❌ Not configured"}`,
  );
  console.log(
    `🗄️  Database: ${process.env.MONGODB_URI ? "✅ Connected" : "❌ Not configured"}`,
  );
  console.log("=====================================\n");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  // Close server & exit process
  process.exit(1);
});

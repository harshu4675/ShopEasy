const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");

dotenv.config();

const connectDB = require("./config/db");
const {
  secureHeaders,
  apiLimiter,
  authLimiter,
  otpLimiter,
  mongoSanitize,
  parameterPollution,
} = require("./middleware/security");

const { startMaturitySweeper } = require("./services/commissionMaturity");
const returnRoutes = require("./routes/returnRoutes");
const paymentRoutes = require("./routes/payment");
const sitemapRoutes = require("./routes/sitemap");

const app = express();

// Render/Netlify/Cloudflare sit in front of this process; without this the
// rate limiters would see the proxy IP for every visitor.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Connect before listening. With bufferCommands disabled a query issued
// before the connection is ready fails immediately, so the server must not
// accept traffic until Mongo is up.
let dbReady = false;
connectDB()
  .then(() => {
    dbReady = true;
  })
  .catch((err) => {
    console.error("Fatal: could not reach MongoDB.", err.message);
    process.exit(1);
  });

/* -------------------------------------------------------------------------- *
 * Security & transport
 * -------------------------------------------------------------------------- */
app.use(secureHeaders);

// gzip/brotli-negotiated compression for JSON payloads and the sitemap.
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) =>
      req.headers["x-no-compression"] ? false : compression.filter(req, res),
  }),
);

const allowedOrigins = [
  "https://talishclothes.netlify.app",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn(`CORS: allowing ${origin} in dev mode`);
        return callback(null, true);
      }

      console.error(`CORS: blocked ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["set-cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.options("*", cors());

/* -------------------------------------------------------------------------- *
 * Body parsing & input hardening
 * -------------------------------------------------------------------------- */
// Explicit size caps: an unbounded JSON body is a trivial memory-exhaustion DoS.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use(mongoSanitize); // strips $-operators / dotted keys from user input
app.use(parameterPollution); // collapses duplicated query params

/* -------------------------------------------------------------------------- *
 * Readiness
 * -------------------------------------------------------------------------- */
// During a cold start the process is listening before Mongo finishes its
// handshake. Returning 503 with Retry-After is honest and lets the client
// retry, which is far better than a query that fails with a driver error.
app.use("/api", (req, res, next) => {
  if (dbReady || req.path === "/health") return next();
  res.set("Retry-After", "3");
  return res.status(503).json({
    success: false,
    code: "WARMING_UP",
    message: "Service is starting up. Please retry in a moment.",
  });
});

/* -------------------------------------------------------------------------- *
 * Static caching hints
 * -------------------------------------------------------------------------- */
app.use((req, res, next) => {
  // Product/banner reads are safe to cache briefly at the CDN edge; everything
  // authenticated stays private.
  if (
    req.method === "GET" &&
    /^\/api\/(products|categories|banners|trending)/.test(req.path) &&
    !req.headers.authorization
  ) {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  }
  next();
});

/* -------------------------------------------------------------------------- *
 * Rate limiting
 * -------------------------------------------------------------------------- */
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/send-otp", otpLimiter);
app.use("/api/auth/resend-otp", otpLimiter);
app.use("/api/auth/forgot-password", otpLimiter);

/* -------------------------------------------------------------------------- *
 * Routes
 * -------------------------------------------------------------------------- */
app.use("/", sitemapRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/auth", require("./routes/auth"));

app.use("/api/products", require("./routes/products"));
app.use("/api/push", require("./routes/push"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/coupons", require("./routes/coupons"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/payment", paymentRoutes);
app.use("/api/banners", require("./routes/banners"));
app.use("/api/trending", require("./routes/trending"));
app.use("/api/categories", require("./routes/categories"));

// Newsletter (public subscribe + admin list)
app.use("/api/newsletter", require("./routes/newsletter"));

// Product import (admin only)
app.use("/api/import", require("./routes/import"));

// Image proxy
app.use("/api/image-proxy", require("./routes/imageProxy"));

// Reseller programme. The admin router is mounted on /api/admin *before* the
// legacy admin routes so its more specific paths win.
app.use("/api/reseller", require("./routes/reseller"));
app.use("/api/admin", require("./routes/adminReseller"));
app.use("/api/admin", require("./routes/admin"));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopEasy API is running",
    timestamp: new Date().toISOString(),
    database: dbReady ? "connected" : "connecting",
    config: {
      email: !!process.env.BREVO_API_KEY,
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

/* -------------------------------------------------------------------------- *
 * Global error handler
 * -------------------------------------------------------------------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Request error:", err.stack);

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || { field: 1 })[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid identifier",
    });
  }

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

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Payload too large",
    });
  }

  // Never leak stack traces or internal messages in production.
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production" && statusCode === 500
        ? "Something went wrong!"
        : err.message || "Something went wrong!",
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

// Releases reseller commissions whose return window has closed. Without this
// they would sit in pendingBalance indefinitely, since delivery always happens
// before maturity.
const stopMaturitySweeper = startMaturitySweeper();

// Fail loudly but shut down cleanly, so in-flight requests aren't cut off.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server");
  stopMaturitySweeper();
  server.close(() => process.exit(0));
});

module.exports = app;

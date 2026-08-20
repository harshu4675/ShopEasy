const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const hpp = require("hpp");

/**
 * Security middleware bundle.
 *
 * Kept in one module so `server.js` reads as a short, ordered pipeline and the
 * individual policies are documented next to their rationale.
 */

const isProd = process.env.NODE_ENV === "production";

/**
 * Secure HTTP headers.
 *
 * CSP is scoped to the origins this API and its PWA actually talk to. It is
 * report-only outside production so a missing origin can never break a local
 * dev session.
 */
const secureHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://www.googletagmanager.com",
        "https://checkout.razorpay.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https:"],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://www.google-analytics.com",
        "https://res.cloudinary.com",
      ],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
    reportOnly: !isProd,
  },

  // The API serves JSON and Cloudinary-hosted images to a separate origin.
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,

  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,

  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  frameguard: { action: "deny" },
  xssFilter: true,
  hidePoweredBy: true,
});

/** Generic API ceiling — generous enough for normal browsing. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 600 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
  // Health checks and preflights shouldn't burn quota.
  //
  // This limiter is mounted with `app.use("/api", apiLimiter)`, and Express
  // strips the mount path from `req.path` inside a mounted handler, so
  // `req.path` here is "/health", never "/api/health" — the old comparison
  // could never match and health checks were consuming rate-limit quota.
  // `req.originalUrl` keeps the full path regardless of mount depth; the query
  // string is trimmed so "/api/health?x=1" still matches.
  skip: (req) =>
    req.method === "OPTIONS" ||
    req.originalUrl.split("?")[0].replace(/\/+$/, "") === "/api/health",
});

/**
 * Credential endpoints. Deliberately strict: this is the main defence against
 * password spraying, alongside the per-account lockout in the User model.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

/** OTP/email sending is expensive and abusable. */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 8 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
  },
});

/** Money movement: low ceiling, per account. */
const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Per-account when authenticated; falls back to the IPv6-safe IP key so a
  // single /64 prefix can't rotate addresses to bypass the limit.
  keyGenerator: (req, res) =>
    req.user?._id?.toString() || ipKeyGenerator(req.ip, 56) || req.ip,
  message: {
    success: false,
    message: "Too many withdrawal requests. Please try again later.",
  },
});

/**
 * Strips MongoDB operator injection ($gt, $ne, dotted paths) from user input.
 *
 * Hand-rolled instead of using `express-mongo-sanitize` directly because that
 * package reassigns `req.query`, which is a getter-only property in Express 5
 * and throws. This mutates the existing objects in place, so it is safe on both
 * Express 4 and 5.
 */
const sanitizeValue = (value, depth = 0) => {
  if (depth > 10 || value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((v) => sanitizeValue(v, depth + 1));
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    sanitizeValue(value[key], depth + 1);
  }
};

const mongoSanitize = (req, res, next) => {
  sanitizeValue(req.body);
  sanitizeValue(req.params);
  // req.query is a getter in Express 5 — mutate the object it returns.
  if (req.query) sanitizeValue(req.query);
  next();
};

/**
 * HTTP Parameter Pollution guard.
 * `whitelist` covers params that are legitimately repeatable.
 */
const parameterPollution = hpp({
  whitelist: ["size", "sizes", "category", "tags", "sort", "color", "status"],
});

module.exports = {
  secureHeaders,
  apiLimiter,
  authLimiter,
  otpLimiter,
  withdrawalLimiter,
  mongoSanitize,
  parameterPollution,
};

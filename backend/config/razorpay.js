const Razorpay = require("razorpay");

/**
 * Razorpay client.
 *
 * This module used to call `process.exit(1)` at import time when the keys were
 * missing. `server.js` requires it transitively (server -> routes/payment ->
 * here) *before* the HTTP listener is created, so on any host where the
 * Razorpay variables are not configured the whole API died during boot with no
 * log line and exit code 1 — every endpoint, not just payments. Locally a
 * populated `.env` hid the problem entirely, which is exactly why it only ever
 * showed up in production.
 *
 * Payments are one feature of the API. A missing payment credential must
 * degrade that feature, never take the catalog, auth and cart down with it, so
 * the client is created only when it can be, and callers check
 * `isRazorpayConfigured` and answer 503 for the payment endpoints alone.
 */
const isRazorpayConfigured = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
);

let razorpayInstance = null;

if (isRazorpayConfigured) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log("Razorpay initialized successfully");
} else {
  console.warn(
    "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set - payment endpoints will return 503, the rest of the API is unaffected.",
  );
}

// When configured, export the real client so existing callers keep working
// unchanged (`razorpayInstance.orders.create(...)`). When it is not configured
// export an inert stand-in whose payment methods reject with a clear error, so
// a mistakenly unguarded call fails as a normal handled 500 instead of a
// `TypeError: Cannot read properties of null`.
const notConfigured = () => {
  const err = new Error(
    "Razorpay is not configured on this server (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).",
  );
  err.code = "PAYMENTS_UNAVAILABLE";
  err.statusCode = 503;
  return Promise.reject(err);
};

const stub = {
  orders: { create: notConfigured, fetch: notConfigured, all: notConfigured },
  payments: {
    fetch: notConfigured,
    capture: notConfigured,
    refund: notConfigured,
  },
};

module.exports = razorpayInstance || stub;
module.exports.isRazorpayConfigured = isRazorpayConfigured;
module.exports.getRazorpayInstance = () => razorpayInstance;

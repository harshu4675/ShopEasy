/**
 * Price parsing utilities.
 */

/**
 * Parse a price string to a number in the minor unit (e.g. INR paise to rupees).
 * Handles formats like:
 *   ₹1,299
 *   ₹ 1,299.00
 *   $29.99
 *   1299
 *   1,299
 */
function parsePrice(str) {
  if (str == null) return null;
  if (typeof str === 'number') return str;

  const cleaned = String(str)
    .replace(/[₹€$£¥,]/g, '')   // remove currency symbols and commas
    .replace(/\s+/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse a discount percentage string.
 * "47% off" → 47
 * "Save 30%" → 30
 */
function parseDiscount(str) {
  if (str == null) return null;
  if (typeof str === 'number') return Math.round(str);

  const match = String(str).match(/(\d+)\s*%/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * Extract structured price information from various inputs.
 * Returns { price, originalPrice, currency, discountPercentage } or null.
 */
function extractPrice(options) {
  const {
    price,
    originalPrice,
    mrp,
    salePrice,
    discount,
    discountPercentage,
    currency = 'INR',
  } = options;

  const result = {};

  // Determine the sale price
  const sale = parsePrice(price || salePrice);
  if (sale !== null) {
    result.price = sale;
  }

  // Determine original / MRP
  const orig = parsePrice(originalPrice || mrp);
  if (orig !== null) {
    result.originalPrice = orig;
  }

  // Calculate discount if not directly provided
  let discPct = parseDiscount(discount || discountPercentage);
  if (discPct === null && result.price && result.originalPrice && result.originalPrice > result.price) {
    discPct = Math.round(((result.originalPrice - result.price) / result.originalPrice) * 100);
  }
  if (discPct !== null && discPct > 0) {
    result.discountPercentage = discPct;
  }

  result.currency = currency || 'INR';

  return Object.keys(result).length > 1 || result.price ? result : null;
}

module.exports = { parsePrice, parseDiscount, extractPrice };
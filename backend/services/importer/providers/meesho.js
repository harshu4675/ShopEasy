/**
 * Meesho provider.
 *
 * Handles Meesho.com product pages.
 */

const BaseProvider = require('./base');
const { parsePriceFromString } = require('../extractors/html');

class MeeshoProvider extends BaseProvider {
  constructor() {
    super('Meesho');
  }

  async mergeData({ html, jsonldData, ogData, htmlData, baseUrl }) {
    const product = {};

    product.title = jsonldData?.title || htmlData?.title || extractMeeshoTitle(html);

    if (jsonldData?.price) {
      product.price = jsonldData.price;
    } else {
      product.price = htmlData?.price || extractMeeshoPrice(html);
    }

    if (htmlData?.originalPrice) {
      product.originalPrice = htmlData.originalPrice;
    } else {
      product.originalPrice = extractMeeshoMrp(html);
    }

    if (htmlData?.discountPercentage) {
      product.discountPercentage = htmlData.discountPercentage;
    } else {
      product.discountPercentage = extractMeeshoDiscount(html);
    }

    product.currency = 'INR';

    if (jsonldData?.images && jsonldData.images.length > 0) {
      product.images = jsonldData.images;
      product.primaryImage = jsonldData.images[0];
    } else if (ogData?.primaryImage) {
      product.primaryImage = ogData.primaryImage;
      product.images = ogData.images || [ogData.primaryImage];
    } else {
      const imgs = extractMeeshoImages(html);
      if (imgs.length > 0) {
        product.images = imgs;
        product.primaryImage = imgs[0];
      }
    }

    product.description = jsonldData?.description || ogData?.description || htmlData?.description || extractMeeshoDescription(html);
    product.brand = jsonldData?.brand || htmlData?.brand || extractMeeshoBrand(html);

    if (jsonldData?.ratingValue) {
      product.ratingValue = jsonldData.ratingValue;
    } else {
      product.ratingValue = htmlData?.ratingValue || extractMeeshoRating(html);
    }

    if (jsonldData?.reviewCount) {
      product.reviewCount = jsonldData.reviewCount;
    } else if (htmlData?.reviewCount) {
      product.reviewCount = htmlData.reviewCount;
    } else {
      product.reviewCount = extractMeeshoReviewCount(html);
    }

    product.sizes = htmlData?.sizes || extractMeeshoSizes(html);
    product.productId = jsonldData?.sku || extractMeeshoProductId(html, baseUrl);

    return product;
  }

  static canHandle(url) {
    const hostname = url.toLowerCase();
    return hostname.includes('meesho.com');
  }
}

function $(html) {
  try { return require('cheerio').load(html); } catch { return null; }
}

function extractMeeshoTitle(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  return $el('h1, .product-name, .prod-title, .title, .pdp-title').first().text().trim() || null;
}

function extractMeeshoPrice(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.price, .selling-price, .offer-price, .sale-price, .final-price, .product-price', 'span[itemprop="price"]'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const parsed = parsePriceFromString(el.text().trim());
      if (parsed !== null && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractMeeshoMrp(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.mrp, .original-price, .old-price, .strike-price, .base-price'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const parsed = parsePriceFromString(el.text().trim());
      if (parsed !== null && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractMeeshoDiscount(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.discount, .offer-discount, .discount-percent, .savings'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const match = el.text().trim().match(/(\d+)\s*%/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

function extractMeeshoImages(html) {
  if (!html) return [];
  const $el = $(html);
  if (!$el) return [];
  const images = [];
  const seen = new Set();
  $el('img[src*="meesho"], .product-image img, .gallery img, img[data-src], .carousel img').each((i, el) => {
    const src = $el(el).attr('src') || $el(el).attr('data-src') || $el(el).attr('data-original');
    if (src && !seen.has(src)) { seen.add(src); images.push(src); }
  });
  return images;
}

function extractMeeshoDescription(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.description, .product-details, .details, .product-description, .info'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text.length > 30) return text;
    }
  }
  return null;
}

function extractMeeshoBrand(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.brand, .seller, .product-brand, .brand-name'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length < 100) return text;
    }
  }
  return null;
}

function extractMeeshoRating(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.rating, .star-rating, .average-rating'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const rating = parseFloat(el.text().trim());
      if (!isNaN(rating) && rating > 0 && rating <= 5) return rating;
    }
  }
  return null;
}

function extractMeeshoReviewCount(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const sel = $el('.review-count, .total-reviews, .rating-count').first();
  if (sel.length) {
    const match = sel.text().trim().match(/([\d,]+)/);
    if (match) return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return null;
}

function extractMeeshoSizes(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const sizes = [];
  $el('.size-selector button, .size-option, [data-size], .size-item, .sizes span').each((i, el) => {
    const text = $el(el).text().trim();
    if (text && !sizes.includes(text)) sizes.push(text);
  });
  return sizes.length > 0 ? sizes : null;
}

function extractMeeshoProductId(html, url) {
  if (url) {
    const match = url.match(/\/product\/(?:[^/]+\/)?([A-Za-z0-9-]+)(?:\/|$|\?)/);
    if (match) return match[1];
  }
  return null;
}

module.exports = MeeshoProvider;
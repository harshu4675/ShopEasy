/**
 * Ajio provider.
 *
 * Handles Ajio.com product pages.
 */

const BaseProvider = require('./base');
const { parsePriceFromString } = require('../extractors/html');

class AjioProvider extends BaseProvider {
  constructor() {
    super('Ajio');
  }

  async mergeData({ html, jsonldData, ogData, htmlData, baseUrl }) {
    const product = {};

    product.title = jsonldData?.title || htmlData?.title || extractAjioTitle(html);

    if (jsonldData?.price) {
      product.price = jsonldData.price;
    } else if (htmlData?.price) {
      product.price = htmlData.price;
    } else {
      product.price = extractAjioPrice(html);
    }

    if (htmlData?.originalPrice) {
      product.originalPrice = htmlData.originalPrice;
    } else {
      product.originalPrice = extractAjioMrp(html);
    }

    if (htmlData?.discountPercentage) {
      product.discountPercentage = htmlData.discountPercentage;
    } else {
      product.discountPercentage = extractAjioDiscount(html);
    }

    product.currency = 'INR';

    if (jsonldData?.images && jsonldData.images.length > 0) {
      product.images = jsonldData.images;
      product.primaryImage = jsonldData.images[0];
    } else if (ogData?.primaryImage) {
      product.primaryImage = ogData.primaryImage;
      product.images = ogData.images || [ogData.primaryImage];
    } else {
      const imgs = extractAjioImages(html);
      if (imgs.length > 0) {
        product.images = imgs;
        product.primaryImage = imgs[0];
      }
    }

    product.description = jsonldData?.description || ogData?.description || htmlData?.description || extractAjioDescription(html);
    product.brand = jsonldData?.brand || htmlData?.brand || extractAjioBrand(html);

    if (jsonldData?.ratingValue) {
      product.ratingValue = jsonldData.ratingValue;
    } else {
      product.ratingValue = extractAjioRating(html);
    }

    if (jsonldData?.reviewCount) {
      product.reviewCount = jsonldData.reviewCount;
    }

    product.sizes = htmlData?.sizes || jsonldData?.sizes || extractAjioSizes(html);
    product.colors = htmlData?.colors || jsonldData?.colors || extractAjioColors(html);
    product.specifications = htmlData?.specifications || extractAjioSpecifications(html);
    product.productId = jsonldData?.sku || extractAjioProductId(html, baseUrl);

    return product;
  }

  static canHandle(url) {
    const hostname = url.toLowerCase();
    return hostname.includes('ajio.com');
  }
}

function $(html) {
  try { return require('cheerio').load(html); } catch { return null; }
}

function extractAjioTitle(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  return $el('h1, .product-name, .title, .prod-title, .pdp-title, .product-title').first().text().trim() || null;
}

function extractAjioPrice(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.price, .final-price, .selling-price, .sale-price, .offer-price, .product-price', 'span[itemprop="price"]'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const parsed = parsePriceFromString(el.text().trim());
      if (parsed !== null && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractAjioMrp(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.original-price, .mrp, .old-price, .striked-price, .base-price, .was-price'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const parsed = parsePriceFromString(el.text().trim());
      if (parsed !== null && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractAjioDiscount(html) {
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

function extractAjioImages(html) {
  if (!html) return [];
  const $el = $(html);
  if (!$el) return [];
  const images = [];
  const seen = new Set();
  $el('img[src*="ajio"], .product-image img, .gallery img, img[data-src], .carousel img').each((i, el) => {
    const src = $el(el).attr('src') || $el(el).attr('data-src');
    if (src && !seen.has(src)) { seen.add(src); images.push(src); }
  });
  return images;
}

function extractAjioDescription(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.description, .product-description, .details, .product-details, .about-product, .info'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text.length > 30) return text;
    }
  }
  return null;
}

function extractAjioBrand(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.brand, .product-brand, .brand-name, .seller, .brand-logo'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length < 100) return text;
    }
  }
  return null;
}

function extractAjioRating(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = ['.rating, .star-rating, .average-rating, .rating-value', '.stars span'];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const rating = parseFloat(el.text().trim());
      if (!isNaN(rating) && rating > 0 && rating <= 5) return rating;
    }
  }
  return null;
}

function extractAjioSizes(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const sizes = [];
  $el('.size-selector button, .size-option, [data-size], .size-item, .size-button, .sizes span').each((i, el) => {
    const text = $el(el).text().trim();
    if (text && !sizes.includes(text)) sizes.push(text);
  });
  return sizes.length > 0 ? sizes : null;
}

function extractAjioColors(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const colors = [];
  $el('.color-selector button, .color-option, [data-color], .color-item, .color-swatch, .colors span').each((i, el) => {
    const text = $el(el).text().trim() || $el(el).attr('aria-label') || '';
    if (text && !colors.includes(text)) colors.push(text);
  });
  return colors.length > 0 ? colors : null;
}

function extractAjioSpecifications(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const specs = {};
  $el('.spec-table tr, .product-details tr, .attributes tr, .info-table tr').each((i, tr) => {
    const cells = $el(tr).find('td, th');
    if (cells.length >= 2) {
      const key = $el(cells[0]).text().trim();
      const val = $el(cells[cells.length - 1]).text().trim();
      if (key && val && !specs[key]) specs[key] = val;
    }
  });
  return Object.keys(specs).length > 0 ? specs : null;
}

function extractAjioProductId(html, url) {
  if (url) {
    const match = url.match(/\/product\/(?:[^/]+\/)?([A-Za-z0-9-]+)(?:\/|$|\?)/);
    if (match) return match[1];
  }
  return null;
}

module.exports = AjioProvider;
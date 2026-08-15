/**
 * Myntra provider.
 *
 * Handles Myntra.com product pages.
 */

const BaseProvider = require('./base');
const { parsePriceFromString } = require('../extractors/html');

class MyntraProvider extends BaseProvider {
  constructor() {
    super('Myntra');
  }

  async mergeData({ html, jsonldData, ogData, htmlData, baseUrl }) {
    const product = {};

    // Title
    product.title = jsonldData?.title || htmlData?.title || extractMyntraTitle(html);

    // Price
    if (jsonldData?.price) {
      product.price = jsonldData.price;
    } else if (htmlData?.price) {
      product.price = htmlData.price;
    } else {
      product.price = extractMyntraPrice(html);
    }

    // Original Price
    if (htmlData?.originalPrice) {
      product.originalPrice = htmlData.originalPrice;
    } else {
      product.originalPrice = extractMyntraMrp(html);
    }

    // Discount
    if (htmlData?.discountPercentage) {
      product.discountPercentage = htmlData.discountPercentage;
    } else {
      product.discountPercentage = extractMyntraDiscount(html);
    }

    product.currency = 'INR';

    // Images
    if (jsonldData?.images && jsonldData.images.length > 0) {
      product.images = jsonldData.images;
      product.primaryImage = jsonldData.images[0];
    } else if (ogData?.primaryImage) {
      product.primaryImage = ogData.primaryImage;
      product.images = ogData.images || [ogData.primaryImage];
    } else {
      const imgs = extractMyntraImages(html);
      if (imgs.length > 0) {
        product.images = imgs;
        product.primaryImage = imgs[0];
      }
    }

    // Description
    product.description = jsonldData?.description || ogData?.description || htmlData?.description || extractMyntraDescription(html);

    // Brand
    product.brand = jsonldData?.brand || htmlData?.brand || extractMyntraBrand(html);

    // Rating
    if (jsonldData?.ratingValue) {
      product.ratingValue = jsonldData.ratingValue;
    } else {
      product.ratingValue = extractMyntraRating(html);
    }

    if (jsonldData?.reviewCount) {
      product.reviewCount = jsonldData.reviewCount;
    } else {
      product.reviewCount = extractMyntraReviewCount(html);
    }

    // Category / Breadcrumbs
    if (jsonldData?.breadcrumbs) {
      product.breadcrumbs = jsonldData.breadcrumbs;
      product.category = jsonldData.breadcrumbs[jsonldData.breadcrumbs.length - 1];
    } else if (htmlData?.breadcrumbs) {
      product.breadcrumbs = htmlData.breadcrumbs;
      product.category = htmlData.category;
    } else {
      const bc = extractMyntraBreadcrumbs(html);
      if (bc.length > 0) {
        product.breadcrumbs = bc;
        product.category = bc[bc.length - 1];
      }
    }

    // Sizes
    product.sizes = htmlData?.sizes || jsonldData?.sizes || extractMyntraSizes(html, html);

    // Colors
    product.colors = htmlData?.colors || jsonldData?.colors || extractMyntraColors(html);

    // Specifications
    if (htmlData?.specifications) {
      product.specifications = htmlData.specifications;
    } else {
      product.specifications = extractMyntraSpecifications(html);
    }

    // Product ID
    product.productId = jsonldData?.sku || extractMyntraProductId(html, baseUrl);

    // Availability
    product.stockStatus = jsonldData?.stockStatus || extractMyntraAvailability(html);

    return product;
  }

  static canHandle(url) {
    const hostname = url.toLowerCase();
    return hostname.includes('myntra.com');
  }
}

function $(html) {
  try { return require('cheerio').load(html); } catch { return null; }
}

function extractMyntraTitle(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const sel = $el('h1, .pdp-title, .title-name, .product-title, .base-name, [data-target="productName"], .product-name').first();
  return sel.length ? sel.text().trim() : null;
}

function extractMyntraPrice(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.pdp-price',
    '.selling-price',
    '.price-value',
    '.product-price',
    '.discounted-price',
    '.sale-price',
    'span[itemprop="price"]',
    '.price-section .offer-price',
    '.price',
  ];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim() || el.attr('content') || '';
      const parsed = parsePriceFromString(text);
      if (parsed !== null && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractMyntraMrp(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.pdp-mrp',
    '.strike-price',
    '.original-price',
    '.old-price',
    '.mrp',
    '.base-price',
    '.price-section .original-price',
    '.price-strike',
    '.striked-price',
  ];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      const parsed = parsePriceFromString(text);
      if (parsed !== null && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractMyntraDiscount(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.discount',
    '.discount-percent',
    '.badge-discount',
    '.offer-discount',
    '._1M601w',
    '.pdp-discount',
    '.savings',
    '.discount-text',
    '.price-section .discount',
  ];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      const match = text.match(/(\d+)\s*%/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

function extractMyntraImages(html) {
  if (!html) return [];
  const $el = $(html);
  if (!$el) return [];
  const images = [];
  const seen = new Set();
  const selectors = [
    'img[src*="myntra"]',
    '.image-grid img',
    '.product-image img',
    '.gallery-item img',
    '.slides img',
    '.pdp-image-container img',
    'img[data-src]',
    '.img-container img',
  ];
  for (const sel of selectors) {
    $el(sel).each((i, el) => {
      const src = $el(el).attr('src') || $el(el).attr('data-src');
      if (src && !seen.has(src)) {
        // Myntra often serves thumbnails; try to get hi-res
        const hiRes = src.replace(/\._(.*?)\.jpg/, '.jpg');
        seen.add(hiRes);
        images.push(hiRes);
      }
    });
    if (images.length > 0) break;
  }
  return images;
}

function extractMyntraDescription(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.pdp-description',
    '.product-description',
    '.description',
    '.details-section',
    '.product-details',
    '.description-content',
    '.about-section',
    '.product-info',
    '.details',
  ];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text.length > 30) return text;
    }
  }
  return null;
}

function extractMyntraBrand(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.brand',
    '.product-brand',
    '.brand-name',
    '.pdp-brand',
    'h3.brand',
    '.seller-name',
    '.product-brand-name',
    '[itemprop="brand"]',
  ];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length < 100) return text;
    }
  }
  return null;
}

function extractMyntraRating(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.rating',
    '.star-rating',
    '.average-rating',
    '.product-rating',
    '.rating-value',
    '.rating-avg',
    '.index-overview__rating__number',
  ];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      const rating = parseFloat(text);
      if (!isNaN(rating) && rating > 0 && rating <= 5) return rating;
    }
  }
  return null;
}

function extractMyntraReviewCount(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.rating-reviews',
    '.review-count',
    '.total-reviews',
    '.product-review-count',
    '.index-overview__rating__count',
  ];
  for (const sel of selectors) {
    const el = $el(sel).first();
    if (el.length) {
      const text = el.text().trim();
      const match = text.match(/([\d,]+)/);
      if (match) return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }
  return null;
}

function extractMyntraBreadcrumbs(html) {
  if (!html) return [];
  const $el = $(html);
  if (!$el) return [];
  const breadcrumbs = [];
  const selectors = [
    '.breadcrumb a',
    '.breadcrumbs a',
    '.breadcrumb-list a',
    '.bread-crumb a',
  ];
  for (const sel of selectors) {
    breadcrumbs.length = 0;
    $el(sel).each((i, el) => {
      const text = $el(el).text().trim();
      if (text && !breadcrumbs.includes(text)) breadcrumbs.push(text);
    });
    if (breadcrumbs.length > 0) return breadcrumbs;
  }
  return breadcrumbs;
}

function extractMyntraSizes(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const sizes = [];
  const selectors = [
    '.size-button',
    '.size-option',
    '.size-variant',
    '[data-size]',
    '.pdp-size button',
    '.size-item',
    '.size-selector div[class*="size"]',
    '.size-list span',
    '.sizes-list li',
    'button[data-value]',
  ];
  for (const sel of selectors) {
    sizes.length = 0;
    $el(sel).each((i, el) => {
      const text = $el(el).text().trim();
      if (text && !sizes.includes(text)) sizes.push(text);
    });
    if (sizes.length > 0) return sizes;
  }
  // Also check for any button/label with size-like text near "SIZE" label
  if (sizes.length === 0) {
    $el('div, span, button').each((i, el) => {
      const text = $el(el).text().trim();
      if (/^(XS|S|M|L|XL|XXL|XXXL|\d{1,2})$/.test(text) && text.length <= 4) {
        if (!sizes.includes(text)) sizes.push(text);
      }
    });
  }
  return sizes.length > 0 ? sizes : null;
}

function extractMyntraColors(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const colors = [];
  const selectors = [
    '.color-label',
    '.color-swatch',
    '.color-option',
    '[data-color]',
    '.colors-list li',
    '.pdp-color button',
    '.color-item',
    '.color-variant',
    'a[data-color]',
  ];
  for (const sel of selectors) {
    colors.length = 0;
    $el(sel).each((i, el) => {
      const text = $el(el).text().trim() || $el(el).attr('aria-label') || $el(el).attr('data-label') || '';
      if (text && !colors.includes(text)) colors.push(text);
    });
    if (colors.length > 0) return colors;
  }
  return null;
}

function extractMyntraSpecifications(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const specs = {};
  const selectors = [
    '.product-details tr',
    '.spec-table tr',
    '.details-table tr',
    '.pdp-details tr',
    '.index-details tr',
    '.info-section tr',
    '.attributes tr',
  ];
  for (const sel of selectors) {
    $el(sel).each((i, tr) => {
      const cells = $el(tr).find('td, th');
      if (cells.length >= 2) {
        const key = $el(cells[0]).text().trim();
        const val = $el(cells[cells.length - 1]).text().trim();
        if (key && val && !specs[key]) specs[key] = val;
      }
    });
    if (Object.keys(specs).length > 0) return specs;
  }
  // Try definition lists or div-based specs
  $el('.detail-item, .spec-item, .attr-item').each((i, el) => {
    const text = $el(el).text().trim();
    const sep = text.match(/^(.+?)[:：](.+)$/);
    if (sep) specs[sep[1].trim()] = sep[2].trim();
  });
  return Object.keys(specs).length > 0 ? specs : null;
}

function extractMyntraProductId(html, url) {
  if (url) {
    const match = url.match(/\/product\/(?:[^/]+\/)?([A-Za-z0-9]+)(?:\/|$|\?)/);
    if (match) return match[1];
  }
  return null;
}

function extractMyntraAvailability(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const text = $el('body').text().toLowerCase();
  if (text.includes('out of stock') || text.includes('sold out')) return 'out_of_stock';
  if (text.includes('in stock')) return 'in_stock';
  return null;
}

module.exports = MyntraProvider;
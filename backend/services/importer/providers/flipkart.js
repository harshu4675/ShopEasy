/**
 * Flipkart provider.
 *
 * Handles Flipkart.com product pages.
 */

const BaseProvider = require('./base');
const { parsePriceFromString } = require('../extractors/html');

class FlipkartProvider extends BaseProvider {
  constructor() {
    super('Flipkart');
  }

  async mergeData({ html, jsonldData, ogData, htmlData, baseUrl }) {
    const product = {};

    // Title
    if (jsonldData?.title) {
      product.title = jsonldData.title;
    } else {
      product.title = htmlData?.title || extractFlipkartTitle(html);
    }

    // Price
    if (jsonldData?.price) {
      product.price = jsonldData.price;
    } else if (htmlData?.price) {
      product.price = htmlData.price;
    } else {
      product.price = extractFlipkartPrice(html);
    }

    // Original Price
    if (htmlData?.originalPrice) {
      product.originalPrice = htmlData.originalPrice;
    } else {
      product.originalPrice = extractFlipkartMrp(html);
    }

    // Discount
    if (htmlData?.discountPercentage) {
      product.discountPercentage = htmlData.discountPercentage;
    } else {
      product.discountPercentage = extractFlipkartDiscount(html);
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
      const imgs = extractFlipkartImages(html);
      if (imgs.length > 0) {
        product.images = imgs;
        product.primaryImage = imgs[0];
      }
    }

    // Description
    if (jsonldData?.description) {
      product.description = jsonldData.description;
    } else if (ogData?.description) {
      product.description = ogData.description;
    } else if (htmlData?.description) {
      product.description = htmlData.description;
    } else {
      product.description = extractFlipkartDescription(html);
    }

    // Brand
    if (jsonldData?.brand) {
      product.brand = jsonldData.brand;
    } else if (htmlData?.brand) {
      product.brand = htmlData.brand;
    } else {
      product.brand = extractFlipkartBrand(html);
    }

    // Rating
    if (jsonldData?.ratingValue) {
      product.ratingValue = jsonldData.ratingValue;
    } else {
      product.ratingValue = extractFlipkartRating(html);
    }

    if (jsonldData?.reviewCount) {
      product.reviewCount = jsonldData.reviewCount;
    } else {
      product.reviewCount = extractFlipkartReviewCount(html);
    }

    // Category / Breadcrumbs
    if (jsonldData?.breadcrumbs) {
      product.breadcrumbs = jsonldData.breadcrumbs;
      product.category = jsonldData.breadcrumbs[jsonldData.breadcrumbs.length - 1];
    } else if (htmlData?.breadcrumbs) {
      product.breadcrumbs = htmlData.breadcrumbs;
      product.category = htmlData.category;
    } else {
      const bc = extractFlipkartBreadcrumbs(html);
      if (bc.length > 0) {
        product.breadcrumbs = bc;
        product.category = bc[bc.length - 1];
      }
    }

    // Specifications
    if (htmlData?.specifications) {
      product.specifications = htmlData.specifications;
    } else {
      product.specifications = extractFlipkartSpecifications(html);
    }

    // Features
    if (htmlData?.features) {
      product.features = htmlData.features;
    } else {
      product.features = extractFlipkartFeatures(html);
    }

    // Availability
    if (jsonldData?.stockStatus) {
      product.stockStatus = jsonldData.stockStatus;
    } else {
      product.stockStatus = extractFlipkartAvailability(html);
    }

    // Seller
    product.sellerName = extractFlipkartSeller(html);

    // Product ID
    product.productId = jsonldData?.sku || extractFlipkartProductId(html, baseUrl);

    return product;
  }

  static canHandle(url) {
    const hostname = url.toLowerCase();
    return hostname.includes('flipkart.com');
  }
}

function $(html) {
  try {
    return require('cheerio').load(html);
  } catch { return null; }
}

function extractFlipkartTitle(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const sel = $el('h1 span[itemprop="name"], .B_NuCI, h1, .product-title, .title-section').first();
  return sel.length ? sel.text().trim() : null;
}

function extractFlipkartPrice(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '._30jeq3',
    '._16Jk6d',
    '.price',
    '[itemprop="price"]',
    '.selling-price',
    '.Nx9bqj',
    '.CEmiEU',
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

function extractFlipkartMrp(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '._3I9_wc',
    '._3Ay_Be',
    '.mrp-price',
    '.old-price',
    '.strike-price',
    '.yFcR3w',
    '.WNoq6m',
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

function extractFlipkartDiscount(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '._3Ay_Be ._3Ay_Be',
    '.discount',
    '.UkUFwK',
    '.badge-discount',
    '.discount-percent',
    '.WNoq6m + span',
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

function extractFlipkartImages(html) {
  if (!html) return [];
  const $el = $(html);
  if (!$el) return [];
  const images = [];
  const seen = new Set();
  const selectors = [
    '._396cs4 img',
    '._2_AcLJ img',
    '._3togXc img',
    '._2wU9MX img',
    '.product-images img',
    'img[data-src]',
    'img._2rvh6j',
    '.CXW8mj img',
    '._1kidPb img',
  ];
  for (const sel of selectors) {
    $el(sel).each((i, el) => {
      const src = $el(el).attr('src') || $el(el).attr('data-src');
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push(src);
      }
    });
    if (images.length > 0) break;
  }
  return images;
}

function extractFlipkartDescription(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '._1mXcCf',
    '.product-description',
    '._3mJWbC',
    '.description-section',
    '.product-details',
    '._3wU53n',
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

function extractFlipkartBrand(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '._2B_pmu',
    '.seller-name',
    '.brand',
    '.product-brand',
    '._3aQbwt',
    '._2INHSN',
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

function extractFlipkartRating(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '._3LWZlK',
    '.rating-number',
    '.average-rating',
    '.rating-value',
    '._2d4LTz',
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

function extractFlipkartReviewCount(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '._2_R_DZ span',
    '.rating-count',
    '.review-count',
    '._1rQCI8',
    '.total-reviews',
    '.col-4-12 span',
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

function extractFlipkartBreadcrumbs(html) {
  if (!html) return [];
  const $el = $(html);
  if (!$el) return [];
  const breadcrumbs = [];
  const selectors = [
    '._1D814T a',
    '.breadcrumb a',
    '.breadcrumbs a',
    '._3N7KZz a',
    '.iWQ19W a',
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

function extractFlipkartSpecifications(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const specs = {};
  const selectors = [
    '._1UhVsV table tr',
    '._3_6Uyw tr',
    '.spec-table tr',
    '.product-specs tr',
    '.specifications tr',
    '._3k3N3S tr',
    '._1YokD2 ._3k3N3S tr',
    '.row .col-6-12 tr',
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
  return null;
}

function extractFlipkartFeatures(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const features = [];
  const selectors = [
    '._3mJWbC li',
    '.features-list li',
    '.highlights li',
    '._1mXcCf li',
    '._2cM9mP li',
    '.product-features li',
    '.key-features li',
  ];
  for (const sel of selectors) {
    features.length = 0;
    $el(sel).each((i, el) => {
      const text = $el(el).text().trim();
      if (text && text.length > 5) features.push(text);
    });
    if (features.length >= 3) return features;
  }
  return features.length > 0 ? features : null;
}

function extractFlipkartAvailability(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const text = $el('body').text().toLowerCase();
  if (text.includes('out of stock') || text.includes('sold out')) return 'out_of_stock';
  if (text.includes('in stock') || text.includes('available')) return 'in_stock';
  return null;
}

function extractFlipkartSeller(html) {
  if (!html) return null;
  const $el = $(html);
  if (!$el) return null;
  const selectors = [
    '.seller-name a',
    '._3M2TZb a',
    '.seller-info a',
    '._2JpNOH a',
    '.seller-link a',
    '._1ZqQKv',
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

function extractFlipkartProductId(html, url) {
  // Try from URL first
  if (url) {
    const match = url.match(/\/product\/(?:[^/]+\/)?([A-Za-z0-9]+)(?:\/|$|\?)/);
    if (match) return match[1];
  }
  return null;
}

module.exports = FlipkartProvider;
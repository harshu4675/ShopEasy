/**
 * Amazon provider.
 *
 * Handles Amazon.in and Amazon.com product pages.
 * Uses platform-specific extraction patterns.
 */

const BaseProvider = require('./base');
const { extractProductFromJsonLd } = require('../extractors/jsonld');
const { extractProductFromOpenGraph } = require('../extractors/opengraph');
const { extractFromHtml, parsePriceFromString } = require('../extractors/html');

class AmazonProvider extends BaseProvider {
  constructor() {
    super('Amazon');
  }

  async mergeData({ html, jsonldData, ogData, htmlData, baseUrl }) {
    const product = {};

    // Title: Amazon often has it in JSON-LD, but also in the HTML
    if (jsonldData?.title) {
      product.title = jsonldData.title;
    } else if (htmlData?.title) {
      product.title = htmlData.title;
    } else {
      // Try Amazon's specific title element
      const $ = cheerioLoad(html);
      const titleEl = $('#productTitle').first();
      if (titleEl.length) {
        product.title = titleEl.text().trim();
      }
    }

    // Price: JSON-LD usually has the correct price
    if (jsonldData?.price) {
      product.price = jsonldData.price;
    } else if (htmlData?.price) {
      product.price = htmlData.price;
    } else {
      // Amazon-specific price extraction
      product.price = extractAmazonPrice(html);
    }

    // Original Price / MRP
    if (htmlData?.originalPrice) {
      product.originalPrice = htmlData.originalPrice;
    } else {
      product.originalPrice = extractAmazonMrp(html);
    }

    // Discount
    if (htmlData?.discountPercentage) {
      product.discountPercentage = htmlData.discountPercentage;
    } else {
      product.discountPercentage = extractAmazonDiscount(html);
    }

    // Currency
    product.currency = 'INR';

    // Images
    if (jsonldData?.images && jsonldData.images.length > 0) {
      product.images = jsonldData.images;
      product.primaryImage = jsonldData.images[0];
    } else if (ogData?.primaryImage) {
      product.primaryImage = ogData.primaryImage;
      product.images = ogData.images || [ogData.primaryImage];
    } else {
      const amazonImages = extractAmazonImages(html);
      if (amazonImages.length > 0) {
        product.images = amazonImages;
        product.primaryImage = amazonImages[0];
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
      product.description = extractAmazonDescription(html);
    }

    // Brand
    if (jsonldData?.brand) {
      product.brand = jsonldData.brand;
    } else if (htmlData?.brand) {
      product.brand = htmlData.brand;
    } else {
      product.brand = extractAmazonBrand(html);
    }

    // Rating
    if (jsonldData?.ratingValue) {
      product.ratingValue = jsonldData.ratingValue;
    } else {
      product.ratingValue = extractAmazonRating(html);
    }

    if (jsonldData?.reviewCount) {
      product.reviewCount = jsonldData.reviewCount;
    } else {
      product.reviewCount = extractAmazonReviewCount(html);
    }

    // Category
    if (jsonldData?.breadcrumbs && jsonldData.breadcrumbs.length > 0) {
      product.breadcrumbs = jsonldData.breadcrumbs;
      product.category = jsonldData.breadcrumbs[jsonldData.breadcrumbs.length - 1];
    } else if (htmlData?.breadcrumbs) {
      product.breadcrumbs = htmlData.breadcrumbs;
      product.category = htmlData.category;
    } else {
      const bc = extractAmazonBreadcrumbs(html);
      if (bc.length > 0) {
        product.breadcrumbs = bc;
        product.category = bc[bc.length - 1];
      }
    }

    // SKU / ASIN
    if (jsonldData?.sku) {
      product.sku = jsonldData.sku;
    }
    const asin = extractAmazonAsin(html, baseUrl);
    if (asin) {
      product.productId = asin;
      product.asin = asin;
    }

    // Features
    if (jsonldData?.features) {
      product.features = jsonldData.features;
    } else {
      product.features = extractAmazonFeatures(html);
    }

    // Specifications
    if (htmlData?.specifications) {
      product.specifications = htmlData.specifications;
    } else {
      product.specifications = extractAmazonSpecifications(html);
    }

    // Availability
    if (jsonldData?.stockStatus) {
      product.stockStatus = jsonldData.stockStatus;
    } else {
      product.stockStatus = extractAmazonAvailability(html);
    }

    // Seller
    product.sellerName = extractAmazonSeller(html);

    return product;
  }

  static canHandle(url) {
    const hostname = url.toLowerCase();
    return hostname.includes('amazon.in') || hostname.includes('amazon.com');
  }
}

// --- Amazon-specific extraction functions ---

function cheerioLoad(html) {
  try {
    const cheerio = require('cheerio');
    return cheerio.load(html);
  } catch {
    return null;
  }
}

function extractAmazonPrice(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  // Try various price selectors specific to Amazon
  const selectors = [
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price-whole',
    '.a-price .a-offscreen',
    '.priceToPay .a-price-whole',
    '.a-price .a-price-fraction',
    'span[data-a-size="xl"] .a-price-whole',
    '.a-price .a-text-price .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-price-whole',
    '.a-spacing-none .a-price .a-offscreen',
    '.a-section .a-price .a-offscreen',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (!el.length) continue;

    let text;
    if (sel.includes('a-offscreen')) {
      text = el.text().trim() || el.attr('aria-label') || '';
    } else if (sel.includes('a-price-whole')) {
      const whole = el.text().trim();
      const fraction = el.closest('.a-price').find('.a-price-fraction').first().text().trim();
      text = whole + (fraction ? '.' + fraction : '');
    } else {
      text = el.text().trim() || el.attr('aria-label') || '';
    }

    const parsed = parsePriceFromString(text);
    if (parsed !== null && parsed > 0) return parsed;
  }

  return null;
}

function extractAmazonMrp(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const selectors = [
    '.a-text-price .a-offscreen',
    '.priceBlockStrikePriceString',
    '.base-price',
    '.a-price .a-text-price span.a-offscreen',
    'span[data-a-strike] .a-offscreen',
    '.a-price.a-text-price',
    '#listPrice',
    '.a-text-price span[aria-hidden="true"]',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (!el.length) continue;
    const text = el.text().trim();
    // Skip if it matches the current sale price
    const parsed = parsePriceFromString(text);
    if (parsed !== null && parsed > 0) return parsed;
  }

  return null;
}

function extractAmazonDiscount(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const selectors = [
    '.savingsPercentage',
    '.priceSave .a-letter-space',
    '.a-color-price .a-text-bold',
    '.a-box .a-color-price',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (!el.length) continue;
    const text = el.text().trim();
    const match = text.match(/(\d+)\s*%/);
    if (match) return parseInt(match[1], 10);
  }

  return null;
}

function extractAmazonImages(html) {
  if (!html) return [];
  const $ = cheerioLoad(html);
  if (!$) return [];

  const images = [];
  const seen = new Set();

  // Main image
  const mainImg = $('#landingImage, #imgTagWrapperId img, #main-image, .a-dynamic-image');
  mainImg.each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-old-hires') || $(el).attr('data-a-dynamic-image');
    if (src) {
      // data-a-dynamic-image may contain JSON
      try {
        const parsed = JSON.parse(src);
        const urls = Object.keys(parsed).sort((a, b) => parsed[b] - parsed[a]);
        urls.forEach(u => {
          if (!seen.has(u)) {
            seen.add(u);
            images.push(u);
          }
        });
      } catch {
        if (!seen.has(src)) {
          seen.add(src);
          images.push(src);
        }
      }
    }
  });

  // Gallery / thumbnails
  $('.a-spacing-small img, .a-spacing-micro img, #altImages img, .imageThumbnail img, .a-button-thumbnail img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) {
      // Use higher-res by replacing thumbnail sizes
      const hiRes = src
        .replace(/\._SX\d+_\./i, '.')
        .replace(/\._SY\d+_\./i, '.')
        .replace(/\._UX\d+_\./i, '.')
        .replace(/\._UY\d+_\./i, '.')
        .replace(/\._AC_.*?\./i, '.');
      if (!seen.has(hiRes)) {
        seen.add(hiRes);
        images.push(hiRes);
      }
    }
  });

  return images;
}

function extractAmazonDescription(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const selectors = [
    '#productDescription',
    '#productDescription_fullView',
    '.product-description',
    '#feature-bullets',
    '.a-spacing-mini',
    '#productDescription_feature_div',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length > 30) return text;
    }
  }

  return null;
}

function extractAmazonBrand(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const selectors = [
    '#bylineInfo',
    '.brand-link',
    'a[href*="brand"]',
    '#productOverview_feature_div tr:contains("Brand") td',
    '.a-section .a-row:contains("Brand") span',
    '#productDetails_detailBullets_sections1 tr:contains("Brand") td',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      let text = el.text().trim();
      // Clean up "Visit the ... Store" pattern
      text = text.replace(/^visit the\s+/i, '').replace(/\s+store$/i, '');
      if (text && text.length > 0 && text.length < 100) return text;
    }
  }

  return null;
}

function extractAmazonRating(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const selectors = [
    'span[data-hook="rating-out-of-text"]',
    '.a-star-rating .a-icon-alt',
    'i.a-icon-star .a-icon-alt',
    'i.a-icon-star span',
    '#averageCustomerReviews .a-star-rating',
    '.averageStarRating',
    '.acrPopover .a-icon-star .a-icon-alt',
    'span[data-hook="average-review-rating"]',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (!el.length) continue;
    const text = el.text().trim() || el.attr('aria-label') || '';
    const match = text.match(/([\d.]+)\s*out\s*of\s*5/i) || text.match(/([\d.]+)/);
    if (match) {
      const rating = parseFloat(match[1]);
      if (!isNaN(rating) && rating > 0 && rating <= 5) return rating;
    }
  }

  return null;
}

function extractAmazonReviewCount(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const selectors = [
    '#acrCustomerReviewText',
    'span[data-hook="total-review-count"]',
    '.totalReviewCount',
    '#averageCustomerReviews .a-size-base',
    '.a-star-rating ~ .a-size-base',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (!el.length) continue;
    const text = el.text().trim();
    const match = text.match(/([\d,]+)/);
    if (match) return parseInt(match[1].replace(/,/g, ''), 10);
  }

  return null;
}

function extractAmazonBreadcrumbs(html) {
  if (!html) return [];
  const $ = cheerioLoad(html);
  if (!$) return [];

  const breadcrumbs = [];
  const selectors = [
    '#wayfinding-breadcrumbs_container ul li a',
    '.a-breadcrumb li a',
    '#Breadcrumbs li a',
    '.breadcrumb li a',
    '[data-testid="breadcrumb"] li span',
    '.nav-a-content',
  ];

  for (const sel of selectors) {
    breadcrumbs.length = 0;
    $(sel).each((i, el) => {
      const text = $(el).text().trim();
      if (text && !breadcrumbs.includes(text)) {
        breadcrumbs.push(text);
      }
    });
    if (breadcrumbs.length > 0) return breadcrumbs;
  }

  return breadcrumbs;
}

function extractAmazonAsin(html, url) {
  // Try from URL first
  if (url) {
    const match = url.match(/(?:dp|product|ASIN)\/([A-Z0-9]{10})(?:\/|$|\?)/i);
    if (match) return match[1];
  }

  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  // Look in hidden attributes / meta
  const asinSelectors = [
    'input[name="ASIN"]',
    'input[name="asin"]',
    '[data-asin]',
    '#ASIN',
    'link[rel="canonical"]',
  ];

  for (const sel of asinSelectors) {
    const el = $(sel).first();
    if (el.length) {
      if (sel.includes('input')) return el.attr('value');
      if (sel.includes('data-asin')) return el.attr('data-asin');
      if (sel === '#ASIN') return el.text().trim();
      if (sel.includes('canonical')) {
        const href = el.attr('href') || '';
        const m = href.match(/(?:dp|product)\/([A-Z0-9]{10})/i);
        if (m) return m[1];
      }
    }
  }

  return null;
}

function extractAmazonFeatures(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const features = [];
  const selectors = [
    '#feature-bullets li span',
    '#key-features li',
    '.product-facts li',
    '.a-ordered-list li span',
    '.a-unordered-list li span',
    '#productDetails_feature_div li',
  ];

  for (const sel of selectors) {
    features.length = 0;
    $(sel).each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 5 && text.length < 500) {
        features.push(text);
      }
    });
    if (features.length >= 3) return features;
  }

  return features.length > 0 ? features : null;
}

function extractAmazonSpecifications(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const specs = {};
  const selectors = [
    '#productDetails_detailBullets_sections1 tr',
    '#productDetails_techSpec_section2 tr',
    '.a-spacing-small tr',
    '.prodDetTable tr',
    '.table-bordered tr',
  ];

  for (const sel of selectors) {
    $(sel).each((i, tr) => {
      const th = $(tr).find('th, td:first-child').text().trim();
      const td = $(tr).find('td:last-child').text().trim();
      if (th && td && !specs[th]) {
        specs[th] = td;
      }
    });
    if (Object.keys(specs).length > 0) return specs;
  }

  return null;
}

function extractAmazonAvailability(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const el = $('#availability span, .a-section .a-color-state, #availability .a-size-medium').first();
  if (el.length) {
    const text = el.text().trim().toLowerCase();
    if (text.includes('in stock')) return 'in_stock';
    if (text.includes('out of stock')) return 'out_of_stock';
    if (text.includes('currently unavailable')) return 'out_of_stock';
    if (text.includes('pre-order')) return 'pre_order';
  }

  return null;
}

function extractAmazonSeller(html) {
  if (!html) return null;
  const $ = cheerioLoad(html);
  if (!$) return null;

  const selectors = [
    '#merchant-info a',
    '.seller-link a',
    '.a-section .a-link-normal[href*="seller"]',
    '#sellerProfileTriggerId',
    '.tabular-buybox .a-section .offerdetail a',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length > 0 && text.length < 100) return text;
    }
  }

  return null;
}

module.exports = AmazonProvider;
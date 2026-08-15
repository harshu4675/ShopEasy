/**
 * Basic HTML / DOM-based extraction.
 *
 * Uses cheerio to parse the HTML and extract common ecommerce product patterns.
 * This is the fallback layer when JSON-LD and OpenGraph don't provide enough data.
 */

const cheerio = require('cheerio');
const { resolveUrl } = require('../utils/url');

/**
 * Extract product data from raw HTML using common ecommerce patterns.
 * @param {string} html - The raw HTML of the page.
 * @param {string} baseUrl - Base URL for resolving relative links.
 * @returns {object|null} Extracted product data.
 */
function extractFromHtml(html, baseUrl) {
  if (!html) return null;
  const $ = cheerio.load(html);
  const product = {};

  // --- Title ---
  // Try various common heading/selectors
  const titleSelectors = [
    'h1',
    '[data-product-name]',
    '.product-title',
    '.product-name',
    '#productTitle',
    '.pdp-title',
    '.prod-title',
    '.item-title',
    '.product__title',
    '.product-header__title',
    '.ProductTitle',
    '.productName',
    '.product_name',
    '.prod-name',
    'h1[itemprop="name"]',
    '.product-main__name',
  ];

  for (const sel of titleSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length > 5) {
        product.title = text;
        break;
      }
    }
  }

  // Also check <title> tag as fallback
  if (!product.title) {
    const titleTag = $('title').first().text().trim();
    if (titleTag && titleTag.length > 5) {
      // Strip site name suffix like " - SiteName" or " | SiteName"
      product.title = titleTag
        .replace(/\s*[–|-|—]\s*[^-|—]+$/, '')
        .replace(/\s*on\s+[^-|—]+$/i, '')
        .trim();
    }
  }

  // --- Price ---
  // Common selectors for sale price
  const priceSelectors = [
    '[data-price]',
    '.price',
    '.sale-price',
    '.selling-price',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.product-price',
    '.prod-price',
    '.pdp-price',
    '.Price',
    '.product__price',
    '.price-value',
    '.actual-price',
    '.offer-price',
    '[itemprop="price"]',
    '.price--current',
    '.price--sale',
    '.special-price',
    '.c-price',
    '.final-price',
    '.product-detail-price',
    '.a-price-whole',
    '.a-price .a-offscreen',
    '.priceBlockDealPriceString',
    '.priceToPay',
  ];

  for (const sel of priceSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      // data-price attribute may hold the value
      const dataPrice = el.attr('data-price') || el.attr('data-value') || el.attr('content');
      const priceStr = dataPrice || text;
      const parsed = parsePriceFromString(priceStr);
      if (parsed !== null && parsed > 0) {
        product.price = parsed;
        break;
      }
    }
  }

  // Original price / MRP
  const originalPriceSelectors = [
    '.original-price',
    '.mrp-price',
    '.strike-price',
    '.old-price',
    '.price--old',
    '.price--compare',
    '.was-price',
    '.product-mrp',
    '.base-price',
    '.price-original',
    '.regular-price',
    '.compare-price',
    '[itemprop="highPrice"]',
    '.price-strike',
    '.price--original',
    '.product__original-price',
  ];

  for (const sel of originalPriceSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      const parsed = parsePriceFromString(text);
      if (parsed !== null && parsed > 0 && parsed !== product.price) {
        product.originalPrice = parsed;
        break;
      }
    }
  }

  // --- Discount ---
  const discountSelectors = [
    '.discount',
    '.badge-discount',
    '.discount-percent',
    '.offer-discount',
    '.save-percent',
    '.product-discount',
    '.discount-badge',
    '.savings',
    '.discount__text',
  ];

  for (const sel of discountSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      const match = text.match(/(\d+)\s*%/);
      if (match) {
        product.discountPercentage = parseInt(match[1], 10);
        break;
      }
    }
  }

  // --- Brand ---
  const brandSelectors = [
    '[data-brand]',
    '.brand',
    '.product-brand',
    '.prod-brand',
    '.brand-name',
    '.seller-name',
    '.product__brand',
    '.brand-logo img[alt]',
    '.Brand',
    '[itemprop="brand"]',
    '.product-brand-name',
    '.manufacturer-name',
  ];

  for (const sel of brandSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const brand = el.attr('data-brand')
        || el.attr('content')
        || el.text().trim()
        || el.find('img').attr('alt');
      if (brand && brand.length > 0 && brand.length < 100) {
        product.brand = brand.trim();
        break;
      }
    }
  }

  // --- Images ---
  const images = [];
  const imageSelectors = [
    '.product-image img',
    '.gallery-image img',
    '.thumb img',
    '.product-gallery img',
    '.pdp-image img',
    '.main-image img',
    '.img-fluid',
    '.product__image img',
    '.image-gallery img',
    '[data-zoom]',
    '.slide img',
    '.carousel-item img',
    'img[itemprop="image"]',
    '.product-media img',
    '.product_img img',
    'img.product-image',
    '.main-img img',
    '.prod-img',
  ];

  const seenUrls = new Set();
  for (const sel of imageSelectors) {
    $(sel).each((i, el) => {
      const src = $(el).attr('src')
        || $(el).attr('data-src')
        || $(el).attr('data-original')
        || $(el).attr('data-lazy')
        || $(el).attr('data-zoom')
        || $(el).attr('data-image');
      if (src) {
        const resolved = resolveUrl(baseUrl, src);
        if (resolved && !seenUrls.has(resolved)) {
          seenUrls.add(resolved);
          images.push({ url: resolved, weight: 50 });
        }
      }
    });
  }

  // Also try to find any large images on the page that look like product shots
  $('img').each((i, el) => {
    if (images.length >= 20) return false; // limit
    const src = $(el).attr('src')
      || $(el).attr('data-src')
      || $(el).attr('data-original');
    if (!src) return;
    const resolved = resolveUrl(baseUrl, src);
    if (!resolved || seenUrls.has(resolved)) return;

    // Only include if it looks like a product image (reasonable size)
    const width = parseInt($(el).attr('width') || '0', 10);
    const height = parseInt($(el).attr('height') || '0', 10);
    if (width > 200 || height > 200 || (!width && !height)) {
      // Skip tiny icons
      if (src.includes('icon') || src.includes('logo')) return;
      seenUrls.add(resolved);
      images.push({ url: resolved, weight: 30 });
    }
  });

  if (images.length > 0) {
    product.domImages = images;
  }

  // --- Description ---
  const descSelectors = [
    '[data-description]',
    '.product-description',
    '.prod-description',
    '.description',
    '#productDescription',
    '.pdp-description',
    '.product-detail',
    '.product-info',
    '.product__description',
    '.prod-desc',
    '.description-section',
    '.product-details-tab',
    '.product-summary',
    '.product-short-desc',
    '.ProductDescription',
    '.product__details',
    '[itemprop="description"]',
  ];

  for (const sel of descSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length > 20) {
        product.description = text;
        break;
      }
    }
  }

  // --- Category / Breadcrumbs ---
  const breadcrumbSelectors = [
    '.breadcrumb',
    '.breadcrumbs',
    '.bread-crumbs',
    '.breadcrumb-list',
    '[itemprop="breadcrumb"]',
    '.Breadcrumb',
    '.breadcrumb__list',
    '.breadcrumb-container',
    '.breadcrumb-wrapper',
  ];

  for (const sel of breadcrumbSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const items = [];
      el.find('a, span, li').each((i, child) => {
        const text = $(child).text().trim();
        if (text && !items.includes(text)) {
          items.push(text);
        }
      });
      if (items.length > 0) {
        product.breadcrumbs = items;
        // Use the last meaningful breadcrumb as category
        if (!product.category) {
          const lastBreadcrumb = items[items.length - 1];
          if (lastBreadcrumb && !lastBreadcrumb.match(/^(home|shop|store|products?)$/i)) {
            product.category = lastBreadcrumb;
          } else if (items.length > 1) {
            product.category = items[items.length - 2];
          }
        }
        break;
      }
    }
  }

  // --- Rating ---
  const ratingSelectors = [
    '[data-rating]',
    '.rating',
    '.product-rating',
    '.prod-rating',
    '.rating-value',
    '.star-rating',
    '.average-rating',
    '.rating-number',
    'span[itemprop="ratingValue"]',
    '.Rating',
    '.product__rating',
    '.rating-score',
    '.review-rating',
    '.rating-count',
  ];

  for (const sel of ratingSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const ratingStr = el.attr('data-rating') || el.attr('content') || el.text().trim();
      const parsed = parseFloat(ratingStr);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 5) {
        product.ratingValue = parsed;
        break;
      }
    }
  }

  // --- Rating Count ---
  const reviewCountSelectors = [
    '.review-count',
    '.rating-count',
    '.total-reviews',
    '.review-count-number',
    'span[itemprop="reviewCount"]',
    '.rating-number',
    '.num-reviews',
    '.review-count__text',
    '.product-reviews-count',
  ];

  for (const sel of reviewCountSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim();
      const match = text.match(/([\d,]+)/);
      if (match) {
        product.reviewCount = parseInt(match[1].replace(/,/g, ''), 10);
        break;
      }
    }
  }

  // --- Availability ---
  const availabilitySelectors = [
    '.availability',
    '.stock-status',
    '.product-stock',
    '.in-stock',
    '.out-of-stock',
    '[itemprop="availability"]',
    '.stock',
    '.product-availability',
  ];

  for (const sel of availabilitySelectors) {
    const el = $(sel).first();
    if (el.length) {
      const text = el.text().trim().toLowerCase();
      if (text.includes('in stock') || text.includes('available')) {
        product.stockStatus = 'in_stock';
        break;
      } else if (text.includes('out of stock') || text.includes('unavailable')) {
        product.stockStatus = 'out_of_stock';
        break;
      }
    }
  }

  // --- Sizes ---
  const sizes = new Set();
  const sizeSelectors = [
    '[data-size]',
    '.size-selector button',
    '.size-option',
    '.size-variant',
    '.size-box',
    '.size-label',
    '.size-value',
    '.size-item',
    '[data-testid="size"]',
    '.select-size li',
    '.sizes button',
    '.size-picker span',
    '.product-sizes span',
    '.variant-size span',
    'a[href*="size"]',
    '.size-list li',
    '.size-select option',
  ];

  for (const sel of sizeSelectors) {
    $(sel).each((i, el) => {
      const text = $(el).text().trim();
      if (text && /^[XSML0-9]+$/i.test(text.replace(/\s/g, ''))) {
        sizes.add(text);
      }
    });
    if (sizes.size > 0) break;
  }
  if (sizes.size > 0) {
    product.sizes = Array.from(sizes);
  }

  // --- Colors ---
  const colors = [];
  const colorSelectors = [
    '[data-color]',
    '.color-selector button',
    '.color-option',
    '.color-variant',
    '.color-swatch',
    '.color-item',
    '.product-colors span',
    '.colors li',
    '.color-box',
    '.select-color li',
    '.color-picker span',
    'a[href*="color"]',
    '.variant-color span',
    '.swatch-color',
  ];

  for (const sel of colorSelectors) {
    $(sel).each((i, el) => {
      const text = $(el).text().trim();
      const title = $(el).attr('title') || $(el).attr('data-name') || $(el).attr('aria-label') || '';
      const colorName = text || title;
      if (colorName && colorName.length < 30) {
        colors.push(colorName);
      }
    });
    if (colors.length > 0) break;
  }
  if (colors.length > 0) {
    product.colors = [...new Set(colors)];
  }

  // --- SKU / Product ID ---
  const skuSelectors = [
    '[data-sku]',
    '.sku',
    '.product-sku',
    '.prod-code',
    '#product-sku',
    '[itemprop="sku"]',
    '.product-code',
    '.sku-value',
    '.product-id',
  ];

  for (const sel of skuSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const sku = el.attr('data-sku') || el.attr('content') || el.text().trim();
      if (sku && sku.length > 0) {
        product.sku = sku.trim();
        break;
      }
    }
  }

  // --- Specifications ---
  const specTables = [];

  // Look for specification tables
  $('table').each((i, el) => {
    const headers = $(el).find('th').map((i, th) => $(th).text().trim()).get();
    if (headers.some(h => /specif|feature|detail|dimension|material/i.test(h))) {
      const rows = {};
      $(el).find('tr').each((i, tr) => {
        const cells = $(tr).find('td, th');
        if (cells.length >= 2) {
          const key = $(cells[0]).text().trim();
          const val = $(cells[1]).text().trim();
          if (key && val) rows[key] = val;
        }
      });
      if (Object.keys(rows).length > 0) specTables.push(rows);
    }
  });

  // Look for definition lists / detail sections
  $('[data-spec], .specifications, .product-specs, .specs, .product-details').each((i, el) => {
    const specs = {};
    $(el).find('li, .spec-item, .detail-item, .attr-item').each((i, item) => {
      const text = $(item).text().trim();
      const sep = text.match(/^(.+?)[:：](.+)$/);
      if (sep) {
        specs[sep[1].trim()] = sep[2].trim();
      }
    });
    $(el).find('dt, .spec-label').each((i, dt) => {
      const key = $(dt).text().trim();
      const dd = $(dt).next('dd, .spec-value');
      if (key && dd.length) {
        specs[key] = dd.text().trim();
      }
    });
    if (Object.keys(specs).length > 0) specTables.push(specs);
  });

  if (specTables.length > 0) {
    // Merge all specification tables
    product.specifications = Object.assign({}, ...specTables);
  }

  // --- Seller ---
  const sellerSelectors = [
    '.seller',
    '.seller-name',
    '.seller-info',
    '.product-seller',
    '.merchant-name',
    '.store-name',
    '.sold-by',
    '.shipped-by',
  ];

  for (const sel of sellerSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const seller = el.text().trim().replace(/^(sold by|by|seller|sold|from)\s+/i, '');
      if (seller && seller.length > 0 && seller.length < 100) {
        product.sellerName = seller;
        break;
      }
    }
  }

  // --- Features (bullet points) ---
  const featureSelectors = [
    '.features',
    '.key-features',
    '.highlights',
    '.product-features',
    '.bullets',
    '.key-highlights',
    '.product-highlights',
    '#feature-buletins',
    '.feature-list',
    '.product-details',
    '.product-benefits',
  ];

  for (const sel of featureSelectors) {
    const el = $(sel).first();
    if (el.length) {
      const features = [];
      el.find('li, span, .feature-item, p').each((i, item) => {
        const text = $(item).text().trim();
        if (text && text.length > 5 && text.length < 300) {
          features.push(text);
        }
      });
      if (features.length > 0) {
        product.features = features;
        break;
      }
    }
  }

  return Object.keys(product).length > 0 ? product : null;
}

/**
 * Attempt to parse a price value from a string.
 * Handles "₹1,299", "₹ 1,299.00", "$29.99", "1299", etc.
 */
function parsePriceFromString(str) {
  if (!str) return null;
  const cleaned = String(str)
    .replace(/[₹€$£¥,.\s]/g, '')   // remove symbols, commas, spaces
    .replace(/^[^\d]+/, '')         // remove leading non-digit
    .trim();
  // If after stripping everything we have digits, parse the first number
  const match = cleaned.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    // If the original had a decimal point, try to get the fractional part
    const decimalMatch = String(str).match(/[₹€$£¥]*\s*(\d+)[.,](\d{2})\s*(?:$|[^\d])/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1] + '.' + decimalMatch[2]);
    }
    return num;
  }
  return null;
}

module.exports = { extractFromHtml, parsePriceFromString };
/**
 * Product Importer — Main Orchestrator.
 *
 * Coordinates the full extraction pipeline:
 *   URL validation → redirect following → platform detection →
 *   HTML fetch → JSON-LD → OpenGraph → HTML extraction →
 *   platform-specific extraction → data normalization → image handling
 */

const { isValidUrl, detectPlatform, normaliseUrl, resolveUrl } = require('./utils/url');
const { extractImages, validateImageUrl } = require('./utils/image');
const { extractPrice } = require('./utils/price');
const { extractProductFromJsonLd } = require('./extractors/jsonld');
const { extractProductFromOpenGraph, extractOpenGraph } = require('./extractors/opengraph');
const { extractFromHtml } = require('./extractors/html');
const { extractRendered } = require('./extractors/rendered');
const cache = require('./cache');
const dns = require('node:dns/promises');
const net = require('node:net');

// Providers
const AmazonProvider = require('./providers/amazon');
const FlipkartProvider = require('./providers/flipkart');
const MyntraProvider = require('./providers/myntra');
const AjioProvider = require('./providers/ajio');
const MeeshoProvider = require('./providers/meesho');
const GenericProvider = require('./providers/generic');

const PROVIDERS = [
  AmazonProvider,
  FlipkartProvider,
  MyntraProvider,
  AjioProvider,
  MeeshoProvider,
  GenericProvider,
];

// User-Agent strings for fetching
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

const FETCH_TIMEOUT = 15000; // 15 seconds
const NAV_TIMEOUT = 30000;   // 30 seconds for full page load

/**
 * SSRF guard: rejects URLs that point at private/loopback/link-local hosts so
 * an admin-supplied URL can never be turned into a request against internal
 * infrastructure.
 */
function isPrivateAddress(ip) {
  return (
    ip === '::1' ||
    ip === '::' ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80:') ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('::ffff:10.') ||
    ip.startsWith('::ffff:192.168.') ||
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^0\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

async function assertPublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error('Enter a valid http or https URL.'), {
      reason: 'INVALID_URL',
    });
  }
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) {
    throw Object.assign(new Error('Enter a public http or https URL.'), {
      reason: 'INVALID_URL',
    });
  }

  const addresses = net.isIP(parsed.hostname)
    ? [{ address: parsed.hostname }]
    : await dns.lookup(parsed.hostname, { all: true }).catch(() => []);

  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw Object.assign(new Error('The URL must point to a public website.'), {
      reason: 'INVALID_URL',
    });
  }
  return parsed.href;
}

/**
 * Main import function.
 *
 * @param {string} url - The affiliate/product URL to import.
 * @param {object} [options]
 * @param {boolean} [options.useRendered] - Whether to attempt rendered page extraction.
 * @param {boolean} [options.skipCache] - Bypass cache.
 * @returns {Promise<object>} Import result with product data and metadata.
 */
async function importProduct(url, options = {}) {
  const startTime = Date.now();
  const log = [];

  function addLog(msg, data = null) {
    const entry = { msg, ts: Date.now() - startTime };
    if (data) entry.data = data;
    log.push(entry);
    console.log(`[Importer] ${msg}`, data ? JSON.stringify(data).slice(0, 200) : '');
  }

  // --- 1. Validate URL ---
  if (!url || !isValidUrl(url)) {
    return {
      success: false,
      reason: 'INVALID_URL',
      message: 'Please enter a valid product URL (http:// or https://).',
      platform: null,
      log,
    };
  }

  const originalAffiliateUrl = url.trim();
  addLog('URL received', { url: originalAffiliateUrl });

  // --- 1b. SSRF guard (public URL only) ---
  try {
    await assertPublicUrl(originalAffiliateUrl);
  } catch (err) {
    return {
      success: false,
      reason: 'INVALID_URL',
      message: err.message,
      platform: null,
      log,
    };
  }

  // --- 2. Cache check ---
  const cacheKey = normaliseUrl(originalAffiliateUrl);
  if (!options.skipCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      addLog('Returning cached result');
      return { ...cached, cached: true, log };
    }
  }

  // --- 3. Fetch the page (with redirect following) ---
  let html = null;
  let finalUrl = originalAffiliateUrl;
  let statusCode = 0;
  let responseHeaders = {};

  try {
    addLog('Fetching page...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(originalAffiliateUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    statusCode = response.status;
    finalUrl = response.url;
    responseHeaders = Object.fromEntries(response.headers.entries());

    addLog('Response received', { status: statusCode, finalUrl });

    if (statusCode >= 400) {
      const reason = statusCode === 403 ? 'BLOCKED' :
                     statusCode === 404 ? 'NO_PRODUCT_DATA' :
                     statusCode === 429 ? 'BLOCKED' :
                     'NETWORK_ERROR';

      const result = {
        success: false,
        reason,
        platform: null,
        message: statusCode === 403
          ? 'This marketplace did not allow automatic product extraction. Please enter the missing information manually.'
          : `Server returned status ${statusCode}.`,
        statusCode,
        log,
      };
      cache.set(cacheKey, result, 60000); // Cache errors for 1 min
      return result;
    }

    html = await response.text();
    addLog('HTML received', { length: html.length });
  } catch (err) {
    addLog('Fetch error', { error: err.message });
    return {
      success: false,
      reason: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      message: err.name === 'AbortError'
        ? 'The request timed out. The page may be too slow or blocked.'
        : `Could not fetch the URL: ${err.message}`,
      platform: null,
      log,
    };
  }

  // --- 4. Detect Platform ---
  const { platform, hostname } = detectPlatform(finalUrl);
  addLog('Platform detected', { platform, hostname });

  // --- 5. Extraction Layers ---
  addLog('Starting JSON-LD extraction...');
  const jsonldData = extractProductFromJsonLd(html);

  addLog('Starting OpenGraph extraction...');
  const ogData = extractProductFromOpenGraph(html);
  const ogRaw = extractOpenGraph(html);

  addLog('Starting HTML extraction...');
  const htmlData = extractFromHtml(html, finalUrl);

  // --- 6. Find matching provider ---
  const ProviderClass = PROVIDERS.find(p => p.canHandle(finalUrl)) || GenericProvider;
  const provider = new ProviderClass();
  addLog('Using provider', { provider: provider.platform });

  // --- 7. Provider-specific extraction ---
  let productData = {};
  try {
    productData = await provider.extract({
      html,
      jsonldData,
      ogData,
      htmlData,
      baseUrl: finalUrl,
      url: originalAffiliateUrl,
      headers: responseHeaders,
    });
    addLog('Provider extraction complete');
  } catch (err) {
    addLog('Provider extraction error', { error: err.message });
    // Fallback to generic
    const genericProvider = new GenericProvider();
    productData = await genericProvider.extract({
      html,
      jsonldData,
      ogData,
      htmlData,
      baseUrl: finalUrl,
    });
    addLog('Fell back to generic extraction');
  }

  // --- 7b. Rendered-page extraction (only when key fields are missing) ---
  const needsRender =
    (options.useRendered !== false) &&
    (
      !productData.title ||
      productData.price === undefined ||
      !productData.primaryImage ||
      !productData.ratingValue
    );

  if (needsRender) {
    addLog('Key fields missing — attempting rendered-page extraction...');
    const rendered = await extractRendered(finalUrl);
    addLog('Rendered extraction result', {
      usedRendered: rendered.usedRendered,
      blocked: rendered.blocked,
      hasHtml: !!rendered.html,
      hasDomData: !!rendered.domData,
    });

    if (rendered.blocked) {
      return {
        success: false,
        reason: 'BLOCKED',
        platform: provider.platform,
        message: 'This marketplace did not allow automatic product extraction. Please enter the missing information manually.',
        log,
      };
    }

    if (rendered.domData) {
      const renderedHtmlData = extractFromHtml(rendered.html || '', finalUrl);
      const renderedMerged = {
        ...rendered.domData,
        ...(renderedHtmlData || {}),
      };

      // Merge rendered data over the existing data (fill only missing fields)
      for (const [key, val] of Object.entries(renderedMerged)) {
        if (val === null || val === undefined || val === '') continue;
        if (Array.isArray(val) && val.length === 0) continue;
        if (productData[key] === undefined || productData[key] === null || productData[key] === '') {
          productData[key] = val;
        }
      }
      if (rendered.domData.images && (!productData.images || productData.images.length === 0)) {
        productData.images = rendered.domData.images;
      }
      addLog('Rendered DOM data merged into product');
    }
  }

  // --- 8. Image extraction and validation ---
  addLog('Processing images...');
  const imageSources = {
    jsonld: jsonldData?.images || (jsonldData?.primaryImage ? [jsonldData.primaryImage] : []),
    ogImage: ogData?.primaryImage,
    twitterImage: ogRaw?.['twitter:image'],
    metaImages: htmlData?.images || [],
    domImages: htmlData?.domImages || [],
  };

  const imageResult = extractImages(imageSources, finalUrl);
  if (imageResult.primary) {
    productData.primaryImage = imageResult.primary;
    productData.images = imageResult.gallery;
  }

  // Attempt to validate primary image (non-blocking)
  if (productData.primaryImage) {
    validateImageUrl(productData.primaryImage).then(valid => {
      if (!valid) {
        addLog('Primary image validation failed, but keeping URL', { url: productData.primaryImage });
      }
    }).catch(() => {});
  }

  // --- 9. Price normalization ---
  if (productData.price !== undefined || productData.originalPrice !== undefined) {
    const priceData = extractPrice({
      price: productData.price,
      originalPrice: productData.originalPrice,
      mrp: productData.originalPrice,
      discountPercentage: productData.discountPercentage,
      currency: productData.currency || 'INR',
    });
    if (priceData) {
      productData.price = priceData.price;
      productData.originalPrice = priceData.originalPrice || null;
      productData.discountPercentage = priceData.discountPercentage || null;
      productData.currency = priceData.currency || 'INR';
    }
  }

  // --- 10. Build final product object ---
  const result = buildResult(productData, {
    originalAffiliateUrl,
    finalUrl,
    platform: provider.platform,
    extractionLayers: {
      jsonld: !!jsonldData,
      opengraph: !!ogData,
      html: !!htmlData,
      provider: provider.platform,
    },
  });

  addLog('Import complete. Fields found: ' + countFields(result.product));
  result.log = log;

  // Cache the successful result
  if (result.success) {
    cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
  }

  return result;
}

/**
 * Build the final result object.
 */
function buildResult(productData, meta) {
  const product = {
    // Basic info
    title: productData.title || null,
    description: productData.description || null,
    shortDescription: productData.shortDescription || null,

    // Brand & categorization
    brand: productData.brand || null,
    category: productData.category || null,
    subcategory: productData.subcategory || null,
    productType: productData.productType || null,

    // Pricing
    price: productData.price || null,
    originalPrice: productData.originalPrice || null,
    mrp: productData.originalPrice || null,
    salePrice: productData.price || null,
    currency: productData.currency || 'INR',
    discount: productData.discountPercentage || null,
    discountPercentage: productData.discountPercentage || null,

    // Images
    images: productData.images || [],
    primaryImage: productData.primaryImage || null,
    thumbnail: productData.thumbnail || productData.primaryImage || null,

    // Rating
    rating: productData.ratingValue || null,
    ratingValue: productData.ratingValue || null,
    ratingCount: productData.ratingCount || null,
    reviewCount: productData.reviewCount || null,

    // Availability
    availability: productData.availability || null,
    stockStatus: productData.stockStatus || null,

    // Identifiers
    sku: productData.sku || null,
    productId: productData.productId || null,
    asin: productData.asin || null,
    mpn: productData.mpn || null,
    gtin: productData.gtin || null,
    barcode: productData.gtin || null,

    // URLs — affiliateUrl is ALWAYS the exact URL the admin pasted.
    // canonicalUrl is the marketplace product URL; finalResolvedUrl is where
    // the affiliate redirect actually landed.
    sourceUrl: meta.originalAffiliateUrl,
    affiliateUrl: meta.originalAffiliateUrl,
    originalAffiliateUrl: meta.originalAffiliateUrl,
    finalResolvedUrl: meta.finalUrl,
    canonicalUrl: productData.canonicalUrl || meta.finalUrl,
    platform: meta.platform,

    // Variants
    colors: productData.colors || null,
    sizes: productData.sizes || null,
    variants: productData.variants || null,

    // Details
    specifications: productData.specifications || null,
    attributes: productData.specifications || null,
    features: productData.features || null,

    // Seller
    sellerName: productData.sellerName || null,
    sellerRating: productData.sellerRating || null,

    // Shipping / Returns
    shippingInformation: productData.shippingInformation || null,
    returnInformation: productData.returnInformation || null,

    // Navigation
    breadcrumbs: productData.breadcrumbs || null,

    // Raw metadata (for debugging)
    rawMetadata: {
      ...meta,
      productDataKeys: Object.keys(productData),
    },
  };

  // Calculate quality score
  const quality = calculateQuality(product);

  return {
    success: true,
    product,
    quality,
    platform: meta.platform,
    extractionLayers: meta.extractionLayers,
  };
}

/**
 * Calculate import completeness score.
 */
function calculateQuality(product) {
  const fields = [
    'title', 'description', 'price', 'originalPrice', 'currency',
    'brand', 'category', 'images', 'rating', 'reviewCount',
    'sizes', 'colors', 'specifications', 'features', 'sku',
    'productId', 'stockStatus', 'sellerName', 'breadcrumbs', 'discountPercentage',
  ];

  let detected = 0;
  const missing = [];

  for (const field of fields) {
    const val = product[field];
    if (val !== null && val !== undefined && val !== '' &&
        !(Array.isArray(val) && val.length === 0) &&
        !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) {
      detected++;
    } else {
      missing.push(field);
    }
  }

  const total = fields.length;
  const percentage = Math.round((detected / total) * 100);

  return {
    total,
    detected,
    missing,
    percentage,
    label: percentage >= 80 ? 'Excellent' :
           percentage >= 60 ? 'Good' :
           percentage >= 40 ? 'Fair' :
           'Poor',
  };
}

/**
 * Count fields with actual values in the product object.
 */
function countFields(product) {
  if (!product) return 0;
  let count = 0;
  for (const [key, val] of Object.entries(product)) {
    if (val !== null && val !== undefined && val !== '' &&
        !(Array.isArray(val) && val.length === 0) &&
        !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) {
      count++;
    }
  }
  return count;
}

/**
 * Clear the import cache.
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  importProduct,
  clearCache,
  detectPlatform,
  PROVIDERS,
};
/**
 * URL utility functions for product import.
 */

const SUPPORTED_DOMAINS = {
  'amazon.in': 'Amazon',
  'amazon.com': 'Amazon',
  'www.amazon.in': 'Amazon',
  'www.amazon.com': 'Amazon',
  'flipkart.com': 'Flipkart',
  'www.flipkart.com': 'Flipkart',
  'myntra.com': 'Myntra',
  'www.myntra.com': 'Myntra',
  'ajio.com': 'Ajio',
  'www.ajio.com': 'Ajio',
  'meesho.com': 'Meesho',
  'www.meesho.com': 'Meesho',
};

/**
 * Extract hostname from a URL string.
 */
function getHostname(url) {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Validate that a string looks like a URL.
 */
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detect the ecommerce platform from a URL.
 * Returns { platform: string|null, hostname: string }.
 */
function detectPlatform(url) {
  const hostname = getHostname(url);
  for (const [domain, platform] of Object.entries(SUPPORTED_DOMAINS)) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return { platform, hostname };
    }
  }
  return { platform: null, hostname };
}

/**
 * Resolve a possibly-relative URL against a base.
 */
function resolveUrl(base, maybeRelative) {
  if (!maybeRelative) return null;
  if (maybeRelative.startsWith('http://') || maybeRelative.startsWith('https://')) {
    return maybeRelative;
  }
  try {
    const baseUrl = new URL(base);
    // Handle protocol-relative URLs
    if (maybeRelative.startsWith('//')) {
      return baseUrl.protocol + maybeRelative;
    }
    return new URL(maybeRelative, base).href;
  } catch {
    return null;
  }
}

/**
 * Normalise a URL by trimming query params that are noise (UTMs, etc).
 * Returns the cleaned URL string.
 */
function normaliseUrl(url, keepAffiliateParams = false) {
  try {
    const u = new URL(url);
    if (!keepAffiliateParams) {
      const dirty = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'ref', 'source', 'si', 's_kwcid'];
      dirty.forEach(p => u.searchParams.delete(p));
    }
    return u.href;
  } catch {
    return url;
  }
}

module.exports = {
  getHostname,
  isValidUrl,
  detectPlatform,
  resolveUrl,
  normaliseUrl,
  SUPPORTED_DOMAINS,
};
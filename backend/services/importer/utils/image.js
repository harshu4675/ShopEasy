/**
 * Image extraction utilities.
 */
const { resolveUrl } = require('./url');

/**
 * Known image-extensions for URL filtering.
 */
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|avif|svg)(\?.*)?$/i;

/**
 * Patterns that likely are NOT product images.
 */
const SKIP_PATTERNS = [
  /logo/i,
  /icon/i,
  /avatar/i,
  /banner/i,
  /spinner/i,
  /loading/i,
  /pixel/i,
  /tracking/i,
  /analytics/i,
  /captcha/i,
  /badge/i,
  /sprite/i,
  /placeholder/i,
  /thumb-ticker/i,
  /facebook/i,
  /twitter/i,
  /instagram/i,
  /social/i,
  /payment/i,
  /shipping/i,
  /coupon/i,
  /offer/i,
  /advertisement/i,
  /ad_/i,
  /sponsored/i,
];

/**
 * Minimum width/height heuristic (pixels).
 * Images smaller than this are unlikely to be primary product shots.
 */
const MIN_DIMENSION = 100;

/**
 * Extract image URLs from various sources, deduplicate and rank.
 * Returns arrays: { primary, gallery, thumbnail }
 */
function extractImages(sources, baseUrl) {
  const seen = new Set();
  const candidates = [];

  const add = (src, weight = 0) => {
    if (!src) return;
    const resolved = resolveUrl(baseUrl, String(src).trim());
    if (!resolved) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);

    // Skip non-image URLs
    if (!IMAGE_EXT_RE.test(resolved) && !resolved.includes('/images/') && !resolved.includes('/img/')) {
      // Still keep if it looks like a CDN product image path
      if (!resolved.includes('/products/') && !resolved.includes('/photos/')) {
        return;
      }
    }

    // Skip known non-product patterns
    for (const ptn of SKIP_PATTERNS) {
      if (ptn.test(resolved)) return;
    }

    candidates.push({ url: resolved, weight });
  };

  // JSON-LD images
  if (sources.jsonld) {
    const imgs = Array.isArray(sources.jsonld) ? sources.jsonld : [sources.jsonld];
    imgs.forEach(img => {
      if (typeof img === 'string') add(img, 100);
      else if (img?.url) add(img.url, 100);
      else if (img?.contentUrl) add(img.contentUrl, 100);
    });
  }

  // OpenGraph image
  if (sources.ogImage) {
    add(sources.ogImage, 90);
  }

  // Twitter image
  if (sources.twitterImage) {
    add(sources.twitterImage, 80);
  }

  // Meta tag images
  if (sources.metaImages) {
    sources.metaImages.forEach(img => add(img, 70));
  }

  // DOM extracted images
  if (sources.domImages) {
    sources.domImages.forEach(img => add(img.url || img, img.weight || 60));
  }

  // Sort by weight descending
  candidates.sort((a, b) => b.weight - a.weight);

  const urls = candidates.map(c => c.url);

  return {
    primary: urls[0] || null,
    gallery: urls,
    thumbnail: urls[0] || null,
    all: urls,
  };
}

/**
 * Score and validate an image URL (async head request check).
 * Returns true if the image appears reachable.
 */
async function validateImageUrl(imageUrl, timeout = 5000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(id);
    if (!response.ok) return false;

    const contentType = response.headers.get('content-type') || '';
    return contentType.startsWith('image/');
  } catch {
    return false;
  }
}

module.exports = { extractImages, validateImageUrl, SKIP_PATTERNS, IMAGE_EXT_RE };
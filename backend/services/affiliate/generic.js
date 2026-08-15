const { fetchPage: defaultFetchPage } = require("./fetcher");
const { extractFromHtml } = require("./metadata");

/**
 * GenericWebProvider.
 *
 * The fallback for every URL — including marketplaces the system does not
 * recognise. It fetches the page as a normal visitor would and extracts the
 * publicly visible structured metadata (JSON-LD, OpenGraph, meta tags,
 * canonical URL). Whatever is absent stays absent; nothing is fabricated.
 */

const ID = "unknown";
const LABEL = "Unknown";

function supports() {
  // The generic provider can attempt any http(s) product URL.
  return true;
}

function extractProductId() {
  return "";
}

/** Maps raw page metadata onto the normalised provider result shape. */
function buildResult(meta, sourceUrl, finalUrl) {
  const originalPrice = meta.originalPrice;
  const price = meta.price;
  let discount = meta.discount || 0;
  if (!discount && price != null && originalPrice != null && originalPrice > price) {
    discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  return {
    title: meta.title || "",
    description: meta.description || "",
    images: meta.images || [],
    price: price,
    originalPrice: originalPrice,
    priceCurrency: meta.priceCurrency || "",
    discount,
    brand: meta.brand || "",
    category: meta.category || "",
    rating: typeof meta.rating === "number" ? meta.rating : 0,
    reviewCount: typeof meta.reviewCount === "number" ? meta.reviewCount : 0,
    variants: meta.variants || [],
    availability: meta.availability || "",
    externalProductId:
      meta.sku || meta.productID || meta.gtin || meta.mpn || "",
    originalUrl: meta.canonicalUrl || finalUrl || sourceUrl,
    sourcePlatform: ID,
  };
}

/**
 * @param {string} url
 * @param {{ fetchPage?: Function }} deps - injectable for tests
 *
 * Never throws for missing metadata: a page with no recognisable structured
 * data simply yields an empty result, which the orchestrator turns into a
 * "complete these fields manually" preview. Only a genuine access failure
 * (thrown by the fetcher) aborts extraction.
 */
async function importProduct(url, deps = {}) {
  const fetchFn = deps.fetchPage || defaultFetchPage;
  const { html, finalUrl } = await fetchFn(url);
  const meta = extractFromHtml(html, url);
  return buildResult(meta, url, finalUrl);
}

module.exports = {
  id: ID,
  label: LABEL,
  domains: [],
  supports,
  extractProductId,
  importProduct,
  buildResult,
};

const { ImportError, CODES } = require("./errors");

/**
 * Flipkart provider (placeholder, no scraping).
 *
 * Flipkart does not expose an open product-data endpoint. The official way to
 * import Flipkart products is the Flipkart Affiliate API (product feeds), which
 * requires an approved affiliate account and an API token. When the credentials
 * become available, `importProduct` should call that API here and return the
 * same normalised shape as the Amazon provider.
 *
 * Until then the provider returns a clear, honest error rather than scraping
 * the site or inventing product data.
 */

const ID = "flipkart";
const LABEL = "Flipkart";

const DOMAINS = ["flipkart.com", "dl.flipkart.com"];

function parseHost(hostname) {
  return hostname ? String(hostname).toLowerCase().replace(/^www\./, "") : "";
}

function supports(url) {
  try {
    const host = parseHost(new URL(url).hostname);
    return DOMAINS.includes(host) || host.endsWith(".flipkart.com");
  } catch {
    return false;
  }
}

function extractProductId(url) {
  try {
    const parsed = new URL(url);
    const pid = parsed.searchParams.get("pid");
    if (pid) return pid;
    const match = parsed.pathname.match(/\/p\/([a-z0-9]+)/i);
    if (match) return match[1].toUpperCase();
    return null;
  } catch {
    return null;
  }
}

function hasCredentials() {
  return Boolean(process.env.FLIPKART_AFFILIATE_ID && process.env.FLIPKART_AFFILIATE_TOKEN);
}

async function importProduct(url) {
  if (!supports(url)) {
    throw new ImportError(CODES.UNSUPPORTED_PLATFORM, "This URL is not a Flipkart product URL.");
  }

  throw new ImportError(
    CODES.NOT_SUPPORTED,
    "Flipkart imports are not enabled yet. They require the official Flipkart " +
      "Affiliate API — set FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN in the " +
      "backend environment to connect it.",
    501,
  );
}

module.exports = {
  id: ID,
  label: LABEL,
  domains: DOMAINS,
  supports,
  extractProductId,
  hasCredentials,
  importProduct,
};

const { supportsFor, importPublic } = require("./providerUtils");

/**
 * Myntra provider — public page metadata only. No API credentials required.
 */
const ID = "myntra";
const LABEL = "Myntra";
const DOMAINS = ["myntra.com"];

function extractProductId(url) {
  try {
    const parsed = new URL(url);
    // Myntra URLs end with a numeric product id, e.g. .../12345678/buy
    const segments = parsed.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      if (/^\d{6,}$/.test(segments[i])) return segments[i];
    }
    return "";
  } catch {
    return "";
  }
}

module.exports = {
  id: ID,
  label: LABEL,
  domains: DOMAINS,
  supports: supportsFor(DOMAINS),
  extractProductId,
  importProduct: (url, deps) => importPublic(url, deps, { id: ID, extractProductId }),
};

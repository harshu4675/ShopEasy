const { supportsFor, importPublic } = require("./providerUtils");

/**
 * AJIO provider — public page metadata only. No API credentials required.
 */
const ID = "ajio";
const LABEL = "Ajio";
const DOMAINS = ["ajio.com"];

function extractProductId(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/p\/(\d+)/i);
    if (match) return match[1];
    const segments = parsed.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      if (/^\d{8,}$/.test(segments[i])) return segments[i];
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

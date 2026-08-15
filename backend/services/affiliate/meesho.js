const { supportsFor, importPublic } = require("./providerUtils");

/**
 * Meesho provider — public page metadata only. No API credentials required.
 */
const ID = "meesho";
const LABEL = "Meesho";
const DOMAINS = ["meesho.com"];

function extractProductId(url) {
  try {
    const parsed = new URL(url);
    const pid = parsed.searchParams.get("product_id");
    if (pid) return pid;
    const match = parsed.pathname.match(/\/p\/([a-z0-9]+)/i);
    if (match) return match[1].toUpperCase();
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

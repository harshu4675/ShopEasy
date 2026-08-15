const { supportsFor, importPublic } = require("./providerUtils");

/**
 * Flipkart provider.
 *
 * Uses only publicly visible page metadata (JSON-LD / OpenGraph / meta tags).
 * No Flipkart API credentials are required — if the optional affiliate API is
 * ever configured, it can be added here without touching other providers.
 */

const ID = "flipkart";
const LABEL = "Flipkart";
const DOMAINS = ["flipkart.com"];

function extractProductId(url) {
  try {
    const parsed = new URL(url);
    const pid = parsed.searchParams.get("pid");
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

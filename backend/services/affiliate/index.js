/**
 * Affiliate provider registry.
 *
 * Adding a marketplace is a matter of dropping a new provider module into this
 * folder and registering it here. The GenericWebProvider always stands behind
 * every platform provider as the credential-free fallback.
 */
const generic = require("./generic");
const amazon = require("./amazon");
const flipkart = require("./flipkart");
const myntra = require("./myntra");
const ajio = require("./ajio");
const meesho = require("./meesho");

const PROVIDERS = [amazon, flipkart, myntra, ajio, meesho];

/**
 * Finds the provider that claims a URL, or null when the platform is unknown
 * (in which case the generic provider still attempts public metadata).
 */
function detectProvider(url) {
  if (!url) return null;
  return PROVIDERS.find((p) => p.supports(url)) || null;
}

/**
 * Open-redirect safety for affiliate destinations.
 *
 * The redirect route resolves a destination by product id from the database —
 * it never accepts a URL from the request — so the destination is always a URL
 * an admin explicitly stored. The remaining guard is the scheme: only http(s)
 * links may be stored and followed, so a `javascript:`/`data:` payload can
 * never become a redirect target.
 */
function isSafeRedirectUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = {
  PROVIDERS,
  generic,
  detectProvider,
  isSafeRedirectUrl,
};

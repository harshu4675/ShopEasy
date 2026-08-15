/**
 * Affiliate provider registry.
 *
 * Adding a platform is a matter of dropping a new provider module into this
 * folder and registering it here — nothing else in the codebase needs to know
 * about individual platforms.
 */
const amazon = require("./amazon");
const flipkart = require("./flipkart");

const PROVIDERS = [amazon, flipkart];

/**
 * Finds the provider that claims a URL, or null when the platform is unknown.
 * @param {string} url
 */
function detectProvider(url) {
  if (!url) return null;
  return PROVIDERS.find((p) => p.supports(url)) || null;
}

/** @param {string} name - provider id, e.g. "amazon" */
function getProvider(name) {
  return PROVIDERS.find((p) => p.id === name) || null;
}

/**
 * All hostnames (and their subdomains) that a redirect may legally point at.
 * Used by the public redirect resolver to prevent open-redirect attacks.
 */
function supportedHostSuffixes() {
  return PROVIDERS.flatMap((p) => p.domains);
}

/** A redirect destination is safe only if its host is a supported marketplace. */
function isAllowedDestination(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return supportedHostSuffixes().some(
      (d) => host === d || host.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

module.exports = {
  PROVIDERS,
  detectProvider,
  getProvider,
  supportedHostSuffixes,
  isAllowedDestination,
};

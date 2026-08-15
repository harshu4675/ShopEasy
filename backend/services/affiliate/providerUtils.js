const generic = require("./generic");

/**
 * Shared helpers for the per-platform providers. Each marketplace provider is
 * a thin, isolated wrapper: it claims URLs on its domains, knows how to read a
 * product id out of its URL, and otherwise reuses the public-metadata
 * extraction. A change in one marketplace's page structure therefore can only
 * ever affect that marketplace's provider.
 */

function hostMatches(hostname, domains) {
  if (!hostname) return false;
  const host = String(hostname).toLowerCase().replace(/^www\./, "");
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

function supportsFor(domains) {
  return (url) => {
    try {
      return hostMatches(new URL(url).hostname, domains);
    } catch {
      return false;
    }
  };
}

/**
 * Runs the generic public-metadata import for a recognised marketplace and
 * stamps the result with the provider identity + a URL-derived product id.
 */
async function importPublic(url, deps, { id, extractProductId }) {
  const result = await generic.importProduct(url, deps);
  const pid = extractProductId ? extractProductId(url) : "";
  if (pid && !result.externalProductId) result.externalProductId = pid;
  result.sourcePlatform = id;
  return result;
}

module.exports = { hostMatches, supportsFor, importPublic };

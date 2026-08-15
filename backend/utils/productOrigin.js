const PLATFORM_DOMAINS = [
  ["amazon", ["amazon.", "amzn.to", "amzn.in"]],
  ["flipkart", ["flipkart.com", "fkrt.it"]],
  ["myntra", ["myntra.com"]],
  ["ajio", ["ajio.com"]],
  ["meesho", ["meesho.com"]],
];

function isSafeWebUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function inferSourcePlatform(value) {
  try {
    const host = new URL(String(value || "").trim()).hostname.toLowerCase();
    return (
      PLATFORM_DOMAINS.find(([, domains]) =>
        domains.some((domain) => host === domain || host.includes(domain)),
      )?.[0] || "unknown"
    );
  } catch {
    return "unknown";
  }
}

/**
 * Canonical classification with a compatibility path for products imported by
 * the original Add Product importer. Those records predate `productType`, but
 * do contain the persisted external destination. Product names are never used
 * to infer origin.
 */
function isAffiliateProduct(product) {
  if (!product) return false;
  if (product.productType === "AFFILIATE") return true;

  // The legacy route only persisted `affiliateUrl`; it did not persist the
  // newer flag reliably. A validated stored destination is therefore the
  // strongest backward-compatible origin signal available.
  return isSafeWebUrl(product.affiliateUrl);
}

function sourcePlatformFor(product) {
  const stored = String(
    product?.sourcePlatform || product?.platform || "",
  ).trim();
  if (stored) return stored.toLowerCase();
  return inferSourcePlatform(
    product?.affiliateUrl || product?.originalUrl || product?.sourceUrl || "",
  );
}

/** Normalise legacy affiliate identity before sending a product to clients. */
function withCanonicalOrigin(product) {
  if (!product) return product;
  const affiliate = isAffiliateProduct(product);
  return {
    ...product,
    productType: affiliate ? "AFFILIATE" : "INTERNAL",
    isAffiliate: affiliate,
    sourcePlatform: affiliate
      ? sourcePlatformFor(product)
      : product.sourcePlatform || "",
  };
}

module.exports = {
  inferSourcePlatform,
  isAffiliateProduct,
  isSafeWebUrl,
  sourcePlatformFor,
  withCanonicalOrigin,
};

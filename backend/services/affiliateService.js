const { ImportError, CODES } = require("./affiliate/errors");
const { detectProvider, getProvider, isAllowedDestination } = require("./affiliate");

const CATEGORY_ENUM = [
  "Men's Clothing",
  "Women's Clothing",
  "Kids' Clothing",
  "Perfumes",
  "Watches",
  "Sunglasses",
  "Bags & Wallets",
  "Jewelry",
  "Footwear",
  "Accessories",
];

/**
 * Keyword → storefront category. Providers return free-form categories (or
 * none at all), so we best-effort map them onto the catalogue's fixed list.
 * Anything unrecognised lands in "Accessories".
 */
const CATEGORY_RULES = [
  [/sunglass|eyeglass|spectacle|goggle|aviator|ray-ban|rayban/, "Sunglasses"],
  [/watch|chronograph|timepiece|smartwatch|wrist ?watch/, "Watches"],
  [/perfume|fragrance|deodorant|cologne|body ?mist|attar|eau de/, "Perfumes"],
  [/shoe|sneaker|sandal|heel|boot|slipper|loafer|trainer|footwear|flip.?flop|moccasin/, "Footwear"],
  [/bag|backpack|handbag|wallet|purse|clutch|tote|luggage|satchel|briefcase|duffle/, "Bags & Wallets"],
  [/jewel|ring|necklace|earring|bracelet|bangle|pendant|anklet|nose ?pin|chain|mangalsutra/, "Jewelry"],
  [/saree|sari|kurti|kurt|dress|gown|lehenga|legging|skirt|blouse|salwar|dupatta|women'?s|womens|ladies/, "Women's Clothing"],
  [/men'?s|mens|shirt|t-?shirt|polo|trouser|jean|blazer|suit|hoodie|sweatshirt|jacket|shorts|boxer|innerwear/, "Men's Clothing"],
  [/kids|baby|toddler|child|boy'?s|girl'?s|infant|newborn/, "Kids' Clothing"],
];

function mapCategory(text) {
  const haystack = String(text || "").toLowerCase();
  for (const [re, category] of CATEGORY_RULES) {
    if (re.test(haystack)) return category;
  }
  return "Accessories";
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Validates a pasted URL and detects its provider. */
function inspectUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) {
    throw new ImportError(CODES.INVALID_URL, "Please paste a product URL first.");
  }
  if (!isValidHttpUrl(trimmed)) {
    throw new ImportError(
      CODES.INVALID_URL,
      "That does not look like a valid URL. Paste a full product link, e.g. https://www.amazon.in/...",
    );
  }
  const provider = detectProvider(trimmed);
  if (!provider) {
    throw new ImportError(
      CODES.UNSUPPORTED_PLATFORM,
      "This platform is currently not supported. Supported platforms: " +
        "Amazon (and Flipkart once the official affiliate API is connected).",
    );
  }
  return { url: trimmed, provider };
}

/**
 * Fetches and normalises product data for a pasted URL.
 * Throws ImportError with a stable code when anything goes wrong.
 */
async function importFromUrl(url) {
  const { url: normalizedUrl, provider } = inspectUrl(url);
  const result = await provider.importProduct(normalizedUrl);

  const category = mapCategory(
    [result.title, result.brand, result.category].filter(Boolean).join(" "),
  );

  return {
    ...result,
    category: CATEGORY_ENUM.includes(category) ? category : "Accessories",
    sourcePlatform: result.sourcePlatform || provider.id,
    sourcePlatformLabel: provider.label,
    providerId: provider.id,
    providerLabel: provider.label,
  };
}

/** Normalised provider result → the subset of Product fields we persist. */
function toProductFields(result) {
  return {
    name: result.title || "Untitled product",
    description: result.description || result.title || "",
    price: Number(result.price) || 0,
    originalPrice: Number(result.originalPrice) || Number(result.price) || 0,
    discount: Number(result.discount) || 0,
    category: result.category,
    brand: result.brand || "",
    images: Array.isArray(result.images) && result.images.length > 0
      ? result.images.slice(0, 8)
      : [],
    rating: Number(result.rating) || 0,
    numReviews: Number(result.reviewCount) || 0,
    variants: Array.isArray(result.variants) ? result.variants : [],
    availability: result.availability || "",
    sourcePlatform: result.sourcePlatform || "",
    externalProductId: result.externalProductId || "",
    originalUrl: result.originalUrl || "",
    affiliateUrl: result.affiliateUrl || "",
    stock: 0,
  };
}

/**
 * Resolves the external destination for an affiliate product, enforcing the
 * platform whitelist so a tampered/stored URL can never turn the redirect into
 * an open redirect.
 */
function resolveAffiliateUrl(product) {
  if (!product || product.productType !== "AFFILIATE") {
    throw new ImportError(CODES.PRODUCT_UNAVAILABLE, "This is not an affiliate product.", 404);
  }
  if (product.status !== "published") {
    throw new ImportError(CODES.PRODUCT_UNAVAILABLE, "This product is not available right now.", 404);
  }
  const url = product.affiliateUrl || product.originalUrl;
  if (!url) {
    throw new ImportError(CODES.PRODUCT_UNAVAILABLE, "This product has no external destination.", 404);
  }
  if (!isAllowedDestination(url)) {
    throw new ImportError(
      CODES.SOURCE_ERROR,
      "This product's destination is not on an allowed platform.",
      502,
    );
  }
  return url;
}

module.exports = {
  CATEGORY_ENUM,
  mapCategory,
  inspectUrl,
  importFromUrl,
  toProductFields,
  resolveAffiliateUrl,
  isAllowedDestination,
  detectProvider,
  getProvider,
};

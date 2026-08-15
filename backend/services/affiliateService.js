const { ImportError, CODES } = require("./affiliate/errors");
const { detectProvider, generic, isSafeRedirectUrl } = require("./affiliate");

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
 * Anything unrecognised lands in "Accessories" and is flagged for review.
 */
const CATEGORY_RULES = [
  [/sunglass|eyeglass|spectacle|goggle|aviator|ray-?ban/, "Sunglasses"],
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

/**
 * Validates a pasted URL and detects its provider. An unknown marketplace is
 * NOT an error — the generic provider will still attempt metadata extraction.
 */
function inspectUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) {
    throw new ImportError(CODES.INVALID_URL, "Please paste a product URL first.");
  }
  if (!isValidHttpUrl(trimmed)) {
    throw new ImportError(
      CODES.INVALID_URL,
      "Please enter a valid product URL — it should start with https://.",
    );
  }
  return { url: trimmed, provider: detectProvider(trimmed) };
}

/**
 * Attempts to import product data from a pasted URL using publicly visible
 * page metadata. Never requires marketplace API credentials.
 *
 * Returns `{ product, warnings, missing, fetchFailed, errorMessage }`:
 *  - `product` is always present (possibly with empty fields) so the admin can
 *    complete anything the page did not expose.
 *  - `missing` lists the fields that could not be detected.
 *  - `warnings` are informational (e.g. "unknown marketplace").
 *  - `fetchFailed` + `errorMessage` describe a page-access problem.
 */
async function importFromUrl(url, deps = {}) {
  const { url: normalizedUrl, provider } = inspectUrl(url);

  const warnings = [];
  let extracted = null;
  let fetchFailed = false;
  let errorMessage = "";

  if (provider) {
    try {
      extracted = await provider.importProduct(normalizedUrl, deps);
    } catch (err) {
      if (err instanceof ImportError && err.code === CODES.NOT_SUPPORTED) {
        // Provider registered but no public path yet → use the generic one.
      } else if (
        err instanceof ImportError &&
        [
          CODES.PAGE_UNAVAILABLE,
          CODES.BLOCKED,
          CODES.RATE_LIMITED,
          CODES.SOURCE_ERROR,
          CODES.PRODUCT_UNAVAILABLE,
          CODES.METADATA_NOT_FOUND,
        ].includes(err.code)
      ) {
        fetchFailed = true;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
  } else {
    warnings.push(
      "This marketplace is not specifically supported. We'll try to extract publicly available product metadata.",
    );
  }

  // Fallback: no platform-specific result and the page was never attempted.
  if (!extracted && !fetchFailed) {
    try {
      extracted = await generic.importProduct(normalizedUrl, deps);
    } catch (err) {
      if (err instanceof ImportError) {
        fetchFailed = true;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
  }

  const sourcePlatform = provider ? provider.id : "unknown";
  const sourcePlatformLabel = provider ? provider.label : "Unknown";

  const rawCategory = extracted ? extracted.category || "" : "";

  const product = {
    title: extracted?.title || "",
    description: extracted?.description || "",
    images: extracted?.images || [],
    price: extracted?.price ?? null,
    originalPrice: extracted?.originalPrice ?? null,
    discount: extracted?.discount || 0,
    brand: extracted?.brand || "",
    category: mapCategory(
      [extracted?.title, extracted?.brand, rawCategory].filter(Boolean).join(" "),
    ),
    rating: typeof extracted?.rating === "number" ? extracted.rating : 0,
    reviewCount: typeof extracted?.reviewCount === "number" ? extracted.reviewCount : 0,
    variants: extracted?.variants || [],
    availability: extracted?.availability || "",
    externalProductId:
      (extracted && extracted.externalProductId) ||
      (provider && provider.extractProductId ? provider.extractProductId(normalizedUrl) : "") ||
      "",
    originalUrl: extracted?.originalUrl || normalizedUrl,
    // The exact URL the admin pasted is the affiliate destination. Tracking
    // parameters are preserved verbatim.
    affiliateUrl: normalizedUrl,
    sourcePlatform,
    sourcePlatformLabel,
  };

  // Recompute a consistent discount when both prices are known.
  if (
    product.discount === 0 &&
    product.price != null &&
    product.originalPrice != null &&
    product.originalPrice > product.price
  ) {
    product.discount = Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100,
    );
  }

  const missing = [];
  if (!product.title) missing.push("title");
  if (!product.images.length) missing.push("image");
  if (product.price == null) missing.push("price");
  if (!product.description) missing.push("description");
  if (!product.brand) missing.push("brand");
  if (!rawCategory) missing.push("category");
  if (product.rating === 0 && product.reviewCount === 0) missing.push("rating");

  if (!fetchFailed && missing.length > 0) {
    warnings.push(
      "Some product information could not be automatically detected. Please review and complete the missing fields.",
    );
  }

  return { product, warnings, missing, fetchFailed, errorMessage };
}

/** Normalised provider result → the subset of Product fields we persist. */
function toProductFields(result) {
  const price = result.price != null ? Number(result.price) : null;
  const originalPrice =
    result.originalPrice != null
      ? Number(result.originalPrice)
      : price != null
        ? price
        : null;
  return {
    name: result.title || "Untitled product",
    description: result.description || "",
    price: price != null ? price : 0,
    originalPrice: originalPrice != null ? originalPrice : 0,
    discount: Number(result.discount) || 0,
    category: CATEGORY_ENUM.includes(result.category)
      ? result.category
      : "Accessories",
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
 * Resolves the external destination for an affiliate product. The URL comes
 * from the database (set by an admin), never from the request, and is only
 * followed when it is a plain http(s) link.
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
  if (!isSafeRedirectUrl(url)) {
    throw new ImportError(
      CODES.SOURCE_ERROR,
      "This product's destination is not a safe web link.",
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
  isSafeRedirectUrl,
  detectProvider,
};

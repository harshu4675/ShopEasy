/**
 * Public page-metadata extraction.
 *
 * Pure, deterministic HTML parsing of the structured data a marketplace serves
 * to any normal visitor:
 *
 *   1. JSON-LD structured product data (schema.org Product / @graph)
 *   2. OpenGraph / `product:` meta tags
 *   3. Twitter card + standard `<meta name=...>` tags
 *   4. `<title>` and `<link rel="canonical">`
 *
 * Everything here is regex/JSON based on head metadata — no fragile CSS
 * selectors and no attempt to bypass any protection. Missing data simply
 * comes back as empty, never fabricated.
 */

const { rankImageCandidates } = require("../imageRanking");

/* ------------------------------- helpers -------------------------------- */

function decodeEntities(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function cleanText(value) {
  return decodeEntities(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? m[1] : "";
}

function isHttpUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parses a human price string into a number. Handles currency symbols,
 * thousands separators and both "." / "," decimal styles.
 */
function parsePrice(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const s = String(value).trim();
  if (!s) return null;

  // Keep digits, dots and commas only.
  const m = s.replace(/[^\d.,]/g, "");
  if (!m) return null;

  let normalized;
  if (m.includes(".") && m.includes(",")) {
    // Both separators present: the last one is the decimal separator.
    const lastDot = m.lastIndexOf(".");
    const lastComma = m.lastIndexOf(",");
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    normalized = m.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (m.includes(",")) {
    const parts = m.split(",");
    // "49,99" (exactly one comma, two trailing digits) → decimal; else thousands.
    if (parts.length === 2 && parts[1].length === 2) {
      normalized = m.replace(",", ".");
    } else {
      normalized = m.replace(/,/g, "");
    }
  } else {
    normalized = m;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/* ---------------------------- meta tag parsing --------------------------- */

function parseMetaTags(html) {
  const metas = [];
  const re = /<meta\b[^>]*>/gi;
  let tag;
  while ((tag = re.exec(html)) !== null) {
    const name =
      attr(tag[0], "name") ||
      attr(tag[0], "property") ||
      attr(tag[0], "itemprop");
    const content = cleanText(attr(tag[0], "content"));
    if (name) metas.push({ key: name.toLowerCase(), content });
  }
  return metas;
}

function metaValue(metas, key) {
  const found = metas.find((m) => m.key === key);
  return found ? found.content : "";
}

function metaValues(metas, key) {
  return metas.filter((m) => m.key === key).map((m) => m.content);
}

/* ---------------------------- JSON-LD parsing ---------------------------- */

function parseJsonLd(html) {
  const blocks = [];
  const re =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let script;
  while ((script = re.exec(html)) !== null) {
    const inner = script[1];
    try {
      blocks.push(JSON.parse(inner));
    } catch {
      // Malformed JSON-LD is ignored; other metadata still applies.
    }
  }
  return blocks;
}

const PRODUCT_TYPES = [
  "Product",
  "ProductGroup",
  "ProductModel",
  "IndividualProduct",
];

function collectProducts(node, out) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectProducts(n, out));
    return;
  }
  if (!node || typeof node !== "object") return;

  const type = node["@type"];
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t) => PRODUCT_TYPES.includes(t))) out.push(node);
  }

  if (Array.isArray(node["@graph"])) collectProducts(node["@graph"], out);
  if (node.mainEntity) collectProducts(node.mainEntity, out);
}

function imageCandidates(image, source = "json-ld") {
  if (!image) return [];
  if (typeof image === "string") return [{ url: image, source }];
  if (Array.isArray(image)) {
    return image.flatMap((item) => imageCandidates(item, source));
  }
  if (typeof image === "object") {
    const url = image.url || image.contentUrl || image["@id"];
    return url
      ? [
          {
            url,
            source,
            width: image.width?.value || image.width,
            height: image.height?.value || image.height,
            semantic: image.representativeOfPage ? "original" : "",
          },
        ]
      : [];
  }
  return [];
}

function imageUrls(image) {
  return imageCandidates(image).map(({ url }) => url);
}

function brandName(brand) {
  if (!brand) return "";
  if (typeof brand === "string") return cleanText(brand);
  if (typeof brand === "object") {
    return cleanText(brand.name || brand["@id"] || "");
  }
  return "";
}

function availabilityLabel(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const path = value.replace(/^https?:\/\/schema\.org\//, "");
    const map = {
      InStock: "In Stock",
      OutOfStock: "Out of Stock",
      PreOrder: "Pre-order",
      LimitedAvailability: "Limited availability",
      Discontinued: "Discontinued",
    };
    if (map[path]) return map[path];
    return cleanText(path);
  }
  return "";
}

function normaliseOffer(offer) {
  if (!offer) return null;
  const price =
    parsePrice(offer.price) ??
    parsePrice(offer.lowPrice) ??
    parsePrice(offer.priceSpecification && offer.priceSpecification.price) ??
    null;
  return {
    price,
    originalPrice: parsePrice(offer.highPrice) ?? null,
    priceCurrency: offer.priceCurrency || "",
    availability: availabilityLabel(offer.availability),
    url: typeof offer.url === "string" ? offer.url : "",
  };
}

function normaliseOffers(offers) {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    const norm = normaliseOffer(offer);
    if (norm && (norm.price != null || norm.availability)) return norm;
  }
  return normaliseOffer(list[0]);
}

function productFromJsonLd(node) {
  const out = {
    title: cleanText(node.name),
    description: cleanText(node.description),
    images: imageUrls(node.image),
    imageCandidates: imageCandidates(node.image),
    sku: cleanText(node.sku),
    productID: cleanText(node.productID),
    gtin: cleanText(
      node.gtin13 || node.gtin12 || node.gtin14 || node.gtin8 || node.gtin,
    ),
    mpn: cleanText(node.mpn),
    category: cleanText(node.category),
    brand: brandName(node.brand),
    rating: null,
    reviewCount: null,
    price: null,
    originalPrice: null,
    priceCurrency: "",
    availability: "",
    offerUrl: "",
    variants: [],
  };

  if (node.aggregateRating) {
    out.rating = parsePrice(node.aggregateRating.ratingValue);
    out.reviewCount =
      parsePrice(node.aggregateRating.reviewCount) ??
      parsePrice(node.aggregateRating.ratingCount) ??
      null;
  }

  const offer = normaliseOffers(node.offers);
  if (offer) {
    out.price = offer.price;
    out.originalPrice = offer.originalPrice;
    out.priceCurrency = offer.priceCurrency;
    out.availability = offer.availability;
    out.offerUrl = offer.url;
  }

  const props = Array.isArray(node.additionalProperty)
    ? node.additionalProperty
    : [];
  for (const p of props) {
    const name = cleanText(p && p.name);
    const value = cleanText(p && p.value);
    if (/size/i.test(name)) out.variants.push({ name: "Size", value });
    if (/color|colour/i.test(name)) out.variants.push({ name: "Color", value });
  }
  if (node.color)
    out.variants.push({ name: "Color", value: cleanText(node.color) });
  if (node.size)
    out.variants.push({ name: "Size", value: cleanText(node.size) });

  return out;
}

function jsonLdProduct(html) {
  const blocks = parseJsonLd(html);
  const products = [];
  blocks.forEach((b) => collectProducts(b, products));
  if (!products.length) return null;
  return productFromJsonLd(products[0]);
}

/* ------------------------------ main extract ----------------------------- */

/**
 * Extracts product metadata from a page's HTML.
 *
 * @param {string} html
 * @param {string} sourceUrl - the URL the admin pasted (fallback origin)
 * @returns a raw metadata object; absent values are empty/null, never invented.
 */
function extractFromHtml(html, sourceUrl) {
  const metas = parseMetaTags(html);
  const ld = jsonLdProduct(html);

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const canonical = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i.exec(html);

  const ogTitle = metaValue(metas, "og:title");
  const ogDescription = metaValue(metas, "og:description");
  const ogImages = metaValues(metas, "og:image");
  const ogImageWidth = metaValue(metas, "og:image:width");
  const ogImageHeight = metaValue(metas, "og:image:height");
  const ogUrl = metaValue(metas, "og:url");
  const ogSiteName = metaValue(metas, "og:site_name");

  const twitterTitle = metaValue(metas, "twitter:title");
  const twitterDescription = metaValue(metas, "twitter:description");
  const twitterImages = [
    metaValue(metas, "twitter:image"),
    metaValue(metas, "twitter:image:src"),
  ].filter(Boolean);

  const metaDescription = metaValue(metas, "description");
  const metaKeywords = metaValue(metas, "keywords");

  const productPrice = metaValue(metas, "product:price:amount");
  const productCurrency = metaValue(metas, "product:price:currency");

  const canonicalUrl = canonical ? cleanText(attr(canonical[0], "href")) : "";
  const safeCanonical = isHttpUrl(canonicalUrl) ? canonicalUrl : "";

  const title =
    (ld && ld.title) ||
    ogTitle ||
    twitterTitle ||
    cleanText(titleTag && titleTag[1]) ||
    "";
  const description =
    (ld && ld.description) ||
    ogDescription ||
    twitterDescription ||
    metaDescription ||
    "";

  const images = rankImageCandidates(
    [
      ...((ld && ld.imageCandidates) || []),
      ...ogImages.map((url, index) => ({
        url: cleanText(url),
        source: "open-graph",
        // OpenGraph dimensions describe the primary image. Do not incorrectly
        // apply them to additional `og:image` entries.
        width: index === 0 ? ogImageWidth : undefined,
        height: index === 0 ? ogImageHeight : undefined,
      })),
      ...twitterImages.map((url) => ({
        url: cleanText(url),
        source: "twitter",
      })),
    ],
    { baseUrl: sourceUrl, limit: 12 },
  );

  const price = (ld && ld.price) ?? parsePrice(productPrice) ?? null;
  const originalPrice =
    (ld && ld.originalPrice) ??
    parsePrice(metaValue(metas, "product:original_price:amount")) ??
    null;
  const priceCurrency = (ld && ld.priceCurrency) || productCurrency || "";

  const rating = (ld && ld.rating) || 0;
  const reviewCount = (ld && ld.reviewCount) || 0;

  const variants = (ld && ld.variants) || [];

  let discount = 0;
  if (price != null && originalPrice != null && originalPrice > price) {
    discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  return {
    title,
    description,
    images,
    price,
    originalPrice,
    priceCurrency,
    discount,
    brand: (ld && ld.brand) || "",
    category: (ld && ld.category) || "",
    rating,
    reviewCount,
    sku: (ld && ld.sku) || "",
    productID: (ld && ld.productID) || "",
    gtin: (ld && ld.gtin) || "",
    mpn: (ld && ld.mpn) || "",
    availability: (ld && ld.availability) || "",
    variants,
    canonicalUrl: safeCanonical || ogUrl || sourceUrl || "",
    siteName: ogSiteName,
    keywords: metaKeywords,
  };
}

module.exports = {
  decodeEntities,
  cleanText,
  parsePrice,
  extractFromHtml,
  parseMetaTags,
  parseJsonLd,
};

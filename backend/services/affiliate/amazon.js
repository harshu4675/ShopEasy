const crypto = require("crypto");
const { ImportError, CODES } = require("./errors");
const { supportsFor, importPublic } = require("./providerUtils");

/**
 * Amazon provider.
 *
 * Primary path (works with NO credentials): fetch the public product page and
 * extract the structured metadata (JSON-LD / OpenGraph / meta tags) that
 * Amazon serves to ordinary visitors.
 *
 * Optional path: if the Product Advertising API credentials are configured in
 * the environment, the provider uses the official PA-API 5.0 instead for
 * richer, reliable data. Credentials are OPTIONAL — their absence never blocks
 * an import, and any API failure falls back to public metadata.
 */

const ID = "amazon";
const LABEL = "Amazon";

const DOMAINS = [
  "amazon.in",
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.com.mx",
  "amazon.com.br",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.com.tr",
  "amazon.ae",
  "amazon.sa",
  "amazon.eg",
  "amazon.sg",
  "amazon.co.jp",
  "amazon.com.au",
];

const REGIONS = {
  "amazon.in": "eu-west-1",
  "amazon.com": "us-east-1",
  "amazon.ca": "us-east-1",
  "amazon.com.mx": "us-east-1",
  "amazon.com.br": "us-east-1",
  "amazon.co.uk": "eu-west-1",
  "amazon.de": "eu-west-1",
  "amazon.fr": "eu-west-1",
  "amazon.it": "eu-west-1",
  "amazon.es": "eu-west-1",
  "amazon.nl": "eu-west-1",
  "amazon.se": "eu-west-1",
  "amazon.pl": "eu-west-1",
  "amazon.com.tr": "eu-west-1",
  "amazon.ae": "eu-west-1",
  "amazon.sa": "eu-west-1",
  "amazon.eg": "eu-west-1",
  "amazon.sg": "us-west-2",
  "amazon.co.jp": "us-west-2",
  "amazon.com.au": "us-west-2",
};

const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})/i,
  /\/gp\/product\/([A-Z0-9]{10})/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
  /\/product\/([A-Z0-9]{10})/i,
  /[?&]asin=([A-Z0-9]{10})/i,
];

const supports = supportsFor(DOMAINS);

function extractProductId(url) {
  try {
    const parsed = new URL(url);
    for (const re of ASIN_PATTERNS) {
      const match = parsed.pathname.match(re) || parsed.search.match(re);
      if (match) return match[1].toUpperCase();
    }
    return "";
  } catch {
    return "";
  }
}

function credentials() {
  return {
    accessKey: process.env.AMAZON_API_KEY || process.env.AMAZON_PA_API_KEY,
    secretKey: process.env.AMAZON_API_SECRET || process.env.AMAZON_PA_API_SECRET,
    partnerTag:
      process.env.AMAZON_PARTNER_TAG || process.env.AMAZON_ASSOCIATE_TAG,
  };
}

/* ------------------------------- Sig V4 -------------------------------- */

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function signRequest({ method, host, path, payload, region, accessKey, secretKey }) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const service = "ProductAdvertisingAPI";
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
  const contentType = "application/json; charset=utf-8";
  const body = JSON.stringify(payload);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders = [
    ["content-encoding", "amz-1.0"],
    ["content-type", contentType],
    ["host", host],
    ["x-amz-date", amzDate],
    ["x-amz-target", target],
  ]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}:${v.trim()}\n`)
    .join("");

  const signedHeaders = ["content-encoding", "content-type", "host", "x-amz-date", "x-amz-target"]
    .sort()
    .join(";");

  const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    body,
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": contentType,
      host,
      "x-amz-date": amzDate,
      "x-amz-target": target,
      authorization,
    },
  };
}

/* ------------------------------ PA-API call ----------------------------- */

async function callGetItems(asin, marketplace, region, creds) {
  const host = `webservices.amazon.${marketplace}`;
  const path = "/paapi5/getitems";
  const payload = {
    ItemIds: [asin],
    Resources: [
      "Images.Primary.Large",
      "Images.Variants.Large",
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.Features",
      "ItemInfo.Classifications",
      "ItemInfo.ProductInfo",
      "ItemInfo.TechnicalInfo",
      "Offers.Listings.Price",
      "Offers.Listings.Availability.Message",
      "Offers.Listings.Availability.Type",
      "Offers.Listings.DeliveryInfo.IsPrimeEligible",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating",
      "VariationSummary.VariationDimension",
    ],
    PartnerTag: creds.partnerTag,
    PartnerType: "Associates",
    Marketplace: `www.${marketplace}`,
  };

  const signed = signRequest({
    method: "POST",
    host,
    path,
    payload,
    region,
    accessKey: creds.accessKey,
    secretKey: creds.secretKey,
  });

  let response;
  try {
    response = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
    });
  } catch {
    throw new ImportError(
      CODES.SOURCE_ERROR,
      "Amazon's product API could not be reached.",
      502,
    );
  }

  if (response.status === 429) {
    throw new ImportError(CODES.RATE_LIMITED, "Amazon rate limit reached.", 429);
  }
  if (response.status === 401) {
    throw new ImportError(CODES.BLOCKED, "Amazon rejected the API credentials.", 401);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ImportError(
      CODES.SOURCE_ERROR,
      (data.Errors && data.Errors[0] && data.Errors[0].Message) || "Amazon API error.",
      502,
    );
  }

  const item = data.ItemsResult && data.ItemsResult.Items && data.ItemsResult.Items[0];
  if (!item) {
    throw new ImportError(CODES.PRODUCT_UNAVAILABLE, "Product not found on Amazon.", 404);
  }
  return item;
}

function pickPrice(listing) {
  if (!listing || !listing.Price) return null;
  const p = listing.Price;
  return {
    price: Number(p.Amount),
    currency: p.Currency,
    original: p.SavingBasis && p.SavingBasis.Price ? Number(p.SavingBasis.Price.Amount) : null,
    discountPercent: p.Savings && p.Savings.Percentage ? Number(p.Savings.Percentage) : null,
  };
}

function normaliseApiItem(item, marketplace, originalUrl, partnerTag) {
  const info = item.ItemInfo || {};
  const offers = item.Offers || {};
  const listings = Array.isArray(offers.Listings) ? offers.Listings : [];
  const primaryListing = listings[0] || null;

  const title = (info.Title && info.Title.DisplayValue) || item.ASIN;
  const features = (info.Features && info.Features.DisplayValues) || [];
  const description = features.length > 0 ? features.join("\n") : title;

  const images = [];
  const primaryImage = item.Images && item.Images.Primary && item.Images.Primary.Large;
  if (primaryImage && primaryImage.URL) images.push(primaryImage.URL);
  const variants = item.Images && item.Images.Variants;
  if (Array.isArray(variants)) {
    for (const v of variants) {
      if (v && v.Large && v.Large.URL && !images.includes(v.Large.URL)) images.push(v.Large.URL);
    }
  }

  const priceInfo = pickPrice(primaryListing);
  const rating = item.CustomerReviews && item.CustomerReviews.StarRating
    ? Number(item.CustomerReviews.StarRating.Value)
    : 0;
  const reviewCount = item.CustomerReviews && item.CustomerReviews.Count
    ? Number(item.CustomerReviews.Count)
    : 0;

  const availability =
    primaryListing && primaryListing.Availability && primaryListing.Availability.Message
      ? primaryListing.Availability.Message
      : "";

  const brand =
    (info.ByLineInfo && info.ByLineInfo.Brand && info.ByLineInfo.Brand.DisplayValue) ||
    (info.ByLineInfo && info.ByLineInfo.Manufacturer && info.ByLineInfo.Manufacturer.DisplayValue) ||
    "";

  const productGroup =
    (info.Classifications && info.Classifications.ProductGroup &&
      info.Classifications.ProductGroup.DisplayValue) ||
    "";
  const binding =
    (info.Classifications && info.Classifications.Binding &&
      info.Classifications.Binding.DisplayValue) ||
    "";

  const variantsMeta = [];
  const variationDimension = item.VariationSummary && item.VariationSummary.VariationDimension;
  if (variationDimension) variantsMeta.push({ name: "Variation", value: variationDimension });

  const canonicalUrl = item.DetailPageURL || `https://www.${marketplace}/dp/${item.ASIN}`;
  const sep = canonicalUrl.includes("?") ? "&" : "?";
  const affiliateUrl = `${canonicalUrl}${sep}tag=${encodeURIComponent(partnerTag)}`;

  const price = priceInfo ? priceInfo.price : 0;
  const original = priceInfo && priceInfo.original ? priceInfo.original : price;

  return {
    title,
    description,
    images,
    price: price || null,
    originalPrice: original > price ? original : price,
    discount:
      priceInfo && priceInfo.discountPercent
        ? Math.round(priceInfo.discountPercent)
        : original > price
          ? Math.round(((original - price) / original) * 100)
          : 0,
    brand,
    category: productGroup || binding || "",
    rating: Number.isFinite(rating) ? rating : 0,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
    variants: variantsMeta,
    availability,
    sourcePlatform: ID,
    externalProductId: item.ASIN,
    originalUrl: canonicalUrl,
    // NOTE: the affiliate URL derived by the API is advisory only. The exact
    // URL the admin pasted always takes precedence as the stored destination.
    affiliateUrl,
  };
}

/* ------------------------------ import ------------------------------- */

async function importProduct(url, deps = {}) {
  if (!supports(url)) {
    throw new ImportError(CODES.INVALID_URL, "This URL is not an Amazon product URL.");
  }

  const asin = extractProductId(url);
  const creds = credentials();

  // Optional official API path: used only when credentials are configured.
  if (creds.accessKey && creds.secretKey && creds.partnerTag && asin) {
    try {
      const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      const region = REGIONS[hostname] || "us-east-1";
      const item = await callGetItems(asin, hostname, region, creds);
      return normaliseApiItem(item, hostname, url, creds.partnerTag);
    } catch (err) {
      if (err instanceof ImportError && err.code === "BLOCKED") throw err;
      // Any other API problem → fall through to public metadata extraction.
    }
  }

  // Public metadata path — works with no credentials at all.
  const result = await importPublic(url, deps, { id: ID, extractProductId });
  if (asin && !result.externalProductId) result.externalProductId = asin;
  return result;
}

module.exports = {
  id: ID,
  label: LABEL,
  domains: DOMAINS,
  supports,
  extractProductId,
  importProduct,
};

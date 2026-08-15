const crypto = require("crypto");
const { ImportError, CODES } = require("./errors");

/**
 * Amazon provider backed by the official Product Advertising API (PA-API 5.0).
 *
 * This deliberately does NOT scrape amazon.com: scraping bypasses bot
 * protection and violates Amazon's terms. With the API credentials configured
 * (see .env.example) the provider signs a standard AWS Signature v4 request,
 * retrieves the product via GetItems and returns a normalised result.
 *
 * Without credentials it fails fast with a MISSING_CREDENTIALS error so the
 * admin sees exactly what is required to enable Amazon imports.
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

// Marketplace → AWS region for PA-API signing.
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

function parseHost(hostname) {
  return hostname ? String(hostname).toLowerCase().replace(/^www\./, "") : "";
}

function marketplaceForHost(hostname) {
  const host = parseHost(hostname);
  if (DOMAINS.includes(host)) return host;
  // Subdomains other than www (rare) still resolve to the marketplace.
  const match = DOMAINS.find((d) => host.endsWith(`.${d}`));
  return match || null;
}

function supports(url) {
  try {
    return Boolean(marketplaceForHost(new URL(url).hostname));
  } catch {
    return false;
  }
}

function extractProductId(url) {
  try {
    const parsed = new URL(url);
    for (const re of ASIN_PATTERNS) {
      const match = parsed.pathname.match(re) || parsed.search.match(re);
      if (match) return match[1].toUpperCase();
    }
    return null;
  } catch {
    return null;
  }
}

function credentials() {
  const accessKey = process.env.AMAZON_API_KEY;
  const secretKey = process.env.AMAZON_API_SECRET;
  const partnerTag =
    process.env.AMAZON_PARTNER_TAG || process.env.AMAZON_ASSOCIATE_TAG;
  return { accessKey, secretKey, partnerTag };
}

function hasCredentials() {
  const { accessKey, secretKey, partnerTag } = credentials();
  return Boolean(accessKey && secretKey && partnerTag);
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

  return { body, headers: {
    "content-encoding": "amz-1.0",
    "content-type": contentType,
    "host": host,
    "x-amz-date": amzDate,
    "x-amz-target": target,
    authorization,
  } };
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
  } catch (err) {
    throw new ImportError(
      CODES.SOURCE_ERROR,
      "Amazon's product API could not be reached. Please try again shortly.",
      502,
    );
  }

  if (response.status === 429) {
    throw new ImportError(
      CODES.RATE_LIMITED,
      "Amazon's product API rate limit has been reached. Please try again in a minute.",
      429,
    );
  }
  if (response.status === 401) {
    throw new ImportError(
      CODES.MISSING_CREDENTIALS,
      "Amazon rejected the API credentials. Check AMAZON_API_KEY and AMAZON_API_SECRET.",
      401,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiError = (data.Errors && data.Errors[0]) || {};
    if (apiError.Code === "InvalidParameterValue" || apiError.Code === "InvalidItemId") {
      throw new ImportError(
        CODES.PRODUCT_UNAVAILABLE,
        "This product could not be found on Amazon. Check the URL and try again.",
        404,
      );
    }
    throw new ImportError(
      CODES.SOURCE_ERROR,
      apiError.Message || "Amazon's product API returned an error.",
      502,
    );
  }

  const item = data.ItemsResult && data.ItemsResult.Items && data.ItemsResult.Items[0];
  if (!item) {
    throw new ImportError(
      CODES.PRODUCT_UNAVAILABLE,
      "This product could not be found on Amazon. Check the URL and try again.",
      404,
    );
  }

  return item;
}

/* ------------------------------ Normalisation ---------------------------- */

function pickPrice(listing) {
  if (!listing || !listing.Price) return null;
  const p = listing.Price;
  return {
    price: Number(p.Amount),
    currency: p.Currency,
    display: p.DisplayAmount,
    original: p.SavingBasis && p.SavingBasis.Price
      ? Number(p.SavingBasis.Price.Amount)
      : null,
    discountPercent: p.Savings && p.Savings.Percentage
      ? Number(p.Savings.Percentage)
      : null,
  };
}

function normalise(item, marketplace, originalUrl, partnerTag) {
  const info = item.ItemInfo || {};
  const offers = item.Offers || {};
  const listings = Array.isArray(offers.Listings) ? offers.Listings : [];
  const primaryListing = listings[0] || null;

  const title = (info.Title && info.Title.DisplayValue) || item.ASIN;
  const features = (info.Features && info.Features.DisplayValues) || [];
  const description =
    features.length > 0 ? features.join("\n") : title;

  const images = [];
  const primaryImage = item.Images && item.Images.Primary && item.Images.Primary.Large;
  if (primaryImage && primaryImage.URL) images.push(primaryImage.URL);
  const variants = item.Images && item.Images.Variants;
  if (Array.isArray(variants)) {
    for (const v of variants) {
      if (v && v.Large && v.Large.URL && !images.includes(v.Large.URL)) {
        images.push(v.Large.URL);
      }
    }
  }

  const priceInfo = pickPrice(primaryListing);
  const rating =
    item.CustomerReviews && item.CustomerReviews.StarRating
      ? Number(item.CustomerReviews.StarRating.Value)
      : 0;
  const reviewCount =
    item.CustomerReviews && item.CustomerReviews.Count
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
  const variationDimension =
    item.VariationSummary && item.VariationSummary.VariationDimension;
  if (variationDimension) {
    variantsMeta.push({ dimension: variationDimension });
  }

  const canonicalUrl =
    item.DetailPageURL ||
    `https://www.${marketplace}/dp/${item.ASIN}`;

  const sep = canonicalUrl.includes("?") ? "&" : "?";
  const affiliateUrl = `${canonicalUrl}${sep}tag=${encodeURIComponent(partnerTag)}`;

  const price = priceInfo ? priceInfo.price : 0;
  const original = priceInfo && priceInfo.original ? priceInfo.original : price;

  return {
    title,
    description,
    images,
    price,
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
    affiliateUrl,
  };
}

async function importProduct(url) {
  if (!supports(url)) {
    throw new ImportError(CODES.UNSUPPORTED_PLATFORM, "This URL is not an Amazon product URL.");
  }

  const asin = extractProductId(url);
  if (!asin) {
    throw new ImportError(
      CODES.PRODUCT_UNAVAILABLE,
      "Could not find a product ID (ASIN) in that Amazon URL.",
    );
  }

  const { accessKey, secretKey, partnerTag } = credentials();
  if (!accessKey || !secretKey || !partnerTag) {
    throw new ImportError(
      CODES.MISSING_CREDENTIALS,
      "Amazon imports require the Product Advertising API. Set AMAZON_API_KEY, " +
        "AMAZON_API_SECRET and AMAZON_PARTNER_TAG (or AMAZON_ASSOCIATE_TAG) in the " +
        "backend environment to enable them.",
      501,
    );
  }

  const marketplace = marketplaceForHost(new URL(url).hostname);
  const region = REGIONS[marketplace] || "us-east-1";

  const item = await callGetItems(asin, marketplace, region, {
    accessKey,
    secretKey,
    partnerTag,
  });

  return normalise(item, marketplace, url, partnerTag);
}

module.exports = {
  id: ID,
  label: LABEL,
  domains: DOMAINS,
  supports,
  extractProductId,
  hasCredentials,
  importProduct,
};

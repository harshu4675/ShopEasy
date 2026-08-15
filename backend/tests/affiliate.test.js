/**
 * Unit tests for the affiliate import pipeline.
 *
 * Covers the deterministic, credential-free logic: URL inspection, provider
 * detection, product-id extraction, public-metadata parsing (JSON-LD /
 * OpenGraph / meta tags), price parsing, category mapping and the redirect
 * safety guard. No database or network is required — page fetches are stubbed.
 *
 *   npm test            (from backend/)
 *   node --test tests/
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { ImportError, CODES } = require("../services/affiliate/errors");
const affiliateService = require("../services/affiliateService");
const {
  extractFromHtml,
  parsePrice,
  decodeEntities,
} = require("../services/affiliate/metadata");
const { detectProvider, isSafeRedirectUrl } = require("../services/affiliate");
const amazon = require("../services/affiliate/amazon");
const flipkart = require("../services/affiliate/flipkart");
const myntra = require("../services/affiliate/myntra");
const ajio = require("../services/affiliate/ajio");
const meesho = require("../services/affiliate/meesho");

/* ----------------------------- URL inspection ---------------------------- */

test("inspectUrl rejects an empty URL", () => {
  assert.throws(
    () => affiliateService.inspectUrl(""),
    (err) => err instanceof ImportError && err.code === "INVALID_URL",
  );
});

test("inspectUrl rejects a non-URL string", () => {
  assert.throws(
    () => affiliateService.inspectUrl("not a url"),
    (err) => err instanceof ImportError && err.code === "INVALID_URL",
  );
});

test("inspectUrl does NOT reject an unknown marketplace", () => {
  const { provider } = affiliateService.inspectUrl(
    "https://example.com/product/123",
  );
  assert.equal(provider, null);
});

/* ----------------------------- Provider detection ------------------------ */

test("detectProvider recognises every supported marketplace", () => {
  assert.equal(
    detectProvider("https://www.amazon.in/dp/B08N5WRWNW").id,
    "amazon",
  );
  assert.equal(
    detectProvider("https://www.flipkart.com/x/p/itm123?pid=SHOE1").id,
    "flipkart",
  );
  assert.equal(
    detectProvider("https://www.myntra.com/kurtas/xyz/12345678/buy").id,
    "myntra",
  );
  assert.equal(
    detectProvider("https://www.ajio.com/x/y/p/12345678").id,
    "ajio",
  );
  assert.equal(
    detectProvider("https://www.meesho.com/x/p/abc123").id,
    "meesho",
  );
  assert.equal(detectProvider("https://some-random-shop.example/p/1"), null);
});

test("amazon.supports accepts marketplaces and rejects others", () => {
  assert.equal(amazon.supports("https://www.amazon.in/dp/X"), true);
  assert.equal(amazon.supports("https://amazon.com/dp/X"), true);
  assert.equal(amazon.supports("https://www.amazon.co.uk/dp/X"), true);
  assert.equal(amazon.supports("https://notamazon.com/dp/X"), false);
});

test("product-id extraction", () => {
  assert.equal(
    amazon.extractProductId("https://www.amazon.in/dp/B08N5WRWNW"),
    "B08N5WRWNW",
  );
  assert.equal(
    amazon.extractProductId("https://www.amazon.com/gp/product/B08N5WRWNW"),
    "B08N5WRWNW",
  );
  assert.equal(
    flipkart.extractProductId(
      "https://www.flipkart.com/x/p/itm123?pid=SHOE123",
    ),
    "SHOE123",
  );
  assert.equal(
    myntra.extractProductId("https://www.myntra.com/kurtas/xyz/12345678/buy"),
    "12345678",
  );
  assert.equal(
    ajio.extractProductId("https://www.ajio.com/a/b/p/12345678"),
    "12345678",
  );
  assert.equal(
    meesho.extractProductId("https://www.meesho.com/x/p/ABC123"),
    "ABC123",
  );
});

/* ----------------------------- Metadata parsing -------------------------- */

const SAMPLE_HTML = `<!doctype html><html><head>
<title>Nike Air Max Running Shoes - Buy Online</title>
<meta property="og:title" content="Nike Air Max Running Shoes" />
<meta property="og:description" content="Comfortable running shoes for men" />
<meta property="og:image" content="https://img.example.com/shoe1.jpg" />
<meta name="description" content="Meta description fallback" />
<link rel="canonical" href="https://www.amazon.in/dp/B08N5WRWNW" />
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"Product","name":"Nike Air Max Running Shoes","description":"Comfortable running shoes for men","image":["https://img.example.com/shoe1.jpg","https://img.example.com/shoe2.jpg"],"sku":"B08N5WRWNW","brand":{"@type":"Brand","name":"Nike"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"1234"},"offers":{"@type":"Offer","price":"2999","priceCurrency":"INR","availability":"https://schema.org/InStock"}}]}
</script>
</head><body></body></html>`;

test("extractFromHtml reads JSON-LD Product data", () => {
  const meta = extractFromHtml(
    SAMPLE_HTML,
    "https://www.amazon.in/dp/B08N5WRWNW",
  );
  assert.equal(meta.title, "Nike Air Max Running Shoes");
  assert.equal(meta.description, "Comfortable running shoes for men");
  assert.equal(meta.images.length, 2);
  assert.equal(meta.price, 2999);
  assert.equal(meta.brand, "Nike");
  assert.equal(meta.rating, 4.5);
  assert.equal(meta.reviewCount, 1234);
  assert.equal(meta.availability, "In Stock");
  assert.equal(meta.sku, "B08N5WRWNW");
  assert.equal(meta.canonicalUrl, "https://www.amazon.in/dp/B08N5WRWNW");
});

test("extractFromHtml falls back to OpenGraph when JSON-LD is absent", () => {
  const html = `<!doctype html><html><head>
  <title>Some Page</title>
  <meta property="og:title" content="Casio Watch" />
  <meta property="og:image" content="https://img.example.com/watch.jpg" />
  <meta property="product:price:amount" content="1,499" />
  <meta property="product:price:currency" content="INR" />
  </head><body></body></html>`;
  const meta = extractFromHtml(html, "https://example.com/p/1");
  assert.equal(meta.title, "Casio Watch");
  assert.equal(meta.images[0], "https://img.example.com/watch.jpg");
  assert.equal(meta.price, 1499);
});

test("extractFromHtml ranks image evidence instead of taking the first URL", () => {
  const html = `<!doctype html><html><head>
  <meta property="og:title" content="Quality test" />
  <meta property="og:image" content="/images/product-master.jpg" />
  <meta property="og:image:width" content="1600" />
  <meta property="og:image:height" content="1200" />
  <script type="application/ld+json">
  {"@type":"Product","name":"Quality test","image":{"@type":"ImageObject","url":"https://cdn.example/product-thumb.jpg","width":150,"height":150}}
  </script>
  </head><body></body></html>`;
  const meta = extractFromHtml(html, "https://shop.example/p/1");
  assert.equal(
    meta.images[0],
    "https://shop.example/images/product-master.jpg",
  );
  assert.equal(meta.images[1], "https://cdn.example/product-thumb.jpg");
});

test("parsePrice handles Indian and western formats", () => {
  assert.equal(parsePrice("₹1,299"), 1299);
  assert.equal(parsePrice("$49.99"), 49.99);
  assert.equal(parsePrice("1,299.00"), 1299);
  assert.equal(parsePrice("49,99"), 49.99);
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("not a price"), null);
});

test("decodeEntities decodes common HTML entities", () => {
  assert.equal(
    decodeEntities("Men&#39;s &amp; Women&#8217;s"),
    "Men's & Women\u2019s",
  );
});

/* --------------------------- Import orchestration ------------------------ */

const okFetch = (html) => async () => ({
  html,
  finalUrl: "https://www.amazon.in/dp/B08N5WRWNW",
});
const failingFetch = () => {
  throw new ImportError(
    CODES.BLOCKED,
    "The product page could not be accessed (the marketplace restricted automated access). You can enter the product information manually.",
    403,
  );
};

test("importFromUrl preserves the pasted affiliate URL exactly", async () => {
  const url = "https://www.amazon.in/dp/B08N5WRWNW?tag=mytag-21&linkCode=ogi";
  const outcome = await affiliateService.importFromUrl(url, {
    fetchPage: okFetch(SAMPLE_HTML),
  });

  assert.equal(outcome.product.affiliateUrl, url); // tracking params preserved
  assert.equal(
    outcome.product.originalUrl,
    "https://www.amazon.in/dp/B08N5WRWNW",
  );
  assert.equal(outcome.product.sourcePlatform, "amazon");
  assert.equal(outcome.product.externalProductId, "B08N5WRWNW");
  assert.equal(outcome.product.price, 2999);
  assert.equal(outcome.product.category, "Footwear");
  assert.equal(outcome.fetchFailed, false);
  assert.ok(!outcome.missing.includes("title"));
  assert.ok(!outcome.missing.includes("price"));
});

test("importFromUrl handles an unknown marketplace via the generic provider", async () => {
  const outcome = await affiliateService.importFromUrl(
    "https://some-random-shop.example/p/123",
    { fetchPage: okFetch(SAMPLE_HTML) },
  );
  assert.equal(outcome.product.sourcePlatform, "unknown");
  assert.ok(
    outcome.warnings.some((w) => /not specifically supported/i.test(w)),
  );
  assert.equal(outcome.product.title, "Nike Air Max Running Shoes");
});

test("importFromUrl does not fabricate data and flags missing fields", async () => {
  const bareHtml =
    "<!doctype html><html><head><title>Page</title></head><body></body></html>";
  const outcome = await affiliateService.importFromUrl(
    "https://www.amazon.in/dp/B08N5WRWNW",
    {
      fetchPage: okFetch(bareHtml),
    },
  );
  assert.equal(outcome.product.price, null);
  assert.equal(outcome.product.title, "Page"); // the <title> tag is real metadata
  assert.equal(outcome.product.description, "");
  assert.equal(outcome.fetchFailed, false);
  assert.ok(outcome.missing.includes("image"));
  assert.ok(outcome.missing.includes("price"));
  assert.ok(
    outcome.warnings.some((w) =>
      /could not be automatically detected/i.test(w),
    ),
  );
});

test("importFromUrl survives a blocked page and returns a manual-entry result", async () => {
  const outcome = await affiliateService.importFromUrl(
    "https://www.amazon.in/dp/B08N5WRWNW",
    {
      fetchPage: failingFetch,
    },
  );
  assert.equal(outcome.fetchFailed, true);
  assert.ok(/restricted automated access/i.test(outcome.errorMessage));
  assert.ok(outcome.missing.includes("title"));
  assert.equal(
    outcome.product.affiliateUrl,
    "https://www.amazon.in/dp/B08N5WRWNW",
  );
});

/* ------------------------------ Field mapping ---------------------------- */

test("toProductFields maps provider output and tolerates a null price", () => {
  const fields = affiliateService.toProductFields({
    title: "A nice watch",
    description: "Analog watch",
    images: ["https://img.example.com/1.jpg"],
    price: null,
    originalPrice: null,
    brand: "Casio",
    category: "Watches",
    rating: 4.4,
    reviewCount: 321,
    variants: [{ name: "Color", value: "Black" }],
    availability: "In Stock",
    sourcePlatform: "amazon",
    externalProductId: "B08N5WRWNW",
    originalUrl: "https://www.amazon.in/dp/B08N5WRWNW",
    affiliateUrl: "https://www.amazon.in/dp/B08N5WRWNW?tag=t-21",
  });

  assert.equal(fields.name, "A nice watch");
  assert.equal(fields.price, 0);
  assert.equal(fields.originalPrice, 0);
  assert.equal(fields.images.length, 1);
  assert.equal(fields.externalProductId, "B08N5WRWNW");
  assert.equal(
    fields.affiliateUrl,
    "https://www.amazon.in/dp/B08N5WRWNW?tag=t-21",
  );
});

/* ---------------------------- Redirect safety ---------------------------- */

const publishedAffiliate = {
  productType: "AFFILIATE",
  status: "published",
  affiliateUrl: "https://www.amazon.in/dp/B08N5WRWNW?tag=test-21",
  originalUrl: "https://www.amazon.in/dp/B08N5WRWNW",
};

test("resolveAffiliateUrl returns the stored affiliate URL (any http(s) marketplace)", () => {
  assert.equal(
    affiliateService.resolveAffiliateUrl(publishedAffiliate),
    "https://www.amazon.in/dp/B08N5WRWNW?tag=test-21",
  );
  assert.equal(
    affiliateService.resolveAffiliateUrl({
      ...publishedAffiliate,
      affiliateUrl: "https://some-random-shop.example/p/1",
    }),
    "https://some-random-shop.example/p/1",
  );
});

test("resolveAffiliateUrl supports legacy origin metadata and refuses manual/draft products", () => {
  assert.equal(
    affiliateService.resolveAffiliateUrl({
      ...publishedAffiliate,
      // Legacy imports received the schema's INTERNAL default even though the
      // persisted affiliate destination identifies them as external products.
      productType: "INTERNAL",
    }),
    publishedAffiliate.affiliateUrl,
  );
  assert.throws(
    () =>
      affiliateService.resolveAffiliateUrl({
        productType: "INTERNAL",
        status: "published",
        affiliateUrl: "",
      }),
    (err) => err instanceof ImportError && err.httpStatus === 404,
  );
  assert.throws(
    () =>
      affiliateService.resolveAffiliateUrl({
        ...publishedAffiliate,
        status: "draft",
      }),
    (err) => err instanceof ImportError && err.httpStatus === 404,
  );
});

test("resolveAffiliateUrl refuses non-http(s) destinations", () => {
  assert.throws(
    () =>
      affiliateService.resolveAffiliateUrl({
        ...publishedAffiliate,
        affiliateUrl: "javascript:alert(1)",
      }),
    (err) => err instanceof ImportError && err.code === "SOURCE_ERROR",
  );
});

test("isSafeRedirectUrl allows http(s) and rejects other schemes", () => {
  assert.equal(isSafeRedirectUrl("https://www.amazon.in/dp/X?tag=t-21"), true);
  assert.equal(isSafeRedirectUrl("http://example.com/p/1"), true);
  assert.equal(isSafeRedirectUrl("javascript:alert(1)"), false);
  assert.equal(isSafeRedirectUrl("data:text/html,x"), false);
  assert.equal(isSafeRedirectUrl("ftp://example.com"), false);
});

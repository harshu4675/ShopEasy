/**
 * Unit tests for the affiliate import pipeline — URL inspection, provider
 * detection, ASIN extraction, category mapping and the redirect whitelist.
 *
 * These cover the deterministic logic only (no DB, no network), so they run
 * with the built-in Node test runner:
 *
 *   npm test            (from backend/)
 *   node --test tests/
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { ImportError } = require("../services/affiliate/errors");
const affiliateService = require("../services/affiliateService");
const amazon = require("../services/affiliate/amazon");
const flipkart = require("../services/affiliate/flipkart");
const { detectProvider, isAllowedDestination } = require("../services/affiliate");

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

test("inspectUrl rejects an unsupported platform", () => {
  assert.throws(
    () => affiliateService.inspectUrl("https://example.com/product/123"),
    (err) => err instanceof ImportError && err.code === "UNSUPPORTED_PLATFORM",
  );
});

test("inspectUrl detects an Amazon URL", () => {
  const { provider } = affiliateService.inspectUrl(
    "https://www.amazon.in/Nike-Shoes/dp/B08N5WRWNW",
  );
  assert.equal(provider.id, "amazon");
});

test("inspectUrl detects a Flipkart URL", () => {
  const { provider } = affiliateService.inspectUrl(
    "https://www.flipkart.com/some-product/p/itmabcdef?pid=SHOEGH12K",
  );
  assert.equal(provider.id, "flipkart");
});

/* ----------------------------- ASIN extraction --------------------------- */

test("extractProductId reads ASIN from /dp/ paths", () => {
  assert.equal(
    amazon.extractProductId("https://www.amazon.in/dp/B08N5WRWNW"),
    "B08N5WRWNW",
  );
});

test("extractProductId reads ASIN from /gp/product/ paths", () => {
  assert.equal(
    amazon.extractProductId("https://www.amazon.com/gp/product/B08N5WRWNW?ref=x"),
    "B08N5WRWNW",
  );
});

test("extractProductId returns null without an ASIN", () => {
  assert.equal(amazon.extractProductId("https://www.amazon.in/"), null);
});

/* ---------------------------- Provider detection -------------------------- */

test("amazon.supports accepts amazon marketplaces and rejects others", () => {
  assert.equal(amazon.supports("https://www.amazon.in/dp/X"), true);
  assert.equal(amazon.supports("https://amazon.com/dp/X"), true);
  assert.equal(amazon.supports("https://www.amazon.co.uk/dp/X"), true);
  assert.equal(amazon.supports("https://notamazon.com/dp/X"), false);
});

test("flipkart.supports accepts flipkart hosts", () => {
  assert.equal(flipkart.supports("https://www.flipkart.com/p/itm123"), true);
  assert.equal(flipkart.supports("https://flipkart.com/p/itm123"), true);
  assert.equal(flipkart.supports("https://amazon.in/dp/X"), false);
});

test("flipkart.extractProductId prefers the pid query param", () => {
  assert.equal(
    flipkart.extractProductId("https://www.flipkart.com/x/p/itm123?pid=SHOE123"),
    "SHOE123",
  );
});

/* ----------------------------- Category mapping --------------------------- */

test("mapCategory maps footwear keywords", () => {
  assert.equal(
    affiliateService.mapCategory("Nike Air Running Shoes for Men"),
    "Footwear",
  );
});

test("mapCategory falls back to Accessories for unknown input", () => {
  assert.equal(affiliateService.mapCategory("Mystery gadget"), "Accessories");
});

test("mapCategory maps watches", () => {
  assert.equal(affiliateService.mapCategory("Casio Analog Wrist Watch"), "Watches");
});

/* ---------------------------- Redirect whitelist -------------------------- */

test("isAllowedDestination allows known marketplaces", () => {
  assert.equal(
    isAllowedDestination("https://www.amazon.in/dp/B08N5WRWNW?tag=x-21"),
    true,
  );
  assert.equal(isAllowedDestination("https://amazon.com/dp/B08N5WRWNW"), true);
  assert.equal(isAllowedDestination("https://www.flipkart.com/p/itm123"), true);
});

test("isAllowedDestination rejects arbitrary hosts", () => {
  assert.equal(isAllowedDestination("https://evil.example.com/steal"), false);
  assert.equal(isAllowedDestination("javascript:alert(1)"), false);
});

/* ---------------------------- Redirect resolver --------------------------- */

const publishedAffiliate = {
  productType: "AFFILIATE",
  status: "published",
  affiliateUrl: "https://www.amazon.in/dp/B08N5WRWNW?tag=test-21",
  originalUrl: "https://www.amazon.in/dp/B08N5WRWNW",
};

test("resolveAffiliateUrl returns the stored affiliate URL", () => {
  assert.equal(
    affiliateService.resolveAffiliateUrl(publishedAffiliate),
    "https://www.amazon.in/dp/B08N5WRWNW?tag=test-21",
  );
});

test("resolveAffiliateUrl refuses non-affiliate products", () => {
  assert.throws(
    () =>
      affiliateService.resolveAffiliateUrl({
        productType: "INTERNAL",
        status: "published",
        affiliateUrl: "https://www.amazon.in/dp/X",
      }),
    (err) => err instanceof ImportError && err.httpStatus === 404,
  );
});

test("resolveAffiliateUrl refuses draft products", () => {
  assert.throws(
    () => affiliateService.resolveAffiliateUrl({ ...publishedAffiliate, status: "draft" }),
    (err) => err instanceof ImportError && err.httpStatus === 404,
  );
});

test("resolveAffiliateUrl refuses a destination outside the whitelist", () => {
  assert.throws(
    () =>
      affiliateService.resolveAffiliateUrl({
        ...publishedAffiliate,
        affiliateUrl: "https://evil.example.com/redirect",
      }),
    (err) => err instanceof ImportError && err.code === "SOURCE_ERROR",
  );
});

/* ------------------------------ Field mapping ----------------------------- */

test("toProductFields maps provider output onto Product fields", () => {
  const fields = affiliateService.toProductFields({
    title: "A nice watch",
    description: "Analog watch",
    images: ["https://img.example.com/1.jpg"],
    price: 1200,
    originalPrice: 2000,
    discount: 40,
    brand: "Casio",
    category: "Watches",
    rating: 4.4,
    reviewCount: 321,
    variants: [{ dimension: "Color" }],
    availability: "In stock",
    sourcePlatform: "amazon",
    externalProductId: "B08N5WRWNW",
    originalUrl: "https://www.amazon.in/dp/B08N5WRWNW",
    affiliateUrl: "https://www.amazon.in/dp/B08N5WRWNW?tag=t-21",
  });

  assert.equal(fields.name, "A nice watch");
  assert.equal(fields.productType, undefined); // productType is set by the route
  assert.equal(fields.images.length, 1);
  assert.equal(fields.discount, 40);
  assert.equal(fields.externalProductId, "B08N5WRWNW");
});

/* ------------------------------ Registration ------------------------------ */

test("registry exposes both providers", () => {
  assert.equal(detectProvider("https://www.amazon.in/dp/X").id, "amazon");
  assert.equal(detectProvider("https://www.flipkart.com/p/itm1").id, "flipkart");
  assert.equal(detectProvider("https://example.com"), null);
});

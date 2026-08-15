const test = require("node:test");
const assert = require("node:assert/strict");

const {
  inferSourcePlatform,
  isAffiliateProduct,
  isSafeWebUrl,
  sourcePlatformFor,
  withCanonicalOrigin,
} = require("../utils/productOrigin");
const {
  dimensionsFromUrl,
  rankImageCandidates,
  resolveHttpUrl,
} = require("../services/imageRanking");
const {
  createProductDeletionService,
  ownedProductPublicId,
} = require("../services/productDeletion");

/* ----------------------- Product origin / commerce ----------------------- */

test("canonical and legacy persisted metadata classify affiliate products", () => {
  assert.equal(isAffiliateProduct({ productType: "AFFILIATE" }), true);
  assert.equal(
    isAffiliateProduct({
      productType: "INTERNAL",
      affiliateUrl: "https://www.amazon.in/dp/ABC?tag=shop-21",
    }),
    true,
  );
  assert.equal(isAffiliateProduct({ productType: "INTERNAL" }), false);
  assert.equal(
    isAffiliateProduct({ affiliateUrl: "javascript:alert(document.domain)" }),
    false,
  );
});

test("origin normalization never relies on a product name", () => {
  const manual = withCanonicalOrigin({
    name: "Imported Amazon Marketplace Deal",
    productType: "INTERNAL",
  });
  assert.equal(manual.productType, "INTERNAL");
  assert.equal(manual.isAffiliate, false);

  const legacy = withCanonicalOrigin({
    name: "Plain title",
    affiliateUrl: "https://fkrt.it/tracked",
  });
  assert.equal(legacy.productType, "AFFILIATE");
  assert.equal(legacy.isAffiliate, true);
  assert.equal(legacy.sourcePlatform, "flipkart");
});

test("platform inference and URL safety cover supported and unknown stores", () => {
  assert.equal(inferSourcePlatform("https://amzn.to/abc"), "amazon");
  assert.equal(
    inferSourcePlatform("https://www.meesho.com/item/p/x"),
    "meesho",
  );
  assert.equal(inferSourcePlatform("https://shop.example/item/1"), "unknown");
  assert.equal(
    sourcePlatformFor({
      platform: "AJIO",
      affiliateUrl: "https://shop.example/item/1",
    }),
    "ajio",
  );
  assert.equal(isSafeWebUrl("https://example.com/a"), true);
  assert.equal(isSafeWebUrl("data:text/html,test"), false);
});

/* ----------------------------- Image quality ----------------------------- */

test("image ranking selects declared high-resolution evidence without upscaling", () => {
  const original =
    "https://images.example/product/master.jpg?width=1600&signature=a+b%2Fc";
  const ranked = rankImageCandidates(
    [
      {
        url: "https://images.example/product/thumb.jpg?w=120&h=120",
        source: "img-src",
        width: 120,
        height: 120,
      },
      {
        url: original,
        source: "srcset",
        semantic: "original zoom",
        width: 1600,
        height: 1200,
      },
      {
        url: "https://images.example/product/medium.jpg?w=700&h=700",
        source: "og:image",
        width: 700,
        height: 700,
      },
    ],
    { baseUrl: "https://shop.example/p/1" },
  );

  assert.equal(ranked[0], original);
  assert.equal(ranked.includes(original), true);
});

test("image ranking resolves relative candidates and excludes UI/tiny assets", () => {
  const ranked = rankImageCandidates(
    [
      { url: "/assets/logo.png", width: 1000, height: 500 },
      { url: "/tracking/pixel.png", width: 1, height: 1 },
      {
        url: "/products/photo-1200x900.jpg",
        source: "json-ld",
        width: 1200,
        height: 900,
      },
    ],
    { baseUrl: "https://shop.example/catalog/item" },
  );

  assert.deepEqual(ranked, [
    "https://shop.example/products/photo-1200x900.jpg",
  ]);
});

test("HTTP URL resolution preserves absolute source bytes and parses dimensions", () => {
  const source = "https://cdn.example/a%2Fb.jpg?token=x+y&width=1400";
  assert.equal(resolveHttpUrl(source, "https://unused.example").url, source);
  assert.equal(
    resolveHttpUrl("../image.jpg", "https://shop.example/p/item").url,
    "https://shop.example/image.jpg",
  );
  assert.equal(
    resolveHttpUrl("javascript:alert(1)", "https://shop.example"),
    null,
  );
  assert.deepEqual(
    dimensionsFromUrl("https://cdn.example/image/1200/900/file.jpg?w=800"),
    { width: 1200, height: 900 },
  );
});

/* -------------------------- Database-first deletion ---------------------- */

function deletionFixtures({ cartFailure = false, configFailure = false } = {}) {
  const events = [];
  const product = {
    _id: "product-1",
    images: [
      "https://res.cloudinary.com/demo/image/upload/v1700000000/shopeasy/products/photo.jpg",
      "https://marketplace.example/external.jpg",
    ],
  };
  const ProductModel = {
    async findOneAndDelete(query) {
      events.push(["delete", query]);
      return product;
    },
  };
  const CartModel = {
    async updateMany(query, update) {
      events.push(["cart", query, update]);
      if (cartFailure) throw new Error("cart unavailable");
      return { modifiedCount: 1 };
    },
  };
  const WishlistModel = {
    async updateMany(query, update) {
      events.push(["wishlist", query, update]);
      return { modifiedCount: 1 };
    },
  };
  const cloudinaryClient = {
    config() {
      if (configFailure) throw new Error("cloud config unavailable");
      return { cloud_name: "demo" };
    },
    uploader: {
      async destroy(publicId) {
        events.push(["cloudinary", publicId]);
      },
    },
  };

  return {
    events,
    ProductModel,
    CartModel,
    WishlistModel,
    cloudinaryClient,
  };
}

test("deletion removes the database record first and cleans only owned assets", async () => {
  const fixtures = deletionFixtures();
  const deleteProduct = createProductDeletionService({
    ...fixtures,
    logger: { warn() {} },
  });
  const result = await deleteProduct("product-1", { createdBy: "admin-1" });

  assert.ok(result.product);
  assert.equal(fixtures.events[0][0], "delete");
  assert.equal(
    fixtures.events.some(([type]) => type === "cart"),
    true,
  );
  assert.equal(
    fixtures.events.some(([type]) => type === "wishlist"),
    true,
  );
  assert.deepEqual(
    fixtures.events.filter(([type]) => type === "cloudinary"),
    [["cloudinary", "shopeasy/products/photo"]],
  );
  assert.deepEqual(result.cleanupErrors, []);
});

test("post-delete cleanup failures are reported but cannot restore/fail deletion", async () => {
  const fixtures = deletionFixtures({ cartFailure: true, configFailure: true });
  const deleteProduct = createProductDeletionService({
    ...fixtures,
    logger: { warn() {} },
  });
  const result = await deleteProduct("product-1");

  assert.ok(result.product);
  assert.equal(fixtures.events[0][0], "delete");
  assert.equal(
    fixtures.events.some(([type]) => type === "wishlist"),
    true,
  );
  assert.equal(
    fixtures.events.some(([type]) => type === "cloudinary"),
    false,
  );
  assert.deepEqual(
    result.cleanupErrors.map(({ scope }) => scope),
    ["cart reference", "image configuration"],
  );
});

test("synchronous reference cleanup errors remain best-effort after deletion", async () => {
  const fixtures = deletionFixtures();
  fixtures.CartModel.updateMany = () => {
    throw new Error("synchronous cart failure");
  };
  const deleteProduct = createProductDeletionService({
    ...fixtures,
    logger: { warn() {} },
  });

  const result = await deleteProduct("product-1");

  assert.ok(result.product);
  assert.equal(fixtures.events[0][0], "delete");
  assert.equal(
    fixtures.events.some(([type]) => type === "wishlist"),
    true,
  );
  assert.deepEqual(
    result.cleanupErrors.map(({ scope }) => scope),
    ["cart reference"],
  );
});

test("Cloudinary cleanup accepts only configured shopeasy product paths", () => {
  assert.equal(
    ownedProductPublicId(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_500/v12/shopeasy/products/a.b.jpg",
      "demo",
    ),
    "shopeasy/products/a.b",
  );
  assert.equal(
    ownedProductPublicId(
      "https://res.cloudinary.com/another/image/upload/v12/shopeasy/products/a.jpg",
      "demo",
    ),
    null,
  );
  assert.equal(
    ownedProductPublicId(
      "https://res.cloudinary.com/demo/image/upload/v12/other-folder/a.jpg",
      "demo",
    ),
    null,
  );
  assert.equal(
    ownedProductPublicId(
      "https://marketplace.example/shopeasy/products/a.jpg",
      "demo",
    ),
    null,
  );
});

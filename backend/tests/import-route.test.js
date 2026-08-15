/**
 * Route-level test for the import router.
 *
 * Calls the route handler directly with mocked req/res, avoiding a live
 * database and HTTP server lifecycle issues. Stubs global.fetch so no
 * internet access is required.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// --- Stub the User model so auth middleware passes ---
const adminUser = { _id: 'admin123', role: 'admin', name: 'Admin' };
const fakeUserModel = { findById: async () => adminUser };
const modelsDir = path.resolve(__dirname, '..', 'models');
require.cache[path.join(modelsDir, 'User.js')] = {
  id: path.join(modelsDir, 'User.js'),
  filename: path.join(modelsDir, 'User.js'),
  loaded: true,
  exports: fakeUserModel,
};

const AMAZON_HTML = `
<html>
<head>
  <title>Nike Running Shoes - Amazon.in</title>
  <meta property="og:title" content="Nike Revolution 6 Running Shoes" />
  <meta property="og:description" content="Lightweight cushioned running shoes for men" />
  <meta property="og:image" content="https://m.media-amazon.com/images/I/61abc123._SL1500_.jpg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Nike Revolution 6 Running Shoes",
    "description": "The Nike Revolution 6 cushions your stride with soft foam.",
    "brand": { "@type": "Brand", "name": "Nike" },
    "sku": "DR9712-002",
    "image": ["https://m.media-amazon.com/images/I/61abc123._SL1500_.jpg"],
    "offers": { "@type": "Offer", "price": "3499.00", "priceCurrency": "INR" },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.5", "reviewCount": "2341" }
  }
  </script>
</head>
<body>
  <h1>Nike Revolution 6 Running Shoes</h1>
  <span class="a-price-whole">3,499</span>
</body>
</html>`;

let router;

before(() => {
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Map([['content-type', 'text/html']]),
    text: async () => AMAZON_HTML,
  });
  router = require('../routes/import');
});

after(() => {
  delete global.fetch;
});

/** Minimal Express-like res object. */
function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}

test('preview route extracts product from URL', async () => {
  const req = {
    body: { url: 'https://www.amazon.in/dp/B0CHZ1TL37?tag=aff21' },
    user: adminUser,
  };
  const res = mockRes();
  await router._router ? null : null;
  // Call the stacked handler directly: find the preview middleware
  const { router: expressRouter } = router;
  // Simpler: just call importProduct via the route stack — invoke the handler
  const handler = findHandler('/preview', 'post');
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  const data = res.body;
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.platform, 'Amazon');
  assert.strictEqual(data.product.title, 'Nike Revolution 6 Running Shoes');
  assert.strictEqual(data.product.price, 3499);
  assert.strictEqual(data.product.brand, 'Nike');
  assert.strictEqual(data.product.affiliateUrl, 'https://www.amazon.in/dp/B0CHZ1TL37?tag=aff21');
  assert.ok(data.quality.percentage >= 50);
});

test('preview route returns INVALID_URL for bad input', async () => {
  const req = { body: { url: 'not-a-url' }, user: adminUser };
  const res = mockRes();
  const handler = findHandler('/preview', 'post');
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.reason, 'INVALID_URL');
});

test('preview route requires url field', async () => {
  const req = { body: {}, user: adminUser };
  const res = mockRes();
  const handler = findHandler('/preview', 'post');
  await handler(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
});

/** Find the route handler by path & method from the Express router stack. */
function findHandler(routePath, method) {
  for (const layer of router.stack) {
    if (layer.route && layer.route.path === routePath) {
      const handlers = layer.route.stack;
      // The last handler in the stack is the actual controller
      return handlers[handlers.length - 1].handle;
    }
  }
  throw new Error(`Route ${method.toUpperCase()} ${routePath} not found`);
}
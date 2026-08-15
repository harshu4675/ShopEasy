/**
 * Product Importer test suite.
 *
 * Uses synthetic HTML fixtures (no network) to validate the extraction
 * pipeline end-to-end:
 *   - JSON-LD extraction
 *   - OpenGraph extraction
 *   - HTML/DOM extraction
 *   - Platform provider selection & merging
 *   - Image extraction/dedup
 *   - Price normalization
 *   - Quality scoring
 *   - URL validation / platform detection
 */

const { test } = require('node:test');
const assert = require('node:assert');

const { importProduct, detectPlatform } = require('../services/importer');
const { extractProductFromJsonLd } = require('../services/importer/extractors/jsonld');
const { extractProductFromOpenGraph } = require('../services/importer/extractors/opengraph');
const { extractFromHtml } = require('../services/importer/extractors/html');
const { extractImages } = require('../services/importer/utils/image');
const { extractPrice, parsePrice } = require('../services/importer/utils/price');
const { isValidUrl } = require('../services/importer/utils/url');

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const AMAZON_HTML = `
<html>
<head>
  <title>Nike Running Shoes - 200% better - Amazon.in</title>
  <meta property="og:title" content="Nike Revolution 6 Running Shoes" />
  <meta property="og:description" content="Lightweight cushioned running shoes for men" />
  <meta property="og:image" content="https://m.media-amazon.com/images/I/61abc123._SL1500_.jpg" />
  <meta name="description" content="Nike Revolution 6 running shoes for men." />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Nike Revolution 6 Running Shoes",
    "description": "The Nike Revolution 6 cushions your stride with soft foam.",
    "brand": { "@type": "Brand", "name": "Nike" },
    "sku": "DR9712-002",
    "image": ["https://m.media-amazon.com/images/I/61abc123._SL1500_.jpg", "https://m.media-amazon.com/images/I/62def456._SL1500_.jpg"],
    "offers": {
      "@type": "Offer",
      "price": "3499.00",
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "2341"
    }
  }
  </script>
</head>
<body>
  <h1>Nike Revolution 6 Running Shoes</h1>
  <span id="productTitle">Nike Revolution 6 Running Shoes</span>
  <span class="a-price-whole">3,499</span>
  <span class="priceBlockStrikePriceString">₹4,999</span>
  <span class="savingsPercentage">30%</span>
  <div id="productDescription">The Nike Revolution 6 cushions your stride with soft foam.</div>
  <span id="bylineInfo">Visit the Nike Store</span>
  <div class="a-star-rating"><span class="a-icon-alt">4.5 out of 5 stars</span></div>
  <span id="acrCustomerReviewText">2,341 ratings</span>
  <img id="landingImage" src="https://m.media-amazon.com/images/I/61abc123._SL1500_.jpg" />
</body>
</html>`;

const FLIPKART_HTML = `
<html>
<head>
  <title>Wildcraft Backpack Online - Flipkart.com</title>
  <meta property="og:title" content="Wildcraft 30L Rucksack" />
  <meta property="og:image" content="https://rukminim2.flixcart.com/image/832/832/l4zcesw0/backpack/b/f/6/-original-imagfpc5h5fgqugd.jpeg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Wildcraft 30L Rucksack",
    "brand": { "@type": "Brand", "name": "Wildcraft" },
    "offers": {
      "@type": "Offer",
      "price": "1299",
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.1", "reviewCount": "892" }
  }
  </script>
</head>
<body>
  <h1>Wildcraft 30L Rucksack</h1>
  <span class="_30jeq3">₹1,299</span>
  <span class="_3I9_wc">₹2,499</span>
  <span class="UkUFwK">48% off</span>
  <div class="_1UhVsV"><table>
    <tr><td>Material</td><td>Polyester</td></tr>
    <tr><td>Capacity</td><td>30L</td></tr>
  </table></div>
  <span class="_2B_pmu">Wildcraft</span>
  <span class="_3LWZlK">4.1</span>
</body>
</html>`;

const MYNTRA_HTML = `
<html>
<head>
  <title>Roadster Men Navy Blue Slim Fit Shirt - Myntra</title>
  <meta property="og:title" content="Roadster Men Navy Blue Slim Fit Shirt" />
  <meta property="og:image" content="https://assets.myntassets.com/h_1440,q_90,w_1080/v1/assets/images/12345678/2023/1/1/12345.jpg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Roadster Men Navy Blue Slim Fit Shirt",
    "brand": { "@type": "Brand", "name": "Roadster" },
    "offers": {
      "@type": "Offer",
      "price": "799",
      "priceCurrency": "INR"
    },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.2", "reviewCount": "1204" }
  }
  </script>
</head>
<body>
  <h1>Roadster Men Navy Blue Slim Fit Shirt</h1>
  <span class="pdp-price">Rs. 799</span>
  <span class="pdp-mrp">Rs. 1,799</span>
  <span class="discount">(56% OFF)</span>
  <div class="pdp-description">Regular fit shirt with spread collar.</div>
  <div class="brand">Roadster</div>
  <div class="size-button">S</div>
  <div class="size-button">M</div>
  <div class="size-button">L</div>
  <div class="size-button">XL</div>
  <div class="color-swatch">Navy Blue</div>
  <div class="color-swatch">Black</div>
</body>
</html>`;

/* ------------------------------------------------------------------ *
 * URL / platform detection tests
 * ------------------------------------------------------------------ */

test('detectPlatform identifies Amazon', () => {
  const r = detectPlatform('https://www.amazon.in/dp/B0CHZ1TL37?tag=affiliate-21');
  assert.strictEqual(r.platform, 'Amazon');
});

test('detectPlatform identifies Flipkart', () => {
  const r = detectPlatform('https://www.flipkart.com/wildcraft-backpack/p/itm12345?pid=BKP12345');
  assert.strictEqual(r.platform, 'Flipkart');
});

test('detectPlatform identifies Myntra', () => {
  const r = detectPlatform('https://www.myntra.com/shirts/roadster/roadster-navy-blue-shirt/12345');
  assert.strictEqual(r.platform, 'Myntra');
});

test('detectPlatform returns null for unknown', () => {
  const r = detectPlatform('https://example.com/product/1');
  assert.strictEqual(r.platform, null);
});

test('isValidUrl rejects garbage', () => {
  assert.strictEqual(isValidUrl('not a url'), false);
  assert.strictEqual(isValidUrl('https://example.com'), true);
});

/* ------------------------------------------------------------------ *
 * JSON-LD extraction tests
 * ------------------------------------------------------------------ */

test('extractProductFromJsonLd extracts full product data', () => {
  const data = extractProductFromJsonLd(AMAZON_HTML);
  assert.ok(data, 'JSON-LD should extract data');
  assert.strictEqual(data.title, 'Nike Revolution 6 Running Shoes');
  assert.strictEqual(data.brand, 'Nike');
  assert.strictEqual(data.price, 3499);
  assert.strictEqual(data.currency, 'INR');
  assert.strictEqual(data.ratingValue, 4.5);
  assert.strictEqual(data.reviewCount, 2341);
  assert.strictEqual(data.stockStatus, 'in_stock');
  assert.ok(Array.isArray(data.images));
  assert.strictEqual(data.images.length, 2);
});

test('extractProductFromJsonLd handles arrays', () => {
  const html = `<script type="application/ld+json">
  [
    { "@type": "WebSite", "name": "Test Site" },
    { "@type": "Product", "name": "Array Product", "offers": { "@type": "Offer", "price": "999" } }
  ]
  </script>`;
  const data = extractProductFromJsonLd(html);
  assert.ok(data);
  assert.strictEqual(data.title, 'Array Product');
  assert.strictEqual(data.price, 999);
});

/* ------------------------------------------------------------------ *
 * OpenGraph extraction tests
 * ------------------------------------------------------------------ */

test('extractProductFromOpenGraph extracts og data', () => {
  const data = extractProductFromOpenGraph(AMAZON_HTML);
  assert.ok(data);
  assert.strictEqual(data.title, 'Nike Revolution 6 Running Shoes');
  assert.strictEqual(data.description, 'Lightweight cushioned running shoes for men');
  assert.strictEqual(data.primaryImage, 'https://m.media-amazon.com/images/I/61abc123._SL1500_.jpg');
});

/* ------------------------------------------------------------------ *
 * HTML extraction tests
 * ------------------------------------------------------------------ */

test('extractFromHtml extracts title and price', () => {
  const data = extractFromHtml(AMAZON_HTML, 'https://www.amazon.in/dp/B0CHZ1TL37');
  assert.ok(data);
  assert.ok(data.title);
  assert.ok(data.price);
});

test('extractFromHtml extracts breadcrumbs', () => {
  const html = `<html><body>
    <div class="breadcrumb">
      <a>Home</a><a>Men</a><a>Shirts</a>
    </div>
  </body></html>`;
  const data = extractFromHtml(html, 'https://example.com/p');
  assert.deepStrictEqual(data.breadcrumbs, ['Home', 'Men', 'Shirts']);
  assert.strictEqual(data.category, 'Shirts');
});

test('extractFromHtml extracts specifications table', () => {
  const html = `<html><body>
    <table>
      <tr><th>Specifications</th></tr>
      <tr><td>Material</td><td>Cotton</td></tr>
      <tr><td>Fit</td><td>Slim</td></tr>
    </table>
  </body></html>`;
  const data = extractFromHtml(html, 'https://example.com/p');
  assert.ok(data.specifications);
  assert.strictEqual(data.specifications.Material, 'Cotton');
});

/* ------------------------------------------------------------------ *
 * Price parsing tests
 * ------------------------------------------------------------------ */

test('parsePrice handles various formats', () => {
  assert.strictEqual(parsePrice('₹1,299'), 1299);
  assert.strictEqual(parsePrice('₹ 1,299.00'), 1299);
  assert.strictEqual(parsePrice('$29.99'), 29.99);
  assert.strictEqual(parsePrice(1299), 1299);
  assert.strictEqual(parsePrice('1,299'), 1299);
});

test('extractPrice computes discount', () => {
  const r = extractPrice({ price: 799, originalPrice: 1499 });
  assert.strictEqual(r.price, 799);
  assert.strictEqual(r.originalPrice, 1499);
  assert.strictEqual(r.discountPercentage, 47);
});

/* ------------------------------------------------------------------ *
 * Image extraction tests
 * ------------------------------------------------------------------ */

test('extractImages dedups and ranks', () => {
  const result = extractImages({
    jsonld: [
      'https://cdn.example.com/img/a.jpg',
      'https://cdn.example.com/img/b.jpg',
    ],
    ogImage: 'https://cdn.example.com/img/a.jpg',
    domImages: [{ url: 'https://cdn.example.com/img/logo.png', weight: 10 }],
  }, 'https://example.com/p');

  assert.strictEqual(result.primary, 'https://cdn.example.com/img/a.jpg');
  assert.ok(result.gallery.includes('https://cdn.example.com/img/a.jpg'));
  assert.ok(result.gallery.includes('https://cdn.example.com/img/b.jpg'));
  // logo should be filtered
  assert.ok(!result.gallery.some(u => u.includes('logo')));
});

test('extractImages resolves relative URLs', () => {
  const result = extractImages({
    ogImage: '/images/product.jpg',
  }, 'https://example.com/product/1');
  assert.strictEqual(result.primary, 'https://example.com/images/product.jpg');
});

/* ------------------------------------------------------------------ *
 * Full import pipeline tests (mock fetch)
 * ------------------------------------------------------------------ */

test('importProduct validates URL', async () => {
  const result = await importProduct('not a url');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.reason, 'INVALID_URL');
});

test('importProduct returns structured error on blocked', async () => {
  // Monkey-patch global fetch to simulate 403
  const originalFetch = global.fetch;
  global.fetch = async () => ({ status: 403, headers: new Map(), text: async () => '' });
  try {
    const result = await importProduct('https://www.amazon.in/dp/B0CHZ1TL37');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'BLOCKED');
    assert.match(result.message, /did not allow automatic product extraction/i);
  } finally {
    global.fetch = originalFetch;
  }
});

test('importProduct pipeline with mocked Amazon page', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Map([['content-type', 'text/html']]),
    text: async () => AMAZON_HTML,
  });

  try {
    const result = await importProduct(
      'https://www.amazon.in/dp/B0CHZ1TL37?tag=affiliate21',
      { skipCache: true }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'Amazon');

    const p = result.product;
    assert.strictEqual(p.title, 'Nike Revolution 6 Running Shoes');
    assert.strictEqual(p.price, 3499);
    assert.strictEqual(p.originalPrice, 4999);
    assert.strictEqual(p.brand, 'Nike');
    assert.strictEqual(p.rating, 4.5);
    assert.strictEqual(p.reviewCount, 2341);
    assert.ok(p.images.length >= 1, 'should have images');
    assert.strictEqual(p.affiliateUrl, 'https://www.amazon.in/dp/B0CHZ1TL37?tag=affiliate21');
    assert.ok(result.quality.percentage > 50, 'quality should be reasonable');
  } finally {
    global.fetch = originalFetch;
  }
});

test('importProduct pipeline with mocked Myntra page', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Map([['content-type', 'text/html']]),
    text: async () => MYNTRA_HTML,
  });

  try {
    const result = await importProduct(
      'https://www.myntra.com/shirts/roadster/roadster-navy-blue-shirt/12345',
      { skipCache: true }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'Myntra');

    const p = result.product;
    assert.strictEqual(p.title, 'Roadster Men Navy Blue Slim Fit Shirt');
    assert.strictEqual(p.price, 799);
    assert.strictEqual(p.originalPrice, 1799);
    assert.strictEqual(p.brand, 'Roadster');
    assert.strictEqual(p.rating, 4.2);
    assert.ok(p.images.length >= 1, 'should have images');
    assert.ok(p.affiliateUrl.includes('myntra.com'));
  } finally {
    global.fetch = originalFetch;
  }
});

test('importProduct pipeline with mocked Flipkart page', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: new Map([['content-type', 'text/html']]),
    text: async () => FLIPKART_HTML,
  });

  try {
    const result = await importProduct(
      'https://www.flipkart.com/wildcraft-backpack/p/itm12345?pid=BKP12345',
      { skipCache: true }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'Flipkart');

    const p = result.product;
    assert.strictEqual(p.title, 'Wildcraft 30L Rucksack');
    assert.strictEqual(p.price, 1299);
    assert.strictEqual(p.brand, 'Wildcraft');
    assert.strictEqual(p.rating, 4.1);
    assert.strictEqual(p.reviewCount, 892);
    assert.ok(p.specifications, 'should have specifications');
    assert.strictEqual(p.specifications.Material, 'Polyester');
  } finally {
    global.fetch = originalFetch;
  }
});

test('importProduct preserves affiliate URL through redirects', async () => {
  const originalFetch = global.fetch;
  const affiliateUrl = 'https://www.amazon.in/gp/redirect.html?location=https%3A%2F%2Fwww.amazon.in%2Fdp%2FB0CHZ1TL37&tag=aff123';
  let callCount = 0;

  global.fetch = async (url) => {
    callCount++;
    if (String(url) === affiliateUrl) {
      return {
        ok: true,
        status: 200,
        url: 'https://www.amazon.in/dp/B0CHZ1TL37',
        headers: new Map([['content-type', 'text/html']]),
        text: async () => AMAZON_HTML,
      };
    }
    return {
      ok: true,
      status: 200,
      url: String(url),
      headers: new Map([['content-type', 'text/html']]),
      text: async () => AMAZON_HTML,
    };
  };

  try {
    const result = await importProduct(affiliateUrl, { skipCache: true });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.product.affiliateUrl, affiliateUrl);
    assert.strictEqual(result.product.sourceUrl, affiliateUrl);
  } finally {
    global.fetch = originalFetch;
  }
});
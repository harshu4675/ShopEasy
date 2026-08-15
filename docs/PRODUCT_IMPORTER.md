# Affiliate Product Importer

A complete public-webpage extraction system for importing affiliate/ecommerce
product URLs into ShopEasy. **No marketplace API keys are required** — all data
is extracted from the publicly served webpage.

---

## How it works

```
Admin pastes URL
        ↓
Validate URL
        ↓
Follow redirects safely (original affiliate URL never lost)
        ↓
Detect final marketplace/domain
        ↓
Layer 1: JSON-LD structured data
Layer 2: OpenGraph / meta tags
Layer 3: HTML/DOM pattern extraction (cheerio)
Layer 4: Platform-specific provider (Amazon/Flipkart/Myntra/Ajio/Meesho/Generic)
Layer 5: Rendered-page extraction (Playwright, optional, graceful fallback)
        ↓
Merge & normalize product data
        ↓
Image extraction: validate, resolve relative URLs, dedupe, prefer hi-res
        ↓
Price normalization (sale price, MRP, discount %, currency)
        ↓
Import quality score (completeness %)
        ↓
Admin reviews / edits in the Import Product preview
        ↓
Publish (affiliateUrl preserved exactly as pasted)
```

### Extraction layers (priority order)

1. **JSON-LD** (`extractors/jsonld.js`) — parses every
   `<script type="application/ld+json">`, supports arrays and nested
   `Product` / `Offer` / `AggregateRating` / `BreadcrumbList` / `Brand`
   structures. Extracts name, description, image, brand, sku, mpn, gtin,
   category, offers, price, priceCurrency, availability, url, rating, reviews.
2. **OpenGraph / meta** (`extractors/opengraph.js`) — `og:*`, `twitter:*`,
   `product:price:*`, `og:price:*`, meta description.
3. **HTML/DOM** (`extractors/html.js`) — cheerio pattern matching for titles,
   price, MRP, discount, brand, description, images, breadcrumbs, rating,
   review count, availability, sizes, colors, sku, specifications, seller,
   features.
4. **Platform providers** (`providers/`) — marketplace-specific selectors:
   - `AmazonProvider` — `#productTitle`, `#priceblock_*`, `.a-price-*`,
     `#landingImage`, `#bylineInfo`, `#acrCustomerReviewText`, ASIN extraction,
     hi-res image rewriting, product details table, `#merchant-info`.
   - `FlipkartProvider` — `._30jeq3`, `._3I9_wc`, `._396cs4`, `._3LWZlK`,
     spec tables, `_1UhVsV`.
   - `MyntraProvider` — `.pdp-price`, `.pdp-mrp`, `.pdp-description`,
     `.size-button`, `.color-swatch`, product ID from URL.
   - `AjioProvider` — `.price`, `.brand`, `.size-option`, spec tables.
   - `MeeshoProvider` — price/brand/rating selectors.
   - `GenericProvider` — merges all layers for any other ecommerce site.
5. **Rendered page** (`extractors/rendered.js`) — if key fields (title, price,
   image, rating) are still missing, attempts a Playwright headless render and
   extracts from the live DOM. Playwright is **optional**: if it is not
   installed the importer silently falls back to the layers above. The render
   has hard timeouts (30 s total, 20 s navigation) and **never** attempts to
   bypass CAPTCHA/Cloudflare/login walls — if a challenge is detected the
   import returns `BLOCKED` with a clean message.

---

## API endpoints

| Method | Path                    | Auth          | Purpose                                    |
|--------|-------------------------|---------------|--------------------------------------------|
| POST   | `/api/import/preview`   | Admin         | Import & preview product data from a URL   |
| POST   | `/api/import/save`      | Admin         | Save a reviewed import as a Product        |
| GET    | `/api/import/providers` | Admin         | List available extraction providers        |
| POST   | `/api/import/clear-cache`| Admin        | Clear the short-lived import cache         |
| GET    | `/api/image-proxy?url=` | —             | Proxies remote product images (CORS fix)   |

### Structured import result

```jsonc
{
  "success": true,
  "platform": "Amazon",
  "product": {
    "title": "…", "description": "…",
    "price": 799, "originalPrice": 1499, "currency": "INR",
    "discountPercentage": 47,
    "images": ["https://…"], "primaryImage": "https://…",
    "brand": "…", "category": "…", "breadcrumbs": ["Women","Clothing","Tops"],
    "rating": 4.5, "reviewCount": 2341,
    "sizes": ["S","M","L"], "colors": ["Black","Blue"],
    "specifications": {"Material": "Cotton", "Fit": "Slim"},
    "features": ["…"],
    "sku": "…", "productId": "…", "asin": "…", "mpn": "…", "gtin": "…",
    "stockStatus": "in_stock",
    "sellerName": "…",
    "sourceUrl": "https://tracking.example.com/…",       // exact pasted URL
    "affiliateUrl": "https://tracking.example.com/…",    // exact pasted URL
    "originalAffiliateUrl": "https://tracking.example.com/…",
    "finalResolvedUrl": "https://www.amazon.in/dp/…",
    "canonicalUrl": "https://www.amazon.in/dp/…",
    "platform": "Amazon"
  },
  "quality": { "total": 20, "detected": 16, "percentage": 80, "missing": ["…"] },
  "extractionLayers": { "jsonld": true, "opengraph": true, "html": true, "provider": "Amazon" }
}
```

### Structured errors

```jsonc
{
  "success": false,
  "reason": "BLOCKED",            // INVALID_URL | NETWORK_ERROR | TIMEOUT | BLOCKED
                                  // | NO_PRODUCT_DATA | PARTIAL_DATA | UNSUPPORTED_PLATFORM
  "platform": "Amazon",
  "message": "This marketplace did not allow automatic product extraction. Please enter the missing information manually."
}
```

No raw stack traces are ever sent to the client. Technical details are logged
server-side; a structured debug summary is printed in non-production when
`NODE_ENV !== "production"` (or `IMPORTER_DEBUG=true`).

---

## Affiliate URL preservation (Buy Now)

The exact URL the admin pastes is stored in **three** places:

- `product.affiliateUrl` — used by the storefront Buy Now button
- `product.sourceUrl`
- `product.originalAffiliateUrl`

The storefront behaviour:

- If a product has an `affiliateUrl`, the **Buy Now** button on the product
  page becomes an external link that opens `affiliateUrl` in a new tab
  (`target="_blank" rel="noopener noreferrer"`). It is **never** replaced with
  the canonical product URL.
- Otherwise, Buy Now keeps the existing internal cart → checkout flow.

The importer follows redirects only for **data extraction**; the stored
affiliate URL is untouched. `canonicalUrl` / `finalResolvedUrl` hold the
resolved marketplace URLs separately.

---

## Image handling

For every extracted image the importer:

1. Validates the URL and resolves relative URLs against the page base.
2. Deduplicates.
3. Filters out logos, icons, tracking pixels, banners, sprites, social icons.
4. Prefers high-resolution variants (e.g. rewrites Amazon thumbnail URLs).
5. Returns `images[]`, `primaryImage`, `thumbnail`.

If a marketplace blocks hotlinking (403/CORS), the backend exposes
`GET /api/image-proxy?url=<encoded>` which streams the image with permissive
`Access-Control-Allow-Origin`. The frontend image tiles also handle
`image loading / image error / image fallback` states so a single unreachable
image never breaks the preview.

---

## Import quality score

The preview shows a completeness bar (`████████████████░░░░ 82%`) computed from
20 meaningful fields. Missing fields are listed individually so the admin knows
exactly what to review. **No data is ever fabricated** — fields that cannot be
extracted stay `null`.

---

## Caching & timeouts

- Short-lived in-memory cache (default TTL **5 minutes**) keyed by the
  normalized URL; cleared on `POST /api/import/clear-cache`. Errors are cached
  for 1 minute only. Private/authenticated content is never cached.
- Fetch timeout: **15 s**; rendered-page timeout: **30 s** hard cap.
- If extraction fails at any layer, the importer falls back to the next layer
  and finally to a partial import + manual editing rather than crashing.

---

## Testing

Run the offline test suite (uses realistic HTML fixtures, no network):

```bash
cd backend
npm test                      # includes tests/importer.test.js + import-route.test.js
```

The suite covers: URL validation, platform detection, JSON-LD (incl. arrays),
OpenGraph, HTML extraction, price parsing/discount math, image dedup/ranking,
relative URL resolution, structured `BLOCKED` errors, full Amazon/Myntra/
Flipkart import pipelines, and affiliate-URL preservation across redirects.

To test with **real** product URLs (requires internet):

1. Start MongoDB and the backend: `cd backend && npm run dev`
2. Start the frontend: `cd FrontEnd && npm run dev`
3. Log in as admin → **Import Product** (sidebar or the All Products page)
4. Paste a product URL from Amazon / Flipkart / Myntra / Ajio / Meesho, or any
   ecommerce site, then click **Import**
5. Review the completeness score, edit missing fields, verify images render,
   then **Save Product**
6. On the published product page, verify **Buy Now** opens the exact affiliate
   URL you pasted.

> Note: some marketplaces (Amazon in particular) frequently serve
> bot-challenge pages to datacenter IPs. The importer will return a clean
> `BLOCKED` result and you can fill the form manually — it never tries to
> bypass anti-bot protections.

---

## Files

```
backend/services/importer/
  index.js                  # orchestrator: validate → fetch → detect → extract → normalize
  cache.js                  # short-lived TTL cache
  debug.js                  # structured server-side debug logging
  extractors/
    jsonld.js               # Layer 1 — JSON-LD
    opengraph.js            # Layer 2 — OpenGraph/meta
    html.js                 # Layer 3 — cheerio DOM patterns
    rendered.js             # Layer 5 — Playwright render (optional)
  providers/
    base.js                 # shared provider base
    amazon.js  flipkart.js  myntra.js  ajio.js  meesho.js  generic.js
  utils/
    url.js                  # validation, platform detection, URL resolution
    price.js                # price/MRP/discount parsing
    image.js                # image extraction, dedup, validation
backend/routes/import.js          # /api/import/*
backend/routes/imageProxy.js      # /api/image-proxy
backend/tests/importer.test.js    # offline pipeline tests
backend/tests/import-route.test.js# route-level tests
FrontEnd/src/pages/admin/ImportProduct.jsx  # admin import UI
```

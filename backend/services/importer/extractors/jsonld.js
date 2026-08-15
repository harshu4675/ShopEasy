/**
 * JSON-LD Structured Data Extractor.
 *
 * Extracts product information from <script type="application/ld+json"> tags.
 * Supports arrays and nested structures.
 */

const cheerio = require('cheerio');

/**
 * Extract all JSON-LD scripts from HTML, returning parsed objects.
 */
function extractAllJsonLd(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];

  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const trimmed = raw.trim();
      if (!trimmed) return;
      const parsed = JSON.parse(trimmed);
      // Handle arrays
      if (Array.isArray(parsed)) {
        parsed.forEach(item => results.push(item));
      } else {
        results.push(parsed);
      }
    } catch {
      // Skip invalid JSON
    }
  });

  return results;
}

/**
 * Extract product data from JSON-LD blocks.
 * Searches for Product, Offer, AggregateRating, BreadcrumbList, Brand types.
 */
function extractProductFromJsonLd(html) {
  const blocks = extractAllJsonLd(html);
  if (blocks.length === 0) return null;

  const product = {};

  // Find the main product block
  const productBlock = blocks.find(b =>
    b['@type'] === 'Product' ||
    (Array.isArray(b['@type']) && b['@type'].includes('Product'))
  );

  if (productBlock) {
    // Name
    if (productBlock.name) product.title = productBlock.name;

    // Description
    if (productBlock.description) product.description = productBlock.description;

    // SKU/MPN/GTIN
    if (productBlock.sku) product.sku = productBlock.sku;
    if (productBlock.mpn) product.mpn = productBlock.mpn;
    if (productBlock.gtin) product.gtin = productBlock.gtin;
    if (productBlock.gtin8) product.gtin = productBlock.gtin8;
    if (productBlock.gtin12) product.gtin = productBlock.gtin12;
    if (productBlock.gtin13) product.gtin = productBlock.gtin13;
    if (productBlock.gtin14) product.gtin = productBlock.gtin14;
    if (productBlock.productID) product.productId = productBlock.productID;

    // URL
    if (productBlock.url) product.canonicalUrl = productBlock.url;

    // Category - from breadcrumb or direct
    if (productBlock.category) product.category = productBlock.category;

    // Image
    if (productBlock.image) {
      if (Array.isArray(productBlock.image)) {
        product.images = productBlock.image
          .filter(i => typeof i === 'string')
          .map(i => i.trim());
        if (product.images.length > 0) {
          product.primaryImage = product.images[0];
        }
      } else if (typeof productBlock.image === 'object' && productBlock.image.url) {
        product.primaryImage = productBlock.image.url;
        product.images = [productBlock.image.url];
      } else if (typeof productBlock.image === 'string') {
        product.primaryImage = productBlock.image;
        product.images = [productBlock.image];
      }
    }

    // Brand
    if (productBlock.brand) {
      if (typeof productBlock.brand === 'string') {
        product.brand = productBlock.brand;
      } else if (productBlock.brand.name) {
        product.brand = productBlock.brand.name;
      }
    }

    // Offers
    if (productBlock.offers) {
      const offers = Array.isArray(productBlock.offers)
        ? productBlock.offers
        : [productBlock.offers];

      // Find the primary offer (first with lowest price)
      offers.sort((a, b) => {
        const pa = parseFloat(a.price) || Infinity;
        const pb = parseFloat(b.price) || Infinity;
        return pa - pb;
      });

      const offer = offers[0];
      if (offer) {
        const price = parseFloat(offer.price);
        if (!isNaN(price)) {
          product.price = price;
        }
        if (offer.priceCurrency) product.currency = offer.priceCurrency;
        if (offer.availability) {
          product.availability = offer.availability;
          product.stockStatus = offer.availability.includes('InStock')
            ? 'in_stock'
            : offer.availability.includes('OutOfStock')
              ? 'out_of_stock'
              : offer.availability.includes('PreOrder')
                ? 'pre_order'
                : null;
        }
        if (offer.url) product.offerUrl = offer.url;
        if (offer.priceValidUntil) product.priceValidUntil = offer.priceValidUntil;
      }
    }

    // Aggregate Rating
    if (productBlock.aggregateRating) {
      const ar = productBlock.aggregateRating;
      if (ar.ratingValue) product.ratingValue = parseFloat(ar.ratingValue);
      if (ar.reviewCount) product.reviewCount = parseInt(ar.reviewCount, 10);
      if (ar.ratingCount) product.ratingCount = parseInt(ar.ratingCount, 10);
      if (ar.bestRating) product.bestRating = parseFloat(ar.bestRating);
      if (ar.worstRating) product.worstRating = parseFloat(ar.worstRating);
    }

    // Review
    if (productBlock.review) {
      const reviews = Array.isArray(productBlock.review)
        ? productBlock.review
        : [productBlock.review];
      product.reviews = reviews.map(r => ({
        author: r.author?.name || null,
        reviewRating: r.reviewRating?.ratingValue
          ? parseFloat(r.reviewRating.ratingValue)
          : null,
        description: r.description || null,
        datePublished: r.datePublished || null,
      }));
    }

    // Additional properties
    if (productBlock.mpn) product.mpn = productBlock.mpn;
  }

  // Look for BreadcrumbList separately
  const breadcrumbBlock = blocks.find(b =>
    b['@type'] === 'BreadcrumbList' ||
    (Array.isArray(b['@type']) && b['@type'].includes('BreadcrumbList'))
  );

  if (breadcrumbBlock && breadcrumbBlock.itemListElement) {
    const items = Array.isArray(breadcrumbBlock.itemListElement)
      ? breadcrumbBlock.itemListElement
      : [breadcrumbBlock.itemListElement];
    product.breadcrumbs = items
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(item => {
        if (typeof item === 'string') return item;
        return item.name || item.item?.name || '';
      })
      .filter(Boolean);
  }

  return Object.keys(product).length > 0 ? product : null;
}

module.exports = { extractAllJsonLd, extractProductFromJsonLd };
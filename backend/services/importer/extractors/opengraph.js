/**
 * OpenGraph / Meta Tag Extractor.
 *
 * Extracts product information from OpenGraph, Twitter Card, and general
 * meta tags in the HTML <head>.
 */

const cheerio = require('cheerio');

/**
 * Extract all OpenGraph and Twitter Card meta tags.
 * Returns a flat map of property → content.
 */
function extractOpenGraph(html) {
  if (!html) return {};
  const $ = cheerio.load(html);
  const og = {};

  // OpenGraph: <meta property="og:..." content="..." />
  $('meta[property^="og:"]').each((i, el) => {
    const prop = $(el).attr('property');
    const content = $(el).attr('content');
    if (prop && content) {
      og[prop] = content;
    }
  });

  // Twitter: <meta name="twitter:..." content="..." />
  $('meta[name^="twitter:"]').each((i, el) => {
    const prop = $(el).attr('name');
    const content = $(el).attr('content');
    if (prop && content) {
      og[prop] = content;
    }
  });

  // Also handle meta name="description"
  $('meta[name="description"]').each((i, el) => {
    const content = $(el).attr('content');
    if (content && !og['description']) {
      og['description'] = content;
    }
  });

  return og;
}

/**
 * Extract product-related data from OpenGraph/meta tags.
 */
function extractProductFromOpenGraph(html) {
  const og = extractOpenGraph(html);
  if (Object.keys(og).length === 0) return null;

  const product = {};

  // og:title
  if (og['og:title']) product.title = og['og:title'];
  else if (og['twitter:title']) product.title = og['twitter:title'];

  // og:description
  if (og['og:description']) product.description = og['og:description'];
  else if (og['twitter:description']) product.description = og['twitter:description'];
  else if (og['description']) product.description = og['description'];

  // og:image
  if (og['og:image']) {
    product.primaryImage = og['og:image'];
    product.images = [og['og:image']];
    // Also check for og:image:secure_url
    if (og['og:image:secure_url']) {
      product.images.push(og['og:image:secure_url']);
    }
  } else if (og['twitter:image']) {
    product.primaryImage = og['twitter:image'];
    product.images = [og['twitter:image']];
  }

  // og:url
  if (og['og:url']) product.canonicalUrl = og['og:url'];

  // Product price (custom namespace)
  if (og['product:price:amount']) {
    const price = parseFloat(og['product:price:amount']);
    if (!isNaN(price)) {
      product.price = price;
    }
  }
  if (og['product:price:currency']) {
    product.currency = og['product:price:currency'];
  }

  // Also check og:price:standard_amount and og:price:sale_amount
  if (og['og:price:standard_amount']) {
    const origP = parseFloat(og['og:price:standard_amount']);
    if (!isNaN(origP)) product.originalPrice = origP;
  }
  if (og['og:price:sale_amount']) {
    const saleP = parseFloat(og['og:price:sale_amount']);
    if (!isNaN(saleP)) product.price = saleP;
  }

  return Object.keys(product).length > 0 ? product : null;
}

/**
 * Extract all meta tags for raw data.
 */
function extractAllMeta(html) {
  if (!html) return {};
  const $ = cheerio.load(html);
  const meta = {};

  $('meta').each((i, el) => {
    const name = $(el).attr('name') || $(el).attr('property') || '';
    const content = $(el).attr('content') || '';
    if (name && content) {
      meta[name] = content;
    }
  });

  return meta;
}

module.exports = { extractOpenGraph, extractProductFromOpenGraph, extractAllMeta };
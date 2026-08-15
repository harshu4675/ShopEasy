/**
 * Structured debug logging for the product importer.
 * Used during development; not exposed in production UI.
 */

const DEBUG_ENABLED = process.env.NODE_ENV !== 'production' || process.env.IMPORTER_DEBUG === 'true';

/**
 * Log structured import debug info to server console.
 */
function debugLog(importResult) {
  if (!DEBUG_ENABLED) return;

  const { product, platform, extractionLayers, quality, log } = importResult;

  console.log('\n═══════════════════════════════════════');
  console.log('  PRODUCT IMPORT DEBUG');
  console.log('═══════════════════════════════════════');
  console.log(`  Platform:        ${platform || 'Unknown'}`);
  console.log(`  JSON-LD:         ${extractionLayers?.jsonld ? '✓ found' : '✗ not found'}`);
  console.log(`  OpenGraph:       ${extractionLayers?.opengraph ? '✓ found' : '✗ not found'}`);
  console.log(`  HTML/DOM:        ${extractionLayers?.html ? '✓ used' : '✗ not used'}`);
  console.log(`  Provider:        ${extractionLayers?.provider || 'Generic'}`);
  console.log(`  Quality:         ${quality?.percentage || 0}% (${quality?.detected || 0}/${quality?.total || 0})`);
  console.log('─────────────────────────────────────');

  if (product) {
    console.log(`  Title:           ${product.title ? product.title.slice(0, 80) : '✗ NOT DETECTED'}`);
    console.log(`  Price:           ${product.price !== null ? '₹' + product.price : '✗ NOT DETECTED'}`);
    console.log(`  MRP:             ${product.originalPrice !== null ? '₹' + product.originalPrice : '✗ NOT DETECTED'}`);
    console.log(`  Discount:        ${product.discountPercentage !== null ? product.discountPercentage + '%' : '✗ NOT DETECTED'}`);
    console.log(`  Brand:           ${product.brand || '✗ NOT DETECTED'}`);
    console.log(`  Category:        ${product.category || '✗ NOT DETECTED'}`);
    console.log(`  Rating:          ${product.rating || product.ratingValue || '✗ NOT DETECTED'}`);
    console.log(`  Reviews:         ${product.reviewCount || '✗ NOT DETECTED'}`);
    console.log(`  Images:          ${product.images?.length || 0} images`);
    console.log(`  Primary Image:   ${product.primaryImage ? '✓' : '✗ NOT DETECTED'}`);
    console.log(`  Sizes:           ${product.sizes?.length || 0} sizes`);
    console.log(`  Colors:          ${product.colors?.length || 0} colors`);
    console.log(`  Specs:           ${product.specifications ? Object.keys(product.specifications).length + ' fields' : '✗ NOT DETECTED'}`);
    console.log(`  Features:        ${product.features?.length || 0} items`);
    console.log(`  SKU/ID:          ${product.sku || product.productId || '✗ NOT DETECTED'}`);
    console.log(`  Seller:          ${product.sellerName || '✗ NOT DETECTED'}`);
  }

  if (quality?.missing?.length > 0) {
    console.log('─────────────────────────────────────');
    console.log(`  Missing fields:  ${quality.missing.join(', ')}`);
  }

  console.log('─────────────────────────────────────');
  console.log('  Extraction Log:');
  if (log) {
    for (const entry of log) {
      console.log(`    [+${entry.ts}ms] ${entry.msg}`);
    }
  }
  console.log('═══════════════════════════════════════\n');
}

module.exports = { debugLog };
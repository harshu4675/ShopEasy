/**
 * Generic provider.
 *
 * Fallback provider used when no platform-specific provider matches.
 * Uses JSON-LD + OpenGraph + HTML extraction layers.
 */

const BaseProvider = require('./base');

class GenericProvider extends BaseProvider {
  constructor() {
    super('Generic');
  }

  async mergeData({ jsonldData, ogData, htmlData }) {
    // Merge all data sources, with JSON-LD taking priority
    const product = {};

    // Title: JSON-LD > OG > HTML
    product.title = jsonldData?.title || ogData?.title || htmlData?.title || null;

    // Description
    product.description = jsonldData?.description || ogData?.description || htmlData?.description || null;

    // Price
    product.price = jsonldData?.price || ogData?.price || htmlData?.price || null;

    // Original Price
    product.originalPrice = jsonldData?.originalPrice || ogData?.originalPrice || htmlData?.originalPrice || null;

    // Discount
    product.discountPercentage = jsonldData?.discountPercentage || htmlData?.discountPercentage || null;

    // Currency
    product.currency = jsonldData?.currency || ogData?.currency || 'INR';

    // Images
    if (jsonldData?.images && jsonldData.images.length > 0) {
      product.images = jsonldData.images;
      product.primaryImage = jsonldData.primaryImage || jsonldData.images[0];
    } else if (ogData?.primaryImage) {
      product.primaryImage = ogData.primaryImage;
      product.images = ogData.images || [ogData.primaryImage];
    } else if (htmlData?.images || htmlData?.domImages) {
      const imgs = htmlData.images || htmlData.domImages;
      product.images = Array.isArray(imgs) ? imgs.map(i => i.url || i) : [imgs];
      product.primaryImage = product.images[0];
    }

    // Brand
    product.brand = jsonldData?.brand || htmlData?.brand || null;

    // Category / Breadcrumbs
    product.category = jsonldData?.category || htmlData?.category || null;
    product.breadcrumbs = jsonldData?.breadcrumbs || htmlData?.breadcrumbs || null;

    // Rating
    product.ratingValue = jsonldData?.ratingValue || htmlData?.ratingValue || null;
    product.reviewCount = jsonldData?.reviewCount || htmlData?.reviewCount || null;

    // SKU / IDs
    product.sku = jsonldData?.sku || htmlData?.sku || null;
    product.mpn = jsonldData?.mpn || null;
    product.gtin = jsonldData?.gtin || null;
    product.productId = jsonldData?.productId || htmlData?.productId || null;

    // Canonical URL
    product.canonicalUrl = jsonldData?.canonicalUrl || ogData?.canonicalUrl || htmlData?.canonicalUrl || null;

    // Availability
    product.stockStatus = jsonldData?.stockStatus || htmlData?.stockStatus || null;
    product.availability = jsonldData?.availability || null;

    // Sizes & Colors
    product.sizes = htmlData?.sizes || jsonldData?.sizes || null;
    product.colors = htmlData?.colors || jsonldData?.colors || null;

    // Features
    product.features = htmlData?.features || null;

    // Specifications
    product.specifications = htmlData?.specifications || null;

    // Seller
    product.sellerName = htmlData?.sellerName || null;

    return product;
  }

  static canHandle(url) {
    // Generic provider handles any URL
    return true;
  }
}

module.exports = GenericProvider;
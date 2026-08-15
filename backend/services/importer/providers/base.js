/**
 * Base provider class.
 *
 * All platform-specific providers should extend this class.
 * Provides the common extraction pipeline.
 */

class BaseProvider {
  /**
   * @param {string} platform - Platform name (e.g., 'Amazon', 'Flipkart').
   */
  constructor(platform) {
    this.platform = platform;
  }

  /**
   * Extract product data from the given URL.
   * @param {object} context - { url, html, ogData, jsonldData, htmlData, resolvedUrl, headers }
   * @returns {Promise<object>} Extracted product data.
   */
  async extract(context) {
    // Default: merge data from all layers, with platform-specific preferencing
    return this.normalize(await this.mergeData(context));
  }

  /**
   * Platform-specific data merging.
   * Override in subclasses to prioritize certain extraction layers.
   */
  async mergeData({ jsonldData, ogData, htmlData }) {
    // Default: JSON-LD > OpenGraph > HTML
    return deepMerge({}, htmlData, ogData, jsonldData);
  }

  /**
   * Normalize the final product data.
   */
  normalize(data) {
    if (!data) return null;

    // Ensure consistent price structure
    if (data.price !== undefined) {
      data.price = typeof data.price === 'number' ? data.price : parseFloat(data.price);
    }

    // Ensure boolean-like fields
    if (data.availability !== undefined) {
      data.stockStatus = data.stockStatus || mapAvailability(data.availability);
    }

    // Remove empty arrays/objects
    for (const key of ['images', 'sizes', 'colors', 'features', 'breadcrumbs']) {
      if (Array.isArray(data[key]) && data[key].length === 0) {
        delete data[key];
      }
    }

    // Remove empty objects
    for (const key of ['specifications']) {
      if (data[key] && typeof data[key] === 'object' && Object.keys(data[key]).length === 0) {
        delete data[key];
      }
    }

    return data;
  }

  /**
   * Can this provider handle the given URL?
   */
  static canHandle(url) {
    return false;
  }
}

/**
 * Deep merge utility (simple version that handles nesting).
 */
function deepMerge(target, ...sources) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of Object.keys(source)) {
      if (source[key] === null || source[key] === undefined) continue;
      if (Array.isArray(source[key])) {
        target[key] = source[key];
      } else if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        if (target[key] === undefined || target[key] === null || target[key] === '') {
          target[key] = source[key];
        }
      }
    }
  }
  return target;
}

/**
 * Map availability string to stock status.
 */
function mapAvailability(availability) {
  if (!availability) return null;
  const a = String(availability).toLowerCase();
  if (a.includes('instock') || a.includes('in stock')) return 'in_stock';
  if (a.includes('outofstock') || a.includes('out of stock')) return 'out_of_stock';
  if (a.includes('preorder') || a.includes('pre-order')) return 'pre_order';
  if (a.includes('backorder') || a.includes('back order')) return 'back_order';
  if (a.includes('discontinued')) return 'discontinued';
  return null;
}

module.exports = BaseProvider;
module.exports.deepMerge = deepMerge;
module.exports.mapAvailability = mapAvailability;
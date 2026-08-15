const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const cloudinary = require("../config/cloudinary");

const PRODUCT_FOLDER = "shopeasy/products/";

/**
 * Returns a public id only for images proven to belong to this application's
 * configured Cloudinary account and product folder. Marketplace URLs and
 * unrelated Cloudinary assets are deliberately ignored.
 */
function ownedProductPublicId(imageUrl, cloudName) {
  if (!cloudName) return null;

  try {
    const url = new URL(String(imageUrl || ""));
    if (url.hostname !== "res.cloudinary.com") return null;

    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    if (
      segments[0] !== cloudName ||
      segments[1] !== "image" ||
      segments[2] !== "upload"
    ) {
      return null;
    }

    const versionIndex = segments.findIndex(
      (part, index) => index >= 3 && /^v\d+$/.test(part),
    );
    const folderIndex = versionIndex >= 0 ? versionIndex + 1 : 3;
    if (
      segments[folderIndex] !== "shopeasy" ||
      segments[folderIndex + 1] !== "products" ||
      segments.length <= folderIndex + 2
    ) {
      return null;
    }

    const publicId = segments
      .slice(folderIndex)
      .join("/")
      .replace(/\.[a-z0-9]+$/i, "");
    return publicId.startsWith(PRODUCT_FOLDER) ? publicId : null;
  } catch {
    return null;
  }
}

function createProductDeletionService({
  ProductModel = Product,
  CartModel = Cart,
  WishlistModel = Wishlist,
  cloudinaryClient = cloudinary,
  logger = console,
} = {}) {
  return async function deleteProduct(productId, filter = {}) {
    // Delete the source of truth first. Cleanup must never make a deleted
    // product reappear or turn a successful database deletion into a 500.
    const product = await ProductModel.findOneAndDelete({
      _id: productId,
      ...filter,
    });
    if (!product) return null;

    const cleanupErrors = [];
    const recordFailure = (scope, reason) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      cleanupErrors.push({ scope, message });
      logger.warn?.(
        `Product ${productId} deleted, but ${scope} cleanup failed:`,
        reason,
      );
    };

    const referenceResults = await Promise.allSettled([
      // Start each cleanup inside its own promise so even a synchronous model
      // error is isolated after the source Product has been deleted.
      Promise.resolve().then(() =>
        CartModel.updateMany(
          { "items.product": productId },
          { $pull: { items: { product: productId } } },
        ),
      ),
      Promise.resolve().then(() =>
        WishlistModel.updateMany(
          { products: productId },
          { $pull: { products: productId } },
        ),
      ),
    ]);
    if (referenceResults[0].status === "rejected") {
      recordFailure("cart reference", referenceResults[0].reason);
    }
    if (referenceResults[1].status === "rejected") {
      recordFailure("wishlist reference", referenceResults[1].reason);
    }

    let cloudName = "";
    try {
      cloudName = cloudinaryClient.config?.().cloud_name || "";
    } catch (error) {
      recordFailure("image configuration", error);
    }

    const publicIds = [
      ...new Set(
        (product.images || [])
          .map((image) => ownedProductPublicId(image, cloudName))
          .filter(Boolean),
      ),
    ];
    const imageResults = await Promise.allSettled(
      publicIds.map(async (publicId) => {
        await cloudinaryClient.uploader.destroy(publicId);
      }),
    );
    imageResults.forEach((result, index) => {
      if (result.status === "rejected") {
        recordFailure(`image ${publicIds[index]}`, result.reason);
      }
    });

    return { product, cleanupErrors };
  };
}

const deleteProduct = createProductDeletionService();

module.exports = {
  createProductDeletionService,
  deleteProduct,
  ownedProductPublicId,
};

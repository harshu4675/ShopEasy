const KEY = "recentlyViewed";
const MAX = 20;

export const addRecentlyViewed = (product) => {
  if (!product?._id) return;
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "[]");
    const filtered = existing.filter((p) => p._id !== product._id);
    const updated = [
      {
        _id: product._id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        images: product.images?.slice(0, 1) || [],
        brand: product.brand,
        rating: product.rating,
        numReviews: product.numReviews,
        discount: product.discount,
        category: product.category,
        stock: product.stock,
        viewedAt: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // silent
  }
};

export const getRecentlyViewed = (limit = 10) => {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || "[]");
    return items.slice(0, limit);
  } catch {
    return [];
  }
};

export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // silent
  }
};

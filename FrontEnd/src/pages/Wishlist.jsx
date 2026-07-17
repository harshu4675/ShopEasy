import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";
import Loader from "../components/Loader";

const Wishlist = () => {
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fontId = "wishlist-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await api.get("/wishlist");
      setWishlist(response.data);
    } catch (error) {
      showToast("Error loading wishlist", "error");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId) => {
    try {
      const response = await api.delete(`/wishlist/remove/${productId}`);
      setWishlist(response.data);
      showToast("Removed from wishlist", "success");
    } catch (error) {
      showToast("Error removing item", "error");
    }
  };

  const moveToCart = async (product) => {
    try {
      await api.post("/cart/add", {
        productId: product._id,
        quantity: 1,
        size: product.sizes?.[0] || "",
        color: product.colors?.[0]?.name || "",
      });
      await removeItem(product._id);
      showToast("Moved to cart successfully", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error moving to cart",
        "error",
      );
    }
  };

  if (loading) return <Loader fullScreen />;

  if (!wishlist || wishlist.products.length === 0) {
    return (
      <div
        className="flex min-h-[calc(100vh-200px)] items-center justify-center py-10"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="container mx-auto px-4">
          <div className="rounded-[12px] bg-white px-8 py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <span className="mb-4 block text-[4rem] leading-none text-[#9ca3af]">
              &#9825;
            </span>
            <h2 className="mb-2 text-[1.5rem] font-semibold text-[#1f2937]">
              Your wishlist is empty
            </h2>
            <p className="mb-6 text-[#6b7280]">
              Save your favorite items here for later
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] px-8 py-[0.85rem] text-[1rem] font-semibold text-white no-underline shadow-[0_4px_15px_rgba(102,126,234,0.3)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)]"
            >
              Explore Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-200px)] py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-[30px]">
          <h1 className="mb-2 text-[32px] font-bold text-[#1a1a2e] max-md:text-[26px]">
            My Wishlist
          </h1>
          <p className="text-[#6b7280]">
            {wishlist.products.length} items saved
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 max-md:grid-cols-2 max-md:gap-4 max-[480px]:grid-cols-1">
          {wishlist.products.map((product) => (
            <div
              key={product._id}
              className="relative overflow-hidden rounded-[8px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-[5px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            >
              <button
                onClick={() => removeItem(product._id)}
                title="Remove from wishlist"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-white text-[16px] text-[#6b7280] shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-[#ef4444] hover:text-white"
              >
                &#x2715;
              </button>

              <Link
                to={`/product/${product._id}`}
                className="relative block w-full overflow-hidden bg-[#f3f4f6]"
                style={{ paddingTop: "120%" }}
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[400ms] ease-in-out hover:scale-[1.05]"
                />
                {product.discount > 0 && (
                  <span className="absolute bottom-3 left-3 rounded-[4px] bg-[#667eea] px-3 py-[6px] text-[12px] font-bold text-white">
                    {product.discount}% OFF
                  </span>
                )}
              </Link>

              <div className="p-5 max-md:p-[14px]">
                <span className="text-[12px] font-semibold uppercase tracking-[0.5px] text-[#6b7280]">
                  {product.brand}
                </span>

                <Link
                  to={`/product/${product._id}`}
                  className="my-2 block overflow-hidden text-[16px] font-semibold leading-[1.4] text-[#1f2937] no-underline transition-colors duration-200 hover:text-[#667eea] max-md:text-[14px]"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {product.name}
                </Link>

                <div className="mb-[10px] flex items-center gap-[6px]">
                  <span className="text-[14px] text-[#ffc107]">
                    {"★".repeat(Math.round(product.rating))}
                  </span>
                  <span className="text-[12px] text-[#6b7280]">
                    ({product.numReviews})
                  </span>
                </div>

                <div className="mb-[10px] flex items-center gap-[10px]">
                  <span className="text-[20px] font-bold text-[#1a1a2e] max-md:text-[16px]">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-[14px] text-[#6b7280] line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="mb-4 text-[13px] font-semibold">
                  {product.stock > 0 ? (
                    <span className="text-[#10b981]">In Stock</span>
                  ) : (
                    <span className="text-[#ef4444]">Out of Stock</span>
                  )}
                </div>

                <button
                  onClick={() => moveToCart(product)}
                  disabled={product.stock === 0}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border-none px-4 py-3 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(102,126,234,0.3)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_6px_16px_rgba(102,126,234,0.4)] disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  {product.stock > 0 ? "Move to Cart" : "Out of Stock"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;

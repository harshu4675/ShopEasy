import React, { useContext, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { WishlistContext } from "../context/WishlistContext";
import { api, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const ProductCard = ({ product }) => {
  const { user } = useContext(AuthContext);
  const { refreshCart } = useContext(CartContext) || {};
  const { refreshWishlist } = useContext(WishlistContext) || {};

  const [inWishlist, setInWishlist] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [loading, setLoading] = useState({ cart: false, wishlist: false });

  const checkStatus = useCallback(async () => {
    if (!user) {
      setInWishlist(false);
      setInCart(false);
      return;
    }

    try {
      const [wishRes, cartRes] = await Promise.all([
        api.get("/wishlist").catch(() => ({ data: { products: [] } })),
        api.get("/cart").catch(() => ({ data: { items: [] } })),
      ]);

      const wishItems = wishRes.data?.products || [];
      const isInWish = wishItems.some((item) => {
        const id = item._id || item.product?._id || item;
        return id?.toString() === product._id?.toString();
      });
      setInWishlist(isInWish);

      const cartItems = cartRes.data?.items || [];
      const isInCart = cartItems.some((item) => {
        const id = item.product?._id || item.product || item._id;
        return id?.toString() === product._id?.toString();
      });
      setInCart(isInCart);
    } catch (err) {
      // silent fail
    }
  }, [user, product._id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const addToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Please login to add items to cart", "error");
      return;
    }
    if (loading.cart || inCart) return;

    setLoading((prev) => ({ ...prev, cart: true }));
    try {
      await api.post("/cart/add", {
        productId: product._id,
        quantity: 1,
        size: product.sizes?.[0] || "",
        color: product.colors?.[0]?.name || "",
      });
      setInCart(true);
      if (refreshCart) refreshCart();
      showToast("Added to cart", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error adding to cart",
        "error",
      );
    } finally {
      setLoading((prev) => ({ ...prev, cart: false }));
    }
  };

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Please login to add to wishlist", "error");
      return;
    }
    if (loading.wishlist) return;

    setLoading((prev) => ({ ...prev, wishlist: true }));
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/remove/${product._id}`);
        setInWishlist(false);
        showToast("Removed from wishlist", "success");
      } else {
        await api.post(`/wishlist/add/${product._id}`);
        setInWishlist(true);
        showToast("Added to wishlist", "success");
      }
      if (refreshWishlist) refreshWishlist();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error updating wishlist",
        "error",
      );
    } finally {
      setLoading((prev) => ({ ...prev, wishlist: false }));
    }
  };

  const discountPercent = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : product.discount || 0;

  return (
    <Link
      to={`/product/${product._id}`}
      className="group relative block overflow-hidden rounded-[12px] border border-[rgba(102,126,234,0.06)] bg-white text-inherit no-underline shadow-[0_2px_12px_rgba(102,126,234,0.08)] transition-all duration-300 hover:-translate-y-[6px] hover:border-[rgba(102,126,234,0.15)] hover:shadow-[0_12px_30px_rgba(102,126,234,0.18)] max-md:rounded-[10px] max-md:hover:-translate-y-[3px] max-[480px]:rounded-[8px]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {discountPercent > 0 && (
        <span
          className="absolute left-[10px] top-[10px] z-10 rounded-[6px] px-[10px] py-1 text-[10px] font-bold tracking-[0.3px] text-white shadow-[0_2px_8px_rgba(190,24,93,0.4)] max-md:left-2 max-md:top-2 max-md:px-[7px] max-md:py-[3px] max-md:text-[9px] max-[480px]:rounded-[4px] max-[480px]:px-[6px] max-[480px]:py-[2px] max-[480px]:text-[8px]"
          style={{
            background: "linear-gradient(135deg, #831843 0%, #be185d 100%)",
          }}
        >
          {discountPercent}% OFF
        </span>
      )}

      {product.isNewArrival && (
        <span
          className="absolute right-[10px] top-[10px] z-10 rounded-[6px] px-[10px] py-1 text-[10px] font-bold tracking-[0.3px] text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)] max-md:right-2 max-md:top-2 max-md:px-[7px] max-md:py-[3px] max-md:text-[9px] max-[480px]:rounded-[4px] max-[480px]:px-[6px] max-[480px]:py-[2px] max-[480px]:text-[8px]"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          }}
        >
          NEW
        </span>
      )}

      <div
        className="relative w-full overflow-hidden"
        style={{
          paddingTop: "100%",
          background: "linear-gradient(135deg, #fdf2f8 0%, #f8fafc 100%)",
        }}
      >
        <img
          src={product.images[0]}
          alt={product.name}
          className="absolute inset-0 h-full w-full border-none object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-[1.08]"
        />

        <div className="absolute bottom-0 left-0 right-0 z-[5] flex translate-y-5 justify-center gap-[10px] bg-[linear-gradient(to_top,rgba(255,255,255,0.95)_0%,transparent_100%)] px-3 py-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:static max-md:translate-y-0 max-md:justify-center max-md:gap-3 max-md:bg-transparent max-md:px-3 max-md:py-2 max-md:opacity-100">
          <button
            onClick={toggleWishlist}
            disabled={loading.wishlist}
            title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            aria-label={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-70 max-md:h-10 max-md:w-10 max-[480px]:h-9 max-[480px]:w-9 ${
              inWishlist
                ? "border-transparent text-white shadow-[0_6px_16px_rgba(236,72,153,0.45)]"
                : "border-[rgba(190,24,93,0.15)] bg-white text-[#be185d] shadow-[0_4px_12px_rgba(190,24,93,0.15)] hover:border-transparent hover:shadow-[0_6px_16px_rgba(236,72,153,0.35)]"
            }`}
            style={
              inWishlist
                ? {
                    background:
                      "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                  }
                : {}
            }
          >
            {loading.wishlist ? (
              <span
                className={`inline-block h-4 w-4 rounded-full border-2 ${
                  inWishlist
                    ? "border-white/40 border-t-white"
                    : "border-pink-200 border-t-pink-500"
                }`}
                style={{ animation: "pc-spin 0.7s linear infinite" }}
              />
            ) : (
              <span
                style={matIcon}
                className="text-[20px] max-md:text-[18px] max-[480px]:text-[16px]"
              >
                {inWishlist ? "favorite" : "favorite_border"}
              </span>
            )}
          </button>

          <button
            onClick={addToCart}
            disabled={loading.cart || inCart}
            title={inCart ? "Already in Cart" : "Add to Cart"}
            aria-label={inCart ? "Already in Cart" : "Add to Cart"}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 active:scale-95 disabled:cursor-default disabled:hover:scale-100 max-md:h-10 max-md:w-10 max-[480px]:h-9 max-[480px]:w-9 ${
              inCart
                ? "border-transparent text-white shadow-[0_6px_16px_rgba(139,92,246,0.45)]"
                : "border-[rgba(139,92,246,0.15)] bg-white text-[#7c3aed] shadow-[0_4px_12px_rgba(139,92,246,0.15)] hover:border-transparent hover:text-white hover:shadow-[0_6px_16px_rgba(139,92,246,0.35)]"
            }`}
            style={
              inCart
                ? {
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  }
                : {}
            }
            onMouseEnter={(e) => {
              if (!inCart && !loading.cart) {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
              }
            }}
            onMouseLeave={(e) => {
              if (!inCart && !loading.cart) {
                e.currentTarget.style.background = "white";
              }
            }}
          >
            {loading.cart ? (
              <span
                className="inline-block h-4 w-4 rounded-full border-2 border-purple-200 border-t-purple-500"
                style={{ animation: "pc-spin 0.7s linear infinite" }}
              />
            ) : (
              <span
                style={matIcon}
                className="text-[20px] max-md:text-[18px] max-[480px]:text-[16px]"
              >
                {inCart ? "shopping_cart_checkout" : "shopping_cart"}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-[14px] pb-[14px] pt-[14px] max-md:px-3 max-md:pb-3 max-md:pt-[10px] max-[480px]:px-[10px] max-[480px]:pb-[10px] max-[480px]:pt-2">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[1px] text-[#be185d] max-md:text-[9px] max-[480px]:mb-[2px] max-[480px]:text-[8px] max-[480px]:tracking-[0.5px]">
          {product.brand}
        </div>

        <h3
          className="mb-[6px] min-h-9 overflow-hidden text-[13px] font-semibold leading-[1.4] text-[#1a1a2e] transition-colors duration-300 group-hover:text-[#be185d] max-md:mb-1 max-md:min-h-[34px] max-md:text-[12px] max-[480px]:min-h-[30px] max-[480px]:text-[11px]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.name}
        </h3>

        <div className="mb-2 flex items-center gap-[6px] max-md:mb-[6px] max-[480px]:mb-1 max-[480px]:gap-1">
          <span className="text-[11px] tracking-[-1px] text-[#ffc107] max-md:text-[10px] max-[480px]:text-[9px]">
            {"★".repeat(Math.round(product.rating))}
          </span>
          <span className="text-[10px] font-medium text-[#9ca3af] max-md:text-[9px] max-[480px]:text-[8px]">
            ({product.numReviews})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-[6px]">
          <span
            className="text-[16px] font-extrabold max-md:text-[14px] max-[480px]:text-[13px]"
            style={{
              background: "linear-gradient(135deg, #831843 0%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {formatPrice(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <>
              <span className="text-[12px] text-[#9ca3af] line-through max-md:text-[11px] max-[480px]:text-[10px]">
                {formatPrice(product.originalPrice)}
              </span>
              <span
                className="rounded-[4px] px-[6px] py-[2px] text-[10px] font-bold text-white max-md:px-[5px] max-md:text-[9px] max-[480px]:px-1 max-[480px]:text-[8px]"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                {discountPercent}% off
              </span>
            </>
          )}
        </div>

        {product.stock === 0 && (
          <div
            className="mt-2 rounded-[6px] px-[10px] py-[6px] text-center text-[10px] font-bold uppercase tracking-[0.5px] text-[#dc2626] max-[480px]:mt-[6px] max-[480px]:rounded-[4px] max-[480px]:text-[9px]"
            style={{
              background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            }}
          >
            Out of Stock
          </div>
        )}
      </div>

      <style>{`
        @keyframes pc-spin {
          to { transform: rotate(360deg); }
        }
        @media (hover: none) {
          .group:hover { transform: none !important; box-shadow: 0 2px 12px rgba(102,126,234,0.08) !important; }
          .group:active { transform: scale(0.98) !important; }
        }
      `}</style>
    </Link>
  );
};

export default ProductCard;

import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { showToast } from "../utils/toast";
import Loader from "./Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const MobileCart = () => {
  const navigate = useNavigate();
  const { refreshCart } = useContext(CartContext) || {};
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);
  const [updatingItem, setUpdatingItem] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const fontId = "mobile-cart-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const fetchCart = async () => {
    try {
      const res = await api.get("/cart");
      setCart(res.data);
    } catch (err) {
      console.error("Cart fetch error:", err);
      setCart({ items: [], appliedCoupon: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get("/cart");
        if (mounted) {
          setCart(res.data);
        }
      } catch (err) {
        console.error("Cart fetch error:", err);
        if (mounted) {
          setCart({ items: [], appliedCoupon: null });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (productId, quantity, size, color) => {
    if (quantity < 1) return;
    const key = `${productId}-${size}-${color}`;
    setUpdatingItem(key);
    try {
      const res = await api.put("/cart/update", {
        productId,
        quantity,
        size,
        color,
      });
      setCart(res.data);
      if (refreshCart) refreshCart();
    } catch (err) {
      showToast(err.response?.data?.message || "Error updating", "error");
    } finally {
      setUpdatingItem(null);
    }
  };

  const removeItem = async (productId, size, color) => {
    const key = `${productId}-${size}-${color}`;
    setRemovingItem(key);
    try {
      let res;
      try {
        res = await api.delete(
          `/cart/remove/${productId}?size=${encodeURIComponent(size || "")}&color=${encodeURIComponent(color || "")}`,
        );
      } catch {
        res = await api.delete(`/cart/remove/${productId}`, {
          data: { size, color },
        });
      }
      if (res?.data) {
        setCart(res.data);
        if (refreshCart) refreshCart();
        showToast("Item removed", "success");
      }
    } catch {
      await fetchCart();
      showToast("Please try again", "warning");
    } finally {
      setRemovingItem(null);
    }
  };

  const moveToWishlist = async (productId, size, color) => {
    try {
      await api.post(`/wishlist/add/${productId}`);
      await removeItem(productId, size, color);
      showToast("Moved to wishlist", "success");
    } catch {
      showToast("Error moving to wishlist", "error");
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post("/cart/apply-coupon", {
        code: couponCode.trim().toUpperCase(),
      });
      setCart(res.data);
      showToast("Coupon applied", "success");
      setCouponCode("");
    } catch (err) {
      showToast(err.response?.data?.message || "Invalid coupon", "error");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = async () => {
    try {
      const res = await api.delete("/cart/remove-coupon");
      setCart(res.data);
      showToast("Coupon removed", "success");
    } catch {
      showToast("Error removing coupon", "error");
    }
  };

  const calcSubtotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce(
      (s, i) => s + (i.product?.price || 0) * (i.quantity || 0),
      0,
    );
  };

  const calcDiscount = () => {
    if (!cart?.appliedCoupon) return 0;
    const sub = calcSubtotal();
    if (cart.appliedCoupon.discountType === "percentage") {
      let d = (sub * cart.appliedCoupon.discountValue) / 100;
      if (cart.appliedCoupon.maxDiscountAmount) {
        d = Math.min(d, cart.appliedCoupon.maxDiscountAmount);
      }
      return d;
    }
    return cart.appliedCoupon.discountValue;
  };

  const calcDelivery = () => (calcSubtotal() >= 199 ? 0 : 49);
  const calcTotal = () =>
    Math.max(0, calcSubtotal() - calcDiscount() + calcDelivery());
  const remainingForFree = () => Math.max(0, 199 - calcSubtotal());

  if (loading) return <Loader fullScreen />;

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center bg-gray-50 px-6 py-10">
        <div
          className="mb-6 flex h-32 w-32 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
          }}
        >
          <span style={matIcon} className="text-[64px] text-pink-600">
            shopping_cart
          </span>
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Your cart is empty
        </h2>
        <p className="mb-6 max-w-xs text-center text-sm text-gray-500">
          Looks like you haven't added anything yet. Start exploring!
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white no-underline shadow-lg"
          style={{
            background: "linear-gradient(135deg, #831843, #ec4899)",
          }}
        >
          Start Shopping
          <span style={matIcon} className="text-[18px]">
            arrow_forward
          </span>
        </Link>
      </div>
    );
  }

  const freeShipPct = Math.min(100, (calcSubtotal() / 199) * 100);

  return (
    <div
      className="bg-gray-50 pb-[180px]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {remainingForFree() > 0 ? (
        <div className="bg-white px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span style={matIcon} className="text-[18px] text-pink-600">
              local_shipping
            </span>
            <span className="text-gray-700">
              Add{" "}
              <span className="font-bold text-pink-600">
                {formatPrice(remainingForFree())}
              </span>{" "}
              more for FREE delivery
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${freeShipPct}%`,
                background: "linear-gradient(90deg, #831843, #ec4899)",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 px-4 py-3">
          <span style={matIcon} className="text-[20px] text-green-600">
            check_circle
          </span>
          <p className="m-0 text-xs font-semibold text-green-700">
            You qualify for FREE delivery
          </p>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2">
        {cart.items.map((item) => {
          if (!item.product) return null;
          const key = `${item.product._id}-${item.size || ""}-${item.color || ""}`;
          const isRemoving = removingItem === key;
          const isUpdating = updatingItem === key;

          return (
            <div
              key={key}
              className={`bg-white p-3 transition-opacity ${
                isRemoving ? "opacity-50" : ""
              }`}
            >
              <div className="flex gap-3">
                <Link
                  to={`/product/${item.product._id}`}
                  className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-50"
                >
                  <img
                    src={item.product.images?.[0]}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  {item.product.brand && (
                    <p className="m-0 mb-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-600">
                      {item.product.brand}
                    </p>
                  )}
                  <Link
                    to={`/product/${item.product._id}`}
                    className="mb-1 block text-[13px] font-semibold text-gray-900 no-underline"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.product.name}
                  </Link>

                  <div className="mb-1 flex flex-wrap gap-1">
                    {item.size && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        Size: {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        {item.color}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-gray-900">
                      {formatPrice(item.product.price)}
                    </span>
                    {item.product.originalPrice > item.product.price && (
                      <>
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(item.product.originalPrice)}
                        </span>
                        <span className="text-xs font-bold text-green-600">
                          {Math.round(
                            ((item.product.originalPrice - item.product.price) /
                              item.product.originalPrice) *
                              100,
                          )}
                          % off
                        </span>
                      </>
                    )}
                  </div>

                  {item.product.stock > 0 && item.product.stock < 10 && (
                    <p className="m-0 mt-1 text-[10px] font-semibold text-orange-600">
                      Only {item.product.stock} left
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white">
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.product._id,
                        item.quantity - 1,
                        item.size,
                        item.color,
                      )
                    }
                    disabled={item.quantity <= 1 || isUpdating}
                    aria-label="Decrease"
                    className="flex h-8 w-8 items-center justify-center border-none bg-transparent text-lg font-bold text-pink-600 disabled:opacity-40"
                  >
                    &minus;
                  </button>
                  <span className="min-w-[24px] text-center text-sm font-bold">
                    {isUpdating ? (
                      <span
                        className="mx-auto inline-block h-3 w-3 rounded-full border-2 border-pink-200 border-t-pink-500"
                        style={{ animation: "cart-spin 0.7s linear infinite" }}
                      />
                    ) : (
                      item.quantity
                    )}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.product._id,
                        item.quantity + 1,
                        item.size,
                        item.color,
                      )
                    }
                    disabled={
                      item.quantity >= (item.product.stock || 0) || isUpdating
                    }
                    aria-label="Increase"
                    className="flex h-8 w-8 items-center justify-center border-none bg-transparent text-lg font-bold text-pink-600 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      moveToWishlist(item.product._id, item.size, item.color)
                    }
                    className="flex items-center gap-1 rounded-lg border-none bg-transparent px-2 py-1.5 text-[11px] font-semibold text-gray-600"
                  >
                    <span style={matIcon} className="text-[16px]">
                      favorite_border
                    </span>
                    Save
                  </button>
                  <button
                    onClick={() =>
                      removeItem(item.product._id, item.size, item.color)
                    }
                    disabled={isRemoving}
                    className="flex items-center gap-1 rounded-lg border-none bg-transparent px-2 py-1.5 text-[11px] font-semibold text-red-600 disabled:opacity-60"
                  >
                    <span style={matIcon} className="text-[16px]">
                      delete
                    </span>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 bg-white p-4">
        {cart.appliedCoupon ? (
          <div
            className="flex items-center justify-between rounded-xl p-3 text-white"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
            }}
          >
            <div className="flex items-center gap-2">
              <span style={matIcon} className="text-[24px]">
                verified
              </span>
              <div>
                <p className="m-0 text-sm font-bold">
                  {cart.appliedCoupon.code}
                </p>
                <p className="m-0 text-[11px] opacity-90">
                  You saved {formatPrice(calcDiscount())}
                </p>
              </div>
            </div>
            <button
              onClick={removeCoupon}
              className="rounded-lg border-none bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <p className="m-0 mb-2 flex items-center gap-1.5 text-xs font-bold text-gray-800">
              <span style={matIcon} className="text-[18px] text-pink-600">
                local_offer
              </span>
              Apply Coupon
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold tracking-wide outline-none focus:border-pink-500 focus:bg-white"
              />
              <button
                onClick={applyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="rounded-lg border-none px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #831843, #ec4899)",
                }}
              >
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>
            <Link
              to="/coupons"
              className="mt-2 inline-block text-xs font-semibold text-pink-600 no-underline"
            >
              View available coupons &rarr;
            </Link>
          </div>
        )}
      </div>

      <div className="mt-2 bg-white p-4">
        <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Price Details ({cart.items.length}{" "}
          {cart.items.length === 1 ? "item" : "items"})
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(calcSubtotal())}
            </span>
          </div>
          {calcDiscount() > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-semibold text-green-600">
                -{formatPrice(calcDiscount())}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery</span>
            <span
              className={
                calcDelivery() === 0
                  ? "font-semibold text-green-600"
                  : "font-semibold text-gray-900"
              }
            >
              {calcDelivery() === 0 ? "FREE" : formatPrice(calcDelivery())}
            </span>
          </div>
          <div className="mt-3 flex justify-between border-t border-dashed border-gray-200 pt-3">
            <span className="text-base font-bold text-gray-900">
              Total Amount
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(calcTotal())}
            </span>
          </div>
          {calcDiscount() > 0 && (
            <p className="m-0 rounded-lg bg-green-50 px-3 py-2 text-center text-xs font-semibold text-green-700">
              You are saving {formatPrice(calcDiscount())} on this order
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 bg-white px-4 py-3">
        <span style={matIcon} className="text-[18px] text-gray-500">
          verified_user
        </span>
        <p className="m-0 text-[11px] text-gray-500">
          Safe and secure payments. Easy returns. 100% authentic products.
        </p>
      </div>

      <div
        className="fixed inset-x-0 z-40 border-t border-gray-100 bg-white"
        style={{
          bottom: "56px",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className="cursor-pointer border-b border-gray-100 px-4 py-2"
          onClick={() => setShowSummary(!showSummary)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="m-0 text-lg font-bold text-gray-900">
                {formatPrice(calcTotal())}
              </p>
              <p className="m-0 flex items-center gap-1 text-[11px] font-semibold text-pink-600">
                View price details
                <span style={matIcon} className="text-[14px]">
                  {showSummary ? "expand_more" : "expand_less"}
                </span>
              </p>
            </div>
            {calcDiscount() > 0 && (
              <div className="text-right">
                <p className="m-0 text-[10px] text-gray-500">You save</p>
                <p className="m-0 text-xs font-bold text-green-600">
                  {formatPrice(calcDiscount())}
                </p>
              </div>
            )}
          </div>
          {showSummary && (
            <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  {formatPrice(calcSubtotal())}
                </span>
              </div>
              {calcDiscount() > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-green-600">
                    -{formatPrice(calcDiscount())}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery</span>
                <span
                  className={
                    calcDelivery() === 0 ? "text-green-600" : "text-gray-900"
                  }
                >
                  {calcDelivery() === 0 ? "FREE" : formatPrice(calcDelivery())}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-2">
          <button
            onClick={() => navigate("/checkout")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-none py-3 text-sm font-bold text-white shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
            }}
          >
            Continue to Checkout
            <span style={matIcon} className="text-[20px]">
              arrow_forward
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cart-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MobileCart;

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";
import Loader from "../components/Loader";

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get("/cart");
      setCart(response.data);
    } catch (error) {
      console.error("Cart fetch error:", error);
      showToast("Error loading cart", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity, size, color) => {
    if (quantity < 1) return;
    try {
      const response = await api.put("/cart/update", {
        productId,
        quantity,
        size,
        color,
      });
      setCart(response.data);
    } catch (error) {
      console.error("Update quantity error:", error);
      showToast(
        error.response?.data?.message || "Error updating cart",
        "error",
      );
    }
  };

  const removeItem = async (productId, size, color) => {
    const itemKey = `${productId}-${size}-${color}`;
    setRemovingItem(itemKey);
    try {
      let response;
      try {
        response = await api.delete(
          `/cart/remove/${productId}?size=${encodeURIComponent(size || "")}&color=${encodeURIComponent(color || "")}`,
        );
      } catch (err) {
        response = await api.delete(`/cart/remove/${productId}`, {
          data: { size, color },
        });
      }
      if (response && response.data) {
        setCart(response.data);
        showToast("Item removed from cart", "success");
      }
    } catch (error) {
      console.error("Remove item error:", error);
      try {
        await fetchCart();
        showToast("Please try again", "warning");
      } catch (fetchError) {
        showToast("Error removing item", "error");
      }
    } finally {
      setRemovingItem(null);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast("Please enter a coupon code", "warning");
      return;
    }
    setCouponLoading(true);
    try {
      const response = await api.post("/cart/apply-coupon", {
        code: couponCode.trim().toUpperCase(),
      });
      setCart(response.data);
      showToast("Coupon applied successfully!", "success");
      setCouponCode("");
    } catch (error) {
      console.error("Apply coupon error:", error);
      showToast(
        error.response?.data?.message || "Invalid coupon code",
        "error",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = async () => {
    try {
      const response = await api.delete("/cart/remove-coupon");
      setCart(response.data);
      showToast("Coupon removed", "success");
    } catch (error) {
      console.error("Remove coupon error:", error);
      showToast("Error removing coupon", "error");
    }
  };

  const calculateSubtotal = () => {
    if (!cart?.items || cart.items.length === 0) return 0;
    return cart.items.reduce((sum, item) => {
      const price = item.product?.price || 0;
      const quantity = item.quantity || 0;
      return sum + price * quantity;
    }, 0);
  };

  const calculateDiscount = () => {
    if (!cart?.appliedCoupon) return 0;
    const subtotal = calculateSubtotal();
    if (cart.appliedCoupon.discountType === "percentage") {
      let discount = (subtotal * cart.appliedCoupon.discountValue) / 100;
      if (cart.appliedCoupon.maxDiscountAmount) {
        discount = Math.min(discount, cart.appliedCoupon.maxDiscountAmount);
      }
      return discount;
    }
    return cart.appliedCoupon.discountValue;
  };

  const calculateDelivery = () => {
    const subtotal = calculateSubtotal();
    return subtotal >= 199 ? 0 : 49;
  };

  const calculateTotal = () => {
    return Math.max(
      0,
      calculateSubtotal() - calculateDiscount() + calculateDelivery(),
    );
  };

  const getRemainingForFreeDelivery = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, 199 - subtotal);
  };

  if (loading) return <Loader fullScreen />;

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="py-10 min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="max-w-[1400px] mx-auto px-5">
          <div className="text-center py-20 px-5">
            <div className="text-[80px] mb-5 opacity-50">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "80px" }}
              >
                shopping_cart
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-3 text-[#1a1a2e]">
              Your cart is empty
            </h2>
            <p className="text-[#adb5bd] mb-6">
              Looks like you haven't added anything to your cart yet
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 py-[18px] px-9 border-none rounded-[12px] cursor-pointer font-[inherit] text-[17px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap mt-2.5 bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 min-h-[calc(100vh-200px)]">
      <div className="max-w-[1400px] mx-auto px-5">
        <div className="mb-0">
          <h1 className="text-[32px] font-bold mb-2 text-[#1a1a2e] md:text-[26px]">
            Shopping Cart
          </h1>
          <p className="text-[#adb5bd] mb-[30px]">
            {cart.items.length} {cart.items.length === 1 ? "item" : "items"} in
            your cart
          </p>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-[30px] items-start lg:grid-cols-1">
          <div className="flex flex-col gap-4">
            {cart.items.map((item) => {
              if (!item.product) {
                console.warn("Product not found for cart item:", item);
                return null;
              }

              const itemKey = `${item.product._id}-${item.size || ""}-${item.color || ""}`;
              const isRemoving = removingItem === itemKey;

              return (
                <div
                  key={itemKey}
                  className={`bg-white rounded-[12px] p-6 grid grid-cols-[100px_1fr_auto_auto_auto] gap-6 items-center shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all duration-300 ease-custom hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] relative md:grid-cols-[80px_1fr] md:gap-4 md:p-4 ${
                    isRemoving ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <Link
                    to={`/product/${item.product._id}`}
                    className="w-[100px] h-[120px] rounded-[6px] overflow-hidden bg-[#f8f9fa] md:w-[80px] md:h-[100px]"
                  >
                    <img
                      src={item.product.images?.[0] || "/placeholder.jpg"}
                      alt={item.product.name || "Product"}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="min-w-0">
                    <Link
                      to={`/product/${item.product._id}`}
                      className="text-base font-semibold text-[#343a40] no-underline block mb-1 transition-all duration-300 ease-custom hover:text-[#e91e63]"
                    >
                      {item.product.name || "Product"}
                    </Link>
                    {item.product.brand && (
                      <p className="text-[13px] text-[#adb5bd] mb-2">
                        {item.product.brand}
                      </p>
                    )}
                    <div className="flex gap-4 text-[13px] text-[#6c757d] mb-2 flex-wrap">
                      {item.size && (
                        <span className="inline-block py-1 px-2 bg-[#f3f4f6] rounded text-xs mr-2">
                          Size: {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="inline-block py-1 px-2 bg-[#f3f4f6] rounded text-xs mr-2">
                          Color: {item.color}
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-semibold text-[#e91e63] m-0">
                      {formatPrice(item.product.price || 0)}
                    </p>
                    {item.product.stock < 10 && item.product.stock > 0 && (
                      <p className="text-[#ef4444] text-xs mt-1">
                        Only {item.product.stock} left in stock
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 bg-[#f8f9fa] rounded-[6px] p-1.5 md:col-start-2">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product._id,
                          item.quantity - 1,
                          item.size,
                          item.color,
                        )
                      }
                      disabled={item.quantity <= 1 || isRemoving}
                      aria-label="Decrease quantity"
                      className="w-9 h-9 border-none bg-white rounded-[6px] cursor-pointer text-lg font-semibold transition-all duration-300 ease-custom hover:not-disabled:bg-[#e91e63] hover:not-disabled:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="min-w-[30px] text-center font-bold text-base">
                      {item.quantity}
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
                        item.quantity >= (item.product.stock || 0) || isRemoving
                      }
                      aria-label="Increase quantity"
                      className="w-9 h-9 border-none bg-white rounded-[6px] cursor-pointer text-lg font-semibold transition-all duration-300 ease-custom hover:not-disabled:bg-[#e91e63] hover:not-disabled:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-lg font-bold text-[#1a1a2e] min-w-[100px] text-right md:col-start-2 md:text-left">
                    {formatPrice(
                      (item.product.price || 0) * (item.quantity || 0),
                    )}
                  </div>

                  <button
                    className="w-9 h-9 border-none bg-[#f8f9fa] text-[#adb5bd] rounded-full cursor-pointer text-lg transition-all duration-300 ease-custom hover:bg-[#f44336] hover:text-white md:absolute md:top-4 md:right-4"
                    onClick={() =>
                      removeItem(item.product._id, item.size, item.color)
                    }
                    disabled={isRemoving}
                    aria-label="Remove item"
                    title="Remove from cart"
                  >
                    {isRemoving ? "..." : "x"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-[12px] p-7 shadow-[0_4px_12px_rgba(0,0,0,0.1)] sticky top-[100px] lg:static">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b-2 border-[#f8f9fa]">
              Order Summary
            </h2>

            <div className="mb-6 pb-6 border-b-2 border-[#f8f9fa]">
              {cart.appliedCoupon ? (
                <div className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white p-4 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z" />
                      </svg>
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-base">
                        {cart.appliedCoupon.code}
                      </span>
                      <span className="text-[13px] opacity-90">
                        You saved{" "}
                        {cart.appliedCoupon.discountType === "percentage"
                          ? `${cart.appliedCoupon.discountValue}%`
                          : formatPrice(cart.appliedCoupon.discountValue)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="bg-white/20 text-white border-none py-2 px-4 rounded-md cursor-pointer text-sm transition-all duration-300 ease-custom hover:bg-white/30"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2.5 mb-2.5">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      onKeyPress={(e) => e.key === "Enter" && applyCoupon()}
                      className="flex-1 py-3 px-4 border-2 border-[#e9ecef] rounded-[6px] text-sm font-semibold tracking-wider focus:outline-none focus:border-[#e91e63]"
                    />
                    <button
                      onClick={applyCoupon}
                      className="py-3 px-6 bg-[#e91e63] text-white border-none rounded-[6px] font-semibold cursor-pointer transition-all duration-300 ease-custom hover:bg-[#c2185b] disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  <Link
                    to="/coupons"
                    className="text-[13px] text-[#e91e63] font-medium"
                  >
                    View available coupons
                  </Link>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between py-2.5 text-[15px] text-[#6c757d]">
                <span>Subtotal</span>
                <span>{formatPrice(calculateSubtotal())}</span>
              </div>

              {calculateDiscount() > 0 && (
                <div className="flex justify-between py-2.5 text-[15px] text-[#10b981] font-semibold">
                  <span>Discount</span>
                  <span className="text-[#10b981] font-semibold">
                    -{formatPrice(calculateDiscount())}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2.5 text-[15px] text-[#6c757d]">
                <span>Delivery</span>
                <span
                  className={
                    calculateDelivery() === 0
                      ? "text-[#10b981] font-semibold"
                      : ""
                  }
                >
                  {calculateDelivery() === 0
                    ? "FREE"
                    : formatPrice(calculateDelivery())}
                </span>
              </div>

              {getRemainingForFreeDelivery() > 0 && (
                <p className="text-xs text-[#e91e63] bg-[#f8bbd9] py-2.5 px-2.5 rounded-[6px] text-center mt-2">
                  Add {formatPrice(getRemainingForFreeDelivery())} more for FREE
                  delivery
                </p>
              )}
            </div>

            <div className="flex justify-between py-5 border-t-2 border-[#e9ecef] text-xl font-bold text-[#1a1a2e]">
              <span>Total Amount</span>
              <span className="text-2xl font-bold text-[#667eea]">
                {formatPrice(calculateTotal())}
              </span>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full inline-flex items-center justify-center gap-2 py-[18px] px-9 border-none rounded-[12px] cursor-pointer font-[inherit] text-[17px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap mt-2.5 bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover mb-4"
            >
              Proceed to Checkout
            </button>

            <Link
              to="/products"
              className="block text-center mt-4 text-[#6c757d] font-medium transition-all duration-300 ease-custom hover:text-[#e91e63]"
            >
              Continue Shopping
            </Link>

            <div className="text-center mt-5 pt-5 border-t border-[#e5e7eb]">
              <p className="text-xs text-[#6b7280] mb-2">We accept:</p>
              <div className="flex justify-center gap-3 text-2xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="#6b7280"
                >
                  <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="#6b7280"
                >
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="#6b7280"
                >
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

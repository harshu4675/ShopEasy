import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import Loader from "../components/Loader";

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    phone: user?.phone || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "COD",
  });

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
  ];

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchCart = useCallback(async () => {
    try {
      const response = await api.get("/cart");
      if (!response.data || response.data.items.length === 0) {
        showToast("Your cart is empty", "error");
        navigate("/cart");
        return;
      }
      setCart(response.data);
    } catch (error) {
      showToast("Error loading cart", "error");
      navigate("/cart");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateSubtotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
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
    return calculateSubtotal() >= 199 ? 0 : 49;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() + calculateDelivery();
  };

  const validateStep1 = () => {
    const { fullName, phone, address, city, state, pincode } = formData;
    if (!fullName || !phone || !address || !city || !state || !pincode) {
      showToast("Please fill all address fields", "error");
      return false;
    }
    if (phone.length !== 10) {
      showToast("Please enter a valid 10-digit phone number", "error");
      return false;
    }
    if (pincode.length !== 6) {
      showToast("Please enter a valid 6-digit pincode", "error");
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validateStep1()) setStep(2);
  };

  const handleRazorpayPayment = async () => {
    setSubmitting(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showToast("Failed to load Razorpay SDK. Please try again.", "error");
        setSubmitting(false);
        return;
      }
      const totalAmount = calculateTotal();
      const orderResponse = await api.post("/payment/create-order", {
        amount: totalAmount,
        currency: "INR",
      });
      const { order, key_id } = orderResponse.data;
      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Your Store Name",
        description: "Purchase from Your Store",
        order_id: order.id,
        prefill: {
          name: formData.fullName,
          email: user?.email || "",
          contact: formData.phone,
        },
        notes: {
          address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        },
        theme: { color: "#3399cc" },
        handler: async function (response) {
          try {
            const verifyResponse = await api.post("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyResponse.data.success) {
              await createOrder(
                response.razorpay_payment_id,
                response.razorpay_order_id,
              );
            } else {
              showToast("Payment verification failed", "error");
              setSubmitting(false);
            }
          } catch (error) {
            showToast("Payment verification error", "error");
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            showToast("Payment cancelled", "info");
            setSubmitting(false);
          },
        },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Razorpay Error:", error);
      showToast(
        error.response?.data?.message || "Error initiating payment",
        "error",
      );
      setSubmitting(false);
    }
  };

  const createOrder = async (paymentId = null, orderId = null) => {
    try {
      const orderData = {
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        paymentMethod: formData.paymentMethod,
        ...(paymentId && { razorpayPaymentId: paymentId }),
        ...(orderId && { razorpayOrderId: orderId }),
      };
      await api.post("/orders", orderData);
      showToast("Order placed successfully!", "success");
      navigate("/my-orders");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error placing order",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.paymentMethod === "Razorpay") {
      await handleRazorpayPayment();
    } else if (formData.paymentMethod === "COD") {
      setSubmitting(true);
      await createOrder();
    } else {
      showToast("This payment method is coming soon!", "info");
    }
  };

  if (loading) return <Loader fullScreen />;

  const inputClass =
    "w-full py-3.5 px-4 border-2 border-[#dee2e6] rounded-[6px] font-[inherit] text-[15px] transition-all duration-300 bg-white focus:outline-none focus:border-[#e91e63] focus:shadow-[0_0_0_3px_#f8bbd9] placeholder:text-[#adb5bd]";

  return (
    <div className="py-10 min-h-[calc(100vh-200px)] bg-[#f8f9fa]">
      <div className="max-w-[1400px] mx-auto px-5">
        <div className="mb-10">
          <h1 className="text-[32px] font-bold mb-6 text-[#1a1a2e] md:text-[26px]">
            Checkout
          </h1>

          <div className="flex items-center max-w-[400px] md:max-w-full">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step >= 1
                    ? "bg-[#e91e63] text-white"
                    : "bg-[#dee2e6] text-[#6c757d]"
                }`}
              >
                1
              </span>
              <span
                className={`font-semibold transition-all duration-300 md:hidden ${
                  step >= 1 ? "text-[#e91e63]" : "text-[#adb5bd]"
                }`}
              >
                Address
              </span>
            </div>

            <div className="flex-1 h-[3px] bg-[#dee2e6] mx-5"></div>

            <div className="flex items-center gap-2.5">
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step >= 2
                    ? "bg-[#e91e63] text-white"
                    : "bg-[#dee2e6] text-[#6c757d]"
                }`}
              >
                2
              </span>
              <span
                className={`font-semibold transition-all duration-300 md:hidden ${
                  step >= 2 ? "text-[#e91e63]" : "text-[#adb5bd]"
                }`}
              >
                Payment
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_420px] gap-[30px] items-start lg:grid-cols-1">
          <div className="bg-white rounded-[12px] p-8 shadow-[0_2px_4px_rgba(0,0,0,0.05)] md:p-5">
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold mb-6 pb-4 border-b-2 border-[#f8f9fa]">
                  Delivery Address
                </h2>

                <div className="grid grid-cols-2 gap-5 md:grid-cols-1">
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-[#495057] text-sm">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-[#495057] text-sm">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-medium text-[#495057] text-sm">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="House No., Building, Street, Area"
                    rows="3"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-5 md:grid-cols-1">
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-[#495057] text-sm">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-[#495057] text-sm">
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Select State</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 md:grid-cols-1">
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-[#495057] text-sm">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="6-digit pincode"
                      maxLength="6"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full inline-flex items-center justify-center gap-2 py-[18px] px-9 border-none rounded-[12px] cursor-pointer font-[inherit] text-[17px] font-semibold transition-all duration-300 bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover mt-2.5"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <h2 className="text-xl font-bold mb-6 pb-4 border-b-2 border-[#f8f9fa]">
                  Payment Method
                </h2>

                <div className="flex flex-col gap-3 mb-[30px]">
                  <label
                    className={`flex items-center p-5 border-2 rounded-[12px] cursor-pointer transition-all duration-300 ${
                      formData.paymentMethod === "COD"
                        ? "border-[#e91e63] bg-[#f8bbd9]"
                        : "border-[#e9ecef] hover:border-[#f8bbd9]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={formData.paymentMethod === "COD"}
                      onChange={handleChange}
                      className="w-5 h-5 mr-4 cursor-pointer"
                    />
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-[28px]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="#4caf50"
                        >
                          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                        </svg>
                      </span>
                      <div>
                        <strong className="block text-[15px] mb-0.5">
                          Cash on Delivery
                        </strong>
                        <p className="text-[13px] text-[#adb5bd] m-0">
                          Pay when you receive your order
                        </p>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-5 border-2 rounded-[12px] cursor-pointer transition-all duration-300 ${
                      formData.paymentMethod === "Razorpay"
                        ? "border-[#e91e63] bg-[#f8bbd9]"
                        : "border-[#e9ecef] hover:border-[#f8bbd9]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Razorpay"
                      checked={formData.paymentMethod === "Razorpay"}
                      onChange={handleChange}
                      className="w-5 h-5 mr-4 cursor-pointer"
                    />
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-[28px]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="#1565c0"
                        >
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                      </span>
                      <div>
                        <strong className="block text-[15px] mb-0.5">
                          Pay Online
                        </strong>
                        <p className="text-[13px] text-[#adb5bd] m-0">
                          UPI, Cards, NetBanking, Wallets
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="bg-[#f8f9fa] p-5 rounded-[12px] mb-6">
                  <h3 className="text-sm text-[#adb5bd] mb-3 font-semibold">
                    Delivering to:
                  </h3>
                  <p className="my-1 text-[#495057] text-sm">
                    <strong>{formData.fullName}</strong>
                  </p>
                  <p className="my-1 text-[#495057] text-sm">
                    {formData.address}
                  </p>
                  <p className="my-1 text-[#495057] text-sm">
                    {formData.city}, {formData.state} - {formData.pincode}
                  </p>
                  <p className="my-1 text-[#495057] text-sm">
                    Phone: {formData.phone}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="bg-transparent border-none text-[#e91e63] font-semibold cursor-pointer mt-3 text-sm"
                  >
                    Change Address
                  </button>
                </div>

                <div className="flex gap-4 md:flex-col">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-7 border-2 border-[#dee2e6] bg-white text-[#343a40] rounded-[12px] cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 hover:border-[#e91e63] hover:text-[#e91e63]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-7 border-none rounded-[12px] cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Processing..."
                      : `Place Order - ${formatPrice(calculateTotal())}`}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white rounded-[12px] p-7 shadow-[0_4px_12px_rgba(0,0,0,0.1)] sticky top-[100px] lg:static lg:order-first">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b-2 border-[#f8f9fa]">
              Order Summary
            </h2>

            <div className="max-h-[300px] overflow-y-auto mb-5 pr-2">
              {cart?.items.map((item) => (
                <div
                  key={`${item.product._id}-${item.size}-${item.color}`}
                  className="flex gap-3.5 py-3 border-b border-[#f8f9fa] last:border-b-0"
                >
                  <div className="relative w-[60px] h-[70px] rounded-[6px] overflow-hidden bg-[#f8f9fa] flex-shrink-0">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute -top-1.5 -right-1.5 bg-[#e91e63] text-white w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#343a40] m-0 mb-1 line-clamp-2">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-[#adb5bd] m-0">
                      {item.size && `Size: ${item.size}`}
                      {item.size && item.color && " | "}
                      {item.color && `Color: ${item.color}`}
                    </p>
                  </div>
                  <p className="font-semibold text-sm text-[#343a40] m-0">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="py-4 border-t-2 border-b-2 border-[#f8f9fa]">
              <div className="flex justify-between py-2 text-sm text-[#495057]">
                <span>Subtotal ({cart?.items.length} items)</span>
                <span>{formatPrice(calculateSubtotal())}</span>
              </div>
              {calculateDiscount() > 0 && (
                <div className="flex justify-between py-2 text-sm text-[#4caf50] font-semibold">
                  <span>Discount</span>
                  <span>-{formatPrice(calculateDiscount())}</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-sm text-[#495057]">
                <span>Delivery</span>
                <span>
                  {calculateDelivery() === 0
                    ? "FREE"
                    : formatPrice(calculateDelivery())}
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-5 text-lg font-bold text-[#1a1a2e]">
              <span>Total Amount</span>
              <span>{formatPrice(calculateTotal())}</span>
            </div>

            <div className="flex items-center gap-2.5 mt-5 p-3.5 bg-[#f8f9fa] rounded-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="#6c757d"
              >
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              <p className="text-xs text-[#6c757d] m-0">
                Your payment information is secure and encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

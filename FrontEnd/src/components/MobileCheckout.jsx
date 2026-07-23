import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
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

const MobileCheckout = () => {
  const { user } = useContext(AuthContext);
  const { refreshCart } = useContext(CartContext) || {};
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [expandedSection, setExpandedSection] = useState(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeInfo, setPincodeInfo] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

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

  useEffect(() => {
    const fontId = "mobile-checkout-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get("/cart");
      if (!res.data?.items?.length) {
        showToast("Cart is empty", "error");
        navigate("/cart");
        return;
      }
      setCart(res.data);
    } catch {
      showToast("Error loading cart", "error");
      navigate("/cart");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (formData.pincode.length !== 6) {
      setPincodeInfo(null);
      return;
    }

    const validation = validatePincode(formData.pincode);
    if (!validation.valid) {
      setFieldErrors((prev) => ({ ...prev, pincode: validation.error }));
      setPincodeInfo(null);
      return;
    }

    setFieldErrors((prev) => ({ ...prev, pincode: null }));

    const timer = setTimeout(async () => {
      setPincodeLoading(true);
      const result = await lookupPincode(formData.pincode);
      setPincodeLoading(false);

      if (result.success) {
        setPincodeInfo(result.data);
        setFormData((prev) => ({
          ...prev,
          city: result.data.city,
          state: result.data.state,
        }));
        setFieldErrors((prev) => ({
          ...prev,
          pincode: null,
          city: null,
          state: null,
        }));
      } else {
        setPincodeInfo(null);
        setFieldErrors((prev) => ({
          ...prev,
          pincode: "Invalid pincode - not found",
        }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.pincode]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, phone: digits });
      if (digits.length === 10) {
        const v = validatePhone(digits);
        setFieldErrors((prev) => ({
          ...prev,
          phone: v.valid ? null : v.error,
        }));
      } else if (digits.length > 0) {
        setFieldErrors((prev) => ({ ...prev, phone: null }));
      }
    } else if (name === "pincode") {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      setFormData({ ...formData, pincode: digits });
    } else if (name === "fullName") {
      setFormData({ ...formData, fullName: value });
      if (value.trim().length > 0) {
        const v = validateName(value);
        setFieldErrors((prev) => ({
          ...prev,
          fullName: v.valid ? null : v.error,
        }));
      }
    } else if (name === "address") {
      setFormData({ ...formData, address: value });
      if (value.trim().length > 0) {
        const v = validateAddress(value);
        setFieldErrors((prev) => ({
          ...prev,
          address: v.valid ? null : v.error,
        }));
      }
    } else {
      setFormData({ ...formData, [name]: value });
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

  const validateAddressForm = () => {
    const errors = {};

    const nameV = validateName(formData.fullName);
    if (!nameV.valid) errors.fullName = nameV.error;

    const phoneV = validatePhone(formData.phone);
    if (!phoneV.valid) errors.phone = phoneV.error;

    const addressV = validateAddress(formData.address);
    if (!addressV.valid) errors.address = addressV.error;

    if (!formData.city?.trim()) errors.city = "City is required";
    if (!formData.state?.trim()) errors.state = "State is required";

    const pincodeV = validatePincode(formData.pincode);
    if (!pincodeV.valid) errors.pincode = pincodeV.error;
    else if (!pincodeInfo && formData.pincode.length === 6) {
      errors.pincode = "Please verify pincode (invalid or not found)";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      showToast(firstError, "error");
      return false;
    }

    return true;
  };

  const goToPayment = () => {
    if (validateAddressForm()) setStep(2);
  };

  const createOrder = async (paymentId = null, orderId = null) => {
    try {
      const orderData = {
        shippingAddress: {
          fullName: formData.fullName.trim(),
          phone: formData.phone,
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode,
        },
        paymentMethod: formData.paymentMethod,
        ...(paymentId && { razorpayPaymentId: paymentId }),
        ...(orderId && { razorpayOrderId: orderId }),
      };
      await api.post("/orders", orderData);
      if (refreshCart) refreshCart();
      showToast("Order placed successfully", "success");
      navigate("/my-orders");
    } catch (err) {
      showToast(err.response?.data?.message || "Error placing order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRazorpay = async () => {
    setSubmitting(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        showToast("Failed to load payment gateway", "error");
        setSubmitting(false);
        return;
      }
      const total = calcTotal();
      const orderRes = await api.post("/payment/create-order", {
        amount: total,
        currency: "INR",
      });
      const { order, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Talish Clothes",
        description: "Purchase from Talish Clothes",
        order_id: order.id,
        prefill: {
          name: formData.fullName,
          email: user?.email || "",
          contact: formData.phone,
        },
        notes: {
          address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        },
        theme: { color: "#be185d" },
        handler: async function (response) {
          try {
            const verify = await api.post("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verify.data.success) {
              await createOrder(
                response.razorpay_payment_id,
                response.razorpay_order_id,
              );
            } else {
              showToast("Payment verification failed", "error");
              setSubmitting(false);
            }
          } catch {
            showToast("Payment verification error", "error");
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            showToast("Payment cancelled", "info");
            setSubmitting(false);
          },
        },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (formData.paymentMethod === "Razorpay") {
      await handleRazorpay();
    } else if (formData.paymentMethod === "COD") {
      setSubmitting(true);
      await createOrder();
    } else {
      showToast("This payment method is coming soon", "info");
    }
  };

  if (loading) return <Loader fullScreen />;

  const inputBase =
    "w-full rounded-lg border-2 bg-white px-3 py-3 text-sm outline-none transition-colors";
  const inputNormal = "border-gray-200 focus:border-pink-500";
  const inputError = "border-red-500 focus:border-red-500";
  const inputSuccess = "border-green-500 focus:border-green-500";

  const getInputClass = (fieldName, hasValue) => {
    if (fieldErrors[fieldName]) return `${inputBase} ${inputError}`;
    if (hasValue && !fieldErrors[fieldName])
      return `${inputBase} ${inputSuccess}`;
    return `${inputBase} ${inputNormal}`;
  };

  const labelClass = "mb-1.5 block text-xs font-semibold text-gray-700";

  return (
    <div
      className="bg-gray-50 pb-[140px]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="sticky top-14 z-30 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                step >= 1 ? "" : "bg-gray-300"
              }`}
              style={
                step >= 1
                  ? { background: "linear-gradient(135deg, #831843, #ec4899)" }
                  : {}
              }
            >
              {step > 1 ? (
                <span style={matIcon} className="text-[16px]">
                  check
                </span>
              ) : (
                "1"
              )}
            </div>
            <div
              className={`ml-2 flex-1 text-xs font-semibold ${
                step >= 1 ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Address
            </div>
          </div>

          <div
            className={`h-0.5 w-8 ${step >= 2 ? "bg-pink-500" : "bg-gray-200"}`}
          />

          <div className="flex flex-1 items-center">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                step >= 2 ? "" : "bg-gray-300"
              }`}
              style={
                step >= 2
                  ? { background: "linear-gradient(135deg, #831843, #ec4899)" }
                  : {}
              }
            >
              2
            </div>
            <div
              className={`ml-2 text-xs font-semibold ${
                step >= 2 ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Payment
            </div>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="mt-2 bg-white p-4">
          <h2 className="m-0 mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span style={matIcon} className="text-[22px] text-pink-600">
              location_on
            </span>
            Delivery Address
          </h2>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>
                Full Name <span className="text-pink-600">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className={getInputClass("fullName", formData.fullName)}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                  <span style={matIcon} className="text-[12px]">
                    error
                  </span>
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Phone Number <span className="text-pink-600">*</span>
              </label>
              <div
                className={`flex items-center overflow-hidden rounded-lg border-2 bg-white transition-colors ${
                  fieldErrors.phone
                    ? "border-red-500"
                    : formData.phone.length === 10
                      ? "border-green-500"
                      : "border-gray-200 focus-within:border-pink-500"
                }`}
              >
                <span className="border-r border-gray-200 px-3 py-3 text-sm font-semibold text-gray-600">
                  +91
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength="10"
                  required
                  className="flex-1 border-none bg-transparent px-3 py-3 text-sm outline-none"
                />
                {formData.phone.length === 10 && !fieldErrors.phone && (
                  <span
                    style={matIcon}
                    className="mr-3 text-[18px] text-green-500"
                  >
                    check_circle
                  </span>
                )}
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                  <span style={matIcon} className="text-[12px]">
                    error
                  </span>
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Address <span className="text-pink-600">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="House No., Building, Street, Area, Landmark"
                rows={3}
                required
                className={`${getInputClass("address", formData.address)} resize-none`}
              />
              {fieldErrors.address && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                  <span style={matIcon} className="text-[12px]">
                    error
                  </span>
                  {fieldErrors.address}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Pincode <span className="text-pink-600">*</span>
              </label>
              <div
                className={`flex items-center overflow-hidden rounded-lg border-2 bg-white transition-colors ${
                  fieldErrors.pincode
                    ? "border-red-500"
                    : pincodeInfo
                      ? "border-green-500"
                      : "border-gray-200 focus-within:border-pink-500"
                }`}
              >
                <input
                  type="tel"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength="6"
                  required
                  className="flex-1 border-none bg-transparent px-3 py-3 text-sm outline-none"
                />
                <div className="mr-3 flex items-center">
                  {pincodeLoading && (
                    <span
                      className="inline-block h-4 w-4 rounded-full border-2 border-pink-200 border-t-pink-500"
                      style={{ animation: "co-spin 0.7s linear infinite" }}
                    />
                  )}
                  {!pincodeLoading && pincodeInfo && (
                    <span
                      style={matIcon}
                      className="text-[18px] text-green-500"
                    >
                      check_circle
                    </span>
                  )}
                  {!pincodeLoading && fieldErrors.pincode && (
                    <span style={matIcon} className="text-[18px] text-red-500">
                      cancel
                    </span>
                  )}
                </div>
              </div>
              {pincodeInfo && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-green-600">
                  <span style={matIcon} className="text-[12px]">
                    check_circle
                  </span>
                  {pincodeInfo.area}, {pincodeInfo.city}
                </p>
              )}
              {fieldErrors.pincode && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                  <span style={matIcon} className="text-[12px]">
                    error
                  </span>
                  {fieldErrors.pincode}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  City <span className="text-pink-600">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  required
                  readOnly={!!pincodeInfo}
                  className={`${getInputClass("city", formData.city)} ${pincodeInfo ? "bg-green-50" : ""}`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  State <span className="text-pink-600">*</span>
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  disabled={!!pincodeInfo}
                  className={`${getInputClass("state", formData.state)} cursor-pointer ${pincodeInfo ? "bg-green-50" : ""}`}
                >
                  <option value="">Select State</option>
                  {indianStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {pincodeInfo && (
              <div className="rounded-lg bg-green-50 p-2.5">
                <p className="m-0 flex items-center gap-1.5 text-[11px] text-green-800">
                  <span style={matIcon} className="text-[14px]">
                    verified
                  </span>
                  <span>
                    <strong>Verified:</strong> {pincodeInfo.city},{" "}
                    {pincodeInfo.state}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mt-2 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 flex items-center gap-2 text-sm font-bold text-gray-900">
                <span style={matIcon} className="text-[20px] text-pink-600">
                  location_on
                </span>
                Deliver to
              </h3>
              <button
                onClick={() => setStep(1)}
                className="rounded-md border border-pink-500 bg-white px-3 py-1 text-[11px] font-bold text-pink-600"
              >
                Change
              </button>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="m-0 mb-1 text-sm font-bold text-gray-900">
                {formData.fullName}
              </p>
              <p className="m-0 text-xs leading-relaxed text-gray-600">
                {formData.address}, {formData.city}, {formData.state} -{" "}
                {formData.pincode}
              </p>
              <p className="m-0 mt-1 text-xs font-semibold text-gray-700">
                Phone: {formData.phone}
              </p>
            </div>
          </div>

          <div className="mt-2 bg-white p-4">
            <h2 className="m-0 mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
              <span style={matIcon} className="text-[22px] text-pink-600">
                payments
              </span>
              Payment Method
            </h2>

            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${
                  formData.paymentMethod === "Razorpay"
                    ? "border-pink-500 bg-pink-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Razorpay"
                  checked={formData.paymentMethod === "Razorpay"}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 accent-pink-600"
                />
                <div className="flex flex-1 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                    }}
                  >
                    <span style={matIcon} className="text-[22px] text-blue-600">
                      credit_card
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-bold text-gray-900">
                      Pay Online
                    </p>
                    <p className="m-0 text-[11px] text-gray-600">
                      UPI, Cards, NetBanking, Wallets
                    </p>
                  </div>
                  {formData.paymentMethod === "Razorpay" && (
                    <span style={matIcon} className="text-[22px] text-pink-600">
                      check_circle
                    </span>
                  )}
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${
                  formData.paymentMethod === "COD"
                    ? "border-pink-500 bg-pink-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={formData.paymentMethod === "COD"}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 accent-pink-600"
                />
                <div className="flex flex-1 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                    }}
                  >
                    <span
                      style={matIcon}
                      className="text-[22px] text-green-600"
                    >
                      payments
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-bold text-gray-900">
                      Cash on Delivery
                    </p>
                    <p className="m-0 text-[11px] text-gray-600">
                      Pay when your order arrives
                    </p>
                  </div>
                  {formData.paymentMethod === "COD" && (
                    <span style={matIcon} className="text-[22px] text-pink-600">
                      check_circle
                    </span>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 bg-white">
        <div
          className="flex cursor-pointer items-center justify-between px-4 py-3"
          onClick={() =>
            setExpandedSection(expandedSection === "items" ? null : "items")
          }
        >
          <p className="m-0 flex items-center gap-2 text-sm font-bold text-gray-900">
            <span style={matIcon} className="text-[20px] text-pink-600">
              shopping_bag
            </span>
            Order Items ({cart?.items.length})
          </p>
          <span style={matIcon} className="text-[20px] text-gray-500">
            {expandedSection === "items" ? "expand_less" : "expand_more"}
          </span>
        </div>

        {expandedSection === "items" && (
          <div className="border-t border-gray-100">
            {cart?.items.map((item) => (
              <div
                key={`${item.product._id}-${item.size}-${item.color}`}
                className="flex gap-3 border-b border-gray-100 p-3 last:border-b-0"
              >
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  <img
                    src={item.product.images?.[0]}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #831843, #ec4899)",
                    }}
                  >
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="m-0 mb-0.5 text-xs font-semibold text-gray-900"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.product.name}
                  </p>
                  <p className="m-0 text-[10px] text-gray-500">
                    {item.size && `Size: ${item.size}`}
                    {item.size && item.color && " | "}
                    {item.color && `Color: ${item.color}`}
                  </p>
                </div>
                <p className="m-0 shrink-0 text-sm font-bold text-gray-900">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 bg-white p-4">
        <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Price Details
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Subtotal ({cart?.items.length} items)
            </span>
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
            <span className="text-base font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(calcTotal())}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-start gap-2 bg-white px-4 py-3">
        <span style={matIcon} className="mt-0.5 text-[18px] text-gray-500">
          verified_user
        </span>
        <p className="m-0 text-[11px] text-gray-500">
          Safe and secure payments. 100% authentic products. Easy returns within
          7 days.
        </p>
      </div>

      <div
        className="fixed inset-x-0 z-40 border-t border-gray-100 bg-white p-3"
        style={{
          bottom: "56px",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="m-0 text-[11px] text-gray-500">Total Amount</p>
            <p className="m-0 text-lg font-bold text-gray-900">
              {formatPrice(calcTotal())}
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
        {step === 1 ? (
          <button
            onClick={goToPayment}
            disabled={pincodeLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-none py-3 text-sm font-bold text-white shadow-lg disabled:opacity-70"
            style={{
              background:
                "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
            }}
          >
            Continue to Payment
            <span style={matIcon} className="text-[20px]">
              arrow_forward
            </span>
          </button>
        ) : (
          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-none py-3 text-sm font-bold text-white shadow-lg disabled:opacity-70"
            style={{
              background:
                "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
            }}
          >
            {submitting ? (
              <>
                <span
                  className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                  style={{ animation: "co-spin 0.7s linear infinite" }}
                />
                Processing...
              </>
            ) : (
              <>
                <span style={matIcon} className="text-[20px]">
                  lock
                </span>
                Place Order &middot; {formatPrice(calcTotal())}
              </>
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes co-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MobileCheckout;

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { returnsAPI, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";

const ReturnRequest = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [additionalComments, setAdditionalComments] = useState("");
  const [refundMethod, setRefundMethod] = useState("Original Payment Method");
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });
  const [loading, setLoading] = useState(false);

  const returnReasons = [
    "Defective Product",
    "Wrong Item Received",
    "Not as Described",
    "Size/Fit Issue",
    "Changed Mind",
    "Better Price Available",
    "Other",
  ];

  useEffect(() => {
    const fontId = "return-request-fonts";
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
    const orderData = location.state?.order;
    if (!orderData) {
      showToast("No order selected", "error");
      navigate("/my-orders", { replace: true });
      return;
    }

    if (orderData.orderStatus !== "Delivered") {
      showToast("Only delivered orders can be returned", "error");
      navigate("/my-orders", { replace: true });
      return;
    }

    const deliveryDateString =
      orderData.deliveredAt || orderData.updatedAt || orderData.createdAt;

    if (!deliveryDateString) {
      showToast("Order date not found", "error");
      navigate("/my-orders", { replace: true });
      return;
    }

    const deliveryDate = new Date(deliveryDateString);

    if (isNaN(deliveryDate.getTime())) {
      showToast("Invalid order date", "error");
      navigate("/my-orders", { replace: true });
      return;
    }

    const today = new Date();
    const daysSinceDelivery = Math.floor(
      (today - deliveryDate) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDelivery > 7) {
      showToast("Return window has expired (7 days from delivery)", "error");
      navigate("/my-orders", { replace: true });
      return;
    }

    setOrder(orderData);
    setIsValidating(false);
  }, [location.state, navigate]);

  const handleItemSelect = (item, reason) => {
    const productId = item.product._id || item.product;
    const itemIndex = selectedItems.findIndex((i) => i.product === productId);

    if (itemIndex > -1) {
      if (reason) {
        const updated = [...selectedItems];
        updated[itemIndex].reason = reason;
        setSelectedItems(updated);
      } else {
        setSelectedItems(selectedItems.filter((_, i) => i !== itemIndex));
      }
    } else if (reason) {
      setSelectedItems([
        ...selectedItems,
        {
          product: productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          image: item.image,
          reason: reason,
        },
      ]);
    }
  };

  const isItemSelected = (item) => {
    const productId = item.product._id || item.product;
    return selectedItems.some((i) => i.product === productId);
  };

  const getItemReason = (item) => {
    const productId = item.product._id || item.product;
    return selectedItems.find((i) => i.product === productId)?.reason || "";
  };

  const calculateRefundAmount = () => {
    return selectedItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      showToast("Please select at least one item to return", "error");
      return;
    }

    if (refundMethod === "Bank Transfer") {
      if (
        !bankDetails.accountHolderName ||
        !bankDetails.accountNumber ||
        !bankDetails.ifscCode ||
        !bankDetails.bankName
      ) {
        showToast("Please fill all bank details", "error");
        return;
      }
    }

    setLoading(true);

    try {
      const returnData = {
        orderId: order._id,
        items: selectedItems,
        returnReason: selectedItems[0]?.reason || "Other",
        additionalComments,
        refundMethod,
        bankDetails: refundMethod === "Bank Transfer" ? bankDetails : undefined,
      };

      await returnsAPI.create(returnData);
      showToast("Return request submitted successfully", "success");
      navigate("/my-returns", { replace: true });
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error submitting return request",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div
        className="min-h-screen bg-[#f8f9fa] py-8"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="mx-auto max-w-[900px] px-4">
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <div
              className="h-[50px] w-[50px] rounded-full border-4 border-[#e5e7eb] border-t-[#6366f1]"
              style={{ animation: "spin-loader 1s linear infinite" }}
            />
            <p className="text-[1rem] text-[#6b7280]">Loading...</p>
            <style>{`@keyframes spin-loader { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div
      className="min-h-screen bg-[#f8f9fa] py-8 max-md:py-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="mx-auto max-w-[900px] px-4">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/my-orders")}
            className="mb-4 flex cursor-pointer items-center gap-2 border-none bg-transparent text-[1rem] font-normal text-[#6366f1] transition-colors duration-200 hover:text-[#4f46e5]"
          >
            <span>&larr;</span>
            Back to Orders
          </button>
          <h1 className="m-0 mb-2 text-[1.75rem] font-bold text-[#1f2937] max-md:text-[1.5rem]">
            Return Request
          </h1>
          <p className="m-0 text-[0.95rem] text-[#6b7280]">
            Order #{order.orderId}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="rounded-[12px] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] max-md:p-5">
            <h3 className="mb-4 border-b border-[#e5e7eb] pb-3 text-[1.1rem] font-semibold text-[#1f2937] max-[480px]:text-[1rem]">
              1. Select Items to Return
            </h3>

            <div className="flex flex-col gap-4">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-[10px] border-2 p-4 transition-all duration-200 hover:border-[#d1d5db] ${
                    isItemSelected(item)
                      ? "border-[#6366f1] bg-[#f5f3ff]"
                      : "border-[#e5e7eb]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <input
                      type="checkbox"
                      checked={isItemSelected(item)}
                      onChange={(e) =>
                        handleItemSelect(
                          item,
                          e.target.checked ? returnReasons[0] : "",
                        )
                      }
                      className="h-5 w-5 shrink-0 cursor-pointer accent-[#6366f1]"
                    />
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-[70px] w-[70px] shrink-0 rounded-[8px] border border-[#e5e7eb] object-cover max-md:h-[60px] max-md:w-[60px] max-[480px]:h-[50px] max-[480px]:w-[50px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.95rem] font-semibold text-[#1f2937] max-[480px]:text-[0.9rem]">
                        {item.name}
                      </p>
                      <p className="mb-1 text-[0.85rem] text-[#6b7280]">
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && " | "}
                        {item.color && `Color: ${item.color}`}
                      </p>
                      <p className="mb-1 text-[0.85rem] text-[#6b7280]">
                        Qty: {item.quantity}
                      </p>
                      <p className="m-0 text-[0.95rem] font-semibold text-[#059669]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>

                  {isItemSelected(item) && (
                    <div className="mt-4 border-t border-[#e5e7eb] pt-4">
                      <label className="mb-2 block text-[0.85rem] font-medium text-[#374151]">
                        Reason for return:
                      </label>
                      <select
                        value={getItemReason(item)}
                        onChange={(e) => handleItemSelect(item, e.target.value)}
                        required
                        className="w-full cursor-pointer rounded-[8px] border border-[#d1d5db] bg-white px-3 py-[0.6rem] text-[0.9rem] text-[#1f2937] transition-all duration-200 outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                      >
                        {returnReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-0 mt-4">
              <label className="mb-2 block text-[0.9rem] font-medium text-[#374151]">
                Additional Comments (Optional)
              </label>
              <textarea
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                placeholder="Provide additional details about the return..."
                rows={4}
                className="w-full resize-y rounded-[8px] border border-[#d1d5db] bg-white px-4 py-3 text-[0.95rem] text-[#1f2937] transition-all duration-200 outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                style={{ minHeight: "100px" }}
              />
            </div>
          </div>

          <div className="rounded-[12px] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] max-md:p-5">
            <h3 className="mb-4 border-b border-[#e5e7eb] pb-3 text-[1.1rem] font-semibold text-[#1f2937] max-[480px]:text-[1rem]">
              2. Refund Method
            </h3>

            <div className="flex flex-col gap-3">
              {["Original Payment Method", "Bank Transfer"].map((method) => (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-2 p-4 transition-all duration-200 hover:border-[#d1d5db] hover:bg-[#f9fafb] ${
                    refundMethod === method
                      ? "border-[#6366f1] bg-[#f5f3ff]"
                      : "border-[#e5e7eb]"
                  }`}
                >
                  <input
                    type="radio"
                    value={method}
                    checked={refundMethod === method}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="h-[18px] w-[18px] cursor-pointer accent-[#6366f1]"
                  />
                  <span className="text-[0.95rem] font-medium text-[#1f2937]">
                    {method}
                  </span>
                </label>
              ))}
            </div>

            {refundMethod === "Bank Transfer" && (
              <div className="mt-6 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-5 max-[480px]:p-4">
                <h4 className="mb-4 text-[1rem] font-semibold text-[#1f2937]">
                  Bank Account Details
                </h4>
                <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                  <div className="mb-4 last:mb-0">
                    <label className="mb-2 block text-[0.9rem] font-medium text-[#374151]">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountHolderName}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          accountHolderName: e.target.value,
                        })
                      }
                      required
                      className="w-full rounded-[8px] border border-[#d1d5db] bg-white px-4 py-3 text-[0.95rem] text-[#1f2937] transition-all duration-200 outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                    />
                  </div>
                  <div className="mb-4 last:mb-0">
                    <label className="mb-2 block text-[0.9rem] font-medium text-[#374151]">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          accountNumber: e.target.value,
                        })
                      }
                      required
                      className="w-full rounded-[8px] border border-[#d1d5db] bg-white px-4 py-3 text-[0.95rem] text-[#1f2937] transition-all duration-200 outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                    />
                  </div>
                  <div className="mb-4 last:mb-0">
                    <label className="mb-2 block text-[0.9rem] font-medium text-[#374151]">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.ifscCode}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          ifscCode: e.target.value.toUpperCase(),
                        })
                      }
                      required
                      className="w-full rounded-[8px] border border-[#d1d5db] bg-white px-4 py-3 text-[0.95rem] text-[#1f2937] transition-all duration-200 outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                    />
                  </div>
                  <div className="mb-4 last:mb-0">
                    <label className="mb-2 block text-[0.9rem] font-medium text-[#374151]">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          bankName: e.target.value,
                        })
                      }
                      required
                      className="w-full rounded-[8px] border border-[#d1d5db] bg-white px-4 py-3 text-[0.95rem] text-[#1f2937] transition-all duration-200 outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedItems.length > 0 && (
            <div
              className="rounded-[12px] p-6 text-white max-md:p-5"
              style={{
                background:
                  "linear-gradient(135deg, rgba(102,126,234,0.82) 0%, rgba(118,75,162,0.42) 100%)",
              }}
            >
              <h3 className="mb-4 border-b border-white/20 pb-3 text-[1.1rem] font-semibold text-white">
                Refund Summary
              </h3>
              <div className="flex items-center justify-between py-2 text-[0.95rem]">
                <span>Items Selected:</span>
                <span>{selectedItems.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/20 pt-3 text-[1.1rem] font-bold">
                <span>Total Refund Amount:</span>
                <span>{formatPrice(calculateRefundAmount())}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 py-4 max-md:flex-col">
            <button
              type="button"
              onClick={() => navigate("/my-orders")}
              disabled={loading}
              className="cursor-pointer rounded-[10px] border-none bg-[#f3f4f6] px-8 py-[0.85rem] text-[1rem] font-semibold text-[#4b5563] transition-all duration-200 hover:bg-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-60 max-md:w-full max-md:text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer rounded-[10px] border-none px-8 py-[0.85rem] text-[1rem] font-semibold text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0 max-md:w-full max-md:text-center"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              }}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnRequest;

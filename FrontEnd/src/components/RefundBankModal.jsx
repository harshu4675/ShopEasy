import React, { useState } from "react";
import { api, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";

const RefundBankModal = ({ order, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "ifscCode" ? value.toUpperCase() : value,
    }));
  };

  const validateForm = () => {
    if (!formData.accountHolderName.trim()) {
      showToast("Please enter account holder name", "error");
      return false;
    }
    if (!formData.accountNumber.trim()) {
      showToast("Please enter account number", "error");
      return false;
    }
    if (formData.accountNumber !== formData.confirmAccountNumber) {
      showToast("Account numbers do not match", "error");
      return false;
    }
    if (!formData.ifscCode.trim()) {
      showToast("Please enter IFSC code", "error");
      return false;
    }
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(formData.ifscCode)) {
      showToast("Invalid IFSC code format", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.post(
        `/orders/${order._id}/refund-bank-details`,
        formData,
      );
      showToast(
        response.data.message || "Refund request submitted successfully",
        "success",
      );
      onSuccess(response.data.order);
      onClose();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to submit refund request",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-[12px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#eee] px-6 py-6">
          <h2 className="m-0 text-[1.25rem] font-semibold text-[#333]">
            Bank Details for Refund
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent p-0 text-[1.5rem] leading-none text-[#666] transition-colors duration-200 hover:text-[#333]"
          >
            &times;
          </button>
        </div>

        <div className="border-b border-[#eee] bg-[#f8f9fa] px-6 py-4">
          <p className="my-1 text-[0.95rem] text-[#555]">
            Order ID: <strong>#{order.orderId}</strong>
          </p>
          <p className="my-1 text-[0.95rem] text-[#555]">
            Refund Amount:{" "}
            <strong className="text-[1.25rem] text-[#28a745]">
              {formatPrice(order.totalAmount)}
            </strong>
          </p>
          <p className="mt-3 rounded-[6px] bg-[#fff3cd] px-3 py-3 text-[0.875rem] text-[#856404]">
            Your refund will be processed within 5-7 business days after
            verification.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="mb-4">
            <label className="mb-2 block text-[0.875rem] font-medium text-[#333]">
              Account Holder Name *
            </label>
            <input
              type="text"
              name="accountHolderName"
              value={formData.accountHolderName}
              onChange={handleChange}
              placeholder="Enter name as per bank account"
              required
              className="w-full rounded-[8px] border border-[#ddd] px-4 py-3 text-[1rem] outline-none transition-all duration-200 focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[0.875rem] font-medium text-[#333]">
              Account Number *
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="Enter your account number"
              required
              className="w-full rounded-[8px] border border-[#ddd] px-4 py-3 text-[1rem] outline-none transition-all duration-200 focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[0.875rem] font-medium text-[#333]">
              Confirm Account Number *
            </label>
            <input
              type="text"
              name="confirmAccountNumber"
              value={formData.confirmAccountNumber}
              onChange={handleChange}
              placeholder="Re-enter your account number"
              required
              className="w-full rounded-[8px] border border-[#ddd] px-4 py-3 text-[1rem] outline-none transition-all duration-200 focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <div>
              <label className="mb-2 block text-[0.875rem] font-medium text-[#333]">
                IFSC Code *
              </label>
              <input
                type="text"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="e.g., SBIN0001234"
                maxLength={11}
                required
                className="w-full rounded-[8px] border border-[#ddd] px-4 py-3 text-[1rem] outline-none transition-all duration-200 focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[0.875rem] font-medium text-[#333]">
                Bank Name
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g., State Bank of India"
                className="w-full rounded-[8px] border border-[#ddd] px-4 py-3 text-[1rem] outline-none transition-all duration-200 focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[0.875rem] font-medium text-[#333]">
              UPI ID (Optional)
            </label>
            <input
              type="text"
              name="upiId"
              value={formData.upiId}
              onChange={handleChange}
              placeholder="e.g., yourname@upi"
              className="w-full rounded-[8px] border border-[#ddd] px-4 py-3 text-[1rem] outline-none transition-all duration-200 focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
            />
          </div>

          <div className="mt-6 flex gap-4 border-t border-[#eee] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 cursor-pointer rounded-[8px] border border-[#ddd] bg-[#f8f9fa] px-6 py-[0.875rem] text-[1rem] font-medium text-[#666] transition-all duration-200 hover:bg-[#e9ecef] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 cursor-pointer rounded-[8px] border-none bg-[#007bff] px-6 py-[0.875rem] text-[1rem] font-medium text-white transition-all duration-200 hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Refund Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundBankModal;

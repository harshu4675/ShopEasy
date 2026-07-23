import React, { useState, useEffect, useCallback } from "react";
import { api, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const RefundManagement = () => {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [refundForm, setRefundForm] = useState({
    refundTransactionId: "",
    refundNotes: "",
    paymentMethod: "Bank Transfer",
    additionalDetails: "",
    paymentProof: null,
  });
  const [proofPreview, setProofPreview] = useState(null);

  useEffect(() => {
    const fontId = "refund-mgmt-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const fetchRefundRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/orders/admin/refund-requests?status=${filter}`,
      );
      setRefundRequests(response.data);
    } catch (error) {
      showToast("Error fetching refund requests", "error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRefundRequests();
  }, [fetchRefundRequests]);

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size must be less than 5MB", "error");
      return;
    }

    setRefundForm((prev) => ({ ...prev, paymentProof: file }));

    if (file.type.startsWith("image/")) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview("pdf");
    }
  };

  const resetForm = () => {
    setSelectedRefund(null);
    setRefundForm({
      refundTransactionId: "",
      refundNotes: "",
      paymentMethod: "Bank Transfer",
      additionalDetails: "",
      paymentProof: null,
    });
    setProofPreview(null);
  };

  const processRefund = async (orderId) => {
    if (!refundForm.paymentProof) {
      const confirmWithoutProof = window.confirm(
        "You haven't uploaded payment proof. Continue without proof?",
      );
      if (!confirmWithoutProof) return;
    }

    if (!refundForm.refundTransactionId.trim()) {
      showToast("Please enter transaction ID", "error");
      return;
    }

    setProcessingId(orderId);
    try {
      const formData = new FormData();
      formData.append("refundTransactionId", refundForm.refundTransactionId);
      formData.append("refundNotes", refundForm.refundNotes);
      formData.append("paymentMethod", refundForm.paymentMethod);
      formData.append("additionalDetails", refundForm.additionalDetails);
      if (refundForm.paymentProof) {
        formData.append("paymentProof", refundForm.paymentProof);
      }

      await api.put(`/orders/${orderId}/process-refund`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("Refund processed successfully", "success");
      resetForm();
      fetchRefundRequests();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error processing refund",
        "error",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <Loader />;

  return (
    <div
      className="p-6 max-md:p-4"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <h2 className="m-0 flex items-center gap-2 text-2xl font-bold text-gray-900 max-md:text-xl">
          <span style={matIcon} className="text-[28px] text-pink-600">
            account_balance
          </span>
          Refund Management
        </h2>
        <div className="flex gap-2">
          {["all", "pending", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                filter === f
                  ? "border-pink-600 bg-pink-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-pink-600 hover:text-pink-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {refundRequests.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 p-12 text-center">
          <span
            style={matIcon}
            className="mb-4 block text-[64px] text-gray-300"
          >
            credit_card_off
          </span>
          <h3 className="mb-2 text-lg font-semibold text-gray-800">
            No refund requests
          </h3>
          <p className="text-sm text-gray-500">
            All refunds have been processed or no requests yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {refundRequests.map((order) => (
            <div
              key={order._id}
              className={`overflow-hidden rounded-2xl bg-white shadow-md ${
                order.paymentStatus === "Refunded"
                  ? "border-l-4 border-green-500"
                  : "border-l-4 border-amber-500"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4 max-md:flex-col">
                <div>
                  <h3 className="m-0 mb-1 text-base font-bold text-gray-900">
                    Order #{order.orderId}
                  </h3>
                  <p className="m-0 flex items-center gap-1 text-xs text-gray-600">
                    <span style={matIcon} className="text-[14px]">
                      person
                    </span>
                    {order.user?.name || "N/A"} ({order.user?.email || "N/A"})
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                    order.paymentStatus === "Refunded"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <span style={matIcon} className="text-[14px]">
                    {order.paymentStatus === "Refunded"
                      ? "check_circle"
                      : "schedule"}
                  </span>
                  {order.paymentStatus === "Refunded" ? "Refunded" : "Pending"}
                </span>
              </div>

              <div className="p-5 max-md:p-3">
                <div
                  className="mb-4 flex items-center justify-between rounded-xl px-4 py-3 max-md:flex-col max-md:items-start max-md:gap-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                  }}
                >
                  <span className="font-medium text-gray-800">
                    Refund Amount
                  </span>
                  <span className="text-2xl font-bold text-green-700">
                    {formatPrice(
                      order.refundDetails?.refundAmount || order.totalAmount,
                    )}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="mb-3 flex items-center gap-1 text-sm font-bold text-gray-800">
                    <span style={matIcon} className="text-[18px] text-pink-600">
                      account_balance
                    </span>
                    Customer Bank Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
                    {[
                      {
                        label: "Account Holder",
                        value:
                          order.refundDetails?.bankDetails?.accountHolderName,
                      },
                      {
                        label: "Account Number",
                        value: order.refundDetails?.bankDetails?.accountNumber,
                      },
                      {
                        label: "IFSC Code",
                        value: order.refundDetails?.bankDetails?.ifscCode,
                      },
                      order.refundDetails?.bankDetails?.bankName && {
                        label: "Bank Name",
                        value: order.refundDetails.bankDetails.bankName,
                      },
                      order.refundDetails?.bankDetails?.upiId && {
                        label: "UPI ID",
                        value: order.refundDetails.bankDetails.upiId,
                      },
                    ]
                      .filter(Boolean)
                      .map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-gray-50 p-3">
                          <span className="mb-1 block text-[11px] uppercase text-gray-500">
                            {label}
                          </span>
                          <span className="break-all text-sm font-semibold text-gray-900">
                            {value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h4 className="mb-3 flex items-center gap-1 text-sm font-bold text-gray-800">
                    <span style={matIcon} className="text-[18px] text-pink-600">
                      inventory_2
                    </span>
                    Order Details
                  </h4>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p className="m-0">
                      Payment Method: <strong>{order.paymentMethod}</strong>
                    </p>
                    {order.razorpayPaymentId && (
                      <p className="m-0 text-xs">
                        Razorpay ID: <strong>{order.razorpayPaymentId}</strong>
                      </p>
                    )}
                    <p className="m-0 text-xs">
                      Requested on:{" "}
                      {formatDate(order.refundDetails?.refundInitiatedAt)}
                    </p>
                    {order.refundDetails?.refundCompletedAt && (
                      <>
                        <p className="m-0 text-xs">
                          Processed on:{" "}
                          {formatDate(order.refundDetails.refundCompletedAt)}
                        </p>
                        <p className="m-0 text-xs">
                          Method:{" "}
                          <strong>
                            {order.refundDetails.paymentMethod ||
                              "Bank Transfer"}
                          </strong>
                        </p>
                        <p className="m-0 text-xs">
                          Transaction ID:{" "}
                          <strong>
                            {order.refundDetails.refundTransactionId}
                          </strong>
                        </p>
                        {order.refundDetails.refundNotes && (
                          <p className="m-0 mt-2 rounded-lg bg-blue-50 p-2 text-xs">
                            <strong>Notes:</strong>{" "}
                            {order.refundDetails.refundNotes}
                          </p>
                        )}
                        {order.refundDetails.additionalDetails && (
                          <p className="m-0 mt-2 rounded-lg bg-amber-50 p-2 text-xs">
                            <strong>Details:</strong>{" "}
                            {order.refundDetails.additionalDetails}
                          </p>
                        )}
                        {order.refundDetails.paymentProofUrl && (
                          <div className="mt-3">
                            <p className="m-0 mb-2 text-xs font-bold text-gray-700">
                              Payment Proof:
                            </p>
                            <a
                              href={order.refundDetails.paymentProofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white no-underline hover:bg-blue-700"
                            >
                              <span style={matIcon} className="text-[16px]">
                                receipt
                              </span>
                              View Payment Proof
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {order.paymentStatus === "Refund Requested" && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  {selectedRefund === order._id ? (
                    <div className="space-y-3">
                      <h4 className="m-0 flex items-center gap-2 text-sm font-bold text-gray-800">
                        <span
                          style={matIcon}
                          className="text-[18px] text-pink-600"
                        >
                          payments
                        </span>
                        Process Refund
                      </h4>

                      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Payment Method{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={refundForm.paymentMethod}
                            onChange={(e) =>
                              setRefundForm({
                                ...refundForm,
                                paymentMethod: e.target.value,
                              })
                            }
                            className="w-full cursor-pointer rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
                          >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="UPI">UPI</option>
                            <option value="Wallet">Wallet</option>
                            <option value="Original Payment">
                              Original Payment Method
                            </option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Transaction ID{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., UTR/UPI ref number"
                            value={refundForm.refundTransactionId}
                            onChange={(e) =>
                              setRefundForm({
                                ...refundForm,
                                refundTransactionId: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                          Notes (visible to customer)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Refund processed to your bank account"
                          value={refundForm.refundNotes}
                          onChange={(e) =>
                            setRefundForm({
                              ...refundForm,
                              refundNotes: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                          Additional Details (optional)
                        </label>
                        <textarea
                          placeholder="Any additional info about the refund process..."
                          value={refundForm.additionalDetails}
                          onChange={(e) =>
                            setRefundForm({
                              ...refundForm,
                              additionalDetails: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full resize-none rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                          Payment Proof (screenshot/receipt)
                        </label>
                        <label
                          htmlFor={`proof-${order._id}`}
                          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-center transition-all hover:border-pink-500 hover:bg-pink-50"
                        >
                          <span
                            style={matIcon}
                            className="text-[24px] text-pink-500"
                          >
                            {refundForm.paymentProof
                              ? "check_circle"
                              : "cloud_upload"}
                          </span>
                          <p className="m-0 text-xs font-semibold text-gray-800">
                            {refundForm.paymentProof
                              ? refundForm.paymentProof.name
                              : "Click to upload screenshot or receipt"}
                          </p>
                          <p className="m-0 text-[10px] text-gray-500">
                            JPG, PNG, WebP or PDF · Max 5MB
                          </p>
                          <input
                            id={`proof-${order._id}`}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                            onChange={handleProofChange}
                            className="hidden"
                          />
                        </label>

                        {proofPreview && proofPreview !== "pdf" && (
                          <div className="mt-2">
                            <img
                              src={proofPreview}
                              alt="Payment proof preview"
                              className="max-h-40 rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                        {proofPreview === "pdf" && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 p-2">
                            <span
                              style={matIcon}
                              className="text-[20px] text-red-600"
                            >
                              picture_as_pdf
                            </span>
                            <span className="text-xs font-semibold text-red-700">
                              PDF file selected
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={resetForm}
                          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => processRefund(order._id)}
                          disabled={processingId === order._id}
                          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
                          style={{
                            background:
                              "linear-gradient(135deg, #10b981, #059669)",
                          }}
                        >
                          {processingId === order._id ? (
                            <>
                              <span
                                className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                                style={{
                                  animation: "refund-spin 0.7s linear infinite",
                                }}
                              />
                              Processing...
                            </>
                          ) : (
                            <>
                              <span style={matIcon} className="text-[18px]">
                                check_circle
                              </span>
                              Confirm & Mark Refunded
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedRefund(order._id)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border-none px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      style={{
                        background: "linear-gradient(135deg, #831843, #ec4899)",
                      }}
                    >
                      <span style={matIcon} className="text-[18px]">
                        payments
                      </span>
                      Process Refund
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes refund-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RefundManagement;

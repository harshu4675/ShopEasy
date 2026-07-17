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
  });

  useEffect(() => {
    const fontId = "refund-mgmt-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
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

  const processRefund = async (orderId) => {
    if (
      !window.confirm("Are you sure you want to mark this refund as processed?")
    )
      return;

    setProcessingId(orderId);
    try {
      await api.put(`/orders/${orderId}/process-refund`, refundForm);
      showToast("Refund processed successfully", "success");
      setSelectedRefund(null);
      setRefundForm({ refundTransactionId: "", refundNotes: "" });
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
    <div className="p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <h2 className="m-0 flex items-center gap-2 text-[1.5rem] font-bold text-[#333]">
          <span style={matIcon} className="text-[28px] text-[#667eea]">
            account_balance
          </span>
          Refund Management
        </h2>
        <div className="flex gap-2">
          {["all", "pending", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-[6px] border px-4 py-2 text-[14px] font-medium capitalize transition-all duration-200 ${
                filter === f
                  ? "border-[#007bff] bg-[#007bff] text-white"
                  : "border-[#ddd] bg-white text-[#374151] hover:border-[#007bff] hover:text-[#007bff]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {refundRequests.length === 0 ? (
        <div className="rounded-[12px] bg-[#f8f9fa] p-12 text-center">
          <span
            style={matIcon}
            className="mb-4 block text-[3rem] text-[#9ca3af]"
          >
            credit_card_off
          </span>
          <h3 className="mb-2 text-[1.25rem] font-semibold text-[#333]">
            No refund requests
          </h3>
          <p className="text-[#666]">
            All refunds have been processed or no requests yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {refundRequests.map((order) => (
            <div
              key={order._id}
              className={`overflow-hidden rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${
                order.paymentStatus === "Refunded"
                  ? "border-l-4 border-l-[#28a745]"
                  : "border-l-4 border-l-[#ffc107]"
              }`}
            >
              <div className="flex items-start justify-between border-b border-[#eee] bg-[#f8f9fa] px-6 py-4 max-md:flex-col max-md:gap-3">
                <div>
                  <h3 className="mb-1 text-[1rem] font-semibold text-[#333]">
                    Order #{order.orderId}
                  </h3>
                  <p className="m-0 flex items-center gap-1 text-[0.875rem] text-[#666]">
                    <span style={matIcon} className="text-[16px]">
                      person
                    </span>
                    {order.user?.name || "N/A"} ({order.user?.email || "N/A"})
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-[20px] px-3 py-[0.375rem] text-[0.75rem] font-semibold ${
                    order.paymentStatus === "Refunded"
                      ? "bg-[#d4edda] text-[#155724]"
                      : "bg-[#fff3cd] text-[#856404]"
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

              <div className="p-6">
                <div
                  className="mb-4 flex items-center justify-between rounded-[8px] px-4 py-4 max-md:flex-col max-md:items-start max-md:gap-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                  }}
                >
                  <span className="font-medium text-[#333]">Refund Amount</span>
                  <span className="text-[1.5rem] font-bold text-[#28a745]">
                    {formatPrice(
                      order.refundDetails?.refundAmount || order.totalAmount,
                    )}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="mb-3 flex items-center gap-1 text-[0.95rem] font-semibold text-[#333]">
                    <span
                      style={matIcon}
                      className="text-[18px] text-[#667eea]"
                    >
                      account_balance
                    </span>
                    Bank Details
                  </h4>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 max-md:grid-cols-1">
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
                      order.refundDetails?.bankDetails?.bankName
                        ? {
                            label: "Bank Name",
                            value: order.refundDetails.bankDetails.bankName,
                          }
                        : null,
                      order.refundDetails?.bankDetails?.upiId
                        ? {
                            label: "UPI ID",
                            value: order.refundDetails.bankDetails.upiId,
                          }
                        : null,
                    ]
                      .filter(Boolean)
                      .map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-[6px] bg-[#f8f9fa] p-3"
                        >
                          <span className="mb-1 block text-[0.75rem] text-[#666]">
                            {label}
                          </span>
                          <span className="break-all font-semibold text-[#333]">
                            {value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="border-t border-[#eee] pt-4">
                  <h4 className="mb-3 flex items-center gap-1 text-[0.95rem] font-semibold text-[#333]">
                    <span
                      style={matIcon}
                      className="text-[18px] text-[#667eea]"
                    >
                      inventory_2
                    </span>
                    Order Details
                  </h4>
                  <div className="space-y-1">
                    <p className="m-0 text-[0.875rem] text-[#555]">
                      Payment Method: <strong>{order.paymentMethod}</strong>
                    </p>
                    {order.razorpayPaymentId && (
                      <p className="m-0 text-[0.875rem] text-[#555]">
                        Razorpay Payment ID:{" "}
                        <strong>{order.razorpayPaymentId}</strong>
                      </p>
                    )}
                    <p className="m-0 text-[0.875rem] text-[#555]">
                      Requested on:{" "}
                      {formatDate(order.refundDetails?.refundInitiatedAt)}
                    </p>
                    {order.refundDetails?.refundCompletedAt && (
                      <p className="m-0 text-[0.875rem] text-[#555]">
                        Processed on:{" "}
                        {formatDate(order.refundDetails.refundCompletedAt)}
                      </p>
                    )}
                    {order.refundDetails?.refundTransactionId && (
                      <p className="m-0 text-[0.875rem] text-[#555]">
                        Refund Transaction ID:{" "}
                        <strong>
                          {order.refundDetails.refundTransactionId}
                        </strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {order.paymentStatus === "Refund Requested" && (
                <div className="border-t border-[#eee] bg-[#f8f9fa] px-6 py-4">
                  {selectedRefund === order._id ? (
                    <div className="flex flex-wrap items-center gap-3 max-md:flex-col max-md:items-stretch">
                      <input
                        type="text"
                        placeholder="Refund Transaction ID (optional)"
                        value={refundForm.refundTransactionId}
                        onChange={(e) =>
                          setRefundForm({
                            ...refundForm,
                            refundTransactionId: e.target.value,
                          })
                        }
                        className="min-w-[200px] flex-1 rounded-[6px] border border-[#ddd] px-3 py-2 text-[0.875rem] outline-none focus:border-[#007bff] max-md:min-w-full"
                      />
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={refundForm.refundNotes}
                        onChange={(e) =>
                          setRefundForm({
                            ...refundForm,
                            refundNotes: e.target.value,
                          })
                        }
                        className="min-w-[200px] flex-1 rounded-[6px] border border-[#ddd] px-3 py-2 text-[0.875rem] outline-none focus:border-[#007bff] max-md:min-w-full"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedRefund(null);
                            setRefundForm({
                              refundTransactionId: "",
                              refundNotes: "",
                            });
                          }}
                          className="cursor-pointer rounded-[6px] border-none bg-[#6c757d] px-4 py-2 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#545b62]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => processRefund(order._id)}
                          disabled={processingId === order._id}
                          className="cursor-pointer rounded-[6px] border-none bg-[#28a745] px-4 py-2 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#1e7e34] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === order._id
                            ? "Processing..."
                            : "Confirm Refund"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedRefund(order._id)}
                      className="cursor-pointer rounded-[6px] border-none bg-[#007bff] px-4 py-2 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#0056b3]"
                    >
                      Process Refund
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RefundManagement;

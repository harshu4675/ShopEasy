import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { returnsAPI, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";
import Loader from "../components/Loader";

const pageFontStyle = {
  fontFamily: "'Inter', sans-serif",
};

const materialSymbolsStyle = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
};

const MyReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedReturn, setExpandedReturn] = useState(null);

  useEffect(() => {
    const fontId = "my-returns-google-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await returnsAPI.getMyReturns();
      setReturns(response.data);
    } catch (error) {
      showToast("Error fetching returns", "error");
    } finally {
      setLoading(false);
    }
  };

  const cancelReturn = async (returnId) => {
    if (
      !window.confirm("Are you sure you want to cancel this return request?")
    ) {
      return;
    }

    try {
      await returnsAPI.cancel(returnId);
      showToast("Return request cancelled", "success");
      fetchReturns();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error cancelling return",
        "error",
      );
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      Pending: { backgroundColor: "#fef3c7", color: "#d97706" },
      Approved: { backgroundColor: "#d1fae5", color: "#059669" },
      Rejected: { backgroundColor: "#fee2e2", color: "#dc2626" },
      Completed: { backgroundColor: "#dbeafe", color: "#2563eb" },
      "Pickup Scheduled": { backgroundColor: "#ede9fe", color: "#8b5cf6" },
      "Item Received": { backgroundColor: "#cffafe", color: "#06b6d4" },
      "Refund Processing": { backgroundColor: "#d1fae5", color: "#10b981" },
      "Refund Completed": { backgroundColor: "#dcfce7", color: "#22c55e" },
    };

    return styles[status] || { backgroundColor: "#f3f4f6", color: "#6b7280" };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) return <Loader fullScreen />;

  if (returns.length === 0) {
    return (
      <div
        className="min-h-screen bg-[#f8f9fa] py-4 md:py-8"
        style={pageFontStyle}
      >
        <div className="mx-auto max-w-[900px] px-4">
          <div className="rounded-[12px] bg-white px-8 py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <span
              className="mb-4 block text-[4rem] leading-none text-[#1f2937]"
              style={materialSymbolsStyle}
            >
              sync
            </span>
            <h2 className="mb-2 text-[1.5rem] font-semibold text-[#1f2937]">
              No return requests
            </h2>
            <p className="mb-6 text-[#6b7280]">
              You haven't made any return requests yet.
            </p>
            <Link
              to="/my-orders"
              className="inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-8 py-[0.85rem] text-[1rem] font-semibold text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)]"
            >
              View Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f8f9fa] py-4 md:py-8"
      style={pageFontStyle}
    >
      <div className="mx-auto max-w-[900px] px-4">
        <h1 className="mb-2 text-[1.5rem] font-bold text-[#1f2937] md:text-[1.75rem]">
          My Returns & Refunds
        </h1>
        <p className="mb-8 text-[#6b7280]">{returns.length} return requests</p>

        <div className="flex flex-col gap-4">
          {returns.map((returnReq) => (
            <div
              key={returnReq._id}
              className="rounded-[12px] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
            >
              <div
                className="mb-4 flex cursor-pointer flex-col gap-3 border-b border-[#e5e7eb] pb-4 md:flex-row md:items-start md:justify-between md:gap-0"
                onClick={() =>
                  setExpandedReturn(
                    expandedReturn === returnReq._id ? null : returnReq._id,
                  )
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[1rem] font-semibold text-[#1f2937]">
                      Return #{returnReq.returnId}
                    </span>
                    <span
                      className="rounded-[20px] px-[0.85rem] py-[0.35rem] text-[0.8rem] font-semibold uppercase"
                      style={getStatusStyle(returnReq.returnStatus)}
                    >
                      {returnReq.returnStatus}
                    </span>
                  </div>
                  <p className="text-[0.85rem] text-[#6b7280]">
                    Requested on {formatDate(returnReq.createdAt)}
                  </p>
                  <p className="mt-1 text-[0.85rem] text-[#6b7280]">
                    Order: #{returnReq.order?.orderId || "N/A"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1 md:items-end">
                  <p className="text-[0.95rem] font-semibold text-[#059669]">
                    Refund: {formatPrice(returnReq.refundAmount)}
                  </p>
                  <span
                    className="select-none text-[1.5rem] leading-none text-[#6b7280]"
                    style={materialSymbolsStyle}
                  >
                    {expandedReturn === returnReq._id
                      ? "expand_less"
                      : "expand_more"}
                  </span>
                </div>
              </div>

              {expandedReturn === returnReq._id && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <h4 className="mb-4 text-[1rem] font-semibold text-[#1f2937]">
                      Return Items
                    </h4>

                    <div className="flex flex-col gap-4">
                      {returnReq.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-4">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-[70px] w-[70px] shrink-0 rounded-[8px] border border-[#e5e7eb] object-cover max-[480px]:h-[50px] max-[480px]:w-[50px]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="mb-1 truncate text-[0.95rem] font-semibold text-[#1f2937] max-[480px]:text-[0.9rem]">
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
                              <p className="text-[0.85rem] text-[#374151]">
                                <span className="font-semibold">Reason:</span>{" "}
                                {item.reason}
                              </p>
                            </div>
                          </div>

                          <p className="shrink-0 text-[0.95rem] font-semibold text-[#059669] sm:text-right">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                      <h4 className="mb-4 text-[1rem] font-semibold text-[#1f2937]">
                        Return Reason
                      </h4>
                      <p className="text-[0.95rem] text-[#374151]">
                        {returnReq.returnReason}
                      </p>
                      {returnReq.additionalComments && (
                        <p className="mt-3 text-[0.95rem] text-[#374151]">
                          <span className="font-semibold">
                            Additional Comments:
                          </span>{" "}
                          {returnReq.additionalComments}
                        </p>
                      )}
                    </div>

                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                      <h4 className="mb-4 text-[1rem] font-semibold text-[#1f2937]">
                        Refund Information
                      </h4>
                      <div className="space-y-1 text-[0.95rem] text-[#374151]">
                        <p>Method: {returnReq.refundMethod}</p>
                        <p>Amount: {formatPrice(returnReq.refundAmount)}</p>
                      </div>

                      {returnReq.bankDetails && (
                        <div className="mt-3 space-y-1 text-[0.95rem] text-[#374151]">
                          <p>
                            <span className="font-semibold">
                              Account Holder:
                            </span>{" "}
                            {returnReq.bankDetails.accountHolderName}
                          </p>
                          <p>
                            <span className="font-semibold">Account No:</span>{" "}
                            {returnReq.bankDetails.accountNumber}
                          </p>
                          <p>
                            <span className="font-semibold">IFSC:</span>{" "}
                            {returnReq.bankDetails.ifscCode}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {returnReq.rejectionReason && (
                    <div className="rounded-[10px] border border-[#fee2e2] bg-[#fef2f2] p-4">
                      <h4 className="mb-3 text-[1rem] font-semibold text-[#dc2626]">
                        Rejection Reason
                      </h4>
                      <p className="text-[0.95rem] text-[#7f1d1d]">
                        {returnReq.rejectionReason}
                      </p>
                    </div>
                  )}

                  {returnReq.adminNotes && (
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                      <h4 className="mb-3 text-[1rem] font-semibold text-[#1f2937]">
                        Admin Notes
                      </h4>
                      <p className="text-[0.95rem] text-[#374151]">
                        {returnReq.adminNotes}
                      </p>
                    </div>
                  )}

                  {returnReq.timeline && returnReq.timeline.length > 0 && (
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                      <h4 className="mb-4 text-[1rem] font-semibold text-[#1f2937]">
                        Return Timeline
                      </h4>
                      <div className="flex flex-col gap-4">
                        {returnReq.timeline.map((update, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#6366f1]"></div>
                            <div className="min-w-0">
                              <p className="text-[0.95rem] font-semibold text-[#1f2937]">
                                {update.status}
                              </p>
                              {update.description && (
                                <p className="mt-1 text-[0.9rem] text-[#6b7280]">
                                  {update.description}
                                </p>
                              )}
                              <p className="mt-1 text-[0.85rem] text-[#6b7280]">
                                {formatDate(update.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {returnReq.returnStatus === "Pending" && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => cancelReturn(returnReq._id)}
                        className="rounded-[10px] bg-[#dc2626] px-8 py-[0.85rem] text-[1rem] font-semibold text-white transition-all duration-200 hover:bg-[#b91c1c]"
                      >
                        Cancel Return Request
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyReturns;

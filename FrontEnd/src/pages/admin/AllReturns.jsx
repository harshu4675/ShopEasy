import React, { useState, useEffect, useCallback } from "react";
import { returnsAPI, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const AllReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedReturn, setExpandedReturn] = useState(null);

  const fetchReturns = useCallback(async () => {
    try {
      const response = await returnsAPI.getAll();
      setReturns(response.data);
    } catch (error) {
      console.error("Fetch returns error:", error);
      showToast("Error fetching returns", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const updateReturnStatus = async (
    returnId,
    returnStatus,
    additionalData = {},
  ) => {
    try {
      await returnsAPI.updateStatus(returnId, {
        returnStatus,
        ...additionalData,
      });
      showToast(`Return status updated to ${returnStatus}`, "success");
      fetchReturns();
    } catch (error) {
      console.error("Update return status error:", error);
      showToast(
        error.response?.data?.message || "Error updating return",
        "error",
      );
    }
  };

  const handleStatusChange = (returnId, newStatus) => {
    if (newStatus === "Rejected") {
      const reason = prompt("Please enter rejection reason:");
      if (!reason) return;
      updateReturnStatus(returnId, newStatus, { rejectionReason: reason });
    } else {
      updateReturnStatus(returnId, newStatus);
    }
  };

  const addAdminNotes = (returnId) => {
    const notes = prompt("Enter admin notes:");
    if (!notes) return;
    updateReturnStatus(
      returnId,
      returns.find((r) => r._id === returnId).returnStatus,
      { adminNotes: notes },
    );
  };

  const filteredReturns = returns.filter((returnReq) => {
    if (filter === "all") return true;
    return returnReq.returnStatus.toLowerCase().replace(/\s+/g, "-") === filter;
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: "#f59e0b",
      Approved: "#3b82f6",
      Rejected: "#ef4444",
      "Pickup Scheduled": "#8b5cf6",
      "Item Received": "#06b6d4",
      "Refund Processing": "#10b981",
      "Refund Completed": "#22c55e",
    };
    return colors[status] || "#6b7280";
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 md:px-4">
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-5 md:flex-col md:items-start md:gap-4">
          <h1 className="text-[28px] font-bold text-dark md:text-[22px]">
            All Returns & Refunds ({returns.length})
          </h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2.5 mb-6 flex-wrap md:overflow-x-auto md:flex-nowrap md:pb-2.5 md:[&::-webkit-scrollbar]:hidden">
          {[
            "all",
            "pending",
            "approved",
            "rejected",
            "pickup-scheduled",
            "item-received",
            "refund-processing",
            "refund-completed",
          ].map((tab) => (
            <button
              key={tab}
              className={`py-2.5 px-5 border-2 rounded-md font-semibold text-sm cursor-pointer transition-all duration-300 ease-custom whitespace-nowrap md:py-2 md:px-3.5 md:text-[13px] ${
                filter === tab
                  ? "bg-primary border-primary text-white"
                  : "border-gray-200 bg-white hover:border-primary hover:text-primary"
              }`}
              onClick={() => setFilter(tab)}
            >
              {tab
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </button>
          ))}
        </div>

        {filteredReturns.length === 0 ? (
          <div className="text-center py-20 px-5">
            <h3 className="text-[22px] mb-3 text-gray-700">No returns found</h3>
            <p className="text-gray-500 mb-6">
              No return requests match the selected filter
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredReturns.map((returnReq) => (
              <div
                key={returnReq._id}
                className="bg-white rounded-md p-6 shadow-sm"
              >
                {/* Header */}
                <div
                  className="flex justify-between items-start mb-5 pb-5 border-b-2 border-gray-100 cursor-pointer md:flex-col md:gap-4"
                  onClick={() =>
                    setExpandedReturn(
                      expandedReturn === returnReq._id ? null : returnReq._id,
                    )
                  }
                >
                  <div>
                    <h3 className="text-lg m-0 mb-1.5">
                      Return #{returnReq.returnId}
                    </h3>
                    <p className="text-[13px] text-gray-500 m-0">
                      {formatDate(returnReq.createdAt)}
                    </p>
                    <span
                      className="inline-block py-1 px-3 rounded-[50px] text-xs font-semibold text-white mt-2"
                      style={{
                        backgroundColor: getStatusColor(returnReq.returnStatus),
                      }}
                    >
                      {returnReq.returnStatus}
                    </span>
                  </div>
                  <div className="text-right md:text-left">
                    <span className="text-[22px] font-bold text-gray-800 block mb-1.5">
                      Refund: {formatPrice(returnReq.refundAmount)}
                    </span>
                    <p className="text-[13px] text-gray-500 m-0">
                      Order: #{returnReq.order?.orderId || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Customer */}
                <div className="mb-4 text-sm text-gray-600">
                  <p className="my-1">
                    <strong>👤 {returnReq.user?.name || "N/A"}</strong>
                  </p>
                  <p className="my-1">📧 {returnReq.user?.email || "N/A"}</p>
                  <p className="my-1">
                    📱 {returnReq.pickupAddress?.phone || "N/A"}
                  </p>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <p className="text-sm">
                    <strong>Reason:</strong> {returnReq.returnReason}
                  </p>
                  {returnReq.additionalComments && (
                    <p className="text-sm text-gray-500">
                      {returnReq.additionalComments}
                    </p>
                  )}
                </div>

                {/* Items Preview */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {returnReq.items.slice(0, 4).map((item, index) => (
                    <div
                      key={index}
                      className="relative w-[50px] h-[50px] rounded-sm overflow-hidden"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute -top-1 -right-1 bg-primary text-white w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                  ))}
                  {returnReq.items.length > 4 && (
                    <div className="w-[50px] h-[50px] flex items-center justify-center bg-gray-200 text-gray-600 text-xs font-semibold rounded-sm">
                      +{returnReq.items.length - 4}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedReturn === returnReq._id && (
                  <div className="border-t-2 border-gray-100 pt-5">
                    {/* Full Items */}
                    <div className="mb-5">
                      <h4 className="mb-3">Return Items</h4>
                      {returnReq.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex gap-4 p-4 bg-gray-100 rounded-lg items-center mb-3"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="font-semibold m-0 mb-1">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500 my-1">
                              {item.size && `Size: ${item.size}`}
                              {item.size && item.color && " | "}
                              {item.color && `Color: ${item.color}`}
                            </p>
                            <p className="text-sm text-gray-600 my-1">
                              Qty: {item.quantity}
                            </p>
                            <p className="text-sm my-1">
                              <strong>Reason:</strong> {item.reason}
                            </p>
                          </div>
                          <p className="font-bold text-gray-800">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-5 md:grid-cols-1">
                      <div>
                        <h4 className="mb-3">📍 Pickup Address</h4>
                        <p className="text-sm my-1">
                          {returnReq.pickupAddress?.fullName}
                        </p>
                        <p className="text-sm my-1">
                          {returnReq.pickupAddress?.address}
                        </p>
                        <p className="text-sm my-1">
                          {returnReq.pickupAddress?.city},{" "}
                          {returnReq.pickupAddress?.state} -{" "}
                          {returnReq.pickupAddress?.pincode}
                        </p>
                        <p className="text-sm my-1">
                          Phone: {returnReq.pickupAddress?.phone}
                        </p>
                      </div>
                      <div>
                        <h4 className="mb-3">💳 Refund Method</h4>
                        <p className="text-sm">{returnReq.refundMethod}</p>
                        {returnReq.bankDetails && (
                          <div className="mt-2 text-sm">
                            <p className="my-1">
                              <strong>A/C Holder:</strong>{" "}
                              {returnReq.bankDetails.accountHolderName}
                            </p>
                            <p className="my-1">
                              <strong>A/C No:</strong>{" "}
                              {returnReq.bankDetails.accountNumber}
                            </p>
                            <p className="my-1">
                              <strong>IFSC:</strong>{" "}
                              {returnReq.bankDetails.ifscCode}
                            </p>
                            <p className="my-1">
                              <strong>Bank:</strong>{" "}
                              {returnReq.bankDetails.bankName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {returnReq.adminNotes && (
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <h4 className="mb-2">📝 Admin Notes</h4>
                        <p className="text-sm">{returnReq.adminNotes}</p>
                      </div>
                    )}

                    {returnReq.rejectionReason && (
                      <div className="bg-red-50 p-4 rounded-lg mb-4">
                        <h4 className="mb-2">❌ Rejection Reason</h4>
                        <p className="text-sm">{returnReq.rejectionReason}</p>
                      </div>
                    )}

                    {returnReq.timeline && returnReq.timeline.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-3">📋 Return Timeline</h4>
                        <div className="relative pl-8 timeline-line">
                          {returnReq.timeline.map((update, index) => (
                            <div
                              key={index}
                              className="relative pb-6 last:pb-0"
                            >
                              <div
                                className={`absolute -left-8 w-3 h-3 rounded-full border-[3px] border-white ${index === 0 ? "bg-[#28a745] shadow-[0_0_0_2px_#28a745]" : "bg-[#007bff] shadow-[0_0_0_2px_#007bff]"}`}
                              ></div>
                              <div className="bg-gray-100 py-3 px-4 rounded-lg">
                                <p className="font-semibold text-gray-800 m-0 mb-1">
                                  {update.status}
                                </p>
                                {update.description && (
                                  <p className="text-gray-600 text-sm my-1">
                                    {update.description}
                                  </p>
                                )}
                                <p className="text-gray-400 text-[0.75rem] mt-1 mb-0">
                                  {formatDate(update.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Controls */}
                <div className="flex gap-5 flex-wrap items-end pt-4 border-t-2 border-gray-100 md:flex-col">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      Return Status:
                    </label>
                    <select
                      value={returnReq.returnStatus}
                      onChange={(e) =>
                        handleStatusChange(returnReq._id, e.target.value)
                      }
                      className="py-2.5 px-4 border-2 border-gray-200 rounded-sm text-sm font-medium cursor-pointer min-w-[180px] focus:outline-none focus:border-primary md:w-full"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Pickup Scheduled">Pickup Scheduled</option>
                      <option value="Item Received">Item Received</option>
                      <option value="Refund Processing">
                        Refund Processing
                      </option>
                      <option value="Refund Completed">Refund Completed</option>
                    </select>
                  </div>
                  <button
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-2 border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap hover:border-primary hover:text-primary"
                    onClick={() => addAdminNotes(returnReq._id)}
                  >
                    Add Notes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllReturns;

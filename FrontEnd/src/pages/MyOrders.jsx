import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";
import Loader from "../components/Loader";
import RefundBankModal from "../components/RefundBankModal";

const MyOrders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders/my-orders");
      setOrders(response.data);
    } catch (error) {
      showToast("Error fetching orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    setCancellingId(orderId);
    try {
      const response = await api.put(`/orders/${orderId}/cancel`);

      if (response.data.requiresBankDetails) {
        setSelectedOrderForRefund(response.data.order);
        setShowRefundModal(true);
        showToast(
          "Order cancelled. Please submit bank details for refund.",
          "info",
        );
      } else {
        showToast("Order cancelled successfully", "success");
      }

      fetchOrders();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error cancelling order",
        "error",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleRefundSuccess = (updatedOrder) => {
    setOrders(
      orders.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)),
    );
    setShowRefundModal(false);
    setSelectedOrderForRefund(null);
    fetchOrders();
  };

  const needsRefundDetails = (order) => {
    return (
      order.orderStatus === "Cancelled" &&
      order.paymentStatus === "Paid" &&
      !order.refundDetails?.bankDetails
    );
  };

  const getStatusClasses = (status) => {
    const map = {
      Placed: "bg-[#fff3e0] text-[#e65100]",
      Confirmed: "bg-[#e3f2fd] text-[#1565c0]",
      Processing: "bg-[#e3f2fd] text-[#1565c0]",
      Shipped: "bg-[#e8eaf6] text-[#3949ab]",
      "Out for Delivery": "bg-[#e8eaf6] text-[#3949ab]",
      Delivered: "bg-[#e8f5e9] text-[#2e7d32]",
      Cancelled: "bg-[#ffebee] text-[#c62828]",
      Returned: "bg-[#ffebee] text-[#c62828]",
    };
    return map[status] || "bg-[#fff3e0] text-[#e65100]";
  };

  const getPaymentStatusClasses = (status) => {
    const map = {
      Pending: "bg-[#fff3cd] text-[#856404]",
      Paid: "bg-[#d4edda] text-[#155724]",
      Failed: "bg-[#f8d7da] text-[#721c24]",
      "Refund Requested": "bg-[#d1ecf1] text-[#0c5460]",
      Refunded: "bg-[#e2d9f3] text-[#6f42c1]",
    };
    return map[status] || "bg-[#fff3cd] text-[#856404]";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const canReturn = (order) => {
    if (order.orderStatus !== "Delivered")
      return { allowed: false, reason: "Order not delivered" };

    const deliveryDate = new Date(order.deliveredAt || order.updatedAt);
    const today = new Date();
    const daysSinceDelivery = Math.floor(
      (today - deliveryDate) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDelivery > 7) {
      return {
        allowed: false,
        reason: `Return window expired (${daysSinceDelivery} days since delivery)`,
      };
    }

    return {
      allowed: true,
      daysLeft: 7 - daysSinceDelivery,
    };
  };

  const initiateReturn = (order) => {
    const returnCheck = canReturn(order);

    if (!returnCheck.allowed) {
      showToast(returnCheck.reason, "error");
      return;
    }

    navigate("/return-request", { state: { order } });
  };

  if (loading) return <Loader fullScreen />;

  if (orders.length === 0) {
    return (
      <div className="font-inter py-10 min-h-[calc(100vh-200px)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center text-center py-20">
            <span className="text-6xl mb-4">[ ]</span>
            <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">
              You haven't placed any orders. Start shopping now!
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 no-underline whitespace-nowrap bg-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:-translate-y-0.5"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-inter py-10 min-h-[calc(100vh-200px)]">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-[32px] font-bold mb-2 max-md:text-[26px]">
          My Orders
        </h1>
        <p className="text-gray-500 mb-[30px]">{orders.length} orders placed</p>

        <div className="flex flex-col gap-5">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <div
                className="flex justify-between items-center p-6 cursor-pointer transition-all duration-200 hover:bg-gray-50 max-md:flex-col max-md:items-start max-md:gap-4"
                onClick={() =>
                  setExpandedOrder(
                    expandedOrder === order._id ? null : order._id,
                  )
                }
              >
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-bold text-base text-gray-800">
                      Order #{order.orderId}
                    </span>
                    <span
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${getStatusClasses(order.orderStatus)}`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 m-0">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-5 max-md:w-full max-md:justify-between">
                  <p className="text-xl font-bold text-gray-900 m-0">
                    {formatPrice(order.totalAmount)}
                  </p>
                  <span className="text-gray-400 text-xs">
                    {expandedOrder === order._id ? "\u25B2" : "\u25BC"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 px-6 pb-6">
                {order.items.slice(0, 3).map((item, index) => (
                  <div
                    key={index}
                    className="w-[60px] h-[60px] rounded overflow-hidden bg-gray-100"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="w-[60px] h-[60px] rounded bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">
                    +{order.items.length - 3}
                  </div>
                )}
              </div>

              {order.paymentStatus === "Refund Requested" && (
                <div className="flex items-center gap-2 py-3 px-4 mx-4 my-2 rounded-lg text-sm font-medium bg-[#fff3cd] text-[#856404] border border-[#ffc107]">
                  Refund of {formatPrice(order.totalAmount)} is being processed
                </div>
              )}
              {order.paymentStatus === "Refunded" && (
                <div className="flex items-center gap-2 py-3 px-4 mx-4 my-2 rounded-lg text-sm font-medium bg-[#d4edda] text-[#155724] border border-[#28a745]">
                  Refund of {formatPrice(order.totalAmount)} has been processed
                  {order.refundDetails?.refundTransactionId && (
                    <span className="text-xs opacity-80">
                      | Txn ID: {order.refundDetails.refundTransactionId}
                    </span>
                  )}
                </div>
              )}

              {needsRefundDetails(order) && (
                <div className="flex justify-between items-center py-3 px-4 mx-4 my-2 bg-gradient-to-br from-[#fff3cd] to-[#ffeeba] border border-[#ffc107] rounded-lg text-sm text-[#856404] gap-4 max-[576px]:flex-col max-[576px]:text-center">
                  <span className="flex-1">
                    Your order was paid. Submit bank details to receive refund.
                  </span>
                  <button
                    className="inline-flex items-center justify-center gap-2 py-1.5 px-3 text-sm font-medium rounded-md border-none cursor-pointer transition-all duration-200 whitespace-nowrap bg-gradient-to-br from-[#ffc107] to-[#e0a800] text-[#212529] hover:bg-gradient-to-br hover:from-[#e0a800] hover:to-[#c69500] hover:-translate-y-px"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrderForRefund(order);
                      setShowRefundModal(true);
                    }}
                  >
                    Submit Bank Details
                  </button>
                </div>
              )}

              {expandedOrder === order._id && (
                <div className="border-t-2 border-gray-100 p-6 animate-slideDown">
                  <div className="mb-6">
                    <h4 className="text-base mb-4 text-gray-700">
                      Items in this order
                    </h4>
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex gap-4 p-3.5 bg-gray-100 rounded mb-2.5"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-[70px] h-[80px] object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-[15px] text-gray-800 m-0 mb-1.5">
                            {item.name}
                          </p>
                          <p className="text-[13px] text-gray-500 m-0 mb-1">
                            {item.size && `Size: ${item.size}`}
                            {item.size && item.color && " | "}
                            {item.color && `Color: ${item.color}`}
                          </p>
                          <p className="text-[13px] text-gray-600 m-0">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-bold text-[15px] text-gray-800 m-0">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mb-6 max-md:grid-cols-1">
                    <div>
                      <h4 className="text-sm text-gray-500 mb-3">
                        Shipping Address
                      </h4>
                      <p className="text-sm text-gray-700 my-1">
                        {order.shippingAddress.fullName}
                      </p>
                      <p className="text-sm text-gray-700 my-1">
                        {order.shippingAddress.address}
                      </p>
                      <p className="text-sm text-gray-700 my-1">
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.state} -{" "}
                        {order.shippingAddress.pincode}
                      </p>
                      <p className="text-sm text-gray-700 my-1">
                        Phone: {order.shippingAddress.phone}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm text-gray-500 mb-3">Payment</h4>
                      <p className="text-sm text-gray-700 my-1">
                        Method: {order.paymentMethod}
                      </p>
                      <p className="text-sm text-gray-700 my-1">
                        Status:{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getPaymentStatusClasses(order.paymentStatus)}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </p>
                      {order.razorpayPaymentId && (
                        <p className="text-xs text-gray-500 mt-1 break-all">
                          Payment ID: {order.razorpayPaymentId}
                        </p>
                      )}
                    </div>

                    {order.expectedDelivery &&
                      order.orderStatus !== "Delivered" &&
                      order.orderStatus !== "Cancelled" && (
                        <div>
                          <h4 className="text-sm text-gray-500 mb-3">
                            Expected Delivery
                          </h4>
                          <p className="text-sm text-gray-700 my-1">
                            {formatDate(order.expectedDelivery)}
                          </p>
                        </div>
                      )}

                    {order.refundDetails?.bankDetails && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm text-gray-800 mb-3 font-semibold">
                          Refund Details
                        </h4>
                        <p className="text-sm text-gray-600 my-1">
                          Amount:{" "}
                          {formatPrice(order.refundDetails.refundAmount)}
                        </p>
                        <p className="text-sm text-gray-600 my-1">
                          Status: {order.paymentStatus}
                        </p>
                        {order.refundDetails.refundCompletedAt && (
                          <p className="text-sm text-gray-600 my-1">
                            Processed on:{" "}
                            {formatDate(order.refundDetails.refundCompletedAt)}
                          </p>
                        )}
                        {order.refundDetails.refundTransactionId && (
                          <p className="text-sm text-gray-600 my-1">
                            Transaction ID:{" "}
                            {order.refundDetails.refundTransactionId}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {order.deliveryUpdates &&
                    order.deliveryUpdates.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-base mb-4 text-gray-700">
                          Order Timeline
                        </h4>
                        <div className="relative pl-[30px] before:content-[''] before:absolute before:left-[8px] before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-300">
                          {order.deliveryUpdates.map((update, index) => (
                            <div
                              key={index}
                              className={`relative ${index === order.deliveryUpdates.length - 1 ? "pb-0" : "pb-5"}`}
                            >
                              <div className="absolute -left-[26px] top-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-[3px] border-white shadow-[0_0_0_2px_#2563eb]"></div>
                              <div>
                                <p className="font-semibold text-gray-800 m-0 mb-1">
                                  {update.status}
                                </p>
                                {update.description && (
                                  <p className="text-sm text-gray-600 m-0 mb-1">
                                    {update.description}
                                  </p>
                                )}
                                {update.location && (
                                  <p className="text-[13px] text-gray-500 m-0 mb-1">
                                    {update.location}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 m-0">
                                  {formatDate(update.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="bg-gray-100 p-5 rounded-lg mb-5">
                    <div className="flex justify-between py-2 text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between py-2 text-sm text-green-600 font-semibold">
                        <span>Discount</span>
                        <span>-{formatPrice(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 text-sm text-gray-600">
                      <span>Delivery</span>
                      <span>
                        {order.deliveryCharge === 0
                          ? "FREE"
                          : formatPrice(order.deliveryCharge)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2.5 pt-4 border-t-2 border-gray-300 text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t-2 border-gray-100 max-md:flex-col max-[576px]:flex-col">
                    {["Placed", "Confirmed", "Processing"].includes(
                      order.orderStatus,
                    ) && (
                      <button
                        onClick={() => cancelOrder(order._id)}
                        className="inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 whitespace-nowrap bg-gradient-to-br from-[#dc3545] to-[#c82333] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:bg-gradient-to-br hover:from-[#c82333] hover:to-[#a71d2a] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none max-md:w-full max-md:justify-center max-md:py-3.5 max-md:min-h-[48px]"
                        disabled={cancellingId === order._id}
                      >
                        {cancellingId === order._id
                          ? "Cancelling..."
                          : "Cancel Order"}
                      </button>
                    )}

                    {needsRefundDetails(order) && (
                      <button
                        onClick={() => {
                          setSelectedOrderForRefund(order);
                          setShowRefundModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 whitespace-nowrap bg-gradient-to-br from-[#ffc107] to-[#e0a800] text-[#212529] shadow-[0_4px_12px_rgba(245,158,11,0.3)] hover:bg-gradient-to-br hover:from-[#e0a800] hover:to-[#c69500] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none max-md:w-full max-md:justify-center max-md:py-3.5 max-md:min-h-[48px]"
                      >
                        Submit Bank Details for Refund
                      </button>
                    )}

                    {order.orderStatus === "Delivered" &&
                      order.paymentStatus !== "Refunded" &&
                      (() => {
                        const returnCheck = canReturn(order);
                        return returnCheck.allowed ? (
                          <div className="flex items-center gap-3 max-[576px]:flex-col max-[576px]:items-start">
                            <button
                              onClick={() => initiateReturn(order)}
                              className="inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 whitespace-nowrap bg-gradient-to-br from-[#ffc107] to-[#e0a800] text-[#212529] shadow-[0_4px_12px_rgba(245,158,11,0.3)] hover:bg-gradient-to-br hover:from-[#e0a800] hover:to-[#c69500] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 max-md:w-full max-md:justify-center max-md:py-3.5 max-md:min-h-[48px]"
                            >
                              Request Return
                            </button>
                            <span className="text-xs text-[#28a745] bg-[#d4edda] px-2 py-1 rounded font-semibold">
                              {returnCheck.daysLeft} days left to return
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="bg-gray-200 text-gray-500 py-3 px-6 rounded-lg text-sm font-semibold cursor-not-allowed">
                              Return Window Closed
                            </span>
                            <span className="text-xs text-gray-500">
                              Returns allowed within 7 days of delivery only
                            </span>
                          </div>
                        );
                      })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showRefundModal && selectedOrderForRefund && (
        <RefundBankModal
          order={selectedOrderForRefund}
          onClose={() => {
            setShowRefundModal(false);
            setSelectedOrderForRefund(null);
          }}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  );
};

export default MyOrders;

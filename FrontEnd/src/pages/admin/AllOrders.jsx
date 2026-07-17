import React, { useState, useEffect } from "react";
import { api, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterPayment, searchTerm]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterPayment !== "all")
        params.append("paymentStatus", filterPayment);
      if (searchTerm) params.append("search", searchTerm);
      const response = await api.get(`/orders/admin/all?${params.toString()}`);
      setOrders(response.data);
    } catch (error) {
      showToast("Error fetching orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { orderStatus: newStatus });
      showToast("Order status updated successfully", "success");
      fetchOrders();
    } catch (error) {
      showToast("Error updating order status", "error");
    }
  };

  const updatePaymentStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/payment-status`, {
        paymentStatus: newStatus,
      });
      showToast("Payment status updated successfully", "success");
      fetchOrders();
    } catch (error) {
      showToast("Error updating payment status", "error");
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
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

  const getPaymentStatusClass = (status) => {
    const classes = {
      Pending: "bg-[#fff3cd] text-[#856404] border-[#ffeaa7]",
      Paid: "bg-[#d4edda] text-[#155724] border-[#c3e6cb]",
      Failed: "bg-[#f8d7da] text-[#721c24] border-[#f5c6cb]",
      "Refund Requested": "bg-[#d1ecf1] text-[#0c5460] border-[#bee5eb]",
      Refunded: "bg-[#e2d9f3] text-[#6f42c1] border-[#d4c5e8]",
    };
    return classes[status] || "";
  };

  const getOrderStatusClass = (status) => {
    const classes = {
      Placed: "bg-[#d1ecf1] text-[#0c5460] border-[#bee5eb]",
      Confirmed: "bg-[#cce5ff] text-[#004085] border-[#b8daff]",
      Processing: "bg-[#fff3cd] text-[#856404] border-[#ffeaa7]",
      Shipped: "bg-[#d1ecf1] text-[#0c5460] border-[#bee5eb]",
      "Out for Delivery": "bg-[#d1ecf1] text-[#0c5460] border-[#bee5eb]",
      Delivered: "bg-[#d4edda] text-[#155724] border-[#c3e6cb]",
      Cancelled: "bg-[#f8d7da] text-[#721c24] border-[#f5c6cb]",
      Returned: "bg-[#f8d7da] text-[#721c24] border-[#f5c6cb]",
    };
    return classes[status] || "";
  };

  const getOrderStatusBadgeClass = (status) => {
    const classes = {
      Placed: "bg-[#d1ecf1] text-[#0c5460]",
      Confirmed: "bg-[#cce5ff] text-[#004085]",
      Processing: "bg-[#fff3cd] text-[#856404]",
      Shipped: "bg-[#d1ecf1] text-[#0c5460]",
      "Out for Delivery": "bg-[#d1ecf1] text-[#0c5460]",
      Delivered: "bg-[#d4edda] text-[#155724]",
      Cancelled: "bg-[#f8d7da] text-[#721c24]",
      Returned: "bg-[#f8d7da] text-[#721c24]",
    };
    return classes[status] || "";
  };

  const getPaymentBadgeClass = (status) => {
    const classes = {
      Pending: "bg-[#fff3cd] text-[#856404]",
      Paid: "bg-[#d4edda] text-[#155724]",
      Failed: "bg-[#f8d7da] text-[#721c24]",
      "Refund Requested": "bg-[#d1ecf1] text-[#0c5460]",
      Refunded: "bg-[#e2d9f3] text-[#6f42c1]",
    };
    return classes[status] || "";
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 md:px-4">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-5 md:flex-col md:items-start md:gap-4">
          <h1 className="text-[28px] font-bold text-dark md:text-[22px]">
            All Orders
          </h1>
          <p>{orders.length} total orders</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-md mb-6 shadow-sm">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 md:grid-cols-1">
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Order Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="Placed">Placed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Returned">Returned</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Payment Status
              </label>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
              >
                <option value="all">All Payments</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Refund Requested">Refund Requested</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by Order ID, Name, Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-md shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {[
                  "Order ID",
                  "Customer",
                  "Date",
                  "Items",
                  "Total",
                  "Payment Method",
                  "Payment Status",
                  "Order Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="py-4 px-5 text-left border-b border-gray-200 bg-gray-100 text-xs font-bold text-gray-600 uppercase tracking-[0.5px]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="py-4 px-5 text-center text-gray-500"
                  >
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-100">
                    <td className="py-4 px-5 border-b border-gray-200">
                      <strong>#{order.orderId}</strong>
                      {order.razorpayPaymentId && (
                        <div className="mt-1">
                          <small className="text-[0.7rem] text-gray-600 bg-[#f0f0f0] py-[0.15rem] px-[0.4rem] rounded">
                            💳 {order.razorpayPaymentId.slice(0, 15)}...
                          </small>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200">
                      <div className="flex flex-col gap-[0.15rem]">
                        <strong className="text-gray-800">
                          {order.user?.name || "N/A"}
                        </strong>
                        <small className="text-gray-600 text-[0.75rem]">
                          {order.user?.email || "N/A"}
                        </small>
                        <small className="text-gray-600 text-[0.75rem]">
                          {order.shippingAddress?.phone}
                        </small>
                      </div>
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200 text-sm">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200 text-sm">
                      {order.items?.length || 0}
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200">
                      <strong>{formatPrice(order.totalAmount)}</strong>
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200">
                      <span className="bg-[#e3f2fd] text-[#1976d2] py-1 px-2 rounded text-[0.75rem] font-semibold">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200">
                      <select
                        className={`py-[0.375rem] px-3 border rounded-md text-sm font-semibold cursor-pointer transition-all duration-200 ${getPaymentStatusClass(order.paymentStatus)} disabled:opacity-60 disabled:cursor-not-allowed`}
                        value={order.paymentStatus}
                        onChange={(e) =>
                          updatePaymentStatus(order._id, e.target.value)
                        }
                        disabled={order.paymentStatus === "Refunded"}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Failed">Failed</option>
                        <option value="Refund Requested">
                          Refund Requested
                        </option>
                        <option value="Refunded">Refunded</option>
                      </select>
                      {order.paymentStatus === "Refund Requested" && (
                        <div className="mt-1">
                          <small className="text-warning font-medium">
                            ⚠️ Bank details submitted
                          </small>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200">
                      <select
                        className={`py-[0.375rem] px-3 border rounded-md text-sm font-semibold cursor-pointer transition-all duration-200 ${getOrderStatusClass(order.orderStatus)}`}
                        value={order.orderStatus}
                        onChange={(e) =>
                          updateOrderStatus(order._id, e.target.value)
                        }
                      >
                        <option value="Placed">Placed</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">
                          Out for Delivery
                        </option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Returned">Returned</option>
                      </select>
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200">
                      <button
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover"
                        onClick={() => viewOrderDetails(order)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-5 animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-[900px] w-full max-h-[90vh] overflow-y-auto animate-slideUp md:mx-2.5 md:max-h-[calc(100vh-20px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b-2 border-gray-100">
              <h2 className="text-[22px] m-0">
                Order Details - #{selectedOrder.orderId}
              </h2>
              <button
                className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 p-1 transition-all duration-300 ease-custom hover:text-gray-800"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Order Status Section */}
              <div className="bg-white p-6 rounded-lg mb-4 border border-[#e0e0e0]">
                <h3 className="m-0 mb-4 text-gray-800 text-[1.1rem] border-b-2 border-[#f0f0f0] pb-2">
                  📦 Order Status
                </h3>
                <div className="flex gap-2 mb-4 flex-wrap md:flex-col">
                  <span
                    className={`py-2 px-4 rounded-[20px] font-semibold text-sm ${getOrderStatusBadgeClass(selectedOrder.orderStatus)}`}
                  >
                    {selectedOrder.orderStatus}
                  </span>
                  <span
                    className={`py-2 px-4 rounded-[20px] font-semibold text-sm ${getPaymentBadgeClass(selectedOrder.paymentStatus)}`}
                  >
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
                <p className="my-2 text-gray-600">
                  <strong className="text-gray-800 mr-2">
                    Payment Method:
                  </strong>
                  {selectedOrder.paymentMethod}
                </p>
                {selectedOrder.razorpayPaymentId && (
                  <p className="my-2 text-gray-600">
                    <strong className="text-gray-800 mr-2">
                      Razorpay Payment ID:
                    </strong>
                    {selectedOrder.razorpayPaymentId}
                  </p>
                )}
                {selectedOrder.razorpayOrderId && (
                  <p className="my-2 text-gray-600">
                    <strong className="text-gray-800 mr-2">
                      Razorpay Order ID:
                    </strong>
                    {selectedOrder.razorpayOrderId}
                  </p>
                )}
                <p className="my-2 text-gray-600">
                  <strong className="text-gray-800 mr-2">Order Date:</strong>
                  {formatDate(selectedOrder.createdAt)}
                </p>
              </div>

              {/* Refund Bank Details */}
              {selectedOrder.refundDetails?.bankDetails && (
                <div className="refund-bank-gradient border-2 border-[#ffc107] rounded-md p-6 mb-4">
                  <h3 className="m-0 mb-4 text-[#856404] text-[1.1rem] border-b-2 border-[#f0f0f0] pb-2">
                    🏦 Refund Bank Details
                  </h3>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-4 md:grid-cols-1">
                    <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                      <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                        Account Holder Name:
                      </span>
                      <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                        {
                          selectedOrder.refundDetails.bankDetails
                            .accountHolderName
                        }
                      </span>
                    </div>
                    <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                      <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                        Account Number:
                      </span>
                      <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                        {selectedOrder.refundDetails.bankDetails.accountNumber}
                      </span>
                    </div>
                    <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                      <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                        IFSC Code:
                      </span>
                      <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                        {selectedOrder.refundDetails.bankDetails.ifscCode}
                      </span>
                    </div>
                    {selectedOrder.refundDetails.bankDetails.bankName && (
                      <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                        <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                          Bank Name:
                        </span>
                        <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                          {selectedOrder.refundDetails.bankDetails.bankName}
                        </span>
                      </div>
                    )}
                    {selectedOrder.refundDetails.bankDetails.upiId && (
                      <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                        <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                          UPI ID:
                        </span>
                        <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                          {selectedOrder.refundDetails.bankDetails.upiId}
                        </span>
                      </div>
                    )}
                    <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                      <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                        Refund Amount:
                      </span>
                      <span className="block text-[1.25rem] text-[#28a745] font-semibold break-all">
                        {formatPrice(selectedOrder.refundDetails.refundAmount)}
                      </span>
                    </div>
                    <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                      <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                        Requested On:
                      </span>
                      <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                        {formatDate(
                          selectedOrder.refundDetails.refundInitiatedAt,
                        )}
                      </span>
                    </div>
                    {selectedOrder.refundDetails.refundCompletedAt && (
                      <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                        <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                          Refund Completed:
                        </span>
                        <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                          {formatDate(
                            selectedOrder.refundDetails.refundCompletedAt,
                          )}
                        </span>
                      </div>
                    )}
                    {selectedOrder.refundDetails.refundTransactionId && (
                      <div className="bg-white py-3 px-4 rounded-lg border-l-[3px] border-[#ffc107]">
                        <span className="block text-[0.75rem] text-gray-600 mb-1 font-medium">
                          Transaction ID:
                        </span>
                        <span className="block text-[0.95rem] text-gray-800 font-semibold break-all">
                          {selectedOrder.refundDetails.refundTransactionId}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedOrder.paymentStatus === "Refund Requested" && (
                    <div className="mt-4 pt-4 border-t border-[#ffc107] text-center">
                      <button
                        className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-none rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-success text-white hover:bg-[#388e3c] hover:-translate-y-0.5"
                        onClick={() => {
                          window.location.href = `/admin/refunds`;
                        }}
                      >
                        Go to Refund Management
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Details */}
              <div className="bg-white p-6 rounded-lg mb-4 border border-[#e0e0e0]">
                <h3 className="m-0 mb-4 text-gray-800 text-[1.1rem] border-b-2 border-[#f0f0f0] pb-2">
                  👤 Customer Details
                </h3>
                <p className="my-2 text-gray-600">
                  <strong className="text-gray-800 mr-2">Name:</strong>
                  {selectedOrder.user?.name || "N/A"}
                </p>
                <p className="my-2 text-gray-600">
                  <strong className="text-gray-800 mr-2">Email:</strong>
                  {selectedOrder.user?.email || "N/A"}
                </p>
                <p className="my-2 text-gray-600">
                  <strong className="text-gray-800 mr-2">Phone:</strong>
                  {selectedOrder.user?.phone || "N/A"}
                </p>
              </div>

              {/* Shipping Address */}
              <div className="bg-white p-6 rounded-lg mb-4 border border-[#e0e0e0]">
                <h3 className="m-0 mb-4 text-gray-800 text-[1.1rem] border-b-2 border-[#f0f0f0] pb-2">
                  📍 Shipping Address
                </h3>
                <p className="my-2 text-gray-600">
                  {selectedOrder.shippingAddress.fullName}
                </p>
                <p className="my-2 text-gray-600">
                  {selectedOrder.shippingAddress.address}
                </p>
                <p className="my-2 text-gray-600">
                  {selectedOrder.shippingAddress.city},{" "}
                  {selectedOrder.shippingAddress.state} -{" "}
                  {selectedOrder.shippingAddress.pincode}
                </p>
                <p className="my-2 text-gray-600">
                  Phone: {selectedOrder.shippingAddress.phone}
                </p>
              </div>

              {/* Order Items */}
              <div className="bg-white p-6 rounded-lg mb-4 border border-[#e0e0e0]">
                <h3 className="m-0 mb-4 text-gray-800 text-[1.1rem] border-b-2 border-[#f0f0f0] pb-2">
                  📦 Order Items
                </h3>
                <div className="flex flex-col gap-4">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-4 p-4 bg-gray-100 rounded-lg items-center md:flex-col md:text-center"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg md:w-full md:h-[150px]"
                      />
                      <div className="flex-1">
                        <p className="font-semibold m-0 mb-1 text-gray-800">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-600 my-1">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && " | "}
                          {item.color && `Color: ${item.color}`}
                        </p>
                        <p className="text-sm text-gray-600 my-1">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-gray-800 text-[1.1rem]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-white p-6 rounded-lg mb-4 border border-[#e0e0e0]">
                <h3 className="m-0 mb-4 text-gray-800 text-[1.1rem] border-b-2 border-[#f0f0f0] pb-2">
                  💰 Price Breakdown
                </h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex justify-between py-2 border-b border-[#e0e0e0]">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between py-2 border-b border-[#e0e0e0] text-[#28a745] font-semibold">
                      <span>Discount:</span>
                      <span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-[#e0e0e0]">
                    <span>Delivery:</span>
                    <span>
                      {selectedOrder.deliveryCharge === 0
                        ? "FREE"
                        : formatPrice(selectedOrder.deliveryCharge)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-[1.25rem] font-bold text-gray-800 border-t-2 border-gray-800 pt-4 mt-2">
                    <span>Total:</span>
                    <span>{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Timeline */}
              {selectedOrder.deliveryUpdates &&
                selectedOrder.deliveryUpdates.length > 0 && (
                  <div className="bg-white p-6 rounded-lg mb-4 border border-[#e0e0e0]">
                    <h3 className="m-0 mb-4 text-gray-800 text-[1.1rem] border-b-2 border-[#f0f0f0] pb-2">
                      🚚 Delivery Timeline
                    </h3>
                    <div className="relative pl-8 timeline-line">
                      {selectedOrder.deliveryUpdates.map((update, index) => (
                        <div key={index} className="relative pb-6 last:pb-0">
                          <div
                            className={`absolute -left-8 w-3 h-3 rounded-full border-[3px] border-white ${
                              index === 0
                                ? "bg-[#28a745] shadow-[0_0_0_2px_#28a745]"
                                : "bg-[#007bff] shadow-[0_0_0_2px_#007bff]"
                            }`}
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
                            {update.location && (
                              <p className="text-[#007bff] text-sm my-1">
                                📍 {update.location}
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

            {/* Modal Footer */}
            <div className="p-6 border-t-2 border-gray-100">
              <button
                className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-2 border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap hover:border-primary hover:text-primary"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllOrders;

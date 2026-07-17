import React, { useState, useEffect } from "react";
import { api, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const DeliveryManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    status: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get("/admin/orders");
      const activeOrders = response.data.filter(
        (order) => !["Delivered", "Cancelled"].includes(order.orderStatus),
      );
      setOrders(activeOrders);
    } catch (error) {
      showToast("Error fetching orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChange = (e) => {
    setUpdateForm({ ...updateForm, [e.target.name]: e.target.value });
  };

  const addDeliveryUpdate = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.post(
        `/admin/orders/${selectedOrder._id}/delivery-update`,
        updateForm,
      );
      showToast("Delivery update added successfully! 📦", "success");
      setUpdateForm({ status: "", location: "", description: "" });
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      showToast("Error adding update", "error");
    }
  };

  const quickStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, {
        orderStatus: newStatus,
        description: `Order ${newStatus.toLowerCase()}`,
      });
      showToast(`Order marked as ${newStatus}`, "success");
      fetchOrders();
    } catch (error) {
      showToast("Error updating status", "error");
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

  const getStatusIcon = (status) => {
    const icons = {
      Placed: "📝",
      Confirmed: "✅",
      Processing: "⚙️",
      Shipped: "📦",
      "Out for Delivery": "🚚",
      Delivered: "🎉",
    };
    return icons[status] || "📋";
  };

  const getStatusBadgeClass = (status) => {
    const s = status.toLowerCase().replace(" ", "-");
    const classes = {
      placed: "bg-[#fff3e0] text-[#e65100]",
      confirmed: "bg-[#e3f2fd] text-[#1565c0]",
      processing: "bg-[#e3f2fd] text-[#1565c0]",
      shipped: "bg-[#e8eaf6] text-[#3949ab]",
      "out-for-delivery": "bg-[#f3e5f5] text-[#7b1fa2]",
    };
    return classes[s] || "bg-gray-200 text-gray-700";
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 md:px-4">
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-5 md:flex-col md:items-start md:gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-dark md:text-[22px]">
              🚚 Delivery Management
            </h1>
            <p className="text-gray-500 mt-2">
              {orders.length} active orders to manage
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 px-5">
            <span className="text-[80px] block mb-5 opacity-50">📦</span>
            <h3 className="text-[22px] mb-3 text-gray-700">
              No active deliveries
            </h3>
            <p className="text-gray-500 mb-6">
              All orders have been delivered or cancelled
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-6 lg:grid-cols-1">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-md p-6 shadow-sm border-l-4 border-primary"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg m-0 mb-1">
                      Order #{order.orderId || order._id.slice(-8)}
                    </h3>
                    <p className="text-[13px] text-gray-500 m-0">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`py-1.5 px-3.5 rounded-[50px] text-xs font-bold ${getStatusBadgeClass(order.orderStatus)}`}
                  >
                    {getStatusIcon(order.orderStatus)} {order.orderStatus}
                  </span>
                </div>

                {/* Customer */}
                <div className="bg-gray-100 p-3.5 rounded-sm mb-4 text-sm">
                  <p className="my-1">
                    <strong>{order.shippingAddress.fullName}</strong>
                  </p>
                  <p className="my-1">📱 {order.shippingAddress.phone}</p>
                  <p className="my-1">
                    📍 {order.shippingAddress.address},{" "}
                    {order.shippingAddress.city}
                  </p>
                  <p className="my-1">
                    {order.shippingAddress.state} -{" "}
                    {order.shippingAddress.pincode}
                  </p>
                </div>

                {/* Items */}
                <div className="mb-4">
                  <p className="text-sm m-0 mb-2.5">
                    <strong>{order.items.length} items</strong> •{" "}
                    {formatPrice(order.totalAmount)}
                  </p>
                  <div className="flex gap-1.5 items-center">
                    {order.items.slice(0, 4).map((item, index) => (
                      <img
                        key={index}
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ))}
                    {order.items.length > 4 && (
                      <span className="bg-gray-200 py-1 px-2.5 rounded text-xs font-semibold">
                        +{order.items.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {order.expectedDelivery && (
                  <div className="bg-[#e8f5e9] py-2.5 px-3.5 rounded-sm mb-4 text-[13px] text-[#2e7d32]">
                    📅 Expected: {formatDate(order.expectedDelivery)}
                  </div>
                )}

                {/* Timeline */}
                {order.deliveryUpdates && order.deliveryUpdates.length > 0 && (
                  <div className="mb-4 p-3.5 bg-gray-100 rounded-sm">
                    <p className="text-xs font-semibold text-gray-500 m-0 mb-3 uppercase">
                      Recent Updates:
                    </p>
                    {order.deliveryUpdates
                      .slice(-3)
                      .reverse()
                      .map((update, index) => (
                        <div
                          key={index}
                          className="flex gap-3 mb-3 pl-3 relative last:mb-0"
                        >
                          <div className="absolute left-0 top-1.5 w-2 h-2 bg-primary rounded-full"></div>
                          <div>
                            <p className="font-semibold text-[13px] m-0">
                              {update.status}
                            </p>
                            {update.location && (
                              <p className="text-xs text-gray-500 my-0.5">
                                {update.location}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-400 m-0">
                              {formatDate(update.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2.5 flex-wrap pt-4 border-t-2 border-gray-100 md:flex-col">
                  {order.orderStatus === "Placed" && (
                    <button
                      onClick={() => quickStatusUpdate(order._id, "Confirmed")}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-success text-white hover:bg-[#388e3c] hover:-translate-y-0.5 md:w-full md:justify-center"
                    >
                      ✅ Confirm
                    </button>
                  )}
                  {order.orderStatus === "Confirmed" && (
                    <button
                      onClick={() => quickStatusUpdate(order._id, "Processing")}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover md:w-full md:justify-center"
                    >
                      ⚙️ Processing
                    </button>
                  )}
                  {order.orderStatus === "Processing" && (
                    <button
                      onClick={() => quickStatusUpdate(order._id, "Shipped")}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover md:w-full md:justify-center"
                    >
                      📦 Ship
                    </button>
                  )}
                  {order.orderStatus === "Shipped" && (
                    <button
                      onClick={() =>
                        quickStatusUpdate(order._id, "Out for Delivery")
                      }
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover md:w-full md:justify-center"
                    >
                      🚚 Out for Delivery
                    </button>
                  )}
                  {order.orderStatus === "Out for Delivery" && (
                    <button
                      onClick={() => quickStatusUpdate(order._id, "Delivered")}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-success text-white hover:bg-[#388e3c] hover:-translate-y-0.5 md:w-full md:justify-center"
                    >
                      🎉 Delivered
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-2 border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap hover:border-primary hover:text-primary md:w-full md:justify-center"
                  >
                    📝 Add Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Update Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-5 animate-fadeIn">
            <div className="bg-white rounded-lg max-w-[600px] w-full max-h-[90vh] overflow-y-auto animate-slideUp md:mx-2.5">
              <div className="flex justify-between items-center p-6 border-b-2 border-gray-100">
                <h2 className="text-[22px] m-0">Add Delivery Update</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 p-1 transition-all duration-300 ease-custom hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              <div className="bg-gray-100 py-4 px-6 text-sm">
                <p className="my-1">
                  <strong>Order:</strong> #
                  {selectedOrder.orderId || selectedOrder._id.slice(-8)}
                </p>
                <p className="my-1">
                  <strong>Customer:</strong>{" "}
                  {selectedOrder.shippingAddress.fullName}
                </p>
                <p className="my-1">
                  <strong>Current Status:</strong> {selectedOrder.orderStatus}
                </p>
              </div>

              <form onSubmit={addDeliveryUpdate} className="p-6">
                <div className="mb-6">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Status Update *
                  </label>
                  <select
                    name="status"
                    value={updateForm.status}
                    onChange={handleUpdateChange}
                    required
                    className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                  >
                    <option value="">Select Status</option>
                    <option value="Order Confirmed">Order Confirmed</option>
                    <option value="Package Being Prepared">
                      Package Being Prepared
                    </option>
                    <option value="Picked Up by Courier">
                      Picked Up by Courier
                    </option>
                    <option value="In Transit">In Transit</option>
                    <option value="Reached Local Hub">Reached Local Hub</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivery Attempted">
                      Delivery Attempted
                    </option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={updateForm.location}
                    onChange={handleUpdateChange}
                    placeholder="e.g., Mumbai Sorting Facility"
                    className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary placeholder:text-gray-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={updateForm.description}
                    onChange={handleUpdateChange}
                    placeholder="Add more details about this update..."
                    rows="3"
                    className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary placeholder:text-gray-500"
                  />
                </div>

                <div className="flex gap-4 mt-8 md:flex-col">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-none rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover md:w-full"
                  >
                    Add Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-2 border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap hover:border-primary hover:text-primary md:w-full"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryManagement;

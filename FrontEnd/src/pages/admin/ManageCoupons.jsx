import React, { useState, useEffect } from "react";
import { api, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const ManageCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    isActive: true,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await api.get("/coupons/all");
      setCoupons(response.data);
    } catch (error) {
      showToast("Error fetching coupons", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderAmount: "",
      maxDiscountAmount: "",
      validFrom: "",
      validUntil: "",
      usageLimit: "",
      isActive: true,
    });
    setEditingCoupon(null);
    setShowForm(false);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || "",
      maxDiscountAmount: coupon.maxDiscountAmount || "",
      validFrom: coupon.validFrom.split("T")[0],
      validUntil: coupon.validUntil.split("T")[0],
      usageLimit: coupon.usageLimit || "",
      isActive: coupon.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCoupon) {
        await api.put(`/coupons/${editingCoupon._id}`, formData);
        showToast("Coupon updated successfully! 🎉", "success");
      } else {
        await api.post("/coupons", formData);
        showToast("Coupon created successfully! 🎉", "success");
      }
      resetForm();
      fetchCoupons();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error saving coupon",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(coupons.filter((c) => c._id !== id));
      showToast("Coupon deleted successfully", "success");
    } catch (error) {
      showToast("Error deleting coupon", "error");
    }
  };

  const toggleCouponStatus = async (coupon) => {
    try {
      await api.put(`/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      fetchCoupons();
      showToast(
        `Coupon ${coupon.isActive ? "deactivated" : "activated"}`,
        "success",
      );
    } catch (error) {
      showToast("Error updating coupon", "error");
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 md:px-4">
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-5 md:flex-col md:items-start md:gap-4">
          <h1 className="text-[28px] font-bold text-dark md:text-[22px]">
            Manage Coupons ({coupons.length})
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-none rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover"
          >
            ➕ Add Coupon
          </button>
        </div>

        {/* Coupon Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-5 animate-fadeIn">
            <div className="bg-white rounded-lg max-w-[600px] w-full max-h-[90vh] overflow-y-auto animate-slideUp md:mx-2.5">
              <div className="flex justify-between items-center p-6 border-b-2 border-gray-100">
                <h2 className="text-[22px] m-0">
                  {editingCoupon ? "Edit Coupon" : "Add New Coupon"}
                </h2>
                <button
                  onClick={resetForm}
                  className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 p-1 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-2 gap-5 md:grid-cols-1">
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="e.g., SAVE20"
                      required
                      style={{ textTransform: "uppercase" }}
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Discount Type *
                    </label>
                    <select
                      name="discountType"
                      value={formData.discountType}
                      onChange={handleChange}
                      required
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Description *
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="e.g., Get 20% off on all products"
                    required
                    className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary placeholder:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 md:grid-cols-1">
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleChange}
                      placeholder="e.g., 20"
                      min="1"
                      required
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Min Order Amount (₹)
                    </label>
                    <input
                      type="number"
                      name="minOrderAmount"
                      value={formData.minOrderAmount}
                      onChange={handleChange}
                      placeholder="e.g., 500"
                      min="0"
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Max Discount (₹)
                    </label>
                    <input
                      type="number"
                      name="maxDiscountAmount"
                      value={formData.maxDiscountAmount}
                      onChange={handleChange}
                      placeholder="e.g., 200"
                      min="0"
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 md:grid-cols-1">
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Valid From *
                    </label>
                    <input
                      type="date"
                      name="validFrom"
                      value={formData.validFrom}
                      onChange={handleChange}
                      required
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Valid Until *
                    </label>
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleChange}
                      required
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleChange}
                      placeholder="Unlimited"
                      min="1"
                      className="w-full py-3.5 px-4 border-2 border-gray-300 rounded-sm font-[inherit] text-[15px] transition-all duration-300 ease-custom bg-white focus:outline-none focus-ring-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-6 flex-wrap">
                  <label className="flex items-center gap-2.5 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className="flex gap-4 mt-8 md:flex-col">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-none rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover disabled:opacity-60 disabled:cursor-not-allowed md:w-full"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingCoupon
                        ? "Update Coupon"
                        : "Create Coupon"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-2 border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap hover:border-primary hover:text-primary md:w-full"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Coupons List */}
        {coupons.length === 0 ? (
          <div className="text-center py-20 px-5">
            <span className="text-[80px] block mb-5 opacity-50">🎟️</span>
            <h3 className="text-[22px] mb-3 text-gray-700">No coupons yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first coupon to offer discounts to customers
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-5 lg:grid-cols-1">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className={`bg-white rounded-md p-6 shadow-sm border-2 border-gray-200 transition-all duration-300 ease-custom ${!coupon.isActive ? "opacity-60 bg-gray-100" : ""}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="bg-primary-light text-primary-dark py-2 px-4 rounded-sm font-mono font-bold text-base tracking-[2px]">
                    {coupon.code}
                  </div>
                  <div
                    className={`py-1 px-3 rounded-[50px] text-xs font-bold ${coupon.isActive ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#ffebee] text-[#c62828]"}`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </div>
                </div>

                <div className="text-[28px] font-extrabold text-primary mb-3">
                  {coupon.discountType === "percentage"
                    ? `${coupon.discountValue}% OFF`
                    : `${formatPrice(coupon.discountValue)} OFF`}
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {coupon.description}
                </p>

                <div className="text-[13px] text-gray-500 mb-4">
                  {coupon.minOrderAmount > 0 && (
                    <p className="my-1">
                      Min Order: {formatPrice(coupon.minOrderAmount)}
                    </p>
                  )}
                  {coupon.maxDiscountAmount && (
                    <p className="my-1">
                      Max Discount: {formatPrice(coupon.maxDiscountAmount)}
                    </p>
                  )}
                  <p className="my-1">
                    Valid: {formatDate(coupon.validFrom)} -{" "}
                    {formatDate(coupon.validUntil)}
                  </p>
                  <p className="my-1">
                    Used: {coupon.usedCount}{" "}
                    {coupon.usageLimit ? `/ ${coupon.usageLimit}` : "times"}
                  </p>
                </div>

                <div className="flex gap-2.5 flex-wrap md:flex-col">
                  <button
                    onClick={() => toggleCouponStatus(coupon)}
                    className={`inline-flex items-center justify-center gap-2 py-2.5 px-[18px] rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap md:w-full ${coupon.isActive ? "border-2 border-gray-300 bg-white text-gray-800 hover:border-primary hover:text-primary" : "border-none bg-success text-white hover:bg-[#388e3c] hover:-translate-y-0.5"}`}
                  >
                    {coupon.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleEdit(coupon)}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-2 border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap hover:border-primary hover:text-primary md:w-full"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCoupon(coupon._id)}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-error text-white hover:bg-[#d32f2f] hover:-translate-y-0.5 md:w-full"
                  >
                    Delete
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

export default ManageCoupons;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../../utils/api";
import Loader from "../../components/Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const fontId = "admin-dashboard-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get("/admin/dashboard");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!stats) return null;

  const statusStyle = (status) => {
    const s = status?.toLowerCase().replace(/ /g, "-");
    const map = {
      placed: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-500",
      },
      pending: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-500",
      },
      confirmed: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        dot: "bg-blue-500",
      },
      processing: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        dot: "bg-blue-500",
      },
      shipped: {
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        dot: "bg-indigo-500",
      },
      "out-for-delivery": {
        bg: "bg-purple-50",
        text: "text-purple-700",
        dot: "bg-purple-500",
      },
      delivered: {
        bg: "bg-green-50",
        text: "text-green-700",
        dot: "bg-green-500",
      },
      paid: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
      cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
      failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    };
    return (
      map[s] || { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" }
    );
  };

  const mainStats = [
    {
      label: "Total Revenue",
      value: formatPrice(stats.totalRevenue),
      icon: "payments",
      trend: null,
      gradient: "from-emerald-500 to-teal-600",
      bgSoft: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: "shopping_bag",
      trend: null,
      gradient: "from-blue-500 to-indigo-600",
      bgSoft: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Customers",
      value: stats.totalUsers,
      icon: "group",
      trend: null,
      gradient: "from-pink-500 to-rose-600",
      bgSoft: "bg-pink-50",
      iconColor: "text-pink-600",
    },
    {
      label: "Total Products",
      value: stats.totalProducts,
      icon: "inventory_2",
      trend: null,
      gradient: "from-purple-500 to-fuchsia-600",
      bgSoft: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  const orderStats = [
    {
      label: "Pending",
      value: stats.pendingOrders,
      icon: "schedule",
      color: "amber",
    },
    {
      label: "Processing",
      value: stats.processingOrders,
      icon: "sync",
      color: "blue",
    },
    {
      label: "Delivered",
      value: stats.deliveredOrders,
      icon: "task_alt",
      color: "green",
    },
    {
      label: "Cancelled",
      value: stats.cancelledOrders,
      icon: "cancel",
      color: "red",
    },
  ];

  const colorClasses = {
    amber: {
      bar: "from-amber-400 to-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    blue: {
      bar: "from-blue-400 to-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    green: {
      bar: "from-green-400 to-green-500",
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    red: {
      bar: "from-red-400 to-red-500",
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
    },
  };

  const totalOrderCount =
    stats.pendingOrders +
    stats.processingOrders +
    stats.deliveredOrders +
    stats.cancelledOrders;

  const managementLinks = [
    {
      to: "/admin/products",
      label: "Products",
      icon: "inventory_2",
      color: "bg-purple-500",
      count: stats.totalProducts,
    },
    {
      to: "/admin/trending",
      label: "Trending",
      icon: "trending_up",
      color: "bg-rose-500",
    },
    {
      to: "/admin/orders",
      label: "Orders",
      icon: "shopping_bag",
      color: "bg-blue-500",
      count: stats.totalOrders,
    },
    {
      to: "/admin/users",
      label: "Customers",
      icon: "group",
      color: "bg-pink-500",
      count: stats.totalUsers,
    },
    {
      to: "/admin/banners",
      label: "Banners",
      icon: "view_carousel",
      color: "bg-indigo-500",
    },
    {
      to: "/admin/delivery",
      label: "Delivery",
      icon: "local_shipping",
      color: "bg-cyan-500",
    },
    {
      to: "/admin/coupons",
      label: "Coupons",
      icon: "local_offer",
      color: "bg-orange-500",
    },
    {
      to: "/admin/reviews",
      label: "Reviews",
      icon: "star",
      color: "bg-yellow-500",
    },
    {
      to: "/admin/refunds",
      label: "Refunds",
      icon: "credit_card",
      color: "bg-red-500",
      badge: stats.refundRequested,
    },
  ];

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-gray-50 py-8 max-md:py-5"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div
          className="mb-8 overflow-hidden rounded-3xl p-8 shadow-lg max-md:p-6"
          style={{
            background:
              "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="text-white">
              <p className="m-0 mb-1 text-sm font-medium opacity-90">
                {greeting}, Admin
              </p>
              <h1 className="m-0 mb-2 text-3xl font-extrabold tracking-tight max-md:text-2xl">
                Welcome to TalishClothes Dashboard
              </h1>
              <p className="m-0 text-sm opacity-90">
                Here is your business overview for today
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/add-product"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/20 px-5 py-3 text-sm font-semibold text-white no-underline backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/30"
              >
                <span style={matIcon} className="text-[20px]">
                  add
                </span>
                Add Product
              </Link>
              <Link
                to="/admin/banners"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-700 no-underline shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <span style={matIcon} className="text-[20px]">
                  view_carousel
                </span>
                Manage Banners
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-4 gap-5 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
          {mainStats.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${stat.bgSoft}`}
              />
              <div className="relative">
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgSoft}`}
                >
                  <span
                    style={matIcon}
                    className={`text-[26px] ${stat.iconColor}`}
                  >
                    {stat.icon}
                  </span>
                </div>
                <p className="m-0 mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
                <p
                  className={`m-0 bg-gradient-to-r bg-clip-text text-2xl font-extrabold text-transparent ${stat.gradient}`}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-3 gap-5 max-[1100px]:grid-cols-1">
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-[1100px]:col-span-1">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  Order Status Breakdown
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-500">
                  Distribution across {totalOrderCount} orders
                </p>
              </div>
              <Link
                to="/admin/orders"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-pink-600 no-underline transition-colors hover:bg-pink-50"
              >
                View all
              </Link>
            </div>

            <div className="space-y-4">
              {orderStats.map((s) => {
                const percent =
                  totalOrderCount > 0
                    ? Math.round((s.value / totalOrderCount) * 100)
                    : 0;
                const cc = colorClasses[s.color];
                return (
                  <div key={s.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${cc.bg}`}
                        >
                          <span
                            style={matIcon}
                            className={`text-[18px] ${cc.text}`}
                          >
                            {s.icon}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {s.value}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({percent}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${cc.bar}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="m-0 mb-5 text-lg font-bold text-gray-900">
              Refund Overview
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <span style={matIcon} className="text-[20px]">
                    schedule
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-xs font-medium text-amber-700">
                    Pending
                  </p>
                  <p className="m-0 text-lg font-bold text-amber-900">
                    {stats.refundRequested || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
                  <span style={matIcon} className="text-[20px]">
                    check_circle
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-xs font-medium text-green-700">
                    Completed
                  </p>
                  <p className="m-0 text-lg font-bold text-green-900">
                    {stats.refunded || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500 text-white">
                  <span style={matIcon} className="text-[20px]">
                    payments
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-xs font-medium text-purple-700">
                    Total Refunded
                  </p>
                  <p className="m-0 truncate text-lg font-bold text-purple-900">
                    {formatPrice(stats.totalRefunded || 0)}
                  </p>
                </div>
              </div>

              <Link
                to="/admin/refunds"
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-semibold text-white no-underline transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Manage Refunds
                <span style={matIcon} className="text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="m-0 text-lg font-bold text-gray-900">
                Management
              </h2>
              <p className="m-0 mt-0.5 text-xs text-gray-500">
                Quick access to all sections
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-[400px]:grid-cols-1">
            {managementLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group relative overflow-hidden rounded-xl border-2 border-gray-100 bg-white p-4 no-underline transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-lg"
              >
                {link.badge > 0 && (
                  <span className="absolute right-3 top-3 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-md">
                    {link.badge}
                  </span>
                )}
                <div
                  className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110 ${link.color}`}
                >
                  <span style={matIcon} className="text-[22px]">
                    {link.icon}
                  </span>
                </div>
                <p className="m-0 text-sm font-bold text-gray-900">
                  {link.label}
                </p>
                {link.count !== undefined && (
                  <p className="m-0 mt-0.5 text-xs text-gray-500">
                    {link.count} total
                  </p>
                )}
                <div
                  className={`absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-0 transition-all duration-500 group-hover:scale-150 group-hover:opacity-10 ${link.color}`}
                />
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 max-[1100px]:grid-cols-1">
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-[1100px]:col-span-1">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  Recent Orders
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-500">
                  Latest {stats.recentOrders?.length || 0} orders
                </p>
              </div>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-pink-600 no-underline transition-colors hover:bg-pink-50"
              >
                View all
                <span style={matIcon} className="text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>

            {!stats.recentOrders || stats.recentOrders.length === 0 ? (
              <div className="py-12 text-center">
                <span
                  style={matIcon}
                  className="mb-2 block text-[48px] text-gray-300"
                >
                  inbox
                </span>
                <p className="m-0 text-sm text-gray-500">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentOrders.map((order) => {
                  const st = statusStyle(order.orderStatus);
                  const initial =
                    order.user?.name?.charAt(0).toUpperCase() || "?";
                  return (
                    <div
                      key={order._id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:border-pink-200 hover:bg-pink-50"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #e91e63, #9c27b0)",
                        }}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="m-0 truncate text-sm font-semibold text-gray-900">
                            {order.user?.name || "Guest"}
                          </p>
                          <span className="text-xs text-gray-400">
                            #{order.orderId?.slice(-6) || order._id?.slice(-6)}
                          </span>
                        </div>
                        <p className="m-0 mt-0.5 text-xs text-gray-500">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.text}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${st.dot}`}
                        />
                        {order.orderStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  Low Stock
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-500">
                  Products running low
                </p>
              </div>
              <Link
                to="/admin/products"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-pink-600 no-underline transition-colors hover:bg-pink-50"
              >
                All
              </Link>
            </div>

            {!stats.lowStockProducts || stats.lowStockProducts.length === 0 ? (
              <div className="py-12 text-center">
                <span
                  style={matIcon}
                  className="mb-2 block text-[48px] text-green-300"
                >
                  check_circle
                </span>
                <p className="m-0 text-sm text-gray-500">
                  All products well stocked
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.lowStockProducts.slice(0, 5).map((product) => (
                  <Link
                    key={product._id}
                    to={`/admin/edit-product/${product._id}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 no-underline transition-all hover:border-red-200 hover:bg-red-50"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-semibold text-gray-900">
                        {product.name}
                      </p>
                      <p
                        className={`m-0 mt-0.5 text-[11px] font-bold ${
                          product.stock === 0
                            ? "text-red-600"
                            : "text-amber-600"
                        }`}
                      >
                        {product.stock === 0
                          ? "Out of stock"
                          : `Only ${product.stock} left`}
                      </p>
                    </div>
                    <span style={matIcon} className="text-[18px] text-gray-300">
                      arrow_forward_ios
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

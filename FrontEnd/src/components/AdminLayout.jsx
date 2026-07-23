import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useAdminNotifications } from "../context/AdminNotificationContext";
import Logo from "./Logo";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const typeConfig = {
  order: { icon: "shopping_bag", color: "#3b82f6", bg: "#dbeafe" },
  refund: { icon: "payments", color: "#f59e0b", bg: "#fef3c7" },
  return: { icon: "assignment_return", color: "#8b5cf6", bg: "#ede9fe" },
  delivery: { icon: "local_shipping", color: "#10b981", bg: "#d1fae5" },
  system: { icon: "notifications", color: "#831843", bg: "#fce7f3" },
};

const formatTime = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString("en-IN");
};

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const {
    adminNotifications,
    adminUnreadCount,
    markAdminAsRead,
    markAllAdminAsRead,
  } = useAdminNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const fontId = "admin-layout-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setBellOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [bellOpen]);

  const mainNav = [
    { to: "/admin/dashboard", icon: "dashboard", label: "Dashboard" },
    { to: "/admin/products", icon: "inventory_2", label: "Products" },
    { to: "/admin/orders", icon: "shopping_bag", label: "Orders" },
    { to: "/admin/users", icon: "group", label: "Customers" },
  ];

  const secondaryNav = [
    { to: "/admin/add-product", icon: "add_circle", label: "Add Product" },
    { to: "/admin/categories", icon: "category", label: "Categories" },
    { to: "/admin/banners", icon: "view_carousel", label: "Banners" },
    { to: "/admin/trending", icon: "trending_up", label: "Trending" },
    { to: "/admin/delivery", icon: "local_shipping", label: "Delivery" },
    { to: "/admin/coupons", icon: "local_offer", label: "Coupons" },
    { to: "/admin/reviews", icon: "star", label: "Reviews" },
    { to: "/admin/refunds", icon: "credit_card", label: "Refunds" },
    {
      to: "/admin/notifications",
      icon: "notifications",
      label: "Notifications",
      badgeKey: "notifications",
    },
    {
      to: "/admin/broadcast",
      icon: "campaign",
      label: "Broadcast",
    },
  ];

  const bottomNav = [
    { to: "/admin/dashboard", icon: "dashboard", label: "Home" },
    { to: "/admin/products", icon: "inventory_2", label: "Products" },
    { to: "/admin/orders", icon: "shopping_bag", label: "Orders" },
    {
      to: "/admin/notifications",
      icon: "notifications",
      label: "Alerts",
      hasBadge: true,
    },
    { icon: "menu", label: "More", isMenu: true },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (to) => {
    if (!to) return false;
    if (to === "/admin/dashboard") {
      return (
        location.pathname === "/admin" ||
        location.pathname === "/admin/dashboard"
      );
    }
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  const getUserInitial = () => {
    if (!user) return "A";
    return (user.name || user.email || "A").charAt(0).toUpperCase();
  };

  const getPageTitle = () => {
    const allNav = [...mainNav, ...secondaryNav];
    const found = allNav.find(
      (n) =>
        n.to &&
        (location.pathname === n.to ||
          location.pathname.startsWith(n.to + "/")),
    );
    if (found) return found.label;
    if (location.pathname.includes("edit-product")) return "Edit Product";
    return "Admin";
  };

  const NavItem = ({ item, mini = false }) => {
    const active = isActive(item.to);
    const showBadge = item.badgeKey === "notifications" && adminUnreadCount > 0;

    return (
      <Link
        to={item.to}
        className={`group relative flex items-center gap-3 rounded-xl no-underline transition-all duration-200 ${
          mini ? "justify-center p-3" : "px-4 py-3"
        } ${
          active
            ? "text-white shadow-lg"
            : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"
        }`}
        style={
          active
            ? {
                background:
                  "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
                boxShadow: "0 4px 12px rgba(190, 24, 93, 0.35)",
              }
            : {}
        }
        title={mini ? item.label : ""}
      >
        <span
          style={matIcon}
          className={`shrink-0 text-[22px] ${active ? "text-white" : ""}`}
        >
          {item.icon}
        </span>
        {!mini && (
          <span className="flex-1 text-sm font-semibold">{item.label}</span>
        )}
        {showBadge && (
          <span
            className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow-md ${
              mini ? "absolute -right-1 -top-1" : ""
            }`}
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
            }}
          >
            {adminUnreadCount > 99 ? "99+" : adminUnreadCount}
          </span>
        )}
        {!mini && active && !showBadge && (
          <span style={matIcon} className="text-[16px] text-white/80">
            arrow_forward_ios
          </span>
        )}
      </Link>
    );
  };

  const BellDropdown = () => (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      style={{ animation: "bell-drop 0.2s ease-out" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: "linear-gradient(135deg, #4a0e2e 0%, #831843 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={matIcon} className="text-[20px] text-white">
            notifications_active
          </span>
          <h3 className="m-0 text-sm font-bold text-white">Notifications</h3>
          {adminUnreadCount > 0 && (
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white">
              {adminUnreadCount} new
            </span>
          )}
        </div>
        {adminUnreadCount > 0 && (
          <button
            onClick={markAllAdminAsRead}
            className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/30"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {adminNotifications.length === 0 ? (
          <div className="py-10 text-center">
            <span
              style={matIcon}
              className="mb-2 block text-[40px] text-gray-300"
            >
              notifications_off
            </span>
            <p className="m-0 text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          adminNotifications.slice(0, 8).map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.system;
            return (
              <div
                key={n._id}
                onClick={() => {
                  if (!n.isRead) markAdminAsRead(n._id);
                  if (n.link) {
                    setBellOpen(false);
                    navigate(n.link);
                  }
                }}
                className={`flex cursor-pointer items-start gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 ${
                  !n.isRead ? "bg-pink-50/50" : ""
                }`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: cfg.bg }}
                >
                  <span
                    style={{ ...matIcon, color: cfg.color }}
                    className="text-[18px]"
                  >
                    {cfg.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="m-0 text-xs font-bold text-gray-900">
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pink-600" />
                    )}
                  </div>
                  <p
                    className="m-0 mt-0.5 text-[11px] text-gray-600"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.message}
                  </p>
                  <p className="m-0 mt-1 text-[10px] text-gray-400">
                    {formatTime(n.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link
        to="/admin/notifications"
        onClick={() => setBellOpen(false)}
        className="flex items-center justify-center gap-1 border-t border-gray-100 bg-gray-50 py-2.5 text-xs font-bold text-pink-600 no-underline hover:bg-pink-50"
      >
        View all notifications
        <span style={matIcon} className="text-[14px]">
          arrow_forward
        </span>
      </Link>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-100 bg-white shadow-sm transition-all duration-300 lg:flex ${
          collapsed ? "w-[80px]" : "w-[260px]"
        }`}
      >
        <div
          className={`flex shrink-0 items-center border-b border-gray-100 ${
            collapsed ? "justify-center px-3 py-5" : "justify-between px-5 py-5"
          }`}
        >
          {collapsed ? (
            <Logo size="small" showText={false} linkTo="/admin/dashboard" />
          ) : (
            <Logo size="default" linkTo="/admin/dashboard" />
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              aria-label="Collapse sidebar"
            >
              <span style={matIcon} className="text-[18px]">
                chevron_left
              </span>
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
            aria-label="Expand sidebar"
          >
            <span style={matIcon} className="text-[18px]">
              chevron_right
            </span>
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Main
            </p>
          )}
          <div className="space-y-1">
            {mainNav.map((item) => (
              <NavItem key={item.to} item={item} mini={collapsed} />
            ))}
          </div>

          <div className="my-4 h-px bg-gray-100" />

          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Management
            </p>
          )}
          <div className="space-y-1">
            {secondaryNav.map((item) => (
              <NavItem key={item.to} item={item} mini={collapsed} />
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-gray-100 p-3">
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border-none bg-red-50 text-red-600 transition-all hover:bg-red-500 hover:text-white"
            >
              <span style={matIcon} className="text-[20px]">
                logout
              </span>
            </button>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 p-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #831843, #ec4899)",
                  }}
                >
                  {getUserInitial()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-bold text-gray-900">
                    {user?.name || "Admin"}
                  </p>
                  <p className="m-0 truncate text-[11px] text-gray-500">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  className="flex items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 no-underline transition-all hover:border-pink-500 hover:text-pink-600"
                >
                  <span style={matIcon} className="text-[16px]">
                    storefront
                  </span>
                  Store
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border-none bg-red-50 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-500 hover:text-white"
                >
                  <span style={matIcon} className="text-[16px]">
                    logout
                  </span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <header
        className={`fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/95 px-4 shadow-sm backdrop-blur-md transition-all duration-300 lg:h-16 ${
          collapsed ? "lg:pl-[100px]" : "lg:pl-[280px]"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-gray-100 text-gray-700 transition-colors hover:bg-pink-50 hover:text-pink-600 lg:hidden"
            aria-label="Open menu"
          >
            <span style={matIcon} className="text-[22px]">
              menu
            </span>
          </button>
          <div className="lg:hidden">
            <Logo size="small" linkTo="/admin/dashboard" />
          </div>
          <div className="hidden lg:block">
            <h1 className="m-0 text-lg font-bold text-gray-900">
              {getPageTitle()}
            </h1>
            <p className="m-0 text-[11px] text-gray-500">
              Welcome back, {user?.name?.split(" ")[0] || "Admin"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/broadcast"
            title="Send broadcast"
            className="hidden h-10 items-center gap-1.5 rounded-xl border-none px-3 text-xs font-bold text-white no-underline shadow-md transition-all hover:-translate-y-0.5 md:flex"
            style={{
              background:
                "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
            }}
          >
            <span style={matIcon} className="text-[18px]">
              campaign
            </span>
            Broadcast
          </Link>

          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              title="Notifications"
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-all hover:border-pink-500 hover:text-pink-600"
            >
              <span style={matIcon} className="text-[22px]">
                {adminUnreadCount > 0
                  ? "notifications_active"
                  : "notifications"}
              </span>
              {adminUnreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold leading-none text-white"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
                    animation:
                      adminUnreadCount > 0
                        ? "bell-pulse 2s ease-in-out infinite"
                        : "none",
                  }}
                >
                  {adminUnreadCount > 99 ? "99+" : adminUnreadCount}
                </span>
              )}
            </button>
            {bellOpen && <BellDropdown />}
          </div>

          <Link
            to="/"
            title="Go to store"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 no-underline transition-all hover:border-pink-500 hover:text-pink-600 lg:hidden"
          >
            <span style={matIcon} className="text-[20px]">
              storefront
            </span>
          </Link>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
            style={{
              background: "linear-gradient(135deg, #831843, #ec4899)",
            }}
          >
            {getUserInitial()}
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-[50] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ animation: "admin-fade-in 0.2s ease" }}
          />
          <aside
            className="fixed left-0 top-0 z-[60] flex h-screen w-[300px] max-w-[85%] flex-col bg-white shadow-2xl lg:hidden"
            style={{ animation: "admin-slide-in 0.3s ease" }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-5 py-5"
              style={{
                background: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)",
              }}
            >
              <Logo size="default" linkTo="/admin/dashboard" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/80 text-gray-700 hover:bg-white"
              >
                <span style={matIcon} className="text-[22px]">
                  close
                </span>
              </button>
            </div>

            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 p-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #831843, #ec4899)",
                  }}
                >
                  {getUserInitial()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-bold text-gray-900">
                    {user?.name || "Admin"}
                  </p>
                  <p className="m-0 truncate text-xs text-gray-500">
                    Administrator
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Main
              </p>
              <div className="space-y-1">
                {mainNav.map((item) => (
                  <NavItem key={item.to} item={item} />
                ))}
              </div>

              <div className="my-4 h-px bg-gray-100" />

              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Management
              </p>
              <div className="space-y-1">
                {secondaryNav.map((item) => (
                  <NavItem key={item.to} item={item} />
                ))}
              </div>
            </nav>

            <div className="shrink-0 border-t border-gray-100 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 no-underline transition-all hover:border-pink-500 hover:text-pink-600"
                >
                  <span style={matIcon} className="text-[16px]">
                    storefront
                  </span>
                  Store
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-red-50 py-2.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-500 hover:text-white"
                >
                  <span style={matIcon} className="text-[16px]">
                    logout
                  </span>
                  Logout
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      <main
        className={`min-h-screen pb-24 pt-16 transition-all duration-300 lg:pb-8 ${
          collapsed ? "lg:pl-[80px]" : "lg:pl-[260px]"
        }`}
      >
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 gap-1 px-1 py-1.5">
          {bottomNav.map((item, i) => {
            if (item.isMenu) {
              return (
                <button
                  key={i}
                  onClick={() => setSidebarOpen(true)}
                  className="flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-none bg-transparent py-2 text-gray-500 transition-all hover:bg-pink-50 hover:text-pink-600"
                >
                  <span style={matIcon} className="text-[22px]">
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-semibold">
                    {item.label}
                  </span>
                </button>
              );
            }

            const active = isActive(item.to);
            const showBadge = item.hasBadge && adminUnreadCount > 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 no-underline transition-all ${
                  active ? "text-pink-600" : "text-gray-500 hover:text-pink-600"
                }`}
              >
                <div
                  className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-all ${
                    active ? "bg-pink-100" : ""
                  }`}
                >
                  <span
                    style={matIcon}
                    className={`text-[22px] ${active ? "text-pink-600" : ""}`}
                  >
                    {item.icon}
                  </span>
                  {showBadge && (
                    <span
                      className="absolute right-2 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white px-1 text-[9px] font-bold leading-none text-white"
                      style={{
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      }}
                    >
                      {adminUnreadCount > 9 ? "9+" : adminUnreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] ${active ? "font-bold" : "font-semibold"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <style>{`
        @keyframes admin-slide-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes admin-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bell-drop {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bell-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;

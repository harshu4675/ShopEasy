import React, { useState, useContext, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Logo from "./Logo";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
  }, [location.pathname]);

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
  ];

  const bottomNav = [
    { to: "/admin/dashboard", icon: "dashboard", label: "Home" },
    { to: "/admin/products", icon: "inventory_2", label: "Products" },
    { to: "/admin/orders", icon: "shopping_bag", label: "Orders" },
    { to: "/admin/trending", icon: "trending_up", label: "Trending" },
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
        {!mini && active && (
          <span style={matIcon} className="text-[16px] text-white/80">
            arrow_forward_ios
          </span>
        )}
      </Link>
    );
  };

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
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 no-underline transition-all ${
                  active ? "text-pink-600" : "text-gray-500 hover:text-pink-600"
                }`}
              >
                <div
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-all ${
                    active ? "bg-pink-100" : ""
                  }`}
                >
                  <span
                    style={matIcon}
                    className={`text-[22px] ${active ? "text-pink-600" : ""}`}
                  >
                    {item.icon}
                  </span>
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
      `}</style>
    </div>
  );
};

export default AdminLayout;

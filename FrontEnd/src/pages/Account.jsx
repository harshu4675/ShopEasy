import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { WishlistContext } from "../context/WishlistContext";
import { NotificationContext } from "../context/NotificationContext";
import { api, formatPrice } from "../utils/api";
import { showToast } from "../utils/toast";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Account = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext) || { cartCount: 0 };
  const { wishlistCount } = useContext(WishlistContext) || {
    wishlistCount: 0,
  };
  const { unreadCount } = useContext(NotificationContext) || {
    unreadCount: 0,
  };
  const navigate = useNavigate();
  const [orderCount, setOrderCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fontId = "account-fonts";
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
    const fetchOrderCount = async () => {
      try {
        const res = await api.get("/orders/my-orders");
        setOrderCount(
          Array.isArray(res.data) ? res.data.length : res.data?.length || 0,
        );
      } catch {
        setOrderCount(0);
      }
    };
    if (user) fetchOrderCount();
  }, [user]);

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    setLoggingOut(true);
    try {
      await logout();
      showToast("Logged out successfully", "success");
      navigate("/");
    } catch {
      showToast("Error logging out", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  const getInitial = () => {
    if (!user) return "U";
    return (user.name || user.email || "U").charAt(0).toUpperCase();
  };

  if (!user) {
    return (
      <div
        className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center bg-gray-50 px-6 py-10"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div
          className="mb-6 flex h-32 w-32 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
          }}
        >
          <span style={matIcon} className="text-[64px] text-pink-600">
            person
          </span>
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Login to your account
        </h2>
        <p className="mb-6 max-w-xs text-center text-sm text-gray-500">
          Sign in to access your orders, wishlist, and personalized
          recommendations
        </p>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Link
            to="/login"
            className="rounded-full py-3 text-center text-sm font-bold text-white no-underline shadow-lg"
            style={{
              background: "linear-gradient(135deg, #831843, #ec4899)",
            }}
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-full border-2 border-pink-500 bg-white py-3 text-center text-sm font-bold text-pink-600 no-underline"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  const stats = [
    {
      to: "/my-orders",
      icon: "inventory_2",
      label: "Orders",
      count: orderCount,
    },
    {
      to: "/wishlist",
      icon: "favorite",
      label: "Wishlist",
      count: wishlistCount,
    },
    {
      to: "/cart",
      icon: "shopping_cart",
      label: "Cart",
      count: cartCount,
    },
  ];

  const sections = [
    {
      title: "My Activity",
      items: [
        {
          to: "/my-orders",
          icon: "inventory_2",
          label: "My Orders",
          desc: "Track, return, or cancel",
          badge: orderCount,
        },
        {
          to: "/wishlist",
          icon: "favorite_border",
          label: "Wishlist",
          desc: "Products you saved",
          badge: wishlistCount,
        },
        {
          to: "/my-returns",
          icon: "assignment_return",
          label: "Returns & Refunds",
          desc: "Manage return requests",
        },
        {
          to: "/notifications",
          icon: "notifications_none",
          label: "Notifications",
          desc: "View updates and alerts",
          badge: unreadCount,
        },
      ],
    },
    {
      title: "Offers & Rewards",
      items: [
        {
          to: "/coupons",
          icon: "local_offer",
          label: "Coupons & Offers",
          desc: "Available discounts",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          to: "/contact",
          icon: "support_agent",
          label: "Help Center",
          desc: "Get help with your orders",
        },
        {
          to: "/contact",
          icon: "chat_bubble_outline",
          label: "Contact Us",
          desc: "Reach out to our team",
        },
      ],
    },
    {
      title: "Legal",
      items: [
        {
          to: "/privacy",
          icon: "shield",
          label: "Privacy Policy",
          desc: "How we protect your data",
        },
        {
          to: "/terms",
          icon: "gavel",
          label: "Terms of Service",
          desc: "Rules of using our platform",
        },
      ],
    },
  ];

  const isAdmin = user.role === "admin";

  return (
    <div
      className="bg-gray-50 pb-6"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        className="relative overflow-hidden px-4 pb-16 pt-6"
        style={{
          background:
            "linear-gradient(135deg, #4a0e2e 0%, #831843 40%, #be185d 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(236, 72, 153, 0.4), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(244, 114, 182, 0.4), transparent)",
          }}
        />

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white shadow-xl"
              style={{
                background: "linear-gradient(135deg, #ec4899, #f472b6)",
                border: "3px solid rgba(255,255,255,0.3)",
              }}
            >
              {getInitial()}
            </div>
            <button
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white text-pink-600 shadow-md"
            >
              <span style={matIcon} className="text-[14px]">
                photo_camera
              </span>
            </button>
          </div>
          <div className="min-w-0 flex-1 text-white">
            <p
              className="m-0 mb-0.5 font-normal"
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: 14,
                color: "#fce7f3",
              }}
            >
              Welcome back
            </p>
            <h1 className="m-0 truncate text-xl font-bold">
              {user.name || "User"}
            </h1>
            <p className="m-0 mt-0.5 truncate text-xs opacity-90">
              {user.email || user.phone}
            </p>
            {isAdmin && (
              <span className="mt-1 inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="-mt-10 px-3">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-lg">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="flex flex-col items-center gap-1 rounded-xl py-2 no-underline transition-colors active:bg-pink-50"
            >
              <div className="relative">
                <span style={matIcon} className="text-[26px] text-pink-600">
                  {s.icon}
                </span>
                {s.count > 0 && (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-white px-1 text-[9px] font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #ec4899, #be185d)",
                    }}
                  >
                    {s.count > 99 ? "99+" : s.count}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-gray-700">
                {s.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-3 px-3">
          <Link
            to="/admin/dashboard"
            className="flex items-center justify-between rounded-2xl p-4 no-underline shadow-lg"
            style={{
              background: "linear-gradient(135deg, #4a0e2e 0%, #831843 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))",
                }}
              >
                <span style={matIcon} className="text-[22px] text-white">
                  admin_panel_settings
                </span>
              </div>
              <div className="text-white">
                <p className="m-0 text-sm font-bold">Admin Dashboard</p>
                <p className="m-0 text-[11px] opacity-90">
                  Manage products, orders & more
                </p>
              </div>
            </div>
            <span style={matIcon} className="text-[20px] text-white">
              arrow_forward
            </span>
          </Link>
        </div>
      )}

      <div className="mt-3 px-3">
        <Link
          to="/products"
          className="flex items-center justify-between rounded-2xl bg-white p-4 no-underline shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
              }}
            >
              <span style={matIcon} className="text-[22px] text-pink-600">
                shopping_bag
              </span>
            </div>
            <div>
              <p className="m-0 text-sm font-bold text-gray-900">
                Continue Shopping
              </p>
              <p className="m-0 text-[11px] text-gray-500">
                Explore latest arrivals & deals
              </p>
            </div>
          </div>
          <span style={matIcon} className="text-[20px] text-gray-400">
            arrow_forward
          </span>
        </Link>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="mt-4">
          <p className="m-0 mb-2 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">
            {section.title}
          </p>
          <div className="bg-white">
            {section.items.map((item, idx) => (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3.5 no-underline transition-colors active:bg-pink-50 ${
                  idx !== section.items.length - 1
                    ? "border-b border-gray-100"
                    : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50">
                  <span style={matIcon} className="text-[20px] text-pink-600">
                    {item.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold text-gray-900">
                    {item.label}
                  </p>
                  <p className="m-0 truncate text-[11px] text-gray-500">
                    {item.desc}
                  </p>
                </div>
                {item.badge > 0 && (
                  <span
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #ec4899, #be185d)",
                    }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                <span style={matIcon} className="text-[20px] text-gray-300">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 px-3">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-white py-3.5 text-sm font-bold text-red-600 shadow-sm transition-all active:bg-red-50 disabled:opacity-60"
        >
          {loggingOut ? (
            <>
              <span
                className="inline-block h-4 w-4 rounded-full border-2 border-red-200 border-t-red-500"
                style={{ animation: "acc-spin 0.7s linear infinite" }}
              />
              Logging out...
            </>
          ) : (
            <>
              <span style={matIcon} className="text-[20px]">
                logout
              </span>
              Logout
            </>
          )}
        </button>
      </div>

      <div className="mt-6 pb-4 text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span
            className="font-normal"
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: 22,
              background:
                "linear-gradient(135deg, #831843 0%, #be185d 40%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Talish
          </span>
          <span
            className="font-bold uppercase text-gray-600"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 9,
              letterSpacing: "0.3em",
            }}
          >
            Clothes
          </span>
        </div>
        <p className="m-0 text-[10px] text-gray-400">
          Version 1.0.0 &middot; Made with love in India
        </p>
      </div>

      <style>{`
        @keyframes acc-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Account;

import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice, trendingAPI } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import HeroSlideshow from "../components/HeroSlideshow";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";
import DesktopHome from "../components/DesktopHome";
import MobileHome from "../components/MobileHome";
import MobileWelcomeBanner from "../components/MobileWelcomeBanner";
const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Home = () => {
  const { user } = useContext(AuthContext);
  const [trending, setTrending] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  useEffect(() => {
    const fontId = "home-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    try {
      const [trendRes, newRes, dealsRes] = await Promise.all([
        trendingAPI.get(8).catch(() => ({ data: [] })),
        api.get("/products?sort=newest&limit=8").catch(() => ({ data: [] })),
        api.get("/products?sort=discount&limit=8").catch(() => ({ data: [] })),
      ]);

      const extractProducts = (res) =>
        Array.isArray(res.data) ? res.data : res.data?.products || [];

      setTrending(extractProducts(trendRes).slice(0, 8));
      setNewArrivals(extractProducts(newRes).slice(0, 8));
      setDeals(
        extractProducts(dealsRes)
          .filter((p) => (p.discount || 0) > 0 || p.originalPrice > p.price)
          .slice(0, 8),
      );
    } catch (error) {
      console.error("Error loading home data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const categories = [
    {
      name: "Men's Clothing",
      short: "Men",
      icon: "checkroom",
      color: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
    },
    {
      name: "Women's Clothing",
      short: "Women",
      icon: "woman",
      color: "from-pink-500 to-rose-600",
      bg: "bg-pink-50",
    },
    {
      name: "Kids' Clothing",
      short: "Kids",
      icon: "child_care",
      color: "from-yellow-500 to-amber-600",
      bg: "bg-yellow-50",
    },
    {
      name: "Perfumes",
      short: "Perfumes",
      icon: "spa",
      color: "from-purple-500 to-fuchsia-600",
      bg: "bg-purple-50",
    },
    {
      name: "Watches",
      short: "Watches",
      icon: "watch",
      color: "from-slate-500 to-gray-700",
      bg: "bg-slate-50",
    },
    {
      name: "Sunglasses",
      short: "Sunglasses",
      icon: "sunny",
      color: "from-orange-500 to-red-600",
      bg: "bg-orange-50",
    },
    {
      name: "Bags & Wallets",
      short: "Bags",
      icon: "backpack",
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
    },
    {
      name: "Jewelry",
      short: "Jewelry",
      icon: "diamond",
      color: "from-amber-500 to-yellow-600",
      bg: "bg-amber-50",
    },
    {
      name: "Footwear",
      short: "Footwear",
      icon: "footprint",
      color: "from-red-500 to-pink-600",
      bg: "bg-red-50",
    },
    {
      name: "Accessories",
      short: "More",
      icon: "auto_awesome",
      color: "from-cyan-500 to-blue-600",
      bg: "bg-cyan-50",
    },
  ];

  const trustBadges = [
    {
      icon: "local_shipping",
      title: "Free Delivery",
      desc: "On orders above Rs.199",
    },
    {
      icon: "assignment_return",
      title: "Easy Returns",
      desc: "7-day return policy",
    },
    {
      icon: "verified_user",
      title: "Secure Payment",
      desc: "100% safe checkout",
    },
    { icon: "support_agent", title: "24/7 Support", desc: "Dedicated help" },
  ];

  const handleNewsletter = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      showToast("Subscribed successfully! Check your inbox.", "success");
      setNewsletterEmail("");
    }
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="hidden md:block">
        <DesktopHome />
      </div>
      <div className="md:hidden">
        <MobileHome />
      </div>
      <div className="hidden md:block">
        <MobileWelcomeBanner />
        <DesktopHome />
      </div>
      <div className="md:hidden">
        <MobileWelcomeBanner />
        <MobileHome />
      </div>

      <section className="border-y border-gray-100 bg-white py-4 max-md:py-3">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-md:gap-2">
            {trustBadges.map((badge) => (
              <div
                key={badge.title}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all hover:bg-pink-50 max-md:gap-2"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 max-md:h-9 max-md:w-9">
                  <span
                    style={matIcon}
                    className="text-[22px] text-pink-600 max-md:text-[18px]"
                  >
                    {badge.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-bold text-gray-900 max-md:text-xs">
                    {badge.title}
                  </p>
                  <p className="m-0 truncate text-[11px] text-gray-500 max-md:text-[10px]">
                    {badge.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-pink-50/30 to-white py-8 max-md:py-6">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="mb-5 flex items-center justify-between max-md:mb-4">
            <div>
              <h2 className="m-0 text-2xl font-extrabold text-gray-900 max-md:text-xl">
                Shop by Category
              </h2>
              <p className="m-0 mt-0.5 text-xs text-gray-500 max-md:text-[11px]">
                Browse across popular categories
              </p>
            </div>
            <Link
              to="/products"
              className="hidden items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-pink-600 no-underline shadow-sm transition-all hover:shadow-md md:inline-flex"
            >
              View all
              <span style={matIcon} className="text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-10 gap-3 max-lg:grid-cols-5 max-md:grid-cols-5 max-[480px]:grid-cols-4 max-md:gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-transparent bg-white p-3 no-underline shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-pink-100 hover:shadow-lg max-md:p-2 max-[480px]:p-2"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 max-md:h-12 max-md:w-12 max-[480px]:h-11 max-[480px]:w-11 ${cat.bg}`}
                >
                  <span
                    style={matIcon}
                    className={`bg-gradient-to-br bg-clip-text text-[28px] text-transparent max-md:text-[24px] max-[480px]:text-[22px] ${cat.color}`}
                  >
                    {cat.icon}
                  </span>
                </div>
                <span className="text-center text-[11px] font-semibold leading-tight text-gray-700 group-hover:text-pink-600 max-md:text-[10px] max-[480px]:text-[10px]">
                  {cat.short}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {trending.length > 0 && (
        <section className="py-8 max-md:py-6">
          <div className="mx-auto max-w-[1400px] px-4">
            <div className="mb-5 flex items-center justify-between max-md:mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl max-md:h-9 max-md:w-9"
                  style={{
                    background: "linear-gradient(135deg, #ec4899, #be185d)",
                  }}
                >
                  <span
                    style={matIcon}
                    className="text-[22px] text-white max-md:text-[20px]"
                  >
                    local_fire_department
                  </span>
                </div>
                <div>
                  <h2 className="m-0 text-2xl font-extrabold text-gray-900 max-md:text-xl">
                    Trending Now
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-gray-500 max-md:text-[11px]">
                    Most loved by our customers
                  </p>
                </div>
              </div>
              <Link
                to="/products"
                className="hidden items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-pink-600 no-underline shadow-sm transition-all hover:shadow-md md:inline-flex"
              >
                View all
                <span style={matIcon} className="text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>

            {loading ? (
              <div className="py-12">
                <Loader />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-md:gap-3">
                {trending.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {deals.length > 0 && (
        <section
          className="relative overflow-hidden py-10 max-md:py-8"
          style={{
            background:
              "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(236, 72, 153, 0.3), transparent)",
            }}
          />
          <div className="mx-auto max-w-[1400px] px-4">
            <div className="mb-5 flex items-center justify-between max-md:mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md max-md:h-9 max-md:w-9"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  }}
                >
                  <span
                    style={matIcon}
                    className="text-[22px] text-white max-md:text-[20px]"
                  >
                    percent
                  </span>
                </div>
                <div>
                  <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-red-600 max-md:text-[9px]">
                    Limited Time
                  </p>
                  <h2 className="m-0 text-2xl font-extrabold text-gray-900 max-md:text-xl">
                    Deals of the Day
                  </h2>
                </div>
              </div>
              <Link
                to="/products?sort=discount"
                className="hidden items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-600 no-underline shadow-sm transition-all hover:shadow-md md:inline-flex"
              >
                All deals
                <span style={matIcon} className="text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-md:gap-3">
              {deals.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="py-8 max-md:py-6">
          <div className="mx-auto max-w-[1400px] px-4">
            <div className="mb-5 flex items-center justify-between max-md:mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl max-md:h-9 max-md:w-9"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  }}
                >
                  <span
                    style={matIcon}
                    className="text-[22px] text-white max-md:text-[20px]"
                  >
                    auto_awesome
                  </span>
                </div>
                <div>
                  <h2 className="m-0 text-2xl font-extrabold text-gray-900 max-md:text-xl">
                    New Arrivals
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-gray-500 max-md:text-[11px]">
                    Fresh styles just for you
                  </p>
                </div>
              </div>
              <Link
                to="/products?sort=newest"
                className="hidden items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-pink-600 no-underline shadow-sm transition-all hover:shadow-md md:inline-flex"
              >
                See more
                <span style={matIcon} className="text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-md:gap-3">
              {newArrivals.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        className="relative overflow-hidden py-16 max-md:py-12"
        style={{
          background:
            "linear-gradient(135deg, #4a0e2e 0%, #831843 40%, #be185d 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(236, 72, 153, 0.5), transparent)",
            animation: "home-blob 8s ease-in-out infinite",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(244, 114, 182, 0.5), transparent)",
            animation: "home-blob 8s ease-in-out 3s infinite",
          }}
        />

        <div className="relative z-10 mx-auto max-w-[1400px] px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span
              className="mb-3 inline-block font-normal"
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: 32,
                color: "#fce7f3",
              }}
            >
              Join our community
            </span>
            <h2 className="mb-4 text-4xl font-extrabold text-white max-md:text-2xl">
              Get exclusive offers & style updates
            </h2>
            <p className="mb-8 text-base text-pink-100 max-md:text-sm">
              Subscribe to our newsletter and be the first to know about new
              arrivals, exclusive deals, and members-only discounts.
            </p>

            <form onSubmit={handleNewsletter} className="mx-auto max-w-md">
              <div className="flex items-center gap-2 rounded-full bg-white p-1.5 shadow-2xl max-[480px]:flex-col max-[480px]:rounded-2xl max-[480px]:p-2">
                <div className="flex flex-1 items-center gap-2 pl-4 max-[480px]:w-full">
                  <span style={matIcon} className="text-[20px] text-gray-400">
                    mail
                  </span>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    className="flex-1 border-none bg-transparent py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 max-[480px]:py-2.5"
                  />
                </div>
                <button
                  type="submit"
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border-none px-5 py-3 text-sm font-bold text-white transition-all hover:scale-105 max-[480px]:w-full max-[480px]:justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
                  }}
                >
                  Subscribe
                  <span style={matIcon} className="text-[16px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-pink-100 max-md:gap-3 max-md:text-[11px]">
              {[
                { icon: "local_offer", label: "Exclusive Deals" },
                { icon: "notifications_active", label: "Early Access" },
                { icon: "shield", label: "No Spam" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span style={matIcon} className="text-[16px]">
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes home-blob {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.15) translate(20px, -20px); }
        }
      `}</style>
    </div>
  );
};

export default Home;

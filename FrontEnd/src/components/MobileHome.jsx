import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice, trendingAPI, bannersAPI } from "../utils/api";
import { getRecentlyViewed } from "../utils/recentlyViewed";
import ProductCard from "./ProductCard";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const MobileHome = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [products, setProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("For You");

  useEffect(() => {
    const fontId = "mobile-home-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bannerRes, trendRes, newRes, allRes] = await Promise.all([
        bannersAPI.getActive().catch(() => ({ data: [] })),
        trendingAPI.get(8).catch(() => ({ data: [] })),
        api.get("/products?sort=newest&limit=12").catch(() => ({ data: [] })),
        api.get("/products?limit=20").catch(() => ({ data: [] })),
      ]);

      setBanners(Array.isArray(bannerRes.data) ? bannerRes.data : []);

      const extract = (r) =>
        Array.isArray(r.data) ? r.data : r.data?.products || [];

      const trend = extract(trendRes);
      const fresh = extract(newRes);
      const all = extract(allRes);

      const mixed = [];
      const usedIds = new Set();

      const addUnique = (item) => {
        if (item && !usedIds.has(item._id)) {
          mixed.push(item);
          usedIds.add(item._id);
        }
      };

      const maxLen = Math.max(trend.length, fresh.length, all.length);
      for (let i = 0; i < maxLen; i++) {
        addUnique(trend[i]);
        addUnique(fresh[i]);
        addUnique(all[i]);
      }

      setProducts(mixed.slice(0, 24));
      setRecentlyViewed(getRecentlyViewed(10));
    } catch (err) {
      console.error("Home data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    { name: "All Categories", icon: "apps", param: "" },
    { name: "Women's Clothing", icon: "woman", param: "Women's Clothing" },
    { name: "Men's Clothing", icon: "checkroom", param: "Men's Clothing" },
    { name: "Kids' Clothing", icon: "child_care", param: "Kids' Clothing" },
    { name: "Perfumes", icon: "spa", param: "Perfumes" },
    { name: "Watches", icon: "watch", param: "Watches" },
    { name: "Sunglasses", icon: "sunny", param: "Sunglasses" },
    { name: "Bags & Wallets", icon: "backpack", param: "Bags & Wallets" },
    { name: "Jewelry", icon: "diamond", param: "Jewelry" },
    { name: "Footwear", icon: "footprint", param: "Footwear" },
    { name: "Accessories", icon: "auto_awesome", param: "Accessories" },
  ];

  const tabs = ["For You", "Fashion", "Beauty", "Home", "Electronics"];

  const currentBanner = banners[bannerIndex];

  return (
    <div
      className="bg-gray-50 pb-2"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="sticky top-14 z-30 bg-white px-3 pt-3 pb-2 shadow-sm">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 rounded-xl border-2 border-pink-200 bg-white px-3 py-2.5 focus-within:border-pink-500"
        >
          <span style={matIcon} className="text-[22px] text-gray-500">
            search
          </span>
          <input
            type="text"
            placeholder="Search by keyword or product ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            aria-label="Voice search"
            className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-transparent text-gray-500"
          >
            <span style={matIcon} className="text-[20px]">
              mic
            </span>
          </button>
          <button
            type="button"
            aria-label="Image search"
            className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-transparent text-gray-500"
          >
            <span style={matIcon} className="text-[20px]">
              photo_camera
            </span>
          </button>
        </form>
      </div>

      <div className="border-b border-gray-100 bg-white">
        <div className="scrollbar-none flex gap-1 overflow-x-auto px-2 py-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-full border-none px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "text-white shadow-md"
                  : "bg-gray-100 text-gray-700"
              }`}
              style={
                activeTab === tab
                  ? {
                      background: "linear-gradient(135deg, #831843, #ec4899)",
                    }
                  : {}
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 bg-white py-3">
        <div className="scrollbar-none flex gap-3 overflow-x-auto px-3 pb-1">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={
                cat.param
                  ? `/products?category=${encodeURIComponent(cat.param)}`
                  : "/products"
              }
              className="flex min-w-[64px] flex-col items-center gap-1.5 no-underline"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50">
                <span style={matIcon} className="text-[26px] text-pink-600">
                  {cat.icon}
                </span>
              </div>
              <span className="max-w-[64px] truncate text-center text-[10px] font-semibold text-gray-700">
                {cat.name.split(" ")[0]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {banners.length > 0 && currentBanner && (
        <div className="mt-2 px-3">
          <Link
            to={currentBanner.link || "/products"}
            className="relative block overflow-hidden rounded-2xl no-underline shadow-md"
            style={{ aspectRatio: "16/9" }}
          >
            <img
              src={currentBanner.image}
              alt={currentBanner.title || "Banner"}
              className="h-full w-full object-cover"
            />

            {(currentBanner.title || currentBanner.subtitle) && (
              <div
                className="absolute inset-0 flex flex-col justify-end p-4"
                style={{
                  background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,${currentBanner.overlayOpacity || 0.4}) 100%)`,
                  color: currentBanner.textColor || "#ffffff",
                }}
              >
                {currentBanner.subtitle && (
                  <span className="mb-1 inline-block self-start rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur-md">
                    {currentBanner.subtitle}
                  </span>
                )}
                {currentBanner.title && (
                  <h3 className="m-0 text-lg font-extrabold leading-tight drop-shadow-lg">
                    {currentBanner.title}
                  </h3>
                )}
              </div>
            )}

            <div className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-semibold uppercase text-white backdrop-blur-md">
              AD
            </div>

            {banners.length > 1 && (
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {banners.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === bannerIndex ? "w-4 bg-white" : "w-1 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </Link>
        </div>
      )}

      {recentlyViewed.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between px-3">
            <h2 className="m-0 flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <span style={matIcon} className="text-[18px] text-pink-600">
                history
              </span>
              Recently Viewed
            </h2>
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-2">
            {recentlyViewed.map((product) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="block w-[130px] shrink-0 overflow-hidden rounded-xl bg-white shadow-sm no-underline"
              >
                <div className="relative aspect-square bg-gray-50">
                  <img
                    src={product.images?.[0]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p
                    className="m-0 mb-1 text-[11px] font-semibold text-gray-800"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.name}
                  </p>
                  <p className="m-0 text-xs font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-y border-gray-100 bg-white px-2 py-2 text-xs font-semibold text-gray-700">
        <button className="flex items-center gap-1 px-3 py-1">
          <span style={matIcon} className="text-[18px]">
            swap_vert
          </span>
          Sort
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <button className="flex items-center gap-1 px-3 py-1">
          Category
          <span style={matIcon} className="text-[16px]">
            expand_more
          </span>
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <button className="flex items-center gap-1 px-3 py-1">
          Gender
          <span style={matIcon} className="text-[16px]">
            expand_more
          </span>
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <button className="flex items-center gap-1 px-3 py-1">
          <span style={matIcon} className="text-[18px]">
            tune
          </span>
          Filters
        </button>
      </div>

      <div className="mt-2 px-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <span
              style={matIcon}
              className="mb-3 block text-[48px] text-gray-300"
            >
              inventory_2
            </span>
            <p className="m-0 text-sm text-gray-500">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>

      <div className="my-6 flex justify-center">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-full border-2 border-pink-500 bg-white px-6 py-2.5 text-sm font-bold text-pink-600 no-underline transition-all active:bg-pink-50"
        >
          View All Products
          <span style={matIcon} className="text-[18px]">
            arrow_forward
          </span>
        </Link>
      </div>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default MobileHome;

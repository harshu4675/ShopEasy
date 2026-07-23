import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice, trendingAPI, bannersAPI } from "../utils/api";
import { getRecentlyViewed } from "../utils/recentlyViewed";
import ProductCard from "./ProductCard";
import MobileWelcomeBanner from "./MobileWelcomeBanner";

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
  const [trending, setTrending] = useState([]);
  const [deals, setDeals] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
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
      const [bannerRes, trendRes, newRes, dealsRes, allRes] = await Promise.all(
        [
          bannersAPI.getActive().catch(() => ({ data: [] })),
          trendingAPI.get(8).catch(() => ({ data: [] })),
          api.get("/products?sort=newest&limit=8").catch(() => ({ data: [] })),
          api
            .get("/products?sort=discount&limit=8")
            .catch(() => ({ data: [] })),
          api.get("/products?limit=20").catch(() => ({ data: [] })),
        ],
      );

      setBanners(Array.isArray(bannerRes.data) ? bannerRes.data : []);

      const extract = (r) =>
        Array.isArray(r.data) ? r.data : r.data?.products || [];

      const trendArr = extract(trendRes).slice(0, 6);
      const newArr = extract(newRes).slice(0, 6);
      const dealArr = extract(dealsRes)
        .filter((p) => (p.discount || 0) > 0 || p.originalPrice > p.price)
        .slice(0, 6);
      const all = extract(allRes);

      setTrending(trendArr);
      setNewArrivals(newArr);
      setDeals(dealArr);

      const usedIds = new Set([
        ...trendArr.map((p) => p._id),
        ...newArr.map((p) => p._id),
        ...dealArr.map((p) => p._id),
      ]);
      const remaining = all.filter((p) => !usedIds.has(p._id)).slice(0, 20);
      setProducts(remaining);

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

  const SectionHeader = ({ icon, iconBg, title, subtitle, link }) => (
    <div className="mb-2 flex items-center justify-between px-3">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: iconBg }}
        >
          <span style={matIcon} className="text-[18px] text-white">
            {icon}
          </span>
        </div>
        <div>
          <h2 className="m-0 text-sm font-bold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="m-0 text-[10px] text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      {link && (
        <Link
          to={link}
          className="flex items-center gap-0.5 text-[11px] font-bold text-pink-600 no-underline"
        >
          See all
          <span style={matIcon} className="text-[14px]">
            chevron_right
          </span>
        </Link>
      )}
    </div>
  );

  const HorizontalProductRow = ({ items }) => (
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-2">
      {items.map((product) => {
        const disc = product.originalPrice
          ? Math.round(
              ((product.originalPrice - product.price) /
                product.originalPrice) *
                100,
            )
          : product.discount || 0;
        return (
          <Link
            key={product._id}
            to={`/product/${product._id}`}
            className="block w-[140px] shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm no-underline"
          >
            <div className="relative aspect-square bg-white">
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="h-full w-full object-contain p-1.5"
              />
              {disc > 0 && (
                <span
                  className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #831843, #be185d)",
                  }}
                >
                  {disc}% OFF
                </span>
              )}
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
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-[10px] text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div
      className="bg-gray-50 pb-2"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <MobileWelcomeBanner />

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
          <SectionHeader
            icon="history"
            iconBg="linear-gradient(135deg, #6366f1, #4f46e5)"
            title="Recently Viewed"
          />
          <HorizontalProductRow items={recentlyViewed} />
        </div>
      )}

      {trending.length > 0 && (
        <div className="mt-4">
          <SectionHeader
            icon="local_fire_department"
            iconBg="linear-gradient(135deg, #ec4899, #be185d)"
            title="Trending Now"
            subtitle="Most loved by customers"
            link="/products"
          />
          <HorizontalProductRow items={trending} />
        </div>
      )}

      {deals.length > 0 && (
        <div
          className="mt-4 py-4"
          style={{
            background:
              "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
          }}
        >
          <SectionHeader
            icon="percent"
            iconBg="linear-gradient(135deg, #f59e0b, #ef4444)"
            title="Deals of the Day"
            subtitle="Limited time offers"
            link="/products?sort=discount"
          />
          <HorizontalProductRow items={deals} />
        </div>
      )}

      {newArrivals.length > 0 && (
        <div className="mt-4">
          <SectionHeader
            icon="auto_awesome"
            iconBg="linear-gradient(135deg, #8b5cf6, #6366f1)"
            title="New Arrivals"
            subtitle="Fresh styles just in"
            link="/products?sort=newest"
          />
          <HorizontalProductRow items={newArrivals} />
        </div>
      )}

      <div className="mt-4 border-y border-gray-100 bg-white">
        <div className="flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-700">
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
      </div>

      <div className="mt-2 px-2">
        <div className="mb-2 px-1">
          <h2 className="m-0 text-sm font-bold text-gray-900">
            Explore More Products
          </h2>
        </div>
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

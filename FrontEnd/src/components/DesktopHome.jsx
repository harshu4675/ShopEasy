import React, { useState, useEffect, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice, trendingAPI, bannersAPI } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { getRecentlyViewed } from "../utils/recentlyViewed";
import ProductCard from "./ProductCard";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const DesktopHome = () => {
  const { user } = useContext(AuthContext);
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [trending, setTrending] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [deals, setDeals] = useState([]);
  const [products, setProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [copyText, setCopyText] = useState("COPY");

  useEffect(() => {
    const fontId = "desktop-home-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
    const dismissed = sessionStorage.getItem("desktopWelcomeBannerDismissed");
    if (dismissed === "true") setBannerDismissed(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bannerRes, trendRes, newRes, dealsRes, allRes] = await Promise.all(
        [
          bannersAPI.getActive().catch(() => ({ data: [] })),
          trendingAPI.get(15).catch(() => ({ data: [] })),
          api.get("/products?sort=newest&limit=15").catch(() => ({ data: [] })),
          api
            .get("/products?sort=discount&limit=15")
            .catch(() => ({ data: [] })),
          api.get("/products?limit=40").catch(() => ({ data: [] })),
        ],
      );

      setBanners(Array.isArray(bannerRes.data) ? bannerRes.data : []);

      const extract = (r) =>
        Array.isArray(r.data) ? r.data : r.data?.products || [];

      const trendArr = extract(trendRes).slice(0, 15);
      const newArr = extract(newRes).slice(0, 15);
      const dealArr = extract(dealsRes)
        .filter((p) => (p.discount || 0) > 0 || p.originalPrice > p.price)
        .slice(0, 15);
      const all = extract(allRes);

      setTrending(trendArr);
      setNewArrivals(newArr);
      setDeals(dealArr);

      const usedIds = new Set([
        ...trendArr.map((p) => p._id),
        ...newArr.map((p) => p._id),
        ...dealArr.map((p) => p._id),
      ]);
      const remaining = all.filter((p) => !usedIds.has(p._id)).slice(0, 30);
      setProducts(remaining);

      setRecentlyViewed(getRecentlyViewed(15));
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
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleCloseBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("desktopWelcomeBannerDismissed", "true");
  };

  const copyCode = () => {
    navigator.clipboard.writeText("WELCOME100");
    setCopyText("COPIED");
    setTimeout(() => setCopyText("COPY"), 2000);
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

  const currentBanner = banners[bannerIndex];

  const SectionHeader = ({ icon, iconBg, title, subtitle, link }) => (
    <div className="mb-3 flex items-center justify-between px-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md"
          style={{ background: iconBg }}
        >
          <span style={matIcon} className="text-[20px] text-white">
            {icon}
          </span>
        </div>
        <div>
          <h2 className="m-0 text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="m-0 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {link && (
        <Link
          to={link}
          className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-pink-600 no-underline shadow-sm transition-all hover:shadow-md"
        >
          See all
          <span style={matIcon} className="text-[14px]">
            arrow_forward
          </span>
        </Link>
      )}
    </div>
  );

  const HorizontalProductRow = ({ items }) => (
    <div className="scrollbar-none flex gap-3 overflow-x-auto px-2 pb-2">
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
            className="block w-[180px] shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm no-underline transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative aspect-square bg-white">
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="h-full w-full object-contain p-2"
              />
              {disc > 0 && (
                <span
                  className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md"
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
                className="m-0 mb-1 text-xs font-semibold text-gray-800"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  minHeight: "32px",
                }}
              >
                {product.name}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-gray-900">
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
      className="bg-gray-50 pb-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {!bannerDismissed && (
        <Link
          to="/products"
          className="relative block w-full overflow-hidden no-underline"
          style={{
            background:
              "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M20 20v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
          <div className="relative z-10 flex items-center gap-3 px-6 py-2">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <span style={matIcon} className="text-[22px] text-white">
                redeem
              </span>
            </div>
            <div className="flex-1">
              <p className="m-0 flex items-baseline gap-2 text-white">
                <span className="text-sm font-normal opacity-90">
                  {user ? "Hi" : "Welcome"}
                  {user?.name ? ` ${user.name.split(" ")[0]}` : ""}!
                </span>
                <span
                  className="text-base font-extrabold"
                  style={{
                    color: "#fde68a",
                    textShadow: "0 0 8px rgba(253, 230, 138, 0.5)",
                  }}
                >
                  Rs.100 OFF
                </span>
                <span className="text-xs opacity-80">on your first order</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyCode();
                  }}
                  className="ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/40 bg-white/15 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white backdrop-blur-md hover:bg-white/30"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  WELCOME100
                  <span
                    className="rounded bg-white/25 px-1.5 py-0 text-[9px] font-bold"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    {copyText}
                  </span>
                </button>
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCloseBanner();
              }}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
            >
              <span style={matIcon} className="text-[18px]">
                close
              </span>
            </button>
          </div>
        </Link>
      )}

      {banners.length > 0 && currentBanner && (
        <div className="mt-3 px-3">
          <Link
            to={currentBanner.link || "/products"}
            className="relative block w-full overflow-hidden rounded-2xl bg-gray-100 no-underline shadow-lg"
            style={{ maxHeight: "568px" }}
          >
            <img
              src={currentBanner.image}
              alt={currentBanner.title || "Banner"}
              className="block w-full object-cover"
              style={{ maxHeight: "568px", objectPosition: "center" }}
            />
            {(currentBanner.title || currentBanner.subtitle) && (
              <div
                className="absolute inset-0 flex flex-col justify-end p-6"
                style={{
                  background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,${currentBanner.overlayOpacity || 0.4}) 100%)`,
                  color: currentBanner.textColor || "#ffffff",
                }}
              >
                {currentBanner.subtitle && (
                  <span className="mb-2 inline-block self-start rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    {currentBanner.subtitle}
                  </span>
                )}
                {currentBanner.title && (
                  <h3 className="m-0 max-w-2xl text-2xl font-extrabold leading-tight drop-shadow-lg">
                    {currentBanner.title}
                  </h3>
                )}
                {currentBanner.buttonText && (
                  <div className="mt-3">
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white shadow-xl"
                      style={{
                        background: "linear-gradient(135deg, #831843, #ec4899)",
                      }}
                    >
                      {currentBanner.buttonText}
                      <span style={matIcon} className="text-[14px]">
                        arrow_forward
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
            {banners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.preventDefault();
                      setBannerIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === bannerIndex ? "w-8 bg-white" : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </Link>
        </div>
      )}

      <div className="mt-3 bg-white py-3">
        <div className="scrollbar-none flex justify-between gap-3 overflow-x-auto px-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={
                cat.param
                  ? `/products?category=${encodeURIComponent(cat.param)}`
                  : "/products"
              }
              className="flex min-w-[70px] flex-col items-center gap-1.5 no-underline transition-transform hover:scale-110"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 transition-all hover:bg-pink-100">
                <span style={matIcon} className="text-[26px] text-pink-600">
                  {cat.icon}
                </span>
              </div>
              <span className="max-w-[70px] truncate text-center text-[11px] font-semibold text-gray-700">
                {cat.name.split(" ")[0]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {recentlyViewed.length > 0 && (
        <div className="mt-4 px-2">
          <SectionHeader
            icon="history"
            iconBg="linear-gradient(135deg, #6366f1, #4f46e5)"
            title="Recently Viewed"
            subtitle="Pick up where you left off"
          />
          <HorizontalProductRow items={recentlyViewed} />
        </div>
      )}

      {trending.length > 0 && (
        <div className="mt-4 px-2">
          <SectionHeader
            icon="local_fire_department"
            iconBg="linear-gradient(135deg, #ec4899, #be185d)"
            title="Trending Now"
            subtitle="Most loved by our customers"
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
          <div className="px-2">
            <SectionHeader
              icon="percent"
              iconBg="linear-gradient(135deg, #f59e0b, #ef4444)"
              title="Deals of the Day"
              subtitle="Limited time offers"
              link="/products?sort=discount"
            />
            <HorizontalProductRow items={deals} />
          </div>
        </div>
      )}

      {newArrivals.length > 0 && (
        <div className="mt-4 px-2">
          <SectionHeader
            icon="auto_awesome"
            iconBg="linear-gradient(135deg, #8b5cf6, #6366f1)"
            title="New Arrivals"
            subtitle="Fresh styles just for you"
            link="/products?sort=newest"
          />
          <HorizontalProductRow items={newArrivals} />
        </div>
      )}

      <div className="mt-4 px-2">
        <SectionHeader
          icon="explore"
          iconBg="linear-gradient(135deg, #06b6d4, #0891b2)"
          title="Explore More Products"
          subtitle="Discover something new every day"
          link="/products"
        />
        {loading ? (
          <div className="scrollbar-none flex gap-3 overflow-x-auto px-2 pb-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-[260px] w-[180px] shrink-0 animate-pulse rounded-xl bg-gray-200"
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
          <HorizontalProductRow items={products} />
        )}
      </div>

      <div className="my-8 flex justify-center">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-full border-2 border-pink-500 bg-white px-8 py-3 text-sm font-bold text-pink-600 no-underline transition-all hover:bg-pink-50"
        >
          View All Products
          <span style={matIcon} className="text-[20px]">
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

export default DesktopHome;

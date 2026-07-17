import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { trendingAPI, api, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";
import useDebounce from "../../hooks/useDebounce";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const ManageTrending = () => {
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 350);

  useEffect(() => {
    const fontId = "admin-trending-fonts";
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
      const res = await trendingAPI.getAdminAll();
      setPinned(res.data.pinned || []);
      setBestSellers(res.data.bestSellers || []);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Error loading trending data",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!showSearchModal) return;

    const search = async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await api.get(
          `/products?search=${encodeURIComponent(debouncedSearch)}&limit=12`,
        );
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.products || [];
        setSearchResults(data.slice(0, 12));
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };
    search();
  }, [debouncedSearch, showSearchModal]);

  const handleToggle = async (productId) => {
    setTogglingId(productId);
    try {
      await trendingAPI.toggle(productId);
      await fetchData();
      showToast("Trending status updated", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Error updating", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...pinned];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setPinned(reordered);
    setDragIndex(index);
  };

  const handleDragEnd = async () => {
    setDragIndex(null);
    try {
      const orders = pinned.map((p, i) => ({ id: p._id, order: i }));
      await trendingAPI.reorder(orders);
      showToast("Order saved", "success");
    } catch (err) {
      showToast("Failed to save order", "error");
      fetchData();
    }
  };

  const handleRecalculate = async () => {
    if (
      !window.confirm(
        "This will recalculate sales count from all delivered orders. Continue?",
      )
    )
      return;

    setRecalculating(true);
    try {
      const res = await trendingAPI.recalculateSales();
      showToast(
        `Sales recalculated for ${res.data.updated} products`,
        "success",
      );
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Error recalculating", "error");
    } finally {
      setRecalculating(false);
    }
  };

  const isPinned = (productId) => pinned.some((p) => p._id === productId);

  if (loading) return <Loader fullScreen />;

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-gray-50 py-8 max-md:py-5"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-gray-900 max-md:text-2xl">
              Trending Products
            </h1>
            <p className="m-0 text-sm text-gray-500">
              {pinned.length} pinned &middot; {bestSellers.length} auto best
              sellers
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-pink-500 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {recalculating ? (
                <span
                  className="inline-block h-4 w-4 rounded-full border-2 border-pink-200 border-t-pink-500"
                  style={{ animation: "trend-spin 0.7s linear infinite" }}
                />
              ) : (
                <span style={matIcon} className="text-[18px]">
                  sync
                </span>
              )}
              {recalculating ? "Recalculating..." : "Recalculate Sales"}
            </button>
            <button
              onClick={() => {
                setShowSearchModal(true);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{
                background:
                  "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
              }}
            >
              <span style={matIcon} className="text-[20px]">
                push_pin
              </span>
              Pin Product
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-4 max-md:grid-cols-1">
          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span
                style={matIcon}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-[22px] text-pink-600"
              >
                push_pin
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-pink-700">
                Pinned
              </span>
            </div>
            <p className="m-0 text-2xl font-extrabold text-gray-900">
              {pinned.length}
            </p>
            <p className="m-0 mt-1 text-xs text-gray-500">
              Manually featured products
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span
                style={matIcon}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[22px] text-blue-600"
              >
                trending_up
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Best Sellers
              </span>
            </div>
            <p className="m-0 text-2xl font-extrabold text-gray-900">
              {bestSellers.length}
            </p>
            <p className="m-0 mt-1 text-xs text-gray-500">
              Auto-detected from sales
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span
                style={matIcon}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[22px] text-purple-600"
              >
                shopping_bag
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                Total Sold
              </span>
            </div>
            <p className="m-0 text-2xl font-extrabold text-gray-900">
              {bestSellers.reduce((sum, p) => sum + (p.salesCount || 0), 0)}
            </p>
            <p className="m-0 mt-1 text-xs text-gray-500">
              Across best sellers
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-md:p-4">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                style={matIcon}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-[22px] text-pink-600"
              >
                push_pin
              </span>
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  Pinned Trending Products
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-500">
                  Drag to reorder &middot; Shown first on homepage
                </p>
              </div>
            </div>
          </div>

          {pinned.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
              <span
                style={matIcon}
                className="mb-3 block text-[48px] text-gray-300"
              >
                push_pin
              </span>
              <p className="m-0 mb-4 text-sm text-gray-500">
                No products pinned yet
              </p>
              <button
                onClick={() => {
                  setShowSearchModal(true);
                  setSearchQuery("");
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none px-5 py-2.5 text-sm font-semibold text-white transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
                }}
              >
                <span style={matIcon} className="text-[18px]">
                  add
                </span>
                Pin your first product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-[400px]:grid-cols-1">
              {pinned.map((product, index) => (
                <div
                  key={product._id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 hover:shadow-lg ${
                    dragIndex === index
                      ? "scale-[0.98] border-pink-500 opacity-70"
                      : "border-gray-100"
                  }`}
                >
                  <div className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-xs font-bold text-white backdrop-blur-md">
                    {index + 1}
                  </div>

                  <div
                    className="absolute right-2 top-2 z-10 cursor-grab rounded-lg bg-black/50 p-1 text-white backdrop-blur-md active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <span style={matIcon} className="text-[18px]">
                      drag_indicator
                    </span>
                  </div>

                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                    {product.salesCount > 0 && (
                      <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-gray-800 backdrop-blur-md">
                        <span style={matIcon} className="text-[12px]">
                          shopping_bag
                        </span>
                        {product.salesCount} sold
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-pink-600">
                      {product.brand || "Product"}
                    </p>
                    <p
                      className="m-0 mb-2 text-sm font-semibold text-gray-900"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {product.name}
                    </p>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice > product.price && (
                        <span className="text-[11px] text-gray-400 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggle(product._id)}
                      disabled={togglingId === product._id}
                      className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border-none bg-red-50 py-2 text-xs font-semibold text-red-700 transition-all hover:bg-red-500 hover:text-white disabled:opacity-60"
                    >
                      {togglingId === product._id ? (
                        <span
                          className="inline-block h-3 w-3 rounded-full border-2 border-red-200 border-t-red-500"
                          style={{
                            animation: "trend-spin 0.7s linear infinite",
                          }}
                        />
                      ) : (
                        <span style={matIcon} className="text-[16px]">
                          push_pin
                        </span>
                      )}
                      Unpin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-md:p-4">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                style={matIcon}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[22px] text-blue-600"
              >
                trending_up
              </span>
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  Auto Best Sellers
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-500">
                  Top selling products based on delivered orders
                </p>
              </div>
            </div>
          </div>

          {bestSellers.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
              <span
                style={matIcon}
                className="mb-3 block text-[48px] text-gray-300"
              >
                trending_up
              </span>
              <p className="m-0 mb-1 text-sm font-semibold text-gray-700">
                No sales data yet
              </p>
              <p className="m-0 text-xs text-gray-500">
                Products will appear here once you have delivered orders
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Rank
                    </th>
                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Product
                    </th>
                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Price
                    </th>
                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Sold
                    </th>
                    <th className="py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.map((product, index) => (
                    <tr
                      key={product._id}
                      className="border-b border-gray-100 transition-colors hover:bg-pink-50/40"
                    >
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                            index === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : index === 1
                                ? "bg-gray-200 text-gray-700"
                                : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.images?.[0]}
                            alt={product.name}
                            className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="m-0 truncate text-sm font-semibold text-gray-900">
                              {product.name}
                            </p>
                            <p className="m-0 text-[11px] text-gray-500">
                              {product.brand} &middot; {product.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-bold text-gray-900">
                          {formatPrice(product.price)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                          <span style={matIcon} className="text-[14px]">
                            shopping_bag
                          </span>
                          {product.salesCount}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggle(product._id)}
                          disabled={togglingId === product._id}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border-none bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-pink-600 disabled:opacity-60"
                        >
                          {togglingId === product._id ? (
                            <span
                              className="inline-block h-3 w-3 rounded-full border-2 border-white/30 border-t-white"
                              style={{
                                animation: "trend-spin 0.7s linear infinite",
                              }}
                            />
                          ) : (
                            <span style={matIcon} className="text-[14px]">
                              push_pin
                            </span>
                          )}
                          Pin
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showSearchModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm max-md:pt-4"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "trend-modal-in 0.2s ease" }}
          >
            <div
              className="flex items-center justify-between border-b border-gray-100 px-6 py-4"
              style={{
                background: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)",
              }}
            >
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  Pin Product as Trending
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-600">
                  Search and select a product to feature on homepage
                </p>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/80 text-gray-700 transition-colors hover:bg-white"
              >
                <span style={matIcon} className="text-[22px]">
                  close
                </span>
              </button>
            </div>

            <div className="p-6 max-md:p-4">
              <div className="mb-4 flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-white focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-100">
                <span
                  style={matIcon}
                  className="ml-4 text-[20px] text-gray-400"
                >
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by product name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="flex-1 border-none bg-transparent px-3 py-3.5 text-base outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mr-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <span style={matIcon} className="text-[16px]">
                      close
                    </span>
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {searchLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                    <span
                      className="inline-block h-5 w-5 rounded-full border-2 border-pink-200 border-t-pink-500"
                      style={{ animation: "trend-spin 0.7s linear infinite" }}
                    />
                    Searching...
                  </div>
                )}

                {!searchLoading &&
                  searchQuery.trim().length >= 2 &&
                  searchResults.length === 0 && (
                    <div className="py-8 text-center">
                      <span
                        style={matIcon}
                        className="mb-2 block text-[40px] text-gray-300"
                      >
                        search_off
                      </span>
                      <p className="m-0 text-sm text-gray-500">
                        No products found for "{searchQuery}"
                      </p>
                    </div>
                  )}

                {!searchLoading && searchQuery.trim().length < 2 && (
                  <div className="py-8 text-center">
                    <span
                      style={matIcon}
                      className="mb-2 block text-[40px] text-gray-300"
                    >
                      inventory_2
                    </span>
                    <p className="m-0 text-sm text-gray-500">
                      Type at least 2 characters to search
                    </p>
                  </div>
                )}

                {!searchLoading && searchResults.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                    {searchResults.map((product) => {
                      const pinned = isPinned(product._id);
                      return (
                        <div
                          key={product._id}
                          className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                            pinned
                              ? "border-pink-200 bg-pink-50"
                              : "border-gray-100 hover:border-pink-300 hover:bg-pink-50/40"
                          }`}
                        >
                          <img
                            src={product.images?.[0]}
                            alt={product.name}
                            className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-semibold text-gray-900">
                              {product.name}
                            </p>
                            <p className="m-0 text-[11px] text-gray-500">
                              {product.brand}
                            </p>
                            <p className="m-0 text-xs font-bold text-gray-900">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggle(product._id)}
                            disabled={togglingId === product._id}
                            className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-2 text-xs font-semibold transition-all disabled:opacity-60 ${
                              pinned
                                ? "bg-red-100 text-red-700 hover:bg-red-500 hover:text-white"
                                : "bg-pink-500 text-white hover:bg-pink-600"
                            }`}
                          >
                            {togglingId === product._id ? (
                              <span
                                className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent"
                                style={{
                                  animation: "trend-spin 0.7s linear infinite",
                                }}
                              />
                            ) : (
                              <span style={matIcon} className="text-[14px]">
                                {pinned ? "close" : "push_pin"}
                              </span>
                            )}
                            {pinned ? "Unpin" : "Pin"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes trend-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes trend-modal-in {
          from { opacity: 0; transform: translateY(-20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ManageTrending;

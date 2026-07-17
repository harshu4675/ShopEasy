import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import useDebounce from "../hooks/useDebounce";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const SearchSuggestions = ({
  query,
  onSelect,
  onClose,
  placement = "desktop",
}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const abortRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchResults = async () => {
      setLoading(true);
      setShowDropdown(true);
      try {
        const response = await api.get(
          `/products?search=${encodeURIComponent(debouncedQuery.trim())}&limit=6`,
          { signal: controller.signal },
        );
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.products || [];
        setResults(data.slice(0, 6));
      } catch (error) {
        if (error.name !== "CanceledError" && error.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    return () => controller.abort();
  }, [debouncedQuery]);

  const handleSelect = (id) => {
    setShowDropdown(false);
    onSelect && onSelect();
    navigate(`/product/${id}`);
  };

  const handleViewAll = () => {
    setShowDropdown(false);
    onSelect && onSelect();
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  if (!showDropdown || !query || query.trim().length < 2) return null;

  const isMobile = placement === "mobile";

  return (
    <div
      className={`absolute left-0 right-0 z-[200] mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ${
        isMobile ? "top-full" : "top-full"
      }`}
      style={{ animation: "search-drop 0.18s ease" }}
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 px-5 py-4 text-sm text-gray-500">
          <span
            className="inline-block h-4 w-4 rounded-full border-2 border-pink-200 border-t-pink-500"
            style={{ animation: "spin 0.7s linear infinite" }}
          />
          Searching...
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="px-5 py-6 text-center">
          <span
            style={matIcon}
            className="mb-2 block text-[36px] text-gray-300"
          >
            search_off
          </span>
          <p className="m-0 text-sm text-gray-500">
            No products found for "{query}"
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="border-b border-gray-100 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Products
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {results.map((product) => {
              const discountPercent = product.originalPrice
                ? Math.round(
                    ((product.originalPrice - product.price) /
                      product.originalPrice) *
                      100,
                  )
                : product.discount || 0;

              return (
                <button
                  key={product._id}
                  onClick={() => handleSelect(product._id)}
                  className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-left transition-all duration-150 hover:bg-pink-50"
                >
                  <img
                    src={product.images?.[0]}
                    alt={product.name}
                    className="h-14 w-14 shrink-0 rounded-lg border border-gray-100 bg-gray-50 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 mb-0.5 truncate text-sm font-semibold text-gray-800">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-pink-600">
                        {product.brand}
                      </span>
                      {product.category && (
                        <>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-500">
                            {product.category}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice > product.price && (
                        <>
                          <span className="text-[11px] text-gray-400 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                            {discountPercent}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    style={matIcon}
                    className="shrink-0 text-[20px] text-gray-300"
                  >
                    arrow_forward
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleViewAll}
            className="flex w-full cursor-pointer items-center justify-center gap-2 border-t border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50 px-5 py-3 text-sm font-semibold text-pink-600 transition-all duration-200 hover:from-pink-100 hover:to-purple-100"
          >
            View all results for "{query}"
            <span style={matIcon} className="text-[18px]">
              arrow_forward
            </span>
          </button>
        </>
      )}

      <style>{`
        @keyframes search-drop {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SearchSuggestions;

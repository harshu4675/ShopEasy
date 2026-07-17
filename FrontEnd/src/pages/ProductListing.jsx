import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";
import useDebounce from "../hooks/useDebounce";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const ProductListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    sort: searchParams.get("sort") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    size: searchParams.get("size") || "",
  });

  const debouncedSearch = useDebounce(filters.search, 400);
  const debouncedMinPrice = useDebounce(filters.minPrice, 500);
  const debouncedMaxPrice = useDebounce(filters.maxPrice, 500);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.category) params.set("category", filters.category);
    if (filters.sort) params.set("sort", filters.sort);
    if (debouncedMinPrice) params.set("minPrice", debouncedMinPrice);
    if (debouncedMaxPrice) params.set("maxPrice", debouncedMaxPrice);
    if (filters.size) params.set("size", filters.size);
    setSearchParams(params, { replace: true });
  }, [
    debouncedSearch,
    debouncedMinPrice,
    debouncedMaxPrice,
    filters.category,
    filters.sort,
    filters.size,
    setSearchParams,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append("search", debouncedSearch);
        if (filters.category && filters.category !== "All")
          params.append("category", filters.category);
        if (filters.sort) params.append("sort", filters.sort);
        if (debouncedMinPrice) params.append("minPrice", debouncedMinPrice);
        if (debouncedMaxPrice) params.append("maxPrice", debouncedMaxPrice);
        if (filters.size) params.append("size", filters.size);

        const response = await api.get(`/products?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.products || [];
        setProducts(data);
      } catch (error) {
        if (error.name !== "CanceledError" && error.name !== "AbortError") {
          console.error("Error fetching products:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [
    debouncedSearch,
    debouncedMinPrice,
    debouncedMaxPrice,
    filters.category,
    filters.sort,
    filters.size,
  ]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "",
      sort: "",
      minPrice: "",
      maxPrice: "",
      size: "",
    });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v && v !== "All",
  ).length;

  const categories = [
    "All",
    "Men's Clothing",
    "Women's Clothing",
    "Kids' Clothing",
    "Perfumes",
    "Watches",
    "Sunglasses",
    "Bags & Wallets",
    "Jewelry",
    "Footwear",
    "Accessories",
  ];

  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

  return (
    <div
      className="min-h-[calc(100vh-200px)] pb-16 pt-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 max-md:flex-col max-md:items-start">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-gray-900 max-md:text-2xl">
              {filters.category || "All Products"}
            </h1>
            <p className="m-0 text-sm text-gray-500">
              {loading
                ? "Loading products..."
                : `${products.length} products found`}
            </p>
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="hidden cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-5 py-3 font-semibold text-gray-700 transition-all duration-200 hover:border-pink-500 hover:text-pink-600 max-[1024px]:flex"
          >
            <span style={matIcon} className="text-[20px]">
              tune
            </span>
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>

        <div className="grid grid-cols-[280px_1fr] gap-8 max-[1024px]:grid-cols-1">
          <aside
            className={`h-fit rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-[1024px]:fixed max-[1024px]:top-0 max-[1024px]:z-[1001] max-[1024px]:h-screen max-[1024px]:w-[320px] max-[1024px]:max-w-[85%] max-[1024px]:overflow-y-auto max-[1024px]:rounded-none max-[1024px]:transition-[left] max-[1024px]:duration-300 lg:sticky lg:top-24 ${
              filtersOpen ? "max-[1024px]:left-0" : "max-[1024px]:-left-full"
            }`}
          >
            <div className="mb-6 flex items-center justify-between border-b-2 border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="cursor-pointer border-none bg-transparent text-sm font-semibold text-pink-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="hidden cursor-pointer rounded-full border-none bg-gray-100 p-1.5 text-gray-600 max-[1024px]:block"
                >
                  <span style={matIcon} className="text-[18px]">
                    close
                  </span>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Search
              </label>
              <div className="relative">
                <span
                  style={matIcon}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-400"
                >
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-pink-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Category
              </label>
              <div className="flex flex-col gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      handleFilterChange("category", cat === "All" ? "" : cat)
                    }
                    className={`cursor-pointer rounded-lg border-none px-3.5 py-2.5 text-left text-sm transition-all duration-200 ${
                      filters.category === cat ||
                      (cat === "All" && !filters.category)
                        ? "bg-pink-50 font-semibold text-pink-700"
                        : "bg-transparent text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Price Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) =>
                    handleFilterChange("minPrice", e.target.value)
                  }
                  className="w-full flex-1 rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-pink-500"
                />
                <span className="text-sm text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    handleFilterChange("maxPrice", e.target.value)
                  }
                  className="w-full flex-1 rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-pink-500"
                />
              </div>
            </div>

            <div className="mb-2">
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Size
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      handleFilterChange(
                        "size",
                        filters.size === size ? "" : size,
                      )
                    }
                    className={`cursor-pointer rounded-lg border-2 px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                      filters.size === size
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-pink-500"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm max-md:flex-col max-md:items-stretch max-md:gap-3">
              <span className="text-sm font-semibold text-gray-700">
                {products.length} Results
              </span>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Sort by:</label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                  className="cursor-pointer rounded-lg border-2 border-gray-200 px-4 py-2 text-sm outline-none transition-all duration-200 focus:border-pink-500"
                >
                  <option value="">Relevance</option>
                  <option value="newest">Newest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="discount">Best Discount</option>
                </select>
              </div>
            </div>

            {loading ? (
              <Loader />
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white px-5 py-20 text-center shadow-sm">
                <span
                  style={matIcon}
                  className="mb-4 block text-[64px] text-gray-300"
                >
                  search_off
                </span>
                <h3 className="mb-2 text-xl font-bold text-gray-800">
                  No products found
                </h3>
                <p className="mb-5 text-gray-500">
                  Try adjusting your filters or search terms
                </p>
                <button
                  onClick={clearFilters}
                  className="cursor-pointer rounded-lg border-none px-6 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 max-md:grid-cols-2 max-md:gap-3 max-[480px]:grid-cols-2">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div
          className="fixed inset-0 z-[1000] hidden bg-black/50 backdrop-blur-sm max-[1024px]:block"
          onClick={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductListing;

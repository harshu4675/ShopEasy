import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, categoriesAPI, formatPrice } from "../utils/api";
import Loader from "../components/Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Categories = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [selectedSub, setSelectedSub] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const fontId = "categories-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesAPI.getAll(true);
      const cats = Array.isArray(res.data) ? res.data : [];
      setCategories(cats);

      const catParam = searchParams.get("cat");
      const subParam = searchParams.get("sub");

      if (catParam) {
        const found = cats.find(
          (c) => c._id === catParam || c.slug === catParam,
        );
        if (found) {
          setActiveCategoryId(found._id);
          if (subParam) setSelectedSub(subParam);
        } else if (cats.length > 0) {
          setActiveCategoryId(cats[0]._id);
        }
      } else if (cats.length > 0) {
        setActiveCategoryId(cats[0]._id);
      }
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const activeCategory = categories.find((c) => c._id === activeCategoryId);

  useEffect(() => {
    if (!activeCategory) return;

    const params = new URLSearchParams();
    params.set("cat", activeCategory.slug);
    if (selectedSub) params.set("sub", selectedSub);
    setSearchParams(params, { replace: true });

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("category", activeCategory.name);
        if (selectedSub) query.set("subCategory", selectedSub);
        query.set("limit", "20");

        const res = await api.get(`/products?${query.toString()}`);
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.products || [];
        setProducts(data);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [activeCategory, selectedSub, setSearchParams]);

  const handleCategoryClick = (catId) => {
    setActiveCategoryId(catId);
    setSelectedSub("");
    window.scrollTo(0, 0);
  };

  const handleSubClick = (subName) => {
    setSelectedSub(selectedSub === subName ? "" : subName);
  };

  const activeSubs =
    activeCategory?.subCategories?.filter((s) => s.isActive !== false) || [];

  if (loading) return <Loader fullScreen />;

  if (categories.length === 0) {
    return (
      <div
        className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center bg-white px-6 py-10"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <span style={matIcon} className="mb-4 text-[64px] text-gray-300">
          category
        </span>
        <h2 className="mb-2 text-lg font-bold text-gray-900">
          No categories available
        </h2>
        <p className="mb-4 text-center text-sm text-gray-500">
          Categories will appear here once added
        </p>
        <Link
          to="/products"
          className="rounded-full px-6 py-2.5 text-sm font-bold text-white no-underline"
          style={{
            background: "linear-gradient(135deg, #831843, #ec4899)",
          }}
        >
          Browse All Products
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex bg-gray-50"
      style={{
        fontFamily: "'Poppins', sans-serif",
        minHeight: "calc(100vh - 120px)",
      }}
    >
      <aside
        className="sticky shrink-0 overflow-y-auto border-r border-gray-200 bg-white"
        style={{
          top: "56px",
          height: "calc(100vh - 120px)",
          width: "88px",
        }}
      >
        {categories.map((cat) => {
          const isActive = cat._id === activeCategoryId;
          return (
            <button
              key={cat._id}
              onClick={() => handleCategoryClick(cat._id)}
              className={`relative flex w-full cursor-pointer flex-col items-center gap-1 border-none px-1 py-3 text-center transition-all ${
                isActive ? "bg-pink-50" : "bg-white active:bg-gray-50"
              }`}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r"
                  style={{
                    background: "linear-gradient(180deg, #831843, #ec4899)",
                  }}
                />
              )}
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                  isActive ? "shadow-md" : "bg-gray-100"
                }`}
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
                      }
                    : {}
                }
              >
                <span
                  style={matIcon}
                  className={`text-[22px] ${isActive ? "text-pink-600" : "text-gray-500"}`}
                >
                  {cat.icon || "category"}
                </span>
              </div>
              <span
                className={`text-[10px] leading-tight ${
                  isActive
                    ? "font-bold text-pink-700"
                    : "font-medium text-gray-600"
                }`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </aside>

      <main className="min-w-0 flex-1">
        {activeCategory && (
          <>
            <div className="sticky top-14 z-20 border-b border-gray-100 bg-white px-4 py-3">
              <div className="mb-1 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
                  }}
                >
                  <span style={matIcon} className="text-[18px] text-pink-600">
                    {activeCategory.icon || "category"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="m-0 truncate text-sm font-bold text-gray-900">
                    {activeCategory.name}
                  </h1>
                  <p className="m-0 text-[10px] text-gray-500">
                    {activeSubs.length}{" "}
                    {activeSubs.length === 1 ? "category" : "categories"}
                  </p>
                </div>
              </div>
            </div>

            {activeSubs.length > 0 && (
              <div className="bg-white px-3 py-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedSub("")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all ${
                      !selectedSub
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: !selectedSub
                          ? "linear-gradient(135deg, #831843, #ec4899)"
                          : "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
                      }}
                    >
                      <span
                        style={matIcon}
                        className={`text-[22px] ${!selectedSub ? "text-white" : "text-gray-500"}`}
                      >
                        apps
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${!selectedSub ? "text-pink-700" : "text-gray-700"}`}
                    >
                      All
                    </span>
                  </button>

                  {activeSubs
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((sub) => {
                      const isSel = selectedSub === sub.name;
                      return (
                        <button
                          key={sub._id}
                          onClick={() => handleSubClick(sub.name)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all ${
                            isSel
                              ? "border-pink-500 bg-pink-50"
                              : "border-gray-200 bg-white active:border-pink-300"
                          }`}
                        >
                          <div
                            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ${
                              !sub.image ? "" : ""
                            }`}
                            style={
                              !sub.image
                                ? {
                                    background: isSel
                                      ? "linear-gradient(135deg, #831843, #ec4899)"
                                      : "linear-gradient(135deg, #fce7f3, #fbcfe8)",
                                  }
                                : {}
                            }
                          >
                            {sub.image ? (
                              <img
                                src={sub.image}
                                alt={sub.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span
                                style={matIcon}
                                className={`text-[22px] ${isSel ? "text-white" : "text-pink-600"}`}
                              >
                                label
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-center text-[10px] font-semibold leading-tight ${isSel ? "text-pink-700" : "text-gray-700"}`}
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {sub.name}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2.5">
              <div>
                <p className="m-0 text-[11px] text-gray-500">
                  {selectedSub
                    ? `${activeCategory.name} > ${selectedSub}`
                    : `All ${activeCategory.name}`}
                </p>
                <p className="m-0 text-sm font-bold text-gray-900">
                  {productsLoading
                    ? "Loading..."
                    : `${products.length} ${products.length === 1 ? "product" : "products"}`}
                </p>
              </div>
              {selectedSub && (
                <button
                  onClick={() => setSelectedSub("")}
                  className="flex items-center gap-1 rounded-lg bg-pink-50 px-2.5 py-1.5 text-[11px] font-bold text-pink-600"
                >
                  <span style={matIcon} className="text-[14px]">
                    close
                  </span>
                  Clear
                </button>
              )}
            </div>

            <div className="p-2">
              {productsLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] animate-pulse rounded-xl bg-gray-200"
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl bg-white px-4 py-12 text-center">
                  <span
                    style={matIcon}
                    className="mb-3 block text-[48px] text-gray-300"
                  >
                    inventory_2
                  </span>
                  <h3 className="m-0 mb-2 text-base font-bold text-gray-800">
                    No products found
                  </h3>
                  <p className="m-0 mb-4 text-xs text-gray-500">
                    {selectedSub
                      ? `No products in ${selectedSub} yet`
                      : `No products in ${activeCategory.name} yet`}
                  </p>
                  {selectedSub && (
                    <button
                      onClick={() => setSelectedSub("")}
                      className="rounded-lg border-2 border-pink-500 bg-white px-4 py-2 text-xs font-bold text-pink-600"
                    >
                      Show all in {activeCategory.name}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {products.map((product) => {
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
                        className="block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm no-underline"
                      >
                        <div className="relative aspect-[3/4] bg-gray-50">
                          <img
                            src={product.images?.[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                          {disc > 0 && (
                            <span
                              className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md"
                              style={{
                                background:
                                  "linear-gradient(135deg, #831843, #be185d)",
                              }}
                            >
                              {disc}% OFF
                            </span>
                          )}
                        </div>
                        <div className="p-2">
                          {product.brand && (
                            <p className="m-0 mb-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-pink-600">
                              {product.brand}
                            </p>
                          )}
                          <p
                            className="m-0 mb-1 text-[11px] font-semibold text-gray-800"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: "28px",
                            }}
                          >
                            {product.name}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-gray-900">
                              {formatPrice(product.price)}
                            </span>
                            {product.originalPrice > product.price && (
                              <span className="text-[9px] text-gray-400 line-through">
                                {formatPrice(product.originalPrice)}
                              </span>
                            )}
                          </div>
                          {product.rating > 0 && (
                            <div className="mt-1 inline-flex items-center gap-0.5 rounded bg-green-600 px-1 py-0.5 text-[9px] font-bold text-white">
                              {product.rating.toFixed(1)}
                              <span style={matIcon} className="text-[10px]">
                                star
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {!productsLoading && products.length > 0 && (
                <div className="mt-4 flex justify-center pb-4">
                  <Link
                    to={`/products?category=${encodeURIComponent(activeCategory.name)}${selectedSub ? `&subCategory=${encodeURIComponent(selectedSub)}` : ""}`}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-pink-500 bg-white px-5 py-2 text-xs font-bold text-pink-600 no-underline"
                  >
                    View all products
                    <span style={matIcon} className="text-[16px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Categories;

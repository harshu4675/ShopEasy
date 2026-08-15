import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import Loader from "../../components/Loader";

const STATUS_META = {
  draft: { label: "Draft", bg: "#fff3e0", color: "#e65100" },
  published: { label: "Published", bg: "#e8f5e9", color: "#2e7d32" },
  unpublished: { label: "Unpublished", bg: "#eceff1", color: "#546e7a" },
};

const platformLabel = (platform) => {
  if (!platform) return "—";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.unpublished;
  return (
    <span
      className="inline-block rounded-[50px] px-3 py-1 text-[12px] font-bold"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
};

const AffiliateProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/affiliate");
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      showToast("Error fetching affiliate products", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const patch = async (id, action) => {
    setBusy(id);
    try {
      const { data } = await api.patch(`/admin/affiliate/${id}/${action}`);
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, ...data.product } : p)),
      );
      showToast(
        action === "publish" ? "Product published" : "Product unpublished",
        "success",
      );
    } catch (error) {
      showToast(
        error.response?.data?.message || "Update failed",
        "error",
      );
    } finally {
      setBusy(null);
    }
  };

  const reimport = async (id) => {
    setBusy(id);
    try {
      const { data } = await api.post(`/admin/affiliate/${id}/reimport`);
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, ...data.product } : p)),
      );
      showToast("Product data refreshed", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Re-import failed",
        "error",
      );
      fetchProducts();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this affiliate product? This cannot be undone."))
      return;
    setBusy(id);
    try {
      await api.delete(`/admin/affiliate/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      showToast("Product deleted", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Delete failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const filtered = products.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [p.name, p.brand, p.externalProductId, p.sourcePlatform]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q));
  });

  if (loading) return <Loader fullScreen />;

  const filterChips = [
    ["all", "All"],
    ["draft", "Draft"],
    ["published", "Published"],
    ["unpublished", "Unpublished"],
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-5 md:px-4">
        {/* Header */}
        <div className="mb-[26px] flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="m-0 text-[26px] font-bold text-gray-900 md:text-[22px]">
              Affiliate Products ({products.length})
            </h1>
            <p className="m-0 mt-1 text-[13px] text-gray-500">
              Paste an external product URL, review the imported data, then
              publish it to the store.
            </p>
          </div>
          <Link
            to="/admin/affiliate/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-none px-6 py-3.5 text-[15px] font-semibold text-white no-underline shadow-md transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #e91e63, #9c27b0)",
              boxShadow: "0 4px 15px rgba(233, 30, 99, 0.3)",
            }}
          >
            <span style={matIcon} className="text-[20px]">
              add_link
            </span>
            Add Affiliate Product
          </Link>
        </div>

        {/* Search + filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-col md:items-stretch">
          <div className="relative min-w-[260px] flex-1">
            <span
              style={matIcon}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400"
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search title, brand, ASIN or platform..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 py-3 pl-12 pr-4 text-[14px] outline-none transition-all focus:border-pink-500 focus:shadow-[0_0_0_3px_#f8bbd9]"
            />
          </div>
          <div className="flex gap-2">
            {filterChips.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className="cursor-pointer rounded-full border-none px-4 py-2 text-[13px] font-semibold transition-all"
                style={{
                  background:
                    statusFilter === value
                      ? "linear-gradient(135deg, #e91e63, #9c27b0)"
                      : "#f3f4f6",
                  color: statusFilter === value ? "#fff" : "#4b5563",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <span
              style={matIcon}
              className="mb-3 block text-[52px] text-gray-300"
            >
              link_off
            </span>
            <h3 className="mb-2 text-[20px] font-bold text-gray-700">
              No affiliate products found
            </h3>
            <p className="mb-6 text-sm text-gray-500">
              Import your first external product to get started.
            </p>
            <Link
              to="/admin/affiliate/new"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white no-underline"
              style={{ background: "linear-gradient(135deg, #e91e63, #9c27b0)" }}
            >
              <span style={matIcon} className="text-[18px]">
                add_link
              </span>
              Add Affiliate Product
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="block overflow-hidden rounded-xl bg-white shadow-sm md:!hidden lg:overflow-x-auto">
              <table className="w-full border-collapse lg:min-w-[900px]">
                <thead>
                  <tr>
                    {[
                      "Image",
                      "Product",
                      "Platform",
                      "Price",
                      "Status",
                      "Clicks",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border-b border-gray-200 bg-gray-100 px-5 py-3.5 text-left text-xs font-bold uppercase tracking-[0.5px] text-gray-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="border-b border-gray-200 px-5 py-4">
                        <img
                          src={p.images?.[0]}
                          alt={p.name}
                          className="h-[70px] w-[60px] rounded-md object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </td>
                      <td className="max-w-[260px] border-b border-gray-200 px-5 py-4">
                        <p className="m-0 mb-1 truncate text-sm font-semibold text-gray-800">
                          {p.name}
                        </p>
                        <p className="m-0 text-[13px] text-gray-500">{p.brand}</p>
                        {p.importStatus === "error" && (
                          <p className="m-0 mt-1 truncate text-[12px] font-semibold text-red-600">
                            Import error: {p.importError}
                          </p>
                        )}
                      </td>
                      <td className="border-b border-gray-200 px-5 py-4 text-sm capitalize text-gray-600">
                        {platformLabel(p.sourcePlatform)}
                      </td>
                      <td className="border-b border-gray-200 px-5 py-4">
                        <span className="block font-bold text-gray-800">
                          {formatPrice(p.price)}
                        </span>
                        {p.originalPrice > p.price && (
                          <span className="text-xs text-gray-500 line-through">
                            {formatPrice(p.originalPrice)}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-gray-200 px-5 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="border-b border-gray-200 px-5 py-4 text-sm text-gray-600">
                        {p.affiliateClicks || 0}
                      </td>
                      <td className="border-b border-gray-200 px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/admin/affiliate/${p._id}`}
                            className="inline-flex items-center gap-1 rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-[13px] font-semibold text-gray-800 no-underline transition-all hover:border-pink-500 hover:text-pink-600"
                          >
                            <span style={matIcon} className="text-[16px]">
                              edit
                            </span>
                            Edit
                          </Link>
                          {p.status === "published" ? (
                            <button
                              onClick={() => patch(p._id, "unpublish")}
                              disabled={busy === p._id}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md border-none bg-amber-100 px-3 py-2 text-[13px] font-semibold text-amber-700 transition-all hover:bg-amber-200 disabled:opacity-60"
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              onClick={() => patch(p._id, "publish")}
                              disabled={busy === p._id}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md border-none px-3 py-2 text-[13px] font-semibold text-white transition-all disabled:opacity-60"
                              style={{
                                background:
                                  "linear-gradient(135deg, #16a34a, #15803d)",
                              }}
                            >
                              Publish
                            </button>
                          )}
                          <button
                            onClick={() => reimport(p._id)}
                            disabled={busy === p._id}
                            title="Re-import product data"
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border-none bg-indigo-50 px-3 py-2 text-[13px] font-semibold text-indigo-700 transition-all hover:bg-indigo-100 disabled:opacity-60"
                          >
                            <span style={matIcon} className="text-[16px]">
                              refresh
                            </span>
                          </button>
                          <button
                            onClick={() => remove(p._id)}
                            disabled={busy === p._id}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border-none bg-[#fee2e2] px-3 py-2 text-[13px] font-semibold text-[#dc2626] transition-all hover:bg-[#fecaca] disabled:opacity-60"
                          >
                            <span style={matIcon} className="text-[16px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="hidden gap-4 pb-20 md:!grid md:grid-cols-1">
              {filtered.map((p) => (
                <div
                  key={p._id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex gap-3.5">
                    <img
                      src={p.images?.[0]}
                      alt={p.name}
                      className="h-[90px] w-20 shrink-0 rounded-md object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <StatusBadge status={p.status} />
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold capitalize text-purple-700">
                          {platformLabel(p.sourcePlatform)}
                        </span>
                      </div>
                      <h4 className="m-0 mb-1 line-clamp-2 text-[15px] font-semibold leading-snug text-gray-800">
                        {p.name}
                      </h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-gray-900">
                          {formatPrice(p.price)}
                        </span>
                        {p.originalPrice > p.price && (
                          <span className="text-[13px] text-gray-400 line-through">
                            {formatPrice(p.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.importStatus === "error" && (
                    <p className="m-0 mb-2 rounded-md bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                      Import error: {p.importError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2.5">
                    <Link
                      to={`/admin/affiliate/${p._id}`}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md px-4 py-3 text-sm font-semibold text-white no-underline"
                      style={{
                        background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                      }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => patch(p._id, p.status === "published" ? "unpublish" : "publish")}
                      disabled={busy === p._id}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-4 py-3 text-sm font-semibold text-gray-800 disabled:opacity-60"
                      style={{ background: "#f3f4f6" }}
                    >
                      {p.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => reimport(p._id)}
                      disabled={busy === p._id}
                      className="flex cursor-pointer items-center justify-center rounded-md bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-700 disabled:opacity-60"
                    >
                      <span style={matIcon} className="text-[16px]">
                        refresh
                      </span>
                    </button>
                    <button
                      onClick={() => remove(p._id)}
                      disabled={busy === p._id}
                      className="flex cursor-pointer items-center justify-center rounded-md bg-[#fee2e2] px-3 py-3 text-sm font-semibold text-[#dc2626] disabled:opacity-60"
                    >
                      <span style={matIcon} className="text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AffiliateProducts;

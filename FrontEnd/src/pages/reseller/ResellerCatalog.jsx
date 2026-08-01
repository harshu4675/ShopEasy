import React, { useCallback, useEffect, useMemo, useState } from "react";
import { resellerAPI, formatPrice, getErrorMessage } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useDebounce from "../../hooks/useDebounce";
import useReseller from "../../hooks/useReseller";
import SmartImage from "../../components/SmartImage";
import ResellerLayout from "../../components/reseller/ResellerLayout";
import {
  EmptyState,
  PrimaryButton,
  Pagination,
  ResellerGate,
} from "../../components/reseller/ResellerUI";

const CATEGORIES = [
  "",
  "Women's Clothing",
  "Men's Clothing",
  "Kids' Clothing",
  "Perfumes",
  "Watches",
  "Sunglasses",
  "Bags & Wallets",
  "Jewelry",
  "Footwear",
  "Accessories",
];

/**
 * Margin picker shown inside the "add to store" sheet.
 * Live-computes the selling price so the reseller sees their profit before
 * committing — the same arithmetic the server re-verifies on submit.
 */
const MarginSheet = ({
  product,
  maxMargin,
  defaultMargin,
  onClose,
  onConfirm,
}) => {
  const [margin, setMargin] = useState(defaultMargin);
  const [saving, setSaving] = useState(false);

  const pricing = useMemo(() => {
    const pct = Math.min(Math.max(0, Number(margin) || 0), maxMargin);
    const amount = Math.round(((product.price * pct) / 100) * 100) / 100;
    return {
      amount,
      selling: Math.round((product.price + amount) * 100) / 100,
    };
  }, [margin, product.price, maxMargin]);

  const submit = async () => {
    setSaving(true);
    try {
      await onConfirm(Number(margin));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Set your margin"
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
            <SmartImage
              src={product.images?.[0]}
              alt={product.name}
              className="h-full w-full object-contain"
              width={128}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="m-0 text-sm font-bold text-gray-900"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {product.name}
            </h3>
            <p className="m-0 mt-1 text-xs text-gray-500">
              Base price {formatPrice(product.price)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-600"
          >
            <span style={matIcon} className="text-[18px]">
              close
            </span>
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Your margin: <span className="text-pink-600">{margin}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={maxMargin}
          step={1}
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          className="w-full accent-pink-600"
          aria-label="Margin percentage"
        />
        <div className="mb-4 flex justify-between text-[10px] text-gray-400">
          <span>0%</span>
          <span>Max {maxMargin}%</span>
        </div>

        <div className="mb-4 flex gap-2">
          {[5, 10, 15, 20, 30]
            .filter((v) => v <= maxMargin)
            .map((v) => (
              <button
                key={v}
                onClick={() => setMargin(v)}
                className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                  Number(margin) === v
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                {v}%
              </button>
            ))}
        </div>

        <div className="mb-4 rounded-xl bg-gray-50 p-3">
          <div className="flex justify-between py-1 text-xs text-gray-600">
            <span>Base price</span>
            <span>{formatPrice(product.price)}</span>
          </div>
          <div className="flex justify-between py-1 text-xs font-semibold text-emerald-600">
            <span>Your profit</span>
            <span>+{formatPrice(pricing.amount)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 text-sm font-bold text-gray-900">
            <span>Customer pays</span>
            <span>{formatPrice(pricing.selling)}</span>
          </div>
        </div>

        <PrimaryButton
          onClick={submit}
          loading={saving}
          icon="add_circle"
          className="w-full"
        >
          {saving ? "Adding…" : "Add to my store"}
        </PrimaryButton>
      </div>
    </div>
  );
};

const ResellerCatalog = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const fetchCatalog = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const { data } = await resellerAPI.getCatalog({
        page,
        limit: 24,
        search: debouncedSearch || undefined,
        category: category || undefined,
      });
      setProducts(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [isApproved, page, debouncedSearch, category]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category]);

  const handleAdd = async (marginPercent) => {
    try {
      await resellerAPI.addProduct({
        productId: selected._id,
        marginPercent,
      });
      showToast("Added to your store", "success");
      // Optimistically flag the tile as listed.
      setProducts((prev) =>
        prev.map((p) =>
          p._id === selected._id ? { ...p, isListed: true } : p,
        ),
      );
      setSelected(null);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  if (profileLoading) {
    return (
      <ResellerLayout title="Catalog">
        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[300px] animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </ResellerLayout>
    );
  }

  if (!isApproved) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <ResellerGate
          status={reseller ? status : "none"}
          message={reseller?.statusReason}
        />
      </div>
    );
  }

  return (
    <ResellerLayout
      title="Catalog"
      subtitle="Pick products, set your margin, start sharing"
    >
      {/* Filters */}
      <div className="mb-4 flex gap-2 max-md:flex-col">
        <div className="flex flex-1 items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 focus-within:border-pink-500">
          <span style={matIcon} className="text-[20px] text-gray-400">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-500"
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => (
            <option key={c || "all"} value={c}>
              {c || "All categories"}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[300px] animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No products found"
          message="Try a different search term or category."
        />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
            {products.map((p) => (
              <div
                key={p._id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="relative aspect-square bg-white">
                  <SmartImage
                    src={p.images?.[0]}
                    alt={p.name}
                    className="h-full w-full object-contain p-2"
                    width={320}
                    sizes="(max-width: 768px) 45vw, 240px"
                  />
                  {p.isListed && (
                    <span className="absolute left-2 top-2 rounded bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                      In your store
                    </span>
                  )}
                  {p.stock === 0 && (
                    <span className="absolute right-2 top-2 rounded bg-rose-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                      Out of stock
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p
                    className="m-0 mb-1.5 text-xs font-semibold text-gray-800"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: "32px",
                    }}
                  >
                    {p.name}
                  </p>

                  <div className="mb-2 space-y-0.5 rounded-lg bg-gray-50 p-2">
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Base</span>
                      <span className="font-semibold">
                        {formatPrice(p.price)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-emerald-600">
                      <span>Profit @{p.suggested?.marginPercent}%</span>
                      <span className="font-bold">
                        +{formatPrice(p.suggested?.marginAmount || 0)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelected(p)}
                    disabled={p.isListed || p.stock === 0}
                    className={`w-full cursor-pointer rounded-lg border-none py-2 text-xs font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      p.isListed ? "" : "hover:brightness-110"
                    }`}
                    style={{
                      background: p.isListed
                        ? "#9ca3af"
                        : "linear-gradient(135deg, #831843, #ec4899)",
                    }}
                  >
                    {p.isListed ? "Already added" : "Set margin & add"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}

      {selected && (
        <MarginSheet
          product={selected}
          maxMargin={reseller.maxMarginPercent}
          defaultMargin={reseller.defaultMarginPercent}
          onClose={() => setSelected(null)}
          onConfirm={handleAdd}
        />
      )}
    </ResellerLayout>
  );
};

export default ResellerCatalog;

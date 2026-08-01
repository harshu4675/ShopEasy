import React, { useCallback, useEffect, useState } from "react";
import { resellerAPI, formatPrice, getErrorMessage } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useReseller from "../../hooks/useReseller";
import SmartImage from "../../components/SmartImage";
import ResellerLayout from "../../components/reseller/ResellerLayout";
import ShareDialog from "../../components/reseller/ShareDialog";
import {
  EmptyState,
  PrimaryButton,
  Pagination,
  RowsSkeleton,
  ResellerGate,
} from "../../components/reseller/ResellerUI";

/** Inline margin editor for an existing listing. */
const MarginEditor = ({ listing, maxMargin, onSave, onCancel }) => {
  const [margin, setMargin] = useState(listing.marginPercent);
  const [saving, setSaving] = useState(false);

  const base = listing.product?.price ?? listing.basePrice;
  const pct = Math.min(Math.max(0, Number(margin) || 0), maxMargin);
  const amount = Math.round(((base * pct) / 100) * 100) / 100;
  const selling = Math.round((base + amount) * 100) / 100;

  return (
    <div className="mt-2 rounded-lg border border-pink-100 bg-pink-50/50 p-3">
      <label className="mb-1 block text-[11px] font-semibold text-gray-700">
        Margin: <span className="text-pink-600">{margin}%</span>
      </label>
      <input
        type="range"
        min={0}
        max={maxMargin}
        value={margin}
        onChange={(e) => setMargin(e.target.value)}
        className="w-full accent-pink-600"
        aria-label="Margin percentage"
      />
      <div className="mb-2 mt-1 flex justify-between text-[11px]">
        <span className="text-gray-500">Base {formatPrice(base)}</span>
        <span className="font-bold text-gray-900">
          Sells at {formatPrice(selling)}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSaving(true);
            await onSave(Number(margin));
            setSaving(false);
          }}
          disabled={saving}
          className="flex-1 cursor-pointer rounded-lg border-none py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #831843, #ec4899)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 cursor-pointer rounded-lg border border-gray-200 bg-white py-1.5 text-[11px] font-semibold text-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const ResellerProducts = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [sharing, setSharing] = useState(null);

  const fetchListings = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const { data } = await resellerAPI.listProducts({ page, limit: 20 });
      setListings(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [isApproved, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateMargin = async (id, marginPercent) => {
    try {
      const { data } = await resellerAPI.updateProduct(id, { marginPercent });
      setListings((prev) =>
        prev.map((l) => (l._id === id ? { ...l, ...data.data } : l)),
      );
      setEditing(null);
      showToast("Margin updated", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  const toggleActive = async (listing) => {
    const next = !listing.isActive;
    // Optimistic: flip immediately, roll back on failure.
    setListings((prev) =>
      prev.map((l) => (l._id === listing._id ? { ...l, isActive: next } : l)),
    );
    try {
      await resellerAPI.updateProduct(listing._id, { isActive: next });
      showToast(next ? "Product is live" : "Product hidden", "success");
    } catch (err) {
      setListings((prev) =>
        prev.map((l) =>
          l._id === listing._id ? { ...l, isActive: !next } : l,
        ),
      );
      showToast(getErrorMessage(err), "error");
    }
  };

  const removeListing = async (id) => {
    const snapshot = listings;
    setListings((prev) => prev.filter((l) => l._id !== id));
    try {
      await resellerAPI.removeProduct(id);
      showToast("Removed from your store", "success");
    } catch (err) {
      setListings(snapshot);
      showToast(getErrorMessage(err), "error");
    }
  };

  if (profileLoading) {
    return (
      <ResellerLayout title="My Products">
        <RowsSkeleton rows={5} height={120} />
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
      title="My Products"
      subtitle={`${pagination?.total ?? 0} product(s) in your store`}
      action={
        <PrimaryButton
          as="link"
          to="/reseller/catalog"
          icon="add"
          className="!bg-white/15 backdrop-blur-md"
        >
          Add more
        </PrimaryButton>
      }
    >
      {loading ? (
        <RowsSkeleton rows={5} height={120} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title="Your store is empty"
          message="Add products from the catalog, set your margin, and start sharing."
          action={
            <PrimaryButton as="link" to="/reseller/catalog" icon="storefront">
              Browse catalog
            </PrimaryButton>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {listings.map((l) => (
              <div
                key={l._id}
                className={`rounded-xl border bg-white p-3 shadow-sm transition-all ${
                  l.isActive ? "border-gray-100" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <SmartImage
                      src={l.product?.images?.[0]}
                      alt={l.product?.name || "Product"}
                      className="h-full w-full object-contain"
                      width={160}
                      sizes="80px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="m-0 mb-1 text-sm font-semibold text-gray-900"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {l.customTitle || l.product?.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-gray-500">
                        Base {formatPrice(l.basePrice)}
                      </span>
                      <span className="font-semibold text-emerald-600">
                        +{formatPrice(l.marginAmount)} ({l.marginPercent}%)
                      </span>
                      <span className="font-bold text-gray-900">
                        Sells at {formatPrice(l.sellingPrice)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-gray-400">
                      <span>{l.stats?.clicks || 0} clicks</span>
                      <span>{l.stats?.unitsSold || 0} sold</span>
                      <span>{formatPrice(l.stats?.earnings || 0)} earned</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => setSharing(l._id)}
                      title="Share"
                      aria-label="Share product"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none text-white"
                      style={{
                        background: "linear-gradient(135deg, #831843, #ec4899)",
                      }}
                    >
                      <span style={matIcon} className="text-[18px]">
                        share
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        setEditing(editing === l._id ? null : l._id)
                      }
                      title="Edit margin"
                      aria-label="Edit margin"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600"
                    >
                      <span style={matIcon} className="text-[18px]">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => toggleActive(l)}
                      title={l.isActive ? "Hide" : "Show"}
                      aria-label={l.isActive ? "Hide product" : "Show product"}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600"
                    >
                      <span style={matIcon} className="text-[18px]">
                        {l.isActive ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                    <button
                      onClick={() => removeListing(l._id)}
                      title="Remove"
                      aria-label="Remove product"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600"
                    >
                      <span style={matIcon} className="text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>

                {editing === l._id && (
                  <MarginEditor
                    listing={l}
                    maxMargin={reseller.maxMarginPercent}
                    onSave={(m) => updateMargin(l._id, m)}
                    onCancel={() => setEditing(null)}
                  />
                )}
              </div>
            ))}
          </div>

          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}

      {sharing && (
        <ShareDialog listingId={sharing} onClose={() => setSharing(null)} />
      )}
    </ResellerLayout>
  );
};

export default ResellerProducts;

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatPrice, invalidateCache, CACHE_KEYS } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import Loader from "../../components/Loader";

const CATEGORIES = [
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

const platformLabel = (platform) =>
  platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "";

const labelCls = "mb-2 block text-[13px] font-bold text-gray-800";
const inputCls =
  "w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-pink-500 focus:shadow-[0_0_0_3px_#f8bbd9]";

const Field = ({ label, hint, children }) => (
  <div>
    <label className={labelCls}>
      {label}
      {hint && (
        <span className="ml-2 text-[11px] font-medium text-gray-400">
          {hint}
        </span>
      )}
    </label>
    {children}
  </div>
);

const AffiliateProductEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastUrl, setLastUrl] = useState("");
  const [importNotices, setImportNotices] = useState({
    missing: [],
    warnings: [],
    error: "",
  });

  const loadExisting = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/affiliate/${id}`);
      setProduct(data);
      setForm({
        name: data.name || "",
        description: data.description || "",
        category: data.category || "Accessories",
        price: data.price ?? 0,
        originalPrice: data.originalPrice ?? 0,
        brand: data.brand || "",
        tags: (data.tags || []).join(", "),
        images: data.images || [],
        affiliateUrl: data.affiliateUrl || "",
        availability: data.availability || "",
        isTrending: Boolean(data.isTrending),
        trendingOrder: data.trendingOrder ?? 0,
      });
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error loading product",
        "error",
      );
      navigate("/admin/affiliate");
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEdit) loadExisting();
  }, [isEdit, loadExisting]);

  const handleImport = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetUrl = (typeof e === "string" ? e : url).trim();
    if (!targetUrl || importing) return;
    setLastUrl(targetUrl);
    setImporting(true);
    setImportError(null);
    try {
      const { data } = await api.post("/admin/affiliate/import", {
        url: targetUrl,
      });
      const imported = data.product;
      const missing = data.missing || [];
      const warnings = data.warnings || [];
      setProduct(imported);
      setImportNotices({
        missing,
        warnings,
        error: imported.importError || "",
      });
      setForm({
        name: imported.name || "",
        description: imported.description || "",
        category: imported.category || "Accessories",
        price: missing.includes("price") ? "" : (imported.price ?? 0),
        originalPrice: missing.includes("price")
          ? ""
          : (imported.originalPrice ?? imported.price ?? 0),
        brand: imported.brand || "",
        tags: (imported.tags || []).join(", "),
        images: imported.images || [],
        affiliateUrl: imported.affiliateUrl || "",
        availability: imported.availability || "",
        isTrending: Boolean(imported.isTrending),
        trendingOrder: imported.trendingOrder ?? 0,
      });
    } catch (error) {
      setImportError({
        code: error.response?.data?.code || "IMPORT_ERROR",
        message:
          error.response?.data?.message ||
          "Product information could not be retrieved from the selected source.",
      });
    } finally {
      setImporting(false);
    }
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addImage = () => {
    const u = newImageUrl.trim();
    if (!u) return;
    setForm((f) => ({ ...f, images: [...f.images, u] }));
    setNewImageUrl("");
  };

  const removeImage = (index) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));

  const buildPayload = () => ({
    name: form.name,
    description: form.description,
    category: form.category,
    price: Number(form.price) || 0,
    originalPrice: Number(form.originalPrice) || 0,
    brand: form.brand,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    images: form.images,
    affiliateUrl: form.affiliateUrl,
    availability: form.availability,
    isTrending: form.isTrending,
    trendingOrder: Number(form.trendingOrder) || 0,
  });

  const save = async (thenPublish) => {
    if (!form.name.trim()) {
      showToast("Please enter a product title", "error");
      return;
    }
    if (!form.images || form.images.length === 0) {
      showToast("Add at least one product image", "error");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(
        `/admin/affiliate/${product._id}`,
        buildPayload(),
      );
      setProduct(data.product);
      invalidateCache(CACHE_KEYS.products);
      if (thenPublish) {
        setPublishing(true);
        try {
          const pub = await api.patch(
            `/admin/affiliate/${product._id}/publish`,
          );
          setProduct(pub.data.product);
          showToast("Product published to the store", "success");
          navigate("/admin/affiliate");
        } catch (error) {
          showToast(error.response?.data?.message || "Publish failed", "error");
        } finally {
          setPublishing(false);
        }
      } else {
        showToast("Changes saved", "success");
        if (isEdit) navigate("/admin/affiliate");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const discardDraft = async () => {
    if (!product?._id) {
      navigate("/admin/affiliate");
      return;
    }
    if (!window.confirm("Discard this imported product?")) return;
    try {
      await api.delete(`/admin/affiliate/${product._id}`);
      invalidateCache(CACHE_KEYS.products);
      navigate("/admin/affiliate");
    } catch (error) {
      showToast(error.response?.data?.message || "Could not discard", "error");
    }
  };

  /* ------------------------------ Import step ---------------------------- */
  if (!product && !importError) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-[760px] px-5 py-8">
          <h1 className="m-0 mb-1 text-[24px] font-bold text-gray-900">
            Add Affiliate Product
          </h1>
          <p className="mb-6 text-[13px] text-gray-500">
            Paste an external product link and the available information is
            imported automatically — no manual data entry needed.
          </p>

          <form
            onSubmit={handleImport}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md md:p-5"
          >
            <Field label="Product URL">
              <textarea
                rows={3}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste product/affiliate URL here — e.g. https://www.amazon.in/..."
                className={`${inputCls} resize-none`}
              />
              <p className="mt-2 text-[12px] text-gray-400">
                Example: https://www.amazon.in/Nike-Shoes/dp/B08N5WRWNW
              </p>
            </Field>

            {importError && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                <p className="m-0 flex items-start gap-2 text-[13px] font-semibold text-red-700">
                  <span style={matIcon} className="mt-0.5 text-[18px]">
                    error
                  </span>
                  <span>{importError.message}</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={importing || !url.trim()}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-6 py-4 text-[15px] font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                boxShadow: "0 4px 15px rgba(233, 30, 99, 0.3)",
              }}
            >
              {importing ? (
                <>
                  <span
                    className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                    style={{ animation: "aff-spin 0.7s linear infinite" }}
                  />
                  Attempting public product metadata extraction...
                </>
              ) : (
                <>
                  <span style={matIcon} className="text-[20px]">
                    download
                  </span>
                  Import Product
                </>
              )}
            </button>

            <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3 text-[12px] text-gray-500">
              Works with{" "}
              <span className="font-semibold text-gray-700">
                Amazon, Flipkart, Myntra, Ajio, Meesho
              </span>{" "}
              and any other product page. No marketplace API keys required — we
              read the publicly visible page metadata (JSON-LD, OpenGraph and
              meta tags), never fabricate data and never bypass platform
              protections.
            </div>
          </form>
        </div>
        <style>{`@keyframes aff-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ------------------------------ Preview / edit -------------------------- */
  const platform = platformLabel(product?.sourcePlatform);
  const discount =
    form.originalPrice > form.price
      ? Math.round(
          ((form.originalPrice - form.price) / form.originalPrice) * 100,
        )
      : 0;

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto max-w-[1100px] px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-[24px] font-bold text-gray-900">
              {isEdit ? "Edit Affiliate Product" : "Product Preview"}
            </h1>
            <p className="m-0 mt-1 text-[13px] text-gray-500">
              {product?.status === "draft"
                ? "Review the imported data, then publish to make it visible."
                : "Update the product details below."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastUrl && (
              <button
                onClick={() => handleImport(lastUrl)}
                disabled={importing || saving || publishing}
                title={lastUrl}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-5 py-3 text-[14px] font-bold text-indigo-700 transition-all hover:bg-indigo-100 disabled:opacity-60"
              >
                {importing ? "Importing..." : "Import Again"}
              </button>
            )}
            {product?.status !== "published" && (
              <button
                onClick={() => save(true)}
                disabled={saving || publishing}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none px-5 py-3 text-[14px] font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #15803d)",
                }}
              >
                {publishing ? "Publishing..." : "Publish Product"}
              </button>
            )}
            {product?.status === "published" && (
              <button
                onClick={async () => {
                  try {
                    await api.patch(
                      `/admin/affiliate/${product._id}/unpublish`,
                    );
                    invalidateCache(CACHE_KEYS.products);
                    navigate("/admin/affiliate");
                  } catch (error) {
                    showToast(
                      error.response?.data?.message || "Unpublish failed",
                      "error",
                    );
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none bg-amber-100 px-5 py-3 text-[14px] font-bold text-amber-700 transition-all hover:bg-amber-200"
              >
                Unpublish
              </button>
            )}
            <button
              onClick={() => save(false)}
              disabled={saving || publishing}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-5 py-3 text-[14px] font-bold text-gray-700 transition-all hover:border-pink-500 hover:text-pink-600 disabled:opacity-60"
            >
              Save Changes
            </button>
            <button
              onClick={() =>
                isEdit ? navigate("/admin/affiliate") : discardDraft()
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-[14px] font-semibold text-gray-500 transition-all hover:bg-gray-50"
            >
              {isEdit ? "Back" : "Cancel"}
            </button>
          </div>
        </div>

        {(importNotices.error ||
          importNotices.missing.length > 0 ||
          importNotices.warnings.length > 0) && (
          <div className="mb-6 space-y-2">
            {importNotices.error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                <p className="m-0 flex items-start gap-2 text-[13px] font-semibold text-red-700">
                  <span style={matIcon} className="mt-0.5 text-[18px]">
                    error
                  </span>
                  <span>
                    {importNotices.error} You can enter the product information
                    manually below.
                  </span>
                </p>
              </div>
            )}
            {importNotices.missing.length > 0 && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="m-0 flex items-start gap-2 text-[13px] font-semibold text-amber-700">
                  <span style={matIcon} className="mt-0.5 text-[18px]">
                    edit_note
                  </span>
                  <span>
                    Not detected:{" "}
                    {importNotices.missing
                      .map(
                        (f) =>
                          ({
                            title: "title",
                            image: "image",
                            price: "price",
                            description: "description",
                            brand: "brand",
                            category: "category",
                            rating: "rating",
                          })[f] || f,
                      )
                      .join(", ")}
                    . Please complete these fields manually.
                  </span>
                </p>
              </div>
            )}
            {importNotices.warnings.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3"
              >
                <p className="m-0 flex items-start gap-2 text-[13px] font-semibold text-indigo-700">
                  <span style={matIcon} className="mt-0.5 text-[18px]">
                    info
                  </span>
                  <span>{w}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Preview card */}
          <div className="h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-md lg:sticky lg:top-4">
            <div
              className="relative mb-4 overflow-hidden rounded-xl bg-white"
              style={{ paddingTop: "110%" }}
            >
              <img
                src={form.images?.[0]}
                alt={form.name}
                className="absolute inset-0 h-full w-full object-contain p-2"
              />
              {discount > 0 && (
                <span
                  className="absolute left-3 top-3 rounded-md px-2 py-1 text-[11px] font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #831843, #be185d)",
                  }}
                >
                  {discount}% OFF
                </span>
              )}
            </div>
            <h2 className="m-0 mb-2 text-[16px] font-bold leading-snug text-gray-900">
              {form.name || "Untitled product"}
            </h2>
            {form.brand && (
              <p className="m-0 mb-2 text-[12px] font-bold uppercase tracking-widest text-pink-600">
                {form.brand}
              </p>
            )}
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-gray-900">
                {form.price !== "" && form.price != null
                  ? formatPrice(form.price)
                  : "Price not detected"}
              </span>
              {form.originalPrice > form.price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(form.originalPrice)}
                </span>
              )}
            </div>
            <dl className="m-0 space-y-2 border-t border-gray-100 pt-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-gray-500">Source platform</dt>
                <dd className="m-0 font-semibold capitalize text-gray-800">
                  {platform || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">External ID</dt>
                <dd className="m-0 font-mono text-gray-800">
                  {product?.externalProductId || "Not available"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Availability</dt>
                <dd className="m-0 text-gray-800">
                  {form.availability || "Not available"}
                </dd>
              </div>
              {product?.rating > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rating</dt>
                  <dd className="m-0 text-gray-800">
                    {product.rating.toFixed(1)} ({product.numReviews} reviews)
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Edit form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md md:p-5">
            <div className="mb-5 flex items-start gap-2 rounded-lg bg-indigo-50 px-4 py-3 text-[12px] text-indigo-700">
              <span style={matIcon} className="mt-0.5 text-[16px]">
                info
              </span>
              <span>
                Fields marked{" "}
                <span className="font-bold">“from {platform || "source"}”</span>{" "}
                were imported and can be edited freely. The affiliate
                destination is only changed if you edit it explicitly.
              </span>
            </div>

            <div className="space-y-5">
              <Field label="Title" hint={`from ${platform || "source"}`}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Description" hint={`from ${platform || "source"}`}>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
                <Field
                  label="Selling price (₹)"
                  hint={`from ${platform || "source"}`}
                >
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder={
                      importNotices.missing.includes("price")
                        ? "Enter price manually"
                        : ""
                    }
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="MRP / original price (₹)"
                  hint={`from ${platform || "source"}`}
                >
                  <input
                    type="number"
                    min="0"
                    value={form.originalPrice}
                    onChange={(e) => update("originalPrice", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Brand" hint={`from ${platform || "source"}`}>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => update("brand", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Tags" hint="comma separated">
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => update("tags", e.target.value)}
                  className={inputCls}
                  placeholder="nike, shoes, running"
                />
              </Field>

              <Field
                label="Images"
                hint={`from ${platform || "source"} — hosted externally`}
              >
                <div className="flex flex-wrap gap-2">
                  {form.images.map((img, i) => (
                    <div
                      key={`${img}-${i}`}
                      className="relative h-[72px] w-[72px] overflow-hidden rounded-lg border border-gray-200 bg-white"
                    >
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        aria-label="Remove image"
                        className="absolute right-0 top-0 flex h-5 w-5 cursor-pointer items-center justify-center rounded-bl-lg border-none bg-red-500 text-white"
                      >
                        <span style={matIcon} className="text-[12px]">
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Add image URL..."
                    className={inputCls}
                  />
                  <button
                    onClick={addImage}
                    className="shrink-0 cursor-pointer rounded-lg border-2 border-gray-300 bg-white px-4 text-[13px] font-semibold text-gray-700 transition-all hover:border-pink-500 hover:text-pink-600"
                  >
                    Add
                  </button>
                </div>
              </Field>

              <Field
                label="Affiliate URL"
                hint="the destination customers are sent to on Buy Now"
              >
                <input
                  type="text"
                  value={form.affiliateUrl}
                  onChange={(e) => update("affiliateUrl", e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1.5 text-[12px] text-gray-400">
                  This is the exact URL you pasted — affiliate tracking
                  parameters are preserved. Customers are sent here on Buy Now.
                </p>
              </Field>

              <div className="grid grid-cols-2 items-center gap-4 md:grid-cols-1">
                <label className="flex items-center gap-2 text-[14px] font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={form.isTrending}
                    onChange={(e) => update("isTrending", e.target.checked)}
                    className="h-4 w-4 accent-pink-600"
                  />
                  Featured (trending)
                </label>
                <Field label="Ordering">
                  <input
                    type="number"
                    value={form.trendingOrder}
                    onChange={(e) => update("trendingOrder", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                <button
                  onClick={() => save(false)}
                  disabled={saving || publishing}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none px-6 py-3 text-[14px] font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <Link
                  to="/admin/affiliate"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-6 py-3 text-[14px] font-semibold text-gray-500 no-underline hover:bg-gray-50"
                >
                  Back to list
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateProductEditor;

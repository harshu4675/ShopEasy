import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, categoriesAPI } from "../../utils/api";
import { showToast } from "../../utils/toast";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const FIELD_LABELS = {
  title: "Title",
  description: "Description",
  price: "Price",
  originalPrice: "Original Price",
  currency: "Currency",
  brand: "Brand",
  category: "Category",
  images: "Images",
  rating: "Rating",
  reviewCount: "Review Count",
  sizes: "Sizes",
  colors: "Colors",
  specifications: "Specifications",
  features: "Features",
  sku: "SKU",
  productId: "Product ID",
  stockStatus: "Stock Status",
  sellerName: "Seller",
  breadcrumbs: "Breadcrumbs",
  discountPercentage: "Discount",
};

const ImportProduct = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    const fontId = "import-product-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    categoriesAPI
      .getAll()
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const scoreColor = (pct) => {
    if (pct >= 80) return "#22c55e";
    if (pct >= 60) return "#eab308";
    if (pct >= 40) return "#f97316";
    return "#ef4444";
  };

  const handleImport = async () => {
    if (!url.trim()) {
      showToast("Please enter a product URL", "error");
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);
    setFormData(null);
    setSelectedImages([]);
    setImageErrors({});

    try {
      const res = await api.post("/import/preview", { url: url.trim() });
      const result = res.data;

      if (result.success && result.product) {
        setImportResult(result);
        const p = result.product;
        setFormData({
          title: p.title || "",
          description: p.description || "",
          price: p.price !== null ? String(p.price) : "",
          originalPrice: p.originalPrice !== null ? String(p.originalPrice) : "",
          category: p.category || "",
          subCategory: p.subcategory || "",
          brand: p.brand || "",
          stock: p.stockStatus === "in_stock" ? "10" : "0",
          sizes: p.sizes || [],
          colors: p.colors || [],
          tags: "",
          affiliateUrl: p.affiliateUrl || url.trim(),
          sourceUrl: p.sourceUrl || url.trim(),
          platform: p.platform || "",
        });
        setSelectedImages(p.images || []);
        showToast("Product data imported successfully", "success");
      } else {
        setError(result);
        const msg = result.message || "Could not extract product data from this URL.";
        showToast(msg, "error");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Import request failed. Check the URL and try again.";
      setError({ message: msg, reason: err.response?.data?.reason || "NETWORK_ERROR" });
      showToast(msg, "error");
    } finally {
      setImporting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    const selected = categories.find((c) => c.name === value);
    setAvailableSubCategories(
      selected?.subCategories?.filter((s) => s.isActive !== false) || []
    );
    setFormData((prev) => ({
      ...prev,
      category: value,
      subCategory: "",
    }));
  };

  const handleSizeToggle = (size) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes?.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...(prev.sizes || []), size],
    }));
  };

  const handleImageError = (idx) => {
    setImageErrors((prev) => ({ ...prev, [idx]: true }));
  };

  const removeImage = (idx) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!formData?.title || !formData?.price || !formData?.category) {
      showToast("Title, price, and category are required", "error");
      return;
    }

    setSaving(true);

    try {
      const p = importResult?.product || {};
      const data = {
        ...formData,
        price: Number(formData.price),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : Number(formData.price),
        stock: Number(formData.stock) || 0,
        images: selectedImages,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        // Preserve the exact affiliate URL and all extracted metadata
        originalAffiliateUrl: p.originalAffiliateUrl || p.sourceUrl || formData.affiliateUrl,
        canonicalUrl: p.canonicalUrl || null,
        currency: p.currency || "INR",
        rating: p.rating || p.ratingValue || null,
        reviewCount: p.reviewCount || null,
        specifications: p.specifications || null,
        features: p.features || null,
        sellerName: p.sellerName || null,
        sku: p.sku || null,
        productId: p.productId || null,
      };

      await api.post("/import/save", data);
      showToast("Product saved successfully", "success");
      navigate("/admin/products");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Error saving product",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const sizes = [
    "XS", "S", "M", "L", "XL", "XXL", "Free Size",
    "6", "7", "8", "9", "10", "11", "12",
  ];

  const inputClass =
    "w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition-all focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]";

  const hasValue = (val) =>
    val !== null && val !== undefined && val !== "" &&
    !(Array.isArray(val) && val.length === 0) &&
    !(typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0);

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-gray-50 py-8 max-md:py-5"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 max-md:text-xl">
            Import Product from URL
          </h1>
          <p className="m-0 mt-1 text-sm text-gray-500">
            Paste an affiliate/product URL to automatically extract product information
          </p>
        </div>

        {/* URL Input */}
        <div className="rounded-2xl bg-white p-6 shadow-sm mb-6">
          <div className="flex gap-3 max-md:flex-col">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste product URL here (e.g., https://www.amazon.in/dp/...)"
              className={inputClass + " flex-1"}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
            />
            <button
              onClick={handleImport}
              disabled={importing || !url.trim()}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl border-none text-base font-bold text-white cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed max-md:w-full"
              style={{
                background: "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
              }}
            >
              {importing ? (
                <>
                  <span
                    className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    style={{ animation: "ip-spin 0.7s linear infinite" }}
                  />
                  Importing...
                </>
              ) : (
                <>
                  <span style={matIcon} className="text-[20px]">download</span>
                  Import
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Supports: Amazon, Flipkart, Myntra, Ajio, Meesho, and other ecommerce sites
          </p>
        </div>

        {/* Error Display */}
        {error && !error.success && (
          <div className="rounded-2xl border-2 border-dashed border-red-300 bg-red-50 p-6 mb-6">
            <div className="flex items-start gap-3">
              <span style={matIcon} className="text-[32px] text-red-500">error</span>
              <div>
                <h3 className="font-bold text-red-800 mb-1">
                  {error.reason === "BLOCKED"
                    ? "Automatic Extraction Not Available"
                    : error.reason === "INVALID_URL"
                      ? "Invalid URL"
                      : error.reason === "TIMEOUT"
                        ? "Request Timed Out"
                        : error.reason === "NO_PRODUCT_DATA"
                          ? "No Product Data Found"
                          : "Import Failed"}
                </h3>
                <p className="text-sm text-red-700 mb-3">
                  {error.reason === "BLOCKED"
                    ? "This marketplace did not allow automatic product extraction. Please enter the missing information manually."
                    : error.message || "Could not extract data from this URL."}
                </p>
                <button
                  onClick={() => navigate("/admin/add-product")}
                  className="px-5 py-2 rounded-lg border-2 border-red-300 bg-white text-sm font-semibold text-red-700 cursor-pointer hover:bg-red-50"
                >
                  Add Product Manually
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {importing && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div
              className="mx-auto h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-500"
              style={{ animation: "ip-spin 0.7s linear infinite" }}
            />
            <p className="m-0 mt-4 text-gray-600 font-medium">
              Fetching product information...
            </p>
            <p className="m-0 mt-1 text-sm text-gray-400">
              This may take a moment for large pages
            </p>
          </div>
        )}

        {/* Import Result Preview */}
        {importResult && importResult.success && formData && (
          <>
            {/* Quality Score */}
            <div className="rounded-2xl bg-white p-6 shadow-sm mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span style={matIcon} className="text-[22px] text-pink-600">insights</span>
                Import Completeness
              </h3>

              <div className="flex items-center gap-4 mb-4 max-md:flex-col max-md:items-start">
                <div className="flex-1 w-full">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      {importResult.quality?.label || "N/A"}
                    </span>
                    <span className="font-bold" style={{ color: scoreColor(importResult.quality?.percentage || 0) }}>
                      {importResult.quality?.percentage || 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${importResult.quality?.percentage || 0}%`,
                        backgroundColor: scoreColor(importResult.quality?.percentage || 0),
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 whitespace-nowrap">
                  {importResult.quality?.detected || 0} of {importResult.quality?.total || 0} fields detected
                </div>
              </div>

              {/* Field status grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const val = importResult.product?.[key];
                  const detected = hasValue(val);
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${
                        detected
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span style={matIcon} className="text-[14px]">
                        {detected ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Editable Product Form */}
            <div className="rounded-2xl bg-white p-8 shadow-sm max-md:p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span style={matIcon} className="text-[22px] text-pink-600">edit</span>
                Review & Edit
                <span className="text-xs font-normal text-gray-400 ml-2">
                  (Editable fields)
                </span>
              </h3>

              {/* Basic Info */}
              <div className="mb-6 border-b border-gray-100 pb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h4>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Product Name <span className="text-pink-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Product name"
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className={inputClass + " resize-y"}
                    placeholder="Product description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Category <span className="text-pink-600">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleCategoryChange}
                      className={inputClass + " cursor-pointer"}
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter((c) => c.isActive !== false)
                        .map((cat) => (
                          <option key={cat._id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Sub Category
                    </label>
                    <select
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleChange}
                      disabled={!formData.category}
                      className={
                        inputClass +
                        " cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
                      }
                    >
                      <option value="">
                        {formData.category
                          ? "Select Sub Category"
                          : "Select category first"}
                      </option>
                      {availableSubCategories.map((sub) => (
                        <option key={sub._id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Brand name"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-6 border-b border-gray-100 pb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Pricing & Stock</h4>
                <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Selling Price (Rs.) <span className="text-pink-600">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Original Price (Rs.)
                    </label>
                    <input
                      type="number"
                      name="originalPrice"
                      value={formData.originalPrice}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Stock
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Variants */}
              <div className="mb-6 border-b border-gray-100 pb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Sizes</h4>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSizeToggle(size)}
                      className={`cursor-pointer rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                        formData.sizes?.includes(size)
                          ? "border-pink-500 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-pink-500"
                      }`}
                      style={
                        formData.sizes?.includes(size)
                          ? {
                              background: "linear-gradient(135deg, #831843, #ec4899)",
                            }
                          : {}
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div className="mb-6 border-b border-gray-100 pb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Images ({selectedImages.length})</h4>
                {selectedImages.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No images extracted</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative h-[140px] w-[120px] overflow-hidden rounded-lg shadow-sm bg-gray-100">
                        {!imageErrors[idx] ? (
                          <img
                            src={img}
                            alt={`Product ${idx + 1}`}
                            className="h-full w-full object-cover"
                            onError={() => handleImageError(idx)}
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-2 text-xs text-gray-400">
                            <div className="text-center">
                              <span style={matIcon} className="block text-[24px] mb-1">broken_image</span>
                              Image unavailable
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white text-xs cursor-pointer border-none hover:bg-black/70"
                        >
                          &times;
                        </button>
                        {idx === 0 && (
                          <span
                            className="absolute bottom-0 left-0 right-0 py-0.5 text-center text-[10px] font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #831843, #ec4899)" }}
                          >
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Affiliate URL */}
              <div className="mb-6 border-b border-gray-100 pb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Links</h4>
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Affiliate URL (Buy Now)</label>
                  <input
                    type="text"
                    value={formData.affiliateUrl || ""}
                    readOnly
                    className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed"}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Customer clicking "Buy Now" will go to this exact URL.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Source URL</label>
                  <input
                    type="text"
                    value={formData.sourceUrl || ""}
                    readOnly
                    className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed"}
                  />
                </div>
              </div>

              {/* Platform info */}
              <div className="mb-6 text-sm text-gray-500">
                Extracted from: <strong>{formData.platform || "Unknown"}</strong>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 max-md:flex-col">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 max-md:w-full"
                  style={{
                    background: "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
                  }}
                >
                  {saving && (
                    <span
                      className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      style={{ animation: "ip-spin 0.7s linear infinite" }}
                    />
                  )}
                  {saving ? "Saving..." : "Save Product"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin/products")}
                  className="cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:bg-gray-50 max-md:w-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes ip-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ImportProduct;
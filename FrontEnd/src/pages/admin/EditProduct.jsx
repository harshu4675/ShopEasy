import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, categoriesAPI } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    subCategory: "",
    brand: "",
    stock: "",
    sizes: [],
    colors: [],
    tags: "",
  });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [colorInput, setColorInput] = useState({ name: "", code: "#000000" });

  useEffect(() => {
    const fontId = "edit-product-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const sizes = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "Free Size",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];

  const fetchCategoriesAndProduct = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        categoriesAPI.getAll(),
        api.get(`/products/${id}`),
      ]);
      const cats = Array.isArray(catRes.data) ? catRes.data : [];
      setCategories(cats);

      const product = prodRes.data;
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice || "",
        category: product.category,
        subCategory: product.subCategory || "",
        brand: product.brand || "",
        stock: product.stock,
        sizes: product.sizes || [],
        colors: product.colors || [],
        tags: product.tags?.join(", ") || "",
      });
      setExistingImages(product.images);

      const selected = cats.find((c) => c.name === product.category);
      setAvailableSubCategories(
        selected?.subCategories?.filter((s) => s.isActive !== false) || [],
      );
    } catch (error) {
      showToast("Error loading product", "error");
      navigate("/admin/products");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCategoriesAndProduct();
  }, [fetchCategoriesAndProduct]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "category") {
      const selected = categories.find((c) => c.name === value);
      setAvailableSubCategories(
        selected?.subCategories?.filter((s) => s.isActive !== false) || [],
      );
      setFormData({
        ...formData,
        category: value,
        subCategory: "",
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleSizeToggle = (size) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const addColor = () => {
    if (colorInput.name && colorInput.code) {
      setFormData((prev) => ({
        ...prev,
        colors: [...prev.colors, { ...colorInput }],
      }));
      setColorInput({ name: "", code: "#000000" });
    }
  };

  const removeColor = (index) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index),
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      showToast("Maximum 5 images allowed", "error");
      return;
    }
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "sizes" || key === "colors")
        data.append(key, JSON.stringify(formData[key]));
      else if (key === "tags")
        data.append(
          key,
          JSON.stringify(
            formData[key]
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t),
          ),
        );
      else data.append(key, formData[key]);
    });
    images.forEach((image) => data.append("images", image));
    try {
      await api.put(`/products/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Product updated successfully", "success");
      navigate("/admin/products");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error updating product",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const inputClass =
    "w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition-all focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]";

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-gray-50 py-8 max-md:py-5"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 max-md:text-xl">
            Edit Product
          </h1>
          <p className="m-0 mt-1 text-sm text-gray-500">
            Update product details
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-sm max-md:p-5"
        >
          <div className="mb-8 border-b border-gray-100 pb-8">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
              <span style={matIcon} className="text-[22px] text-pink-600">
                info
              </span>
              Basic Information
            </h3>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Product Name <span className="text-pink-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Description <span className="text-pink-600">*</span>
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
                className={inputClass + " resize-y"}
              />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Category <span className="text-pink-600">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
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
                {formData.category && availableSubCategories.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No sub-categories in this category yet
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Brand
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mb-8 border-b border-gray-100 pb-8">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
              <span style={matIcon} className="text-[22px] text-pink-600">
                payments
              </span>
              Pricing & Stock
            </h3>
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
                  min="0"
                  required
                  className={inputClass}
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
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Stock <span className="text-pink-600">*</span>
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="mb-8 border-b border-gray-100 pb-8">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
              <span style={matIcon} className="text-[22px] text-pink-600">
                tune
              </span>
              Variants
            </h3>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Available Sizes
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSizeToggle(size)}
                    className={`cursor-pointer rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                      formData.sizes.includes(size)
                        ? "border-pink-500 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-pink-500"
                    }`}
                    style={
                      formData.sizes.includes(size)
                        ? {
                            background:
                              "linear-gradient(135deg, #831843, #ec4899)",
                          }
                        : {}
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Colors
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Color name"
                  value={colorInput.name}
                  onChange={(e) =>
                    setColorInput({ ...colorInput, name: e.target.value })
                  }
                  className="min-w-[150px] flex-1 rounded-lg border-2 border-gray-200 px-4 py-3 text-sm outline-none focus:border-pink-500"
                />
                <input
                  type="color"
                  value={colorInput.code}
                  onChange={(e) =>
                    setColorInput({ ...colorInput, code: e.target.value })
                  }
                  className="h-11 w-12 cursor-pointer rounded-lg border-2 border-gray-200 p-1"
                />
                <button
                  type="button"
                  onClick={addColor}
                  className="cursor-pointer rounded-lg border-2 border-gray-200 bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              {formData.colors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.colors.map((color, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs font-medium"
                    >
                      <span
                        className="h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_1px_#d1d5db]"
                        style={{ backgroundColor: color.code }}
                      />
                      {color.name}
                      <button
                        type="button"
                        onClick={() => removeColor(index)}
                        className="cursor-pointer border-none bg-transparent p-0 text-base leading-none text-gray-500 hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8 border-b border-gray-100 pb-8">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
              <span style={matIcon} className="text-[22px] text-pink-600">
                image
              </span>
              Images
            </h3>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Current Images
              </label>
              <div className="flex flex-wrap gap-3">
                {existingImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative h-[120px] w-[100px] overflow-hidden rounded-lg shadow-sm"
                  >
                    <img
                      src={img}
                      alt={`Current ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {index === 0 && (
                      <span
                        className="absolute bottom-0 left-0 right-0 py-1 text-center text-[10px] font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #831843, #ec4899)",
                        }}
                      >
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Replace Images (uploading new will replace all existing)
            </label>
            <label
              htmlFor="edit-product-images"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-all hover:border-pink-500 hover:bg-pink-50"
            >
              <span style={matIcon} className="text-[36px] text-pink-500">
                cloud_upload
              </span>
              <p className="m-0 text-sm font-semibold text-gray-800">
                {images.length > 0
                  ? `${images.length} new image(s) selected`
                  : "Click to replace images (optional)"}
              </p>
              <p className="m-0 text-xs text-gray-500">
                JPG, PNG, WebP &middot; Max 5MB each
              </p>
              <input
                id="edit-product-images"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            {images.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {images.map((file, index) => (
                  <div
                    key={index}
                    className="relative h-[120px] w-[100px] overflow-hidden rounded-lg shadow-sm"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`New ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-green-500 py-1 text-center text-[10px] font-bold text-white">
                      New
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-8">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
              <span style={matIcon} className="text-[22px] text-pink-600">
                local_offer
              </span>
              Additional Options
            </h3>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Tags (comma separated)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap gap-3 max-md:flex-col">
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 max-md:w-full"
              style={{
                background:
                  "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
              }}
            >
              {saving && (
                <span
                  className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  style={{ animation: "ep-spin 0.7s linear infinite" }}
                />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:bg-gray-50 max-md:w-full"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes ep-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default EditProduct;

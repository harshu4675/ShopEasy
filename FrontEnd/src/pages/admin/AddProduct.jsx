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

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
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
  const [colorInput, setColorInput] = useState({ name: "", code: "#000000" });

  useEffect(() => {
    const fontId = "admin-google-fonts";
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
    const fetchCategories = async () => {
      try {
        const res = await categoriesAPI.getAll();
        setCategories(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        showToast("Error loading categories", "error");
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!formData.category) {
      setAvailableSubCategories([]);
      return;
    }
    const selected = categories.find((c) => c.name === formData.category);
    setAvailableSubCategories(
      selected?.subCategories?.filter((s) => s.isActive !== false) || [],
    );
  }, [formData.category, categories]);

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "category") {
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
    if (images.length === 0) {
      showToast("Please select at least one image", "error");
      return;
    }
    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "sizes" || key === "colors") {
        data.append(key, JSON.stringify(formData[key]));
      } else if (key === "tags") {
        data.append(
          key,
          JSON.stringify(
            formData[key]
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t),
          ),
        );
      } else {
        data.append(key, formData[key]);
      }
    });
    images.forEach((image) => data.append("images", image));
    try {
      await api.post("/products", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Product added successfully", "success");
      navigate("/admin/products");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error adding product",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition-all focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]";

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-gray-50 py-8 max-md:py-5"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 max-md:text-xl">
              Add New Product
            </h1>
            <p className="m-0 mt-1 text-sm text-gray-500">
              Fill in all details to list a new product
            </p>
          </div>
        </div>

        {categoriesLoading ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div
              className="mx-auto h-8 w-8 rounded-full border-4 border-pink-200 border-t-pink-500"
              style={{ animation: "ap-spin 0.7s linear infinite" }}
            />
            <p className="m-0 mt-3 text-sm text-gray-500">
              Loading categories...
            </p>
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
            <span
              style={matIcon}
              className="mb-3 block text-[48px] text-amber-500"
            >
              warning
            </span>
            <h3 className="mb-2 text-lg font-bold text-amber-900">
              No categories found
            </h3>
            <p className="mb-4 text-sm text-amber-800">
              You need to create categories first before adding products.
            </p>
            <button
              onClick={() => navigate("/admin/categories")}
              className="rounded-lg border-none px-5 py-2.5 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #831843, #ec4899)",
              }}
            >
              Manage Categories
            </button>
          </div>
        ) : (
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
                  placeholder="Enter product name"
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
                  placeholder="Describe the product..."
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
                    Sub Category{" "}
                    {formData.category && (
                      <span className="text-pink-600">*</span>
                    )}
                  </label>
                  <select
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    disabled={!formData.category}
                    required={!!formData.category}
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
                  placeholder="Enter brand name"
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
                    placeholder="0"
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
                    placeholder="0"
                    min="0"
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs text-gray-500">
                    Leave empty if no discount
                  </span>
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
                    placeholder="0"
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
                    placeholder="Color name (e.g., Red)"
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
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Product Images <span className="text-pink-600">*</span> (Max 5)
              </label>
              <label
                htmlFor="add-product-images"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-all hover:border-pink-500 hover:bg-pink-50"
              >
                <span style={matIcon} className="text-[36px] text-pink-500">
                  cloud_upload
                </span>
                <p className="m-0 text-sm font-semibold text-gray-800">
                  {images.length > 0
                    ? `${images.length} image(s) selected`
                    : "Click to upload images"}
                </p>
                <p className="m-0 text-xs text-gray-500">
                  JPG, PNG, WebP &middot; Max 5MB each
                </p>
                <input
                  id="add-product-images"
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
                        alt={`Preview ${index + 1}`}
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
                placeholder="e.g., summer, casual, trending"
                className={inputClass}
              />
            </div>

            <div className="flex flex-wrap gap-3 max-md:flex-col">
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 max-md:w-full"
                style={{
                  background:
                    "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
                }}
              >
                {loading && (
                  <span
                    className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    style={{ animation: "ap-spin 0.7s linear infinite" }}
                  />
                )}
                {loading ? "Adding Product..." : "Add Product"}
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
        )}
      </div>

      <style>{`
        @keyframes ap-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AddProduct;

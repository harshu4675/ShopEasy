import React, { useState, useEffect, useCallback } from "react";
import { bannersAPI } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const emptyForm = {
  title: "",
  subtitle: "",
  buttonText: "",
  link: "/products",
  order: 0,
  isActive: true,
  textPosition: "left",
  textColor: "#ffffff",
  overlayOpacity: 0.35,
};

const ManageBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    const fontId = "admin-banners-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bannersAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : [];
      setBanners(data);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Error loading banners",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, order: banners.length });
    setImageFile(null);
    setImagePreview("");
    setShowModal(true);
  };

  const openEditModal = (banner) => {
    setEditingId(banner._id);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      buttonText: banner.buttonText || "",
      link: banner.link || "/products",
      order: banner.order || 0,
      isActive: banner.isActive,
      textPosition: banner.textPosition || "left",
      textColor: banner.textColor || "#ffffff",
      overlayOpacity: banner.overlayOpacity ?? 0.35,
    });
    setImageFile(null);
    setImagePreview(banner.image);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Image must be less than 10MB", "error");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingId && !imageFile) {
      showToast("Please select a banner image", "error");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append("image", imageFile);

      if (editingId) {
        await bannersAPI.update(editingId, fd);
        showToast("Banner updated successfully", "success");
      } else {
        await bannersAPI.create(fd);
        showToast("Banner created successfully", "success");
      }
      closeModal();
      fetchBanners();
    } catch (err) {
      showToast(err.response?.data?.message || "Error saving banner", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await bannersAPI.toggle(id);
      setBanners((prev) => prev.map((b) => (b._id === id ? res.data : b)));
      showToast(
        res.data.isActive ? "Banner activated" : "Banner deactivated",
        "success",
      );
    } catch (err) {
      showToast(
        err.response?.data?.message || "Error toggling banner",
        "error",
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner permanently?")) return;
    try {
      await bannersAPI.delete(id);
      setBanners((prev) => prev.filter((b) => b._id !== id));
      showToast("Banner deleted", "success");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Error deleting banner",
        "error",
      );
    }
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...banners];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setBanners(reordered);
    setDragIndex(index);
  };

  const handleDragEnd = async () => {
    setDragIndex(null);
    try {
      const orders = banners.map((b, i) => ({ id: b._id, order: i }));
      await bannersAPI.reorder(orders);
      showToast("Order saved", "success");
    } catch (err) {
      showToast("Failed to save order", "error");
      fetchBanners();
    }
  };

  if (loading) return <Loader fullScreen />;

  const activeCount = banners.filter((b) => b.isActive).length;

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-gray-50 py-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-gray-900 max-md:text-2xl">
              Homepage Banners
            </h1>
            <p className="m-0 text-sm text-gray-500">
              {banners.length} total &middot; {activeCount} active &middot; drag
              to reorder
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #e91e63, #9c27b0)",
            }}
          >
            <span style={matIcon} className="text-[20px]">
              add_circle
            </span>
            Add Banner
          </button>
        </div>

        {banners.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
            <span
              style={matIcon}
              className="mb-4 block text-[64px] text-gray-300"
            >
              image
            </span>
            <h3 className="mb-2 text-xl font-bold text-gray-800">
              No banners yet
            </h3>
            <p className="mb-6 text-gray-500">
              Create your first hero banner to showcase on the homepage
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none px-6 py-3 text-sm font-semibold text-white transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #e91e63, #9c27b0)",
              }}
            >
              <span style={matIcon} className="text-[20px]">
                add
              </span>
              Create First Banner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {banners.map((banner, index) => (
              <div
                key={banner._id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative overflow-hidden rounded-2xl border-2 bg-white shadow-md transition-all duration-200 hover:shadow-xl ${
                  dragIndex === index
                    ? "scale-[0.98] border-pink-500 opacity-70"
                    : "border-gray-100"
                } ${!banner.isActive ? "opacity-70" : ""}`}
              >
                <div className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-sm font-bold text-white backdrop-blur-md">
                  {index + 1}
                </div>

                <div className="absolute right-3 top-3 z-10 flex gap-1.5">
                  {banner.mediaType === "gif" && (
                    <span className="rounded-md bg-purple-500 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-md">
                      GIF
                    </span>
                  )}
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase text-white shadow-md ${
                      banner.isActive ? "bg-green-500" : "bg-gray-500"
                    }`}
                  >
                    {banner.isActive ? "Active" : "Hidden"}
                  </span>
                </div>

                <div
                  className="relative w-full overflow-hidden bg-gray-100"
                  style={{ aspectRatio: "16/8" }}
                >
                  <img
                    src={banner.image}
                    alt={banner.title || "Banner"}
                    className="h-full w-full object-cover"
                  />
                  {(banner.title || banner.subtitle) && (
                    <div
                      className="absolute inset-0 flex items-end p-4"
                      style={{
                        background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,${banner.overlayOpacity || 0.35}) 100%)`,
                      }}
                    >
                      <div style={{ color: banner.textColor || "#ffffff" }}>
                        {banner.subtitle && (
                          <span className="mb-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md">
                            {banner.subtitle}
                          </span>
                        )}
                        {banner.title && (
                          <h4 className="m-0 text-base font-bold leading-tight drop-shadow-md">
                            {banner.title}
                          </h4>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    {banner.buttonText && (
                      <span className="flex items-center gap-1 rounded-md bg-pink-50 px-2 py-1 text-pink-700">
                        <span style={matIcon} className="text-[14px]">
                          smart_button
                        </span>
                        {banner.buttonText}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                      <span style={matIcon} className="text-[14px]">
                        link
                      </span>
                      {banner.link}
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-purple-700">
                      <span style={matIcon} className="text-[14px]">
                        format_align_{banner.textPosition || "left"}
                      </span>
                      {banner.textPosition || "left"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggle(banner._id)}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                        banner.isActive
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      <span style={matIcon} className="text-[16px]">
                        {banner.isActive ? "visibility_off" : "visibility"}
                      </span>
                      {banner.isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => openEditModal(banner)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border-none bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition-all duration-200 hover:bg-blue-200"
                    >
                      <span style={matIcon} className="text-[16px]">
                        edit
                      </span>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(banner._id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border-none bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition-all duration-200 hover:bg-red-500 hover:text-white"
                    >
                      <span style={matIcon} className="text-[16px]">
                        delete
                      </span>
                      Delete
                    </button>
                    <div
                      className="ml-auto cursor-grab text-gray-400 hover:text-pink-500 active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <span style={matIcon} className="text-[22px]">
                        drag_indicator
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "modal-in 0.2s ease" }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4"
              style={{
                background: "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)",
              }}
            >
              <div>
                <h2 className="m-0 text-xl font-bold text-gray-900">
                  {editingId ? "Edit Banner" : "Create New Banner"}
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-600">
                  {editingId
                    ? "Update banner details and preview live"
                    : "Fill details and upload an image or GIF"}
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/80 text-gray-700 transition-colors hover:bg-white disabled:opacity-50"
              >
                <span style={matIcon} className="text-[22px]">
                  close
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_1fr]">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Banner Image / GIF *
                  </label>
                  <label
                    htmlFor="banner-image"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-all duration-200 hover:border-pink-500 hover:bg-pink-50"
                  >
                    <span style={matIcon} className="text-[32px] text-pink-500">
                      cloud_upload
                    </span>
                    <div>
                      <p className="m-0 text-sm font-semibold text-gray-800">
                        {imageFile
                          ? imageFile.name
                          : editingId
                            ? "Replace image (optional)"
                            : "Click to upload"}
                      </p>
                      <p className="m-0 mt-0.5 text-xs text-gray-500">
                        JPG, PNG, WebP or GIF &middot; Max 10MB
                      </p>
                    </div>
                    <input
                      id="banner-image"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Summer Sale"
                      className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Subtitle / Tag
                    </label>
                    <input
                      type="text"
                      name="subtitle"
                      value={form.subtitle}
                      onChange={handleChange}
                      placeholder="Up to 50% off"
                      className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Button Text
                    </label>
                    <input
                      type="text"
                      name="buttonText"
                      value={form.buttonText}
                      onChange={handleChange}
                      placeholder="Shop Now"
                      className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Button Link
                    </label>
                    <input
                      type="text"
                      name="link"
                      value={form.link}
                      onChange={handleChange}
                      placeholder="/products?category=Perfumes"
                      className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Text Position
                    </label>
                    <select
                      name="textPosition"
                      value={form.textPosition}
                      onChange={handleChange}
                      className="w-full cursor-pointer rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-pink-500"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="textColor"
                        value={form.textColor}
                        onChange={handleChange}
                        className="h-10 w-12 cursor-pointer rounded-lg border-2 border-gray-200"
                      />
                      <input
                        type="text"
                        name="textColor"
                        value={form.textColor}
                        onChange={handleChange}
                        className="w-full rounded-lg border-2 border-gray-200 px-2 py-2.5 text-xs uppercase outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Overlay: {Math.round(form.overlayOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      name="overlayOpacity"
                      min="0"
                      max="1"
                      step="0.05"
                      value={form.overlayOpacity}
                      onChange={handleChange}
                      className="mt-3 w-full accent-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Display Order
                    </label>
                    <input
                      type="number"
                      name="order"
                      value={form.order}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-pink-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 transition-all hover:border-pink-500">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={form.isActive}
                        onChange={handleChange}
                        className="h-4 w-4 cursor-pointer accent-pink-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Active on homepage
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-2 flex gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                    }}
                  >
                    {saving && (
                      <span
                        className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        style={{ animation: "spin 0.7s linear infinite" }}
                      />
                    )}
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Banner"
                        : "Create Banner"}
                  </button>
                </div>
              </form>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Live Preview
                </label>
                <div
                  className="relative overflow-hidden rounded-xl bg-gray-900 shadow-lg"
                  style={{ aspectRatio: "16/9" }}
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(${
                            form.textPosition === "right"
                              ? "270deg"
                              : form.textPosition === "center"
                                ? "180deg"
                                : "90deg"
                          }, rgba(0,0,0,${form.overlayOpacity}) 0%, rgba(0,0,0,${form.overlayOpacity * 0.3}) 100%)`,
                        }}
                      />
                      <div
                        className={`absolute inset-0 flex items-center px-6 ${
                          form.textPosition === "center"
                            ? "justify-center text-center"
                            : form.textPosition === "right"
                              ? "justify-end text-right"
                              : "justify-start text-left"
                        }`}
                      >
                        <div
                          className="flex max-w-md flex-col gap-2"
                          style={{ color: form.textColor }}
                        >
                          {form.subtitle && (
                            <span className="inline-block self-start rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-md">
                              {form.subtitle}
                            </span>
                          )}
                          {form.title && (
                            <h3 className="m-0 text-2xl font-extrabold leading-tight drop-shadow-lg">
                              {form.title}
                            </h3>
                          )}
                          {form.buttonText && (
                            <span
                              className="mt-1 inline-flex items-center gap-1 self-start rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg"
                              style={{
                                background:
                                  "linear-gradient(135deg, #e91e63, #9c27b0)",
                              }}
                            >
                              {form.buttonText}
                              <span style={matIcon} className="text-[14px]">
                                arrow_forward
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
                      <span style={matIcon} className="text-[48px]">
                        image
                      </span>
                      <p className="m-0 text-sm">Upload an image to preview</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg bg-blue-50 p-3">
                  <p className="m-0 flex items-start gap-2 text-xs text-blue-800">
                    <span style={matIcon} className="text-[16px]">
                      info
                    </span>
                    <span>
                      Recommended size: <strong>1920 x 800 px</strong>. Preview
                      shows exact appearance on homepage. GIFs animate on the
                      live site.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes modal-in {
              from { opacity: 0; transform: scale(0.96); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default ManageBanners;

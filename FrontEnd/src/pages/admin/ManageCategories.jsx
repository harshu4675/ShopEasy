import React, { useState, useEffect, useCallback } from "react";
import { categoriesAPI } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const iconOptions = [
  "checkroom",
  "woman",
  "child_care",
  "spa",
  "watch",
  "sunny",
  "backpack",
  "diamond",
  "footprint",
  "auto_awesome",
  "category",
  "shopping_bag",
  "local_mall",
  "storefront",
  "redeem",
  "local_offer",
  "star",
  "favorite",
  "palette",
  "brush",
];

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [activeCatId, setActiveCatId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [catForm, setCatForm] = useState({
    name: "",
    icon: "category",
    order: 0,
    isActive: true,
  });

  const [subForm, setSubForm] = useState({
    name: "",
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    const fontId = "manage-cat-fonts";
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
      const res = await categoriesAPI.getAll();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast("Error loading categories", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm({
      name: "",
      icon: "category",
      order: categories.length,
      isActive: true,
    });
    setShowCatModal(true);
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      icon: cat.icon || "category",
      order: cat.order || 0,
      isActive: cat.isActive,
    });
    setShowCatModal(true);
  };

  const closeCatModal = () => {
    if (saving) return;
    setShowCatModal(false);
    setEditingCat(null);
  };

  const openCreateSub = (catId) => {
    setActiveCatId(catId);
    setEditingSub(null);
    const cat = categories.find((c) => c._id === catId);
    setSubForm({
      name: "",
      order: cat?.subCategories?.length || 0,
      isActive: true,
    });
    setShowSubModal(true);
  };

  const openEditSub = (catId, sub) => {
    setActiveCatId(catId);
    setEditingSub(sub);
    setSubForm({
      name: sub.name,
      order: sub.order || 0,
      isActive: sub.isActive,
    });
    setShowSubModal(true);
  };

  const closeSubModal = () => {
    if (saving) return;
    setShowSubModal(false);
    setEditingSub(null);
    setActiveCatId(null);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      showToast("Please enter category name", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingCat) {
        await categoriesAPI.update(editingCat._id, catForm);
        showToast("Category updated", "success");
      } else {
        await categoriesAPI.create(catForm);
        showToast("Category created", "success");
      }
      closeCatModal();
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    if (!subForm.name.trim()) {
      showToast("Please enter sub-category name", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingSub) {
        await categoriesAPI.updateSubCategory(
          activeCatId,
          editingSub._id,
          subForm,
        );
        showToast("Sub-category updated", "success");
      } else {
        await categoriesAPI.addSubCategory(activeCatId, subForm);
        showToast("Sub-category added", "success");
      }
      closeSubModal();
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleCat = async (id) => {
    setTogglingId(id);
    try {
      const res = await categoriesAPI.toggle(id);
      setCategories((prev) => prev.map((c) => (c._id === id ? res.data : c)));
      showToast(
        res.data.isActive ? "Category activated" : "Category hidden",
        "success",
      );
    } catch {
      showToast("Error", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteCat = async (id) => {
    if (
      !window.confirm(
        "Delete this category permanently? All sub-categories will also be deleted.",
      )
    )
      return;
    try {
      await categoriesAPI.delete(id);
      setCategories((prev) => prev.filter((c) => c._id !== id));
      showToast("Category deleted", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
    }
  };

  const deleteSub = async (catId, subId) => {
    if (!window.confirm("Delete this sub-category?")) return;
    try {
      await categoriesAPI.deleteSubCategory(catId, subId);
      fetchCategories();
      showToast("Sub-category deleted", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
    }
  };

  const handleSeed = async () => {
    if (
      !window.confirm(
        "This will create 10 default categories with sub-categories. Continue?",
      )
    )
      return;
    setSeeding(true);
    try {
      const res = await categoriesAPI.seed();
      showToast(
        `Seed complete: ${res.data.results?.filter((r) => r.status === "created").length || 0} created`,
        "success",
      );
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || "Error seeding", "error");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const inputClass =
    "w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]";

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-gray-50 py-8 max-md:py-5"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 max-md:text-xl">
              Manage Categories
            </h1>
            <p className="m-0 mt-1 text-sm text-gray-500">
              {categories.length} categories &middot;{" "}
              {categories.reduce(
                (sum, c) => sum + (c.subCategories?.length || 0),
                0,
              )}{" "}
              sub-categories
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-all hover:bg-amber-100 disabled:opacity-60"
              >
                {seeding ? (
                  <span
                    className="inline-block h-4 w-4 rounded-full border-2 border-amber-300 border-t-amber-600"
                    style={{ animation: "cat-spin 0.7s linear infinite" }}
                  />
                ) : (
                  <span style={matIcon} className="text-[18px]">
                    auto_awesome
                  </span>
                )}
                {seeding ? "Seeding..." : "Load Default Categories"}
              </button>
            )}
            <button
              onClick={openCreateCat}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #831843, #ec4899)",
              }}
            >
              <span style={matIcon} className="text-[20px]">
                add
              </span>
              Add Category
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <span
              style={matIcon}
              className="mb-4 block text-[64px] text-gray-300"
            >
              category
            </span>
            <h3 className="mb-2 text-lg font-bold text-gray-800">
              No categories yet
            </h3>
            <p className="mb-6 text-sm text-gray-500">
              Load default categories or create your own
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-60"
              >
                {seeding ? "Loading..." : "Load Default Categories"}
              </button>
              <button
                onClick={openCreateCat}
                className="rounded-xl border-none px-5 py-2.5 text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #831843, #ec4899)",
                }}
              >
                Create First Category
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const isExpanded = expandedId === cat._id;
              const activeSubCount =
                cat.subCategories?.filter((s) => s.isActive !== false).length ||
                0;

              return (
                <div
                  key={cat._id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                    cat.isActive
                      ? "border-gray-100"
                      : "border-gray-200 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3 p-4 max-md:flex-wrap">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : cat._id)}
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-pink-50 text-pink-600 transition-all hover:bg-pink-100"
                    >
                      <span
                        style={matIcon}
                        className="text-[22px] transition-transform"
                      >
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </button>

                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
                      }}
                    >
                      <span
                        style={matIcon}
                        className="text-[24px] text-pink-600"
                      >
                        {cat.icon}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="m-0 truncate text-base font-bold text-gray-900">
                          {cat.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            cat.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {cat.isActive ? "Active" : "Hidden"}
                        </span>
                      </div>
                      <p className="m-0 mt-0.5 text-xs text-gray-500">
                        {activeSubCount} sub-categor
                        {activeSubCount === 1 ? "y" : "ies"} &middot; Order:{" "}
                        {cat.order}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 max-md:w-full max-md:justify-end">
                      <button
                        onClick={() => toggleCat(cat._id)}
                        disabled={togglingId === cat._id}
                        title={cat.isActive ? "Hide" : "Show"}
                        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none transition-all disabled:opacity-60 ${
                          cat.isActive
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {togglingId === cat._id ? (
                          <span
                            className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent"
                            style={{
                              animation: "cat-spin 0.7s linear infinite",
                            }}
                          />
                        ) : (
                          <span style={matIcon} className="text-[18px]">
                            {cat.isActive ? "visibility_off" : "visibility"}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => openEditCat(cat)}
                        title="Edit"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-blue-100 text-blue-700 transition-all hover:bg-blue-200"
                      >
                        <span style={matIcon} className="text-[18px]">
                          edit
                        </span>
                      </button>
                      <button
                        onClick={() => deleteCat(cat._id)}
                        title="Delete"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-red-100 text-red-700 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <span style={matIcon} className="text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="m-0 flex items-center gap-2 text-sm font-bold text-gray-700">
                          <span
                            style={matIcon}
                            className="text-[18px] text-pink-600"
                          >
                            subdirectory_arrow_right
                          </span>
                          Sub-Categories
                        </h4>
                        <button
                          onClick={() => openCreateSub(cat._id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border-2 border-pink-500 bg-white px-3 py-1.5 text-xs font-bold text-pink-600 transition-all hover:bg-pink-50"
                        >
                          <span style={matIcon} className="text-[16px]">
                            add
                          </span>
                          Add Sub
                        </button>
                      </div>

                      {!cat.subCategories || cat.subCategories.length === 0 ? (
                        <p className="m-0 rounded-lg border border-dashed border-gray-300 bg-white py-4 text-center text-xs text-gray-500">
                          No sub-categories yet. Add one to organize products
                          better.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-lg:grid-cols-2 max-md:grid-cols-1">
                          {cat.subCategories
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((sub) => (
                              <div
                                key={sub._id}
                                className={`flex items-center gap-2 rounded-lg border bg-white p-2.5 transition-all ${
                                  sub.isActive !== false
                                    ? "border-gray-200"
                                    : "border-gray-200 opacity-60"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="m-0 truncate text-sm font-semibold text-gray-900">
                                    {sub.name}
                                  </p>
                                  <p className="m-0 text-[10px] text-gray-500">
                                    {sub.isActive !== false
                                      ? "Active"
                                      : "Hidden"}{" "}
                                    &middot; Order: {sub.order || 0}
                                  </p>
                                </div>
                                <button
                                  onClick={() => openEditSub(cat._id, sub)}
                                  title="Edit"
                                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-blue-100 text-blue-700 hover:bg-blue-200"
                                >
                                  <span style={matIcon} className="text-[14px]">
                                    edit
                                  </span>
                                </button>
                                <button
                                  onClick={() => deleteSub(cat._id, sub._id)}
                                  title="Delete"
                                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-red-100 text-red-700 hover:bg-red-500 hover:text-white"
                                >
                                  <span style={matIcon} className="text-[14px]">
                                    delete
                                  </span>
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCatModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeCatModal}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "cat-modal-in 0.2s ease" }}
          >
            <div
              className="flex items-center justify-between border-b border-gray-100 px-6 py-4"
              style={{
                background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
              }}
            >
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  {editingCat ? "Edit Category" : "New Category"}
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-600">
                  {editingCat
                    ? "Update category details"
                    : "Create a main category"}
                </p>
              </div>
              <button
                onClick={closeCatModal}
                disabled={saving}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-white/80 text-gray-700 hover:bg-white disabled:opacity-50"
              >
                <span style={matIcon} className="text-[20px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleCatSubmit} className="p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Category Name <span className="text-pink-600">*</span>
                </label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({ ...catForm, name: e.target.value })
                  }
                  placeholder="e.g., Men's Clothing"
                  required
                  className={inputClass}
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2 max-md:grid-cols-5">
                  {iconOptions.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setCatForm({ ...catForm, icon: ic })}
                      className={`flex h-12 cursor-pointer items-center justify-center rounded-lg border-2 transition-all ${
                        catForm.icon === ic
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 bg-white hover:border-pink-300"
                      }`}
                    >
                      <span
                        style={matIcon}
                        className={`text-[24px] ${catForm.icon === ic ? "text-pink-600" : "text-gray-600"}`}
                      >
                        {ic}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={catForm.order}
                    onChange={(e) =>
                      setCatForm({ ...catForm, order: e.target.value })
                    }
                    min="0"
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-3 hover:border-pink-500">
                    <input
                      type="checkbox"
                      checked={catForm.isActive}
                      onChange={(e) =>
                        setCatForm({ ...catForm, isActive: e.target.checked })
                      }
                      className="h-4 w-4 cursor-pointer accent-pink-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeCatModal}
                  disabled={saving}
                  className="flex-1 cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #831843, #ec4899)",
                  }}
                >
                  {saving && (
                    <span
                      className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      style={{ animation: "cat-spin 0.7s linear infinite" }}
                    />
                  )}
                  {saving ? "Saving..." : editingCat ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeSubModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "cat-modal-in 0.2s ease" }}
          >
            <div
              className="flex items-center justify-between border-b border-gray-100 px-6 py-4"
              style={{
                background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
              }}
            >
              <div>
                <h2 className="m-0 text-lg font-bold text-gray-900">
                  {editingSub ? "Edit Sub-Category" : "New Sub-Category"}
                </h2>
                <p className="m-0 mt-0.5 text-xs text-gray-600">
                  {categories.find((c) => c._id === activeCatId)?.name}
                </p>
              </div>
              <button
                onClick={closeSubModal}
                disabled={saving}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-white/80 text-gray-700 hover:bg-white disabled:opacity-50"
              >
                <span style={matIcon} className="text-[20px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSubSubmit} className="p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Sub-Category Name <span className="text-pink-600">*</span>
                </label>
                <input
                  type="text"
                  value={subForm.name}
                  onChange={(e) =>
                    setSubForm({ ...subForm, name: e.target.value })
                  }
                  placeholder="e.g., T-Shirts"
                  required
                  autoFocus
                  className={inputClass}
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={subForm.order}
                    onChange={(e) =>
                      setSubForm({ ...subForm, order: e.target.value })
                    }
                    min="0"
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-3 hover:border-pink-500">
                    <input
                      type="checkbox"
                      checked={subForm.isActive}
                      onChange={(e) =>
                        setSubForm({ ...subForm, isActive: e.target.checked })
                      }
                      className="h-4 w-4 cursor-pointer accent-pink-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeSubModal}
                  disabled={saving}
                  className="flex-1 cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #831843, #ec4899)",
                  }}
                >
                  {saving && (
                    <span
                      className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      style={{ animation: "cat-spin 0.7s linear infinite" }}
                    />
                  )}
                  {saving ? "Saving..." : editingSub ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cat-spin { to { transform: rotate(360deg); } }
        @keyframes cat-modal-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ManageCategories;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data);
    } catch (error) {
      showToast("Error fetching products", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter((p) => p._id !== id));
      showToast("Product deleted successfully", "success");
    } catch (error) {
      showToast("Error deleting product", "error");
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 md:px-4">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-5 md:flex-col md:!items-stretch md:gap-3">
          <h1 className="text-[28px] font-bold text-dark md:text-[22px]">
            All Products ({products.length})
          </h1>
          <Link
            to="/admin/add-product"
            className="inline-flex items-center justify-center gap-2 py-3.5 px-7 border-none rounded-md cursor-pointer font-[inherit] text-[15px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-gradient-primary text-white shadow-primary hover:-translate-y-0.5 hover:shadow-primary-hover md:hidden"
          >
            <span>➕</span>
            <span>Add Product</span>
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white p-5 rounded-md mb-6 shadow-sm md:p-3">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-[400px] py-3.5 px-5 border-2 border-gray-200 rounded-md text-[15px] transition-all duration-300 ease-custom focus:outline-none focus-ring-primary md:max-w-full md:py-3 md:px-4 md:text-base"
          />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 px-5">
            <h3 className="text-[22px] mb-3 text-gray-700">
              No products found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search or add new products
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="block md:!hidden bg-white rounded-md shadow-sm overflow-hidden lg:overflow-x-auto">
              <table className="w-full border-collapse lg:min-w-[800px]">
                <thead>
                  <tr>
                    {[
                      "Image",
                      "Product",
                      "Category",
                      "Price",
                      "Stock",
                      "Rating",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="py-4 px-5 text-left border-b border-gray-200 bg-gray-100 text-xs font-bold text-gray-600 uppercase tracking-[0.5px]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-100">
                      <td className="py-4 px-5 border-b border-gray-200">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-[60px] h-[70px] object-cover rounded-sm"
                        />
                      </td>
                      <td className="py-4 px-5 border-b border-gray-200">
                        <div className="max-w-[250px]">
                          <p className="font-semibold text-gray-800 m-0 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            {product.name}
                          </p>
                          <p className="text-[13px] text-gray-500 m-0">
                            {product.brand}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-5 border-b border-gray-200 text-sm">
                        {product.category}
                      </td>
                      <td className="py-4 px-5 border-b border-gray-200">
                        <span className="font-bold text-gray-800 block">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="text-xs text-gray-500 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 border-b border-gray-200">
                        <span
                          className={`py-1.5 px-3.5 rounded-[50px] text-[13px] font-bold ${
                            product.stock === 0
                              ? "bg-[#ffebee] text-[#c62828]"
                              : product.stock <= 10
                                ? "bg-[#fff3e0] text-[#e65100]"
                                : "bg-[#e8f5e9] text-[#2e7d32]"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-4 px-5 border-b border-gray-200 text-sm text-gray-600">
                        ⭐ {product.rating?.toFixed(1) || "0.0"} (
                        {product.numReviews || 0})
                      </td>
                      <td className="py-4 px-5 border-b border-gray-200">
                        <div className="flex gap-2 lg:flex-col lg:gap-1.5">
                          <Link
                            to={`/admin/edit-product/${product._id}`}
                            className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-2 border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap hover:border-primary hover:text-primary lg:text-xs lg:py-2 lg:px-3"
                          >
                            ✏️ Edit
                          </Link>
                          <button
                            onClick={() => deleteProduct(product._id)}
                            className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-error text-white hover:bg-[#d32f2f] hover:-translate-y-0.5 lg:text-xs lg:py-2 lg:px-3"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="hidden md:!grid grid-cols-1 gap-4 pb-20">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-md p-4 shadow-sm border border-gray-200"
                >
                  <div className="flex gap-3.5 mb-3.5">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-20 h-[100px] object-cover rounded-sm flex-shrink-0 sm:w-[70px] sm:h-[85px]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-semibold m-0 mb-1 leading-[1.3] line-clamp-2 sm:text-sm">
                        {product.name}
                      </h4>
                      <p className="text-[13px] text-gray-500 m-0 mb-0.5">
                        {product.brand}
                      </p>
                      <p className="text-xs text-gray-400 m-0 mb-2">
                        {product.category}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-primary">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="text-[13px] text-gray-400 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 border-t border-b border-gray-100 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-gray-500 font-medium">
                        Stock:
                      </span>
                      <span
                        className={`py-1 px-2.5 rounded-[50px] text-xs font-bold md:text-xs md:py-1 md:px-2.5 ${
                          product.stock === 0
                            ? "bg-[#ffebee] text-[#c62828]"
                            : product.stock <= 10
                              ? "bg-[#fff3e0] text-[#e65100]"
                              : "bg-[#e8f5e9] text-[#2e7d32]"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-gray-500 font-medium">
                        Rating:
                      </span>
                      <span className="text-[13px] text-gray-600">
                        ⭐ {product.rating?.toFixed(1) || "0.0"} (
                        {product.numReviews || 0})
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <Link
                      to={`/admin/edit-product/${product._id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 text-sm font-semibold rounded-sm border-none cursor-pointer transition-all duration-300 ease-custom min-h-[44px] bg-primary text-white hover:bg-primary-dark sm:py-2.5 sm:px-3 sm:text-[13px]"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => deleteProduct(product._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 text-sm font-semibold rounded-sm border-none cursor-pointer transition-all duration-300 ease-custom min-h-[44px] bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca] sm:py-2.5 sm:px-3 sm:text-[13px]"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Mobile FAB */}
        <div className="hidden md:!flex fixed bottom-20 right-5 z-[1000]">
          <Link
            to="/admin/add-product"
            className="w-14 h-14 rounded-full bg-primary text-white border-none shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center justify-center text-2xl cursor-pointer transition-all duration-200 no-underline hover:scale-110 hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)]"
            title="Add Product"
          >
            ➕
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AllProducts;

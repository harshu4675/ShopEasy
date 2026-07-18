import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import ReviewCard from "../components/ReviewCard";
import Loader from "../components/Loader";

const ProductDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
    image: null,
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fontId = "product-details-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const matIcon = {
    fontFamily: '"Material Symbols Outlined"',
    fontWeight: "normal",
    fontStyle: "normal",
    lineHeight: 1,
    display: "inline-block",
  };

  const fetchProduct = useCallback(async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
      if (response.data.sizes?.length) setSelectedSize(response.data.sizes[0]);
      if (response.data.colors?.length)
        setSelectedColor(response.data.colors[0].name);
    } catch (error) {
      showToast("Error loading product", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await api.get(`/reviews/product/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [fetchProduct, fetchReviews]);

  const addToCart = async () => {
    if (!user) {
      showToast("Please login to add items to cart", "error");
      return;
    }
    try {
      await api.post("/cart/add", {
        productId: id,
        quantity,
        size: selectedSize,
        color: selectedColor,
      });
      showToast("Added to cart successfully", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error adding to cart",
        "error",
      );
    }
  };

  const addToWishlist = async () => {
    if (!user) {
      showToast("Please login to add to wishlist", "error");
      return;
    }
    try {
      await api.post(`/wishlist/add/${id}`);
      showToast("Added to wishlist", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error adding to wishlist",
        "error",
      );
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to write a review", "error");
      return;
    }

    const formData = new FormData();
    formData.append("product", id);
    formData.append("rating", reviewForm.rating);
    formData.append("title", reviewForm.title);
    formData.append("comment", reviewForm.comment);
    if (reviewForm.image) {
      formData.append("image", reviewForm.image);
    }

    try {
      await api.post("/reviews", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Review submitted successfully", "success");
      setReviewForm({ rating: 5, title: "", comment: "", image: null });
      setShowReviewForm(false);
      fetchReviews();
      fetchProduct();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error submitting review",
        "error",
      );
    }
  };

  const discountPercent = product?.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : product?.discount || 0;

  if (loading) return <Loader fullScreen />;
  if (!product)
    return <div className="container mx-auto px-4">Product not found</div>;

  return (
    <div
      className="min-h-screen pb-[60px] pt-5 max-md:pb-10 max-md:pt-4 max-[480px]:pb-[30px] max-[480px]:pt-3"
      style={{
        background: "linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container mx-auto px-4">
        <nav className="mb-6 flex flex-wrap items-center gap-2 rounded-[10px] bg-white px-4 py-3 text-[13px] shadow-[0_2px_8px_rgba(102,126,234,0.06)] max-md:mb-[18px] max-md:gap-[6px] max-md:px-3 max-md:py-[10px] max-md:text-[12px] max-[480px]:mb-[14px] max-[480px]:px-[10px] max-[480px]:py-2 max-[480px]:text-[11px]">
          <Link
            to="/"
            className="font-medium text-[#6b7280] no-underline transition-colors duration-300 hover:text-[#667eea]"
          >
            Home
          </Link>
          <span className="text-[#d1d5db]">/</span>
          <Link
            to="/products"
            className="font-medium text-[#6b7280] no-underline transition-colors duration-300 hover:text-[#667eea]"
          >
            Products
          </Link>
          <span className="text-[#d1d5db]">/</span>
          <Link
            to={`/products?category=${product.category}`}
            className="font-medium text-[#6b7280] no-underline transition-colors duration-300 hover:text-[#667eea]"
          >
            {product.category}
          </Link>
          <span className="text-[#d1d5db]">/</span>
          <span className="font-semibold text-[#667eea]">{product.name}</span>
        </nav>

        <div className="mb-[60px] grid grid-cols-2 gap-10 max-[1024px]:mb-[40px] max-[1024px]:grid-cols-1 max-[1024px]:gap-[30px] max-md:gap-6 max-md:mb-10">
          <div className="max-[1024px]:static lg:sticky lg:top-[90px] lg:h-fit">
            <div
              className="relative mb-[14px] w-full overflow-hidden rounded-[16px] border border-[rgba(102,126,234,0.06)] shadow-[0_6px_24px_rgba(102,126,234,0.1)] max-md:mb-3 max-md:rounded-[14px] max-[480px]:mb-[10px] max-[480px]:rounded-[12px]"
              style={{
                paddingTop: "115%",
                background: "#ffffff",
              }}
            >
              {discountPercent > 0 && (
                <span
                  className="absolute left-[14px] top-[14px] z-10 rounded-[8px] px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(102,126,234,0.4)] max-md:left-3 max-md:top-3 max-md:px-3 max-md:py-[6px] max-md:text-[12px] max-[480px]:left-[10px] max-[480px]:top-[10px] max-[480px]:rounded-[6px] max-[480px]:px-[10px] max-[480px]:py-[5px] max-[480px]:text-[11px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  {discountPercent}% OFF
                </span>
              )}
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-contain "
              />
            </div>

            {product.images.length > 1 && (
              <div className="scrollbar-none flex gap-[10px] overflow-x-auto pb-[6px] max-[1024px]:justify-center max-md:gap-2 max-[480px]:gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`h-[70px] w-[70px] shrink-0 cursor-pointer overflow-hidden rounded-[10px] border-2 bg-[#f8f9ff] p-0 transition-all duration-300 max-md:h-[60px] max-md:w-[60px] max-md:rounded-[8px] max-[480px]:h-[52px] max-[480px]:w-[52px] max-[480px]:rounded-[6px] ${
                      selectedImage === index
                        ? "border-[#667eea] shadow-[0_0_0_2px_rgba(102,126,234,0.2)]"
                        : "border-transparent hover:border-[rgba(102,126,234,0.4)]"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div
              className="mb-2 inline-block rounded-[6px] px-3 py-1 text-[12px] font-bold uppercase tracking-[1.5px] text-[#667eea] max-md:px-[10px] max-md:py-[3px] max-md:text-[11px] max-[480px]:px-2 max-[480px]:py-[3px] max-[480px]:text-[10px] max-[480px]:tracking-[1px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)",
              }}
            >
              {product.brand}
            </div>

            <h1 className="mb-[14px] text-[26px] font-extrabold leading-[1.3] text-[#1a1a2e] max-md:mb-3 max-md:text-[20px] max-[480px]:mb-[10px] max-[480px]:text-[18px]">
              {product.name}
            </h1>

            <div className="mb-[18px] flex items-center gap-[10px] max-md:mb-[14px] max-[480px]:mb-3 max-[480px]:gap-2">
              <div className="flex gap-[2px]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-[18px] max-md:text-[16px] max-[480px]:text-[14px] ${
                      star <= product.rating
                        ? "text-[#ffc107]"
                        : "text-[#e5e7eb]"
                    }`}
                  >
                    &#9733;
                  </span>
                ))}
              </div>
              <span className="text-[13px] font-medium text-[#6b7280] max-md:text-[12px] max-[480px]:text-[11px]">
                {product.rating} ({product.numReviews} reviews)
              </span>
            </div>

            <div
              className="mb-[18px] flex flex-wrap items-center gap-3 rounded-[12px] px-4 py-4 max-md:mb-[14px] max-md:px-3 max-md:py-3 max-[480px]:gap-2 max-[480px]:px-[10px] max-[480px]:py-[10px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%)",
              }}
            >
              <span
                className="text-[30px] font-extrabold max-md:text-[24px] max-[480px]:text-[22px]"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-[18px] text-[#9ca3af] line-through max-md:text-[16px] max-[480px]:text-[14px]">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span
                    className="rounded-[6px] px-3 py-[5px] text-[14px] font-bold text-white max-md:px-[10px] max-md:py-1 max-md:text-[12px] max-[480px]:px-2 max-[480px]:py-[3px] max-[480px]:text-[11px]"
                    style={{
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    }}
                  >
                    {discountPercent}% off
                  </span>
                </>
              )}
            </div>

            <p className="mb-6 rounded-[10px] border-l-[3px] border-[#667eea] bg-white px-[14px] py-[14px] text-[14px] leading-[1.7] text-[#4b5563] shadow-[0_2px_6px_rgba(102,126,234,0.06)] max-md:mb-[18px] max-md:px-3 max-md:py-3 max-md:text-[13px] max-[480px]:px-[10px] max-[480px]:py-[10px] max-[480px]:text-[12px] max-[480px]:leading-[1.6]">
              {product.description}
            </p>

            {product.sizes?.length > 0 && (
              <div className="mb-5 rounded-[12px] border border-[rgba(102,126,234,0.04)] bg-white p-[18px] shadow-[0_2px_8px_rgba(102,126,234,0.06)] max-md:mb-[14px] max-md:p-[14px] max-[480px]:mb-3 max-[480px]:rounded-[10px] max-[480px]:p-3">
                <label className="mb-3 block text-[13px] font-bold uppercase tracking-[0.5px] text-[#1a1a2e] max-md:mb-[10px] max-md:text-[12px] max-[480px]:mb-2 max-[480px]:text-[11px]">
                  Size:
                </label>
                <div className="flex flex-wrap gap-2 max-[480px]:gap-[6px]">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[44px] cursor-pointer rounded-[8px] border-2 px-4 py-[10px] text-[13px] font-semibold transition-all duration-300 max-md:min-w-[40px] max-md:rounded-[6px] max-md:px-[14px] max-md:py-2 max-md:text-[12px] max-[480px]:min-w-[38px] max-[480px]:px-3 max-[480px]:py-2 max-[480px]:text-[11px] ${
                        selectedSize === size
                          ? "border-[#667eea] text-white shadow-[0_4px_12px_rgba(102,126,234,0.3)]"
                          : "border-[#e5e7eb] bg-white text-[#1a1a2e] hover:border-[#667eea]"
                      }`}
                      style={
                        selectedSize === size
                          ? {
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            }
                          : {}
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.colors?.length > 0 && (
              <div className="mb-5 rounded-[12px] border border-[rgba(102,126,234,0.04)] bg-white p-[18px] shadow-[0_2px_8px_rgba(102,126,234,0.06)] max-md:mb-[14px] max-md:p-[14px] max-[480px]:mb-3 max-[480px]:rounded-[10px] max-[480px]:p-3">
                <label className="mb-3 block text-[13px] font-bold uppercase tracking-[0.5px] text-[#1a1a2e] max-md:mb-[10px] max-md:text-[12px] max-[480px]:mb-2 max-[480px]:text-[11px]">
                  Color: {selectedColor}
                </label>
                <div className="flex flex-wrap gap-[10px]">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      title={color.name}
                      style={{ backgroundColor: color.code }}
                      className={`relative h-[38px] w-[38px] cursor-pointer rounded-full border-[3px] transition-all duration-300 hover:scale-110 max-md:h-[34px] max-md:w-[34px] max-[480px]:h-8 max-[480px]:w-8 max-[480px]:border-2 ${
                        selectedColor === color.name
                          ? "border-[#1a1a2e] shadow-[0_0_0_2px_white,0_0_0_4px_#667eea]"
                          : "border-[#e5e7eb]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5 rounded-[12px] border border-[rgba(102,126,234,0.04)] bg-white p-[18px] shadow-[0_2px_8px_rgba(102,126,234,0.06)] max-md:mb-[14px] max-md:p-[14px] max-[480px]:mb-3 max-[480px]:rounded-[10px] max-[480px]:p-3">
              <label className="mb-3 block text-[13px] font-bold uppercase tracking-[0.5px] text-[#1a1a2e] max-md:mb-[10px] max-md:text-[12px] max-[480px]:mb-2 max-[480px]:text-[11px]">
                Quantity:
              </label>
              <div className="inline-flex items-center overflow-hidden rounded-[10px] border-2 border-[#e5e7eb] max-[480px]:rounded-[8px]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center border-none text-[18px] font-semibold text-[#667eea] transition-all duration-300 hover:text-white max-md:h-[38px] max-md:w-[38px] max-md:text-[16px] max-[480px]:h-9 max-[480px]:w-9 max-[480px]:text-[14px]"
                  style={{ background: "rgba(102,126,234,0.06)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(102,126,234,0.06)";
                  }}
                >
                  &minus;
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  max={product.stock}
                  className="h-[42px] w-14 border-none bg-white text-center text-[16px] font-semibold outline-none focus:outline-none max-md:h-[38px] max-md:w-[50px] max-md:text-[14px] max-[480px]:h-9 max-[480px]:w-[46px] max-[480px]:text-[13px]"
                />
                <button
                  onClick={() =>
                    setQuantity(Math.min(product.stock, quantity + 1))
                  }
                  className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center border-none text-[18px] font-semibold text-[#667eea] transition-all duration-300 hover:text-white max-md:h-[38px] max-md:w-[38px] max-md:text-[16px] max-[480px]:h-9 max-[480px]:w-9 max-[480px]:text-[14px]"
                  style={{ background: "rgba(102,126,234,0.06)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(102,126,234,0.06)";
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-5 text-[13px] font-semibold max-md:mb-4 max-md:text-[12px]">
              {product.stock > 0 ? (
                <span className="inline-block rounded-[8px] bg-[rgba(16,185,129,0.1)] px-4 py-[10px] text-[#059669] max-md:px-3 max-md:py-2 max-[480px]:px-3 max-[480px]:py-2">
                  In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="inline-block rounded-[8px] bg-[rgba(220,38,38,0.1)] px-4 py-[10px] text-[#dc2626] max-md:px-3 max-md:py-2 max-[480px]:px-3 max-[480px]:py-2">
                  Out of Stock
                </span>
              )}
            </div>

            <div className="mb-7 flex gap-3 max-md:mb-5 max-md:flex-col max-md:gap-[10px]">
              <button
                onClick={addToCart}
                disabled={product.stock === 0}
                className="flex-1 cursor-pointer rounded-[12px] border-none px-6 py-[14px] text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(102,126,234,0.3)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] disabled:cursor-not-allowed disabled:opacity-60 max-md:w-full max-md:px-5 max-md:text-[14px] max-[480px]:rounded-[10px] max-[480px]:px-[18px] max-[480px]:py-3 max-[480px]:text-[13px]"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                Add to Cart
              </button>
              <button
                onClick={addToWishlist}
                className="flex-1 cursor-pointer rounded-[12px] border-2 border-[#667eea] bg-white px-6 py-[14px] text-[15px] font-bold text-[#667eea] transition-all duration-300 hover:-translate-y-[2px] hover:text-white max-md:w-full max-md:px-5 max-md:text-[14px] max-[480px]:rounded-[10px] max-[480px]:px-[18px] max-[480px]:py-3 max-[480px]:text-[13px]"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                Wishlist
              </button>
              <button
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator.share({ title: product.name, url });
                  } else {
                    navigator.clipboard.writeText(url);
                    showToast("Link copied", "success");
                  }
                }}
                className="flex-1 cursor-pointer rounded-[12px] border-2 border-[#667eea] bg-white px-6 py-[14px] text-[15px] font-bold text-[#667eea] transition-all duration-300 hover:-translate-y-[2px] hover:text-white max-md:w-full max-md:px-5 max-md:text-[14px] max-[480px]:rounded-[10px] max-[480px]:px-[18px] max-[480px]:py-3 max-[480px]:text-[13px]"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                Share
              </button>
            </div>

            <div
              className="grid grid-cols-3 gap-3 rounded-[12px] p-[18px] max-md:grid-cols-1 max-md:gap-[10px] max-md:p-[14px] max-[480px]:gap-2 max-[480px]:rounded-[10px] max-[480px]:p-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(102,126,234,0.04) 0%, rgba(118,75,162,0.04) 100%)",
              }}
            >
              {[
                {
                  icon: "local_shipping",
                  title: "Free Delivery",
                  desc: "On orders above Rs.199",
                },
                {
                  icon: "assignment_return",
                  title: "7 Days Return",
                  desc: "Easy return policy",
                },
                {
                  icon: "credit_card",
                  title: "Secure Payment",
                  desc: "100% secure checkout",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-center gap-[10px] rounded-[10px] bg-white p-3 shadow-[0_2px_6px_rgba(102,126,234,0.04)] max-md:gap-3 max-md:p-3 max-[480px]:gap-[10px] max-[480px]:rounded-[8px] max-[480px]:p-[10px]"
                >
                  <span
                    style={matIcon}
                    className="text-[22px] text-[#667eea] max-md:text-[24px] max-[480px]:text-[20px]"
                  >
                    {icon}
                  </span>
                  <div>
                    <strong className="block text-[12px] font-bold text-[#1a1a2e] max-md:text-[13px] max-[480px]:text-[12px]">
                      {title}
                    </strong>
                    <p className="m-0 text-[11px] text-[#6b7280] max-[480px]:text-[10px]">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[rgba(102,126,234,0.1)] pt-10 max-md:pt-8 max-[480px]:pt-6">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 max-md:mb-[14px] max-md:flex-col max-md:items-start max-md:gap-[14px]">
            <h2 className="text-[22px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
              Customer Reviews ({reviews.length})
            </h2>
            {user && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="cursor-pointer rounded-[10px] px-5 py-[10px] text-[14px] font-bold text-white transition-all duration-300 max-md:w-full max-md:py-[10px] max-md:text-center max-[480px]:px-4 max-[480px]:py-[10px] max-[480px]:text-[13px]"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                Write a Review
              </button>
            )}
          </div>

          {showReviewForm && (
            <form
              onSubmit={handleReviewSubmit}
              className="mb-8 rounded-[14px] border border-[rgba(102,126,234,0.08)] p-6 max-md:p-[18px] max-[480px]:rounded-[12px] max-[480px]:p-[14px]"
              style={{ background: "rgba(102,126,234,0.04)" }}
            >
              <div className="mb-[18px] max-[480px]:mb-[14px]">
                <label className="mb-[10px] block text-[13px] font-semibold text-[#1a1a2e] max-[480px]:mb-2 max-[480px]:text-[12px]">
                  Rating
                </label>
                <div className="flex gap-[6px] max-md:gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setReviewForm({ ...reviewForm, rating: star })
                      }
                      className={`cursor-pointer border-none bg-transparent p-0 text-[28px] transition-all duration-300 hover:scale-110 max-md:text-[26px] max-[480px]:text-[24px] ${
                        star <= reviewForm.rating
                          ? "text-[#ffc107]"
                          : "text-[#e5e7eb]"
                      }`}
                    >
                      &#9733;
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-[18px] max-[480px]:mb-[14px]">
                <label className="mb-[10px] block text-[13px] font-semibold text-[#1a1a2e] max-[480px]:mb-2 max-[480px]:text-[12px]">
                  Review Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Give your review a title"
                  value={reviewForm.title}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, title: e.target.value })
                  }
                  className="w-full rounded-[10px] border-2 border-[#e5e7eb] bg-white px-[14px] py-3 text-[14px] transition-all duration-300 outline-none focus:border-[#667eea] focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] max-[480px]:rounded-[8px] max-[480px]:px-3 max-[480px]:py-[10px] max-[480px]:text-[13px]"
                />
              </div>

              <div className="mb-[18px] max-[480px]:mb-[14px]">
                <label className="mb-[10px] block text-[13px] font-semibold text-[#1a1a2e] max-[480px]:mb-2 max-[480px]:text-[12px]">
                  Your Review
                </label>
                <textarea
                  rows={4}
                  placeholder="Write your review here..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  required
                  className="w-full rounded-[10px] border-2 border-[#e5e7eb] bg-white px-[14px] py-3 text-[14px] transition-all duration-300 outline-none focus:border-[#667eea] focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] max-[480px]:rounded-[8px] max-[480px]:px-3 max-[480px]:py-[10px] max-[480px]:text-[13px]"
                />
              </div>

              <div className="mb-[18px] max-[480px]:mb-[14px]">
                <label className="mb-[10px] block text-[13px] font-semibold text-[#1a1a2e] max-[480px]:mb-2 max-[480px]:text-[12px]">
                  Add Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, image: e.target.files[0] })
                  }
                  className="w-full rounded-[10px] border-2 border-[#e5e7eb] bg-white px-[14px] py-3 text-[14px] transition-all duration-300 outline-none focus:border-[#667eea] focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] max-[480px]:rounded-[8px] max-[480px]:px-3 max-[480px]:py-[10px] max-[480px]:text-[13px]"
                />
              </div>

              <div className="mt-5 flex gap-[10px] max-md:flex-col max-[480px]:gap-[10px]">
                <button
                  type="submit"
                  className="cursor-pointer rounded-[10px] px-6 py-3 text-[14px] font-semibold text-white transition-all duration-300 max-md:w-full max-[480px]:px-[18px] max-[480px]:py-[10px] max-[480px]:text-[13px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="cursor-pointer rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-3 text-[14px] font-semibold text-[#4b5563] transition-all duration-300 hover:bg-[#f3f4f6] max-md:w-full max-[480px]:px-[18px] max-[480px]:py-[10px] max-[480px]:text-[13px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="mt-7 flex flex-col gap-4">
            {reviews.length === 0 ? (
              <div
                className="rounded-[14px] border-2 border-dashed border-[rgba(102,126,234,0.15)] py-10 px-10 text-center text-[14px] text-[#6b7280] max-[480px]:rounded-[12px] max-[480px]:px-5 max-[480px]:py-[30px] max-[480px]:text-[13px]"
                style={{ background: "rgba(102,126,234,0.04)" }}
              >
                <p>No reviews yet. Be the first to review this product!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewCard key={review._id} review={review} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;

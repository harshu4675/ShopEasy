import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import ReviewCard from "../components/ReviewCard";
import Loader from "../components/Loader";
import "../styles/ProductDetails.css";

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
      showToast("Added to cart! 🛒", "success");
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
      showToast("Added to wishlist! ♡", "success");
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
      showToast("Review submitted successfully! ⭐", "success");
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
  if (!product) return <div className="container">Product not found</div>;

  return (
    <div className="product-details">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/products">Products</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category}`}>
            {product.category}
          </Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-main">
          {/* Image Gallery */}
          <div className="product-gallery">
            <div className="main-image">
              {discountPercent > 0 && (
                <span className="discount-badge">{discountPercent}% OFF</span>
              )}
              <img src={product.images[selectedImage]} alt={product.name} />
            </div>
            {product.images.length > 1 && (
              <div className="thumbnail-list">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImage === index ? "active" : ""}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info">
            <div className="product-brand">{product.brand}</div>
            <h1 className="product-name">{product.name}</h1>

            <div className="product-rating">
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= product.rating ? "filled" : ""}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="rating-text">
                {product.rating} ({product.numReviews} reviews)
              </span>
            </div>

            <div className="product-pricing">
              <span className="current-price">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="original-price">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="discount-text">{discountPercent}% off</span>
                </>
              )}
            </div>

            <p className="product-description">{product.description}</p>

            {/* Size Selection */}
            {product.sizes?.length > 0 && (
              <div className="option-group">
                <label>Size:</label>
                <div className="size-options">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={`size-btn ${selectedSize === size ? "active" : ""}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors?.length > 0 && (
              <div className="option-group">
                <label>Color: {selectedColor}</label>
                <div className="color-options">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      className={`color-btn ${selectedColor === color.name ? "active" : ""}`}
                      style={{ backgroundColor: color.code }}
                      onClick={() => setSelectedColor(color.name)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="option-group">
              <label>Quantity:</label>
              <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  max={product.stock}
                />
                <button
                  onClick={() =>
                    setQuantity(Math.min(product.stock, quantity + 1))
                  }
                >
                  +
                </button>
              </div>
            </div>

            {/* Stock Status */}
            <div className="stock-status">
              {product.stock > 0 ? (
                <span className="in-stock">
                  ✓ In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="out-of-stock">✕ Out of Stock</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                onClick={addToCart}
                className="btn btn-primary btn-lg"
                disabled={product.stock === 0}
              >
                🛒 Add to Cart
              </button>
              <button
                onClick={addToWishlist}
                className="btn btn-outline btn-lg"
              >
                ♡ Wishlist
              </button>
              {/* Share Button */}
              <button
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator.share({ title: product.name, url });
                  } else {
                    navigator.clipboard.writeText(url);
                    showToast("Link copied! 📋", "success");
                  }
                }}
                className="btn btn-outline btn-lg"
              >
                🔗 Share
              </button>
            </div>

            {/* Features */}
            <div className="product-features">
              <div className="feature">
                <span className="feature-icon">🚚</span>
                <div>
                  <strong>Free Delivery</strong>
                  <p>On orders above ₹199</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">↩️</span>
                <div>
                  <strong>7 Days Return</strong>
                  <p>Easy return policy</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">💳</span>
                <div>
                  <strong>Secure Payment</strong>
                  <p>100% secure checkout</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="reviews-section">
          <div className="reviews-header">
            <h2>Customer Reviews ({reviews.length})</h2>
            {user && (
              <button
                className="btn btn-primary"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                ✍️ Write a Review
              </button>
            )}
          </div>

          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="review-form">
              <div className="form-group">
                <label>Rating</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= reviewForm.rating ? "active" : ""}`}
                      onClick={() =>
                        setReviewForm({ ...reviewForm, rating: star })
                      }
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Review Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Give your review a title"
                  value={reviewForm.title}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, title: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Your Review</label>
                <textarea
                  rows="4"
                  placeholder="Write your review here..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Add Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, image: e.target.files[0] })
                  }
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Submit Review
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="reviews-list">
            {reviews.length === 0 ? (
              <div className="no-reviews">
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

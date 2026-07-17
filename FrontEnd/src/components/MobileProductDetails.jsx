import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, formatPrice } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { WishlistContext } from "../context/WishlistContext";
import { showToast } from "../utils/toast";
import { addRecentlyViewed } from "../utils/recentlyViewed";
import ReviewCard from "./ReviewCard";
import Loader from "./Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const MobileProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { refreshCart } = useContext(CartContext) || {};
  const { refreshWishlist } = useContext(WishlistContext) || {};

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [inWishlist, setInWishlist] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [actionLoading, setActionLoading] = useState({
    cart: false,
    wishlist: false,
    buy: false,
  });
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
    image: null,
  });
  const scrollRef = useRef(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    const fontId = "mobile-pd-fonts";
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
    window.scrollTo(0, 0);
    setImageIndex(0);
  }, [id]);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data);
      if (res.data.sizes?.length) setSelectedSize(res.data.sizes[0]);
      if (res.data.colors?.length) setSelectedColor(res.data.colors[0].name);
      addRecentlyViewed(res.data);
    } catch (err) {
      showToast("Error loading product", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get(`/reviews/product/${id}`);
      setReviews(res.data);
    } catch {
      // silent
    }
  }, [id]);

  const fetchRecommended = useCallback(async () => {
    if (!product?.category) return;
    try {
      const genderMap = {
        "Women's Clothing": "Women's Clothing",
        "Men's Clothing": "Men's Clothing",
        "Kids' Clothing": "Kids' Clothing",
      };
      const gender = genderMap[product.category];

      const [sameCat, sameGender] = await Promise.all([
        api
          .get(
            `/products?category=${encodeURIComponent(product.category)}&limit=10`,
          )
          .catch(() => ({ data: [] })),
        gender
          ? api
              .get(`/products?category=${encodeURIComponent(gender)}&limit=10`)
              .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const extract = (r) =>
        Array.isArray(r.data) ? r.data : r.data?.products || [];
      const combined = [];
      const used = new Set([product._id]);

      const addUnique = (item) => {
        if (item && !used.has(item._id)) {
          combined.push(item);
          used.add(item._id);
        }
      };

      const cat = extract(sameCat);
      const gen = extract(sameGender);
      const maxLen = Math.max(cat.length, gen.length);
      for (let i = 0; i < maxLen; i++) {
        addUnique(cat[i]);
        addUnique(gen[i]);
      }

      setRecommended(combined.slice(0, 8));
    } catch {
      setRecommended([]);
    }
  }, [product]);

  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const [wishRes, cartRes] = await Promise.all([
        api.get("/wishlist").catch(() => ({ data: { products: [] } })),
        api.get("/cart").catch(() => ({ data: { items: [] } })),
      ]);

      const wishItems = wishRes.data?.products || [];
      setInWishlist(
        wishItems.some((item) => {
          const iid = item._id || item.product?._id || item;
          return iid?.toString() === id;
        }),
      );

      const cartItems = cartRes.data?.items || [];
      setInCart(
        cartItems.some((item) => {
          const iid = item.product?._id || item.product || item._id;
          return iid?.toString() === id;
        }),
      );
    } catch {
      // silent
    }
  }, [user, id]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [fetchProduct, fetchReviews]);

  useEffect(() => {
    fetchRecommended();
  }, [fetchRecommended]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const addToCart = async () => {
    if (!user) {
      showToast("Please login to add to cart", "error");
      navigate("/login");
      return;
    }
    if (inCart) {
      navigate("/cart");
      return;
    }
    setActionLoading((p) => ({ ...p, cart: true }));
    try {
      await api.post("/cart/add", {
        productId: id,
        quantity: 1,
        size: selectedSize,
        color: selectedColor,
      });
      setInCart(true);
      if (refreshCart) refreshCart();
      showToast("Added to cart", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Error adding to cart", "error");
    } finally {
      setActionLoading((p) => ({ ...p, cart: false }));
    }
  };

  const buyNow = async () => {
    if (!user) {
      showToast("Please login to buy", "error");
      navigate("/login");
      return;
    }
    setActionLoading((p) => ({ ...p, buy: true }));
    try {
      if (!inCart) {
        await api.post("/cart/add", {
          productId: id,
          quantity: 1,
          size: selectedSize,
          color: selectedColor,
        });
        if (refreshCart) refreshCart();
      }
      navigate("/checkout");
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
    } finally {
      setActionLoading((p) => ({ ...p, buy: false }));
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      showToast("Please login", "error");
      navigate("/login");
      return;
    }
    setActionLoading((p) => ({ ...p, wishlist: true }));
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/remove/${id}`);
        setInWishlist(false);
        showToast("Removed from wishlist", "success");
      } else {
        await api.post(`/wishlist/add/${id}`);
        setInWishlist(true);
        showToast("Added to wishlist", "success");
      }
      if (refreshWishlist) refreshWishlist();
    } catch (err) {
      showToast("Error updating wishlist", "error");
    } finally {
      setActionLoading((p) => ({ ...p, wishlist: false }));
    }
  };

  const shareProduct = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast("Link copied", "success");
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!product?.images) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && imageIndex < product.images.length - 1) {
        setImageIndex(imageIndex + 1);
      } else if (diff < 0 && imageIndex > 0) {
        setImageIndex(imageIndex - 1);
      }
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login", "error");
      return;
    }
    const fd = new FormData();
    fd.append("product", id);
    fd.append("rating", reviewForm.rating);
    fd.append("title", reviewForm.title);
    fd.append("comment", reviewForm.comment);
    if (reviewForm.image) fd.append("image", reviewForm.image);

    try {
      await api.post("/reviews", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Review submitted", "success");
      setReviewForm({ rating: 5, title: "", comment: "", image: null });
      setShowReviewForm(false);
      fetchReviews();
      fetchProduct();
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-4 text-center">Product not found</div>;

  const discountPercent = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : product.discount || 0;

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <div
      className="bg-gray-50 pb-24"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
          <img
            src={product.images[imageIndex]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
          {discountPercent > 0 && (
            <span
              className="absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-md"
              style={{
                background: "linear-gradient(135deg, #831843, #be185d)",
              }}
            >
              {discountPercent}% OFF
            </span>
          )}
          <button
            onClick={shareProduct}
            aria-label="Share"
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border-none bg-white/95 text-gray-700 shadow-md backdrop-blur-md"
          >
            <span style={matIcon} className="text-[20px]">
              ios_share
            </span>
          </button>
        </div>

        {product.images.length > 1 && (
          <div className="flex justify-center gap-1.5 py-3">
            {product.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImageIndex(i)}
                aria-label={`Image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === imageIndex ? "w-6 bg-pink-600" : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {product.brand && (
              <p className="m-0 mb-0.5 text-[10px] font-bold uppercase tracking-widest text-pink-600">
                {product.brand}
              </p>
            )}
            <h1 className="m-0 text-base font-semibold leading-snug text-gray-900">
              {product.name}
            </h1>
          </div>
          <div className="flex flex-col items-center gap-3 shrink-0">
            <button
              onClick={toggleWishlist}
              disabled={actionLoading.wishlist}
              aria-label="Wishlist"
              className="flex flex-col items-center gap-0.5 border-none bg-transparent"
            >
              {actionLoading.wishlist ? (
                <span
                  className="inline-block h-5 w-5 rounded-full border-2 border-pink-200 border-t-pink-500"
                  style={{ animation: "pd-spin 0.7s linear infinite" }}
                />
              ) : (
                <span
                  style={matIcon}
                  className={`text-[24px] ${inWishlist ? "text-pink-600" : "text-gray-500"}`}
                >
                  {inWishlist ? "favorite" : "favorite_border"}
                </span>
              )}
              <span className="text-[10px] font-semibold text-gray-600">
                Wishlist
              </span>
            </button>
            <button
              onClick={shareProduct}
              aria-label="Share"
              className="flex flex-col items-center gap-0.5 border-none bg-transparent"
            >
              <span style={matIcon} className="text-[22px] text-gray-500">
                share
              </span>
              <span className="text-[10px] font-semibold text-gray-600">
                Share
              </span>
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <>
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
              <span className="text-sm font-bold text-green-600">
                {discountPercent}% off
              </span>
            </>
          )}
        </div>

        {product.rating > 0 && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
            {product.rating.toFixed(1)}
            <span style={matIcon} className="text-[14px]">
              star
            </span>
            <span className="ml-1 text-[10px] font-medium opacity-90">
              ({product.numReviews})
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-around rounded-xl border border-pink-100 bg-pink-50/50 py-3">
          {[
            { icon: "assignment_return", title: "7 Days", sub: "Easy Return" },
            { icon: "payments", title: "Cash on", sub: "Delivery" },
            { icon: "sell", title: "Lowest", sub: "Price" },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-2">
              <span style={matIcon} className="text-[24px] text-pink-600">
                {f.icon}
              </span>
              <div>
                <p className="m-0 text-[11px] font-bold text-gray-800">
                  {f.title}
                </p>
                <p className="m-0 text-[11px] text-gray-600">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {product.sizes?.length > 0 && (
        <div className="mt-2 bg-white p-4">
          <h3 className="m-0 mb-3 text-sm font-bold text-gray-900">
            Select Size
          </h3>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`min-w-[48px] rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                  selectedSize === size
                    ? "border-pink-600 bg-pink-50 text-pink-700"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.colors?.length > 0 && (
        <div className="mt-2 bg-white p-4">
          <h3 className="m-0 mb-3 text-sm font-bold text-gray-900">
            Color:{" "}
            <span className="font-normal text-gray-600">{selectedColor}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c.name)}
                title={c.name}
                style={{ backgroundColor: c.code }}
                className={`h-10 w-10 rounded-full border-4 transition-all ${
                  selectedColor === c.name
                    ? "border-pink-600 ring-2 ring-pink-200"
                    : "border-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {product.description && (
        <div className="mt-2 bg-white p-4">
          <h3 className="m-0 mb-2 text-sm font-bold text-gray-900">
            Product Description
          </h3>
          <p className="m-0 text-sm leading-relaxed text-gray-700">
            {product.description}
          </p>
        </div>
      )}

      <div className="mt-2 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="m-0 text-sm font-bold text-gray-900">
              Ratings & Reviews
            </h3>
            <p className="m-0 mt-0.5 text-xs text-gray-500">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="rounded-lg border border-pink-500 bg-white px-3 py-1.5 text-xs font-semibold text-pink-600"
            >
              Write Review
            </button>
          )}
        </div>

        {showReviewForm && (
          <form
            onSubmit={handleReviewSubmit}
            className="mb-4 rounded-xl border border-pink-100 bg-pink-50/40 p-3"
          >
            <div className="mb-3">
              <p className="m-0 mb-2 text-xs font-semibold text-gray-800">
                Your Rating
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                    className="border-none bg-transparent p-0"
                  >
                    <span
                      style={matIcon}
                      className={`text-[26px] ${s <= reviewForm.rating ? "text-yellow-500" : "text-gray-300"}`}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="Review title (optional)"
              value={reviewForm.title}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, title: e.target.value })
              }
              className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
            <textarea
              placeholder="Write your review..."
              value={reviewForm.comment}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, comment: e.target.value })
              }
              required
              rows={3}
              className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setReviewForm({ ...reviewForm, image: e.target.files[0] })
              }
              className="mb-2 w-full text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-xs font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg border-none py-2 text-xs font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #831843, #ec4899)",
                }}
              >
                Submit
              </button>
            </div>
          </form>
        )}

        {reviews.length === 0 ? (
          <p className="m-0 py-4 text-center text-xs text-gray-500">
            No reviews yet
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {displayedReviews.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
            {reviews.length > 3 && !showAllReviews && (
              <button
                onClick={() => setShowAllReviews(true)}
                className="mx-auto rounded-lg border border-pink-500 bg-white px-4 py-2 text-xs font-semibold text-pink-600"
              >
                View all {reviews.length} reviews
              </button>
            )}
          </div>
        )}
      </div>

      {recommended.length > 0 && (
        <div className="mt-2 bg-white p-4">
          <h3 className="m-0 mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <span style={matIcon} className="text-[18px] text-pink-600">
              recommend
            </span>
            You may also like
          </h3>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
            {recommended.map((p) => {
              const disc = p.originalPrice
                ? Math.round(
                    ((p.originalPrice - p.price) / p.originalPrice) * 100,
                  )
                : p.discount || 0;
              return (
                <Link
                  key={p._id}
                  to={`/product/${p._id}`}
                  className="block w-[150px] shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm no-underline"
                >
                  <div className="relative aspect-square bg-gray-50">
                    <img
                      src={p.images?.[0]}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                    {disc > 0 && (
                      <span
                        className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #831843, #be185d)",
                        }}
                      >
                        {disc}% OFF
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p
                      className="m-0 mb-1 text-[11px] font-semibold text-gray-800"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.name}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-gray-900">
                        {formatPrice(p.price)}
                      </span>
                      {p.originalPrice > p.price && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {formatPrice(p.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="fixed inset-x-0 z-40 border-t border-gray-100 bg-white p-2"
        style={{
          bottom: "56px",
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex gap-2">
          <button
            onClick={addToCart}
            disabled={actionLoading.cart || product.stock === 0}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-bold transition-all disabled:opacity-60 ${
              inCart
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-pink-600 bg-white text-pink-600"
            }`}
          >
            {actionLoading.cart ? (
              <span
                className="inline-block h-5 w-5 rounded-full border-2 border-pink-200 border-t-pink-600"
                style={{ animation: "pd-spin 0.7s linear infinite" }}
              />
            ) : (
              <>
                <span style={matIcon} className="text-[20px]">
                  {inCart ? "check_circle" : "shopping_cart"}
                </span>
                {inCart ? "Go to Cart" : "Add to Cart"}
              </>
            )}
          </button>
          <button
            onClick={buyNow}
            disabled={actionLoading.buy || product.stock === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-none py-3 text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{
              background:
                "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
            }}
          >
            {actionLoading.buy ? (
              <span
                className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                style={{ animation: "pd-spin 0.7s linear infinite" }}
              />
            ) : (
              <>
                <span style={matIcon} className="text-[20px]">
                  bolt
                </span>
                Buy Now
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pd-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MobileProductDetails;

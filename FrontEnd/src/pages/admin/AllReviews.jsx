import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const AllReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await api.get("/reviews/all");
      setReviews(response.data);
    } catch (error) {
      showToast("Error fetching reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews(reviews.filter((r) => r._id !== id));
      showToast("Review deleted successfully", "success");
    } catch (error) {
      showToast("Error deleting review", "error");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 md:px-4">
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-5 md:flex-col md:items-start md:gap-4">
          <h1 className="text-[28px] font-bold text-dark md:text-[22px]">
            All Reviews ({reviews.length})
          </h1>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-20 px-5">
            <h3 className="text-[22px] mb-3 text-gray-700">No reviews found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-5 lg:grid-cols-1">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="bg-white rounded-md p-6 shadow-sm"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-base">
                      {review.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-semibold m-0">
                        {review.user?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 m-0">
                        {review.user?.email || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-lg text-[#ffc107]">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </div>
                </div>

                <div className="text-[13px] text-gray-500 mb-3">
                  <strong>Product:</strong> {review.product?.name || "Unknown"}
                </div>

                {review.title && (
                  <h4 className="text-base m-0 mb-2">{review.title}</h4>
                )}
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {review.comment}
                </p>

                {review.image && (
                  <div className="max-w-[150px] mb-3">
                    <img
                      src={review.image}
                      alt="Review"
                      className="w-full rounded-sm"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {formatDate(review.createdAt)}
                  </span>
                  {review.isVerifiedPurchase && (
                    <span className="bg-[#e8f5e9] text-[#2e7d32] py-1 px-2.5 rounded-[50px] text-[11px] font-semibold">
                      ✓ Verified
                    </span>
                  )}
                  <button
                    onClick={() => deleteReview(review._id)}
                    className="ml-auto inline-flex items-center justify-center gap-2 py-2.5 px-[18px] border-none rounded-md cursor-pointer font-[inherit] text-[13px] font-semibold transition-all duration-300 ease-custom whitespace-nowrap bg-error text-white hover:bg-[#d32f2f] hover:-translate-y-0.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllReviews;

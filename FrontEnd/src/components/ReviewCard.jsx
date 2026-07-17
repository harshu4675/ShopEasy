import React from "react";

const ReviewCard = ({ review, onDelete, isAdmin }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="mb-5 rounded-[8px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
      <div className="mb-4 flex items-start justify-between gap-4 max-md:flex-col">
        <div className="flex items-center gap-[14px]">
          <div
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full text-[20px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
            }}
          >
            {review.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="mb-1 text-[16px] font-semibold text-[#1f2937]">
              {review.user.name}
            </h4>
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#10b981]">
                Verified Purchase
              </span>
            )}
          </div>
        </div>

        <div className="text-right max-md:flex max-md:items-center max-md:gap-3 max-md:text-left">
          <div className="mb-1 max-md:mb-0">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-[16px] ${
                  star <= review.rating ? "text-[#ffc107]" : "text-[#d1d5db]"
                }`}
              >
                &#9733;
              </span>
            ))}
          </div>
          <span className="text-[13px] text-[#6b7280]">
            {formatDate(review.createdAt)}
          </span>
        </div>
      </div>

      {review.title && (
        <h5 className="mb-[10px] text-[16px] font-semibold text-[#1f2937]">
          {review.title}
        </h5>
      )}

      <p className="mb-4 text-[15px] leading-[1.7] text-[#374151]">
        {review.comment}
      </p>

      {review.image && (
        <div className="mb-4 max-w-[200px]">
          <img
            src={review.image}
            alt="Review"
            className="w-full cursor-pointer rounded-[6px] transition-transform duration-200 hover:scale-[1.02]"
          />
        </div>
      )}

      {isAdmin && (
        <button
          onClick={() => onDelete(review._id)}
          className="cursor-pointer rounded-[6px] border-none bg-[#ef4444] px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#dc2626]"
        >
          Delete Review
        </button>
      )}
    </div>
  );
};

export default ReviewCard;

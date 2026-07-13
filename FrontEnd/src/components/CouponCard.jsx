import React from "react";
import { Copy, Check, Zap } from "lucide-react";
import { formatPrice } from "../utils/api";

const CouponCard = ({ coupon, onCopy }) => {
  const [copied, setCopied] = React.useState(false);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const isExpiringSoon = () => {
    const daysLeft = Math.ceil(
      (new Date(coupon.validUntil) - new Date()) / (1000 * 60 * 60 * 24),
    );
    return daysLeft <= 3 && daysLeft > 0;
  };

  const handleCopy = () => {
    onCopy(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-white rounded-xl flex relative overflow-hidden border-2 border-dashed transition-all duration-300"
      style={{
        borderColor: "#dee2e6",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
        e.currentTarget.style.borderColor = "#e91e63";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        e.currentTarget.style.borderColor = "#dee2e6";
      }}
    >
      <div
        className="flex items-center justify-center min-w-28 p-6"
        style={{ background: "linear-gradient(135deg, #e91e63, #9c27b0)" }}
      >
        <div className="text-center text-white">
          <span className="text-3xl font-extrabold block leading-none">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}%`
              : formatPrice(coupon.discountValue)}
          </span>
          <span className="text-sm font-bold tracking-widest">OFF</span>
        </div>
      </div>

      <div className="flex-1 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="font-mono text-lg font-bold px-3 py-1.5 rounded-lg border-2 border-dashed"
            style={{
              background: "#f8f9fa",
              color: "#1a1a2e",
              borderColor: "#ced4da",
            }}
          >
            {coupon.code}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all duration-200"
            style={{
              background: copied ? "#e91e63" : "#f8bbd9",
              color: copied ? "white" : "#c2185b",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p
          className="text-sm mb-2.5 leading-relaxed"
          style={{ color: "#495057" }}
        >
          {coupon.description}
        </p>

        <div className="flex gap-2 flex-wrap mb-2">
          {coupon.minOrderAmount > 0 && (
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ background: "#f8f9fa", color: "#6c757d" }}
            >
              Min: {formatPrice(coupon.minOrderAmount)}
            </span>
          )}
          {coupon.maxDiscountAmount && (
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ background: "#f8f9fa", color: "#6c757d" }}
            >
              Max: {formatPrice(coupon.maxDiscountAmount)}
            </span>
          )}
        </div>

        <div
          className="text-xs"
          style={{ color: isExpiringSoon() ? "#ff9800" : "#adb5bd" }}
        >
          Valid till: {formatDate(coupon.validUntil)}
          {isExpiringSoon() && (
            <span className="ml-1 font- items-center gap-1 inline-flex">
              <Zap size={11} /> Expiring Soon!
            </span>
          )}
        </div>
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-5">
        <div
          className="absolute w-5 h-5 rounded-full -right-2.5"
          style={{ top: "30%", background: "#f8f9fa" }}
        />
        <div
          className="absolute w-5 h-5 rounded-full -right-2.5"
          style={{ bottom: "30%", background: "#f8f9fa" }}
        />
      </div>
    </div>
  );
};

export default CouponCard;

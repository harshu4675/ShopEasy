import React, { useState, useEffect } from "react";
import { Ticket, Info } from "lucide-react";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import CouponCard from "../components/CouponCard";
import Loader from "../components/Loader";

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await api.get("/coupons");
        setCoupons(response.data);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchCoupons();
  }, []);

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    showToast(`Coupon code ${code} copied!`, "success");
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div
      className="min-h-screen py-10 px-4 sm:px-5"
      style={{ background: "#f8f9fa" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #e91e63, #9c27b0)",
              }}
            >
              <Ticket size={32} className="text-white" />
            </div>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold mb-3"
            style={{
              background: "linear-gradient(135deg, #e91e63, #9c27b0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Available Offers
          </h1>
          <p className="text-base" style={{ color: "#6c757d" }}>
            Use these coupons at checkout to get amazing discounts
          </p>
        </div>

        {coupons.length === 0 ? (
          <div className="text-center py-20">
            <Ticket
              size={80}
              className="mx-auto mb-5"
              style={{ color: "#dee2e6" }}
            />
            <h3
              className="text-2xl font-semibold mb-2"
              style={{ color: "#495057" }}
            >
              No coupons available right now
            </h3>
            <p style={{ color: "#adb5bd" }}>
              Check back later for exciting offers!
            </p>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
            }}
          >
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon._id}
                coupon={coupon}
                onCopy={copyToClipboard}
              />
            ))}
          </div>
        )}

        <div
          className="bg-white rounded-2xl p-6 sm:p-8 mt-12"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <Info size={22} style={{ color: "#e91e63" }} />
            <h3 className="text-xl font-bold m-0" style={{ color: "#1a1a2e" }}>
              How to use coupons
            </h3>
          </div>
          <ol className="pl-5 m-0 space-y-3">
            {[
              "Copy the coupon code by clicking the Copy button",
              "Add items to your cart",
              "Go to checkout and paste the code in the coupon field",
              "Click Apply to get your discount!",
            ].map((step, i) => (
              <li key={i} className="text-sm" style={{ color: "#6c757d" }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Coupons;

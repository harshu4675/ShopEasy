import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../utils/api";
import { matIcon } from "../utils/fonts";
import Loader from "../components/Loader";

/**
 * Controlled affiliate hand-off.
 *
 * The destination is resolved by the backend (which validates the platform
 * whitelist) rather than trusting any URL stored on the client. A visible
 * "Continue" link doubles as a fallback if the automatic redirect is blocked.
 */
const AffiliateRedirect = () => {
  const { id } = useParams();
  const [state, setState] = useState({ status: "loading", url: "", platform: "", name: "", message: "" });

  const resolve = useCallback(async () => {
    try {
      const { data } = await api.get(`/products/${id}/affiliate-url`);
      setState({
        status: "redirecting",
        url: data.url,
        platform: data.platform || "",
        name: data.name || "",
        message: "",
      });
    } catch (error) {
      setState({
        status: "error",
        url: "",
        platform: "",
        name: "",
        message:
          error.response?.data?.message ||
          "This product is not available right now.",
      });
    }
  }, [id]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  useEffect(() => {
    if (state.status !== "redirecting" || !state.url) return;
    const timer = setTimeout(() => {
      try {
        window.location.replace(state.url);
      } catch {
        // Navigation is blocked in some embedded contexts — the visible link
        // below still takes the shopper to the correct destination.
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [state]);

  if (state.status === "loading") return <Loader fullScreen />;

  if (state.status === "error") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, #fce7f3, #fbcfe8)" }}
        >
          <span style={matIcon} className="text-[44px] text-pink-600">
            link_off
          </span>
        </div>
        <h1 className="mb-2 text-center text-xl font-bold text-gray-900">
          Product unavailable
        </h1>
        <p className="mb-8 max-w-md text-center text-sm text-gray-600">
          {state.message}
        </p>
        <Link
          to="/"
          className="rounded-full px-8 py-3 text-sm font-bold text-white no-underline shadow-lg"
          style={{ background: "linear-gradient(135deg, #831843, #ec4899)" }}
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const platformLabel =
    state.platform === "amazon" ? "Amazon" : state.platform || "the partner store";

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Loader size="small" />
      <h1 className="mb-2 mt-6 text-center text-xl font-bold text-gray-900">
        Taking you to {platformLabel}
      </h1>
      <p className="mb-8 max-w-md text-center text-sm text-gray-600">
        You are leaving TalishClothes to complete this purchase on{" "}
        {platformLabel}. {state.name ? `“${state.name}”` : ""}
      </p>
      <a
        href={state.url}
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white no-underline shadow-lg"
        style={{ background: "linear-gradient(135deg, #831843, #ec4899)" }}
      >
        <span style={matIcon} className="text-[18px]">
          open_in_new
        </span>
        Continue to {platformLabel}
      </a>
      <Link
        to="/"
        className="mt-4 text-sm font-semibold text-gray-500 no-underline hover:text-pink-600"
      >
        Cancel and go back
      </Link>
    </div>
  );
};

export default AffiliateRedirect;

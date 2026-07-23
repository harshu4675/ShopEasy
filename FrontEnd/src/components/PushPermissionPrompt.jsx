import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
} from "../utils/pushNotifications";
import { showToast } from "../utils/toast";

const DISMISS_KEY = "push-prompt-dismissed";
const DISMISS_DAYS = 3;

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const PushPermissionPrompt = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;

    const permission = getPushPermission();
    if (permission === "granted" || permission === "denied") return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    const timer = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!user || getPushPermission() !== "granted") return;
    subscribeToPush().catch(() => {});
  }, [user]);

  const handleEnable = async () => {
    setLoading(true);
    const result = await subscribeToPush();
    setLoading(false);
    if (result.success) {
      showToast("Notifications enabled", "success");
      setVisible(false);
    } else {
      showToast(result.error || "Could not enable notifications", "error");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed left-1/2 top-16 z-[998] w-[92%] max-w-sm -translate-x-1/2 rounded-2xl border border-pink-200 bg-white p-4 shadow-2xl"
      style={{
        fontFamily: "'Poppins', sans-serif",
        animation: "pp-slide-down 0.3s ease-out",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{
            background: "linear-gradient(135deg, #831843, #ec4899)",
          }}
        >
          <span style={matIcon} className="text-[22px]">
            notifications_active
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="m-0 mb-0.5 text-sm font-bold text-gray-900">
            Stay Updated
          </h4>
          <p className="m-0 text-xs leading-relaxed text-gray-600">
            Get notified about orders, deals and updates
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600"
        >
          Not now
        </button>
        <button
          onClick={handleEnable}
          disabled={loading}
          className="flex-1 rounded-lg border-none py-2 text-xs font-bold text-white disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #831843, #ec4899)",
          }}
        >
          {loading ? "Enabling..." : "Enable"}
        </button>
      </div>
      <style>{`
        @keyframes pp-slide-down {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PushPermissionPrompt;

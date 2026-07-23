import React, { useEffect, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const InstallPWABanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    if (standalone) return;

    if (iOS) {
      setIsIOS(true);
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      localStorage.removeItem(DISMISS_KEY);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-[999] mx-auto max-w-md rounded-2xl border border-pink-200 bg-white p-4 shadow-2xl md:bottom-6"
      style={{
        fontFamily: "'Poppins', sans-serif",
        animation: "pwa-slide-up 0.4s ease-out",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{
            background: "linear-gradient(135deg, #4a0e2e, #be185d)",
          }}
        >
          <span style={matIcon} className="text-[24px]">
            {isIOS ? "ios_share" : "download"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 mb-1 text-sm font-bold text-gray-900">
            Install Talish App
          </h3>
          {isIOS ? (
            <p className="m-0 text-xs leading-relaxed text-gray-600">
              Tap <strong>Share</strong> then{" "}
              <strong>Add to Home Screen</strong>
            </p>
          ) : (
            <p className="m-0 text-xs leading-relaxed text-gray-600">
              Get fast access, offline browsing and instant notifications
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-none bg-gray-100 text-gray-500"
        >
          <span style={matIcon} className="text-[18px]">
            close
          </span>
        </button>
      </div>

      {!isIOS && (
        <button
          onClick={handleInstall}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-none py-2.5 text-sm font-bold text-white shadow-md"
          style={{
            background:
              "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
          }}
        >
          <span style={matIcon} className="text-[18px]">
            download
          </span>
          Install App
        </button>
      )}

      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default InstallPWABanner;

import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const WelcomeBanner = () => {
  const { user } = useContext(AuthContext);
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [copyText, setCopyText] = useState("Copy");
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const fontId = "welcome-banner-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("welcomeBannerDismissed");
    if (isDismissed === "true") {
      setIsVisible(false);
      return;
    }

    if (user) {
      const duration = 10000;
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.max(100 - (elapsed / duration) * 100, 0);
        setProgress(pct);
        if (pct <= 0) {
          clearInterval(timer);
          handleClose();
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, [user]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("welcomeBannerDismissed", "true");
    }, 300);
  };

  const copyCode = () => {
    navigator.clipboard.writeText("WELCOME100");
    setCopyText("Copied!");
    setTimeout(() => setCopyText("Copy"), 2000);
  };

  if (!isVisible) return null;

  return (
    <div
      className="relative w-full overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg, #4a0e2e 0%, #831843 30%, #be185d 70%, #ec4899 100%)",
        fontFamily: "'Poppins', sans-serif",
        animation: isClosing
          ? "banner-slide-up 0.3s ease-in forwards"
          : "banner-slide-down 0.5s ease-out",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div
        className="pointer-events-none absolute -left-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(244, 114, 182, 0.5), transparent)",
          animation: "banner-blob-1 8s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(236, 72, 153, 0.5), transparent)",
          animation: "banner-blob-2 8s ease-in-out 2s infinite",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 -translate-x-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
          animation: "banner-shimmer 4s infinite",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-3 max-md:px-3 max-md:py-2.5 max-[480px]:px-3 max-[480px]:py-2">
        <div className="flex items-center justify-between gap-4 max-md:gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3 max-md:gap-2">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl max-md:h-9 max-md:w-9 max-[480px]:hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <span
                style={matIcon}
                className="text-[24px] text-white max-md:text-[20px]"
              >
                redeem
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-semibold leading-tight max-md:text-xs max-[480px]:text-[11px]">
                <span
                  className="font-normal max-[480px]:hidden"
                  style={{
                    fontFamily: "'Great Vibes', cursive",
                    fontSize: 20,
                    color: "#fce7f3",
                    marginRight: 4,
                  }}
                >
                  {user
                    ? `Hi ${user.name?.split(" ")[0] || "there"}!`
                    : "Welcome to Talish!"}
                </span>
                <span className="text-white">
                  Get{" "}
                  <span
                    className="font-extrabold"
                    style={{
                      color: "#fde68a",
                      textShadow: "0 0 12px rgba(253, 230, 138, 0.5)",
                    }}
                  >
                    Rs.100 OFF
                  </span>{" "}
                  your first order
                </span>
                <span className="text-white/60 max-md:hidden">with code</span>
                <button
                  onClick={copyCode}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-bold tracking-wider text-white backdrop-blur-md transition-all hover:bg-white/25 max-md:text-[10px] max-md:px-2 max-md:py-0.5"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  WELCOME100
                  <span
                    style={matIcon}
                    className="text-[14px] max-md:text-[12px]"
                  >
                    {copyText === "Copied!" ? "check" : "content_copy"}
                  </span>
                </button>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/products"
              className="hidden items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-pink-700 no-underline shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl md:inline-flex"
            >
              Shop Now
              <span style={matIcon} className="text-[16px]">
                arrow_forward
              </span>
            </Link>

            <button
              onClick={handleClose}
              aria-label="Close banner"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white backdrop-blur-md transition-all hover:rotate-90 hover:bg-white/25 max-md:h-7 max-md:w-7"
            >
              <span style={matIcon} className="text-[18px] max-md:text-[16px]">
                close
              </span>
            </button>
          </div>
        </div>
      </div>

      {user && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <div
            className="h-full bg-white/70"
            style={{
              width: `${progress}%`,
              transition: "width 0.05s linear",
              boxShadow: "0 0 8px rgba(255,255,255,0.5)",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes banner-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes banner-slide-up {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes banner-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes banner-blob-1 {
          0%, 100% { transform: translate(0, -50%) scale(1); }
          50% { transform: translate(30px, -50%) scale(1.2); }
        }
        @keyframes banner-blob-2 {
          0%, 100% { transform: translate(0, -50%) scale(1); }
          50% { transform: translate(-30px, -50%) scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeBanner;

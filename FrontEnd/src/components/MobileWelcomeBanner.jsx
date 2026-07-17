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

const MobileWelcomeBanner = () => {
  const { user } = useContext(AuthContext);
  const [isVisible, setIsVisible] = useState(true);
  const [copyText, setCopyText] = useState("COPY");

  useEffect(() => {
    const fontId = "mobile-banner-fonts";
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
    const dismissed = sessionStorage.getItem("mobileWelcomeBannerDismissed");
    if (dismissed === "true") setIsVisible(false);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem("mobileWelcomeBannerDismissed", "true");
  };

  const copyCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText("WELCOME100");
    setCopyText("COPIED");
    setTimeout(() => setCopyText("COPY"), 2000);
  };

  if (!isVisible) return null;

  return (
    <Link
      to="/products"
      className="relative block w-full overflow-hidden no-underline"
      style={{
        background:
          "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M20 20v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div
        className="pointer-events-none absolute -left-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(244, 114, 182, 0.5), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(236, 72, 153, 0.5), transparent)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
          animation: "mb-shimmer 3s infinite",
          transform: "translateX(-100%)",
        }}
      />

      <div className="relative z-10 flex items-center gap-2 px-3 py-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <span style={matIcon} className="text-[20px] text-white">
            redeem
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-baseline gap-1 text-white">
            <span className="text-[11px] font-normal opacity-90">
              {user ? "Hi" : "Welcome"}
              {user?.name ? ` ${user.name.split(" ")[0]}` : ""}!
            </span>
            <span
              className="text-[13px] font-extrabold"
              style={{
                color: "#fde68a",
                textShadow: "0 0 8px rgba(253, 230, 138, 0.5)",
              }}
            >
              Rs.100 OFF
            </span>
            <span className="text-[10px] opacity-80">first order</span>
          </p>
          <button
            onClick={copyCode}
            className="mt-0.5 inline-flex cursor-pointer items-center gap-1 rounded border border-white/40 bg-white/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white backdrop-blur-md active:bg-white/30"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            WELCOME100
            <span
              className="ml-0.5 rounded bg-white/25 px-1 py-0 text-[8px] font-bold"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {copyText}
            </span>
          </button>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          aria-label="Close banner"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white backdrop-blur-md active:bg-white/25"
        >
          <span style={matIcon} className="text-[16px]">
            close
          </span>
        </button>
      </div>

      <style>{`
        @keyframes mb-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Link>
  );
};

export default MobileWelcomeBanner;

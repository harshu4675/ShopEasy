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

const WelcomePopup = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [copyText, setCopyText] = useState("COPY");

  useEffect(() => {
    const fontId = "welcome-popup-fonts";
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
    if (user) return;

    const dismissed = localStorage.getItem("welcomePopupDismissed");
    if (dismissed === "true") return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("welcomePopupDismissed", "true");
  };

  const copyCode = () => {
    navigator.clipboard.writeText("WELCOME100");
    setCopyText("COPIED");
    setTimeout(() => setCopyText("COPY"), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{
        fontFamily: "'Poppins', sans-serif",
        animation: "wp-fade-in 0.3s ease",
      }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl max-md:max-w-sm"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "wp-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-white/90 text-gray-700 shadow-md backdrop-blur-md transition-all hover:rotate-90 hover:bg-white"
        >
          <span style={matIcon} className="text-[22px]">
            close
          </span>
        </button>

        <div
          className="relative overflow-hidden px-6 pb-8 pt-12 text-center max-md:pb-6 max-md:pt-10"
          style={{
            background:
              "linear-gradient(135deg, #4a0e2e 0%, #831843 40%, #be185d 100%)",
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
            className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(244, 114, 182, 0.5), transparent)",
              animation: "wp-blob 6s ease-in-out infinite",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(236, 72, 153, 0.5), transparent)",
              animation: "wp-blob 6s ease-in-out 2s infinite",
            }}
          />

          <div className="relative">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255,255,255,0.3)",
                animation: "wp-bounce 2s ease-in-out infinite",
              }}
            >
              <span style={matIcon} className="text-[32px] text-white">
                redeem
              </span>
            </div>

            <p
              className="mb-1 font-normal"
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: 26,
                color: "#fce7f3",
                lineHeight: 1,
              }}
            >
              Welcome to
            </p>
            <p
              className="mb-0 font-normal"
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: 40,
                color: "#ffffff",
                lineHeight: 1.1,
                textShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              Talish Clothes
            </p>
            <p
              className="mt-1 font-bold uppercase text-pink-100"
              style={{
                fontSize: 10,
                letterSpacing: "0.4em",
              }}
            >
              Fashion Redefined
            </p>
          </div>
        </div>

        <div className="px-6 py-6 max-md:py-5">
          <div className="mb-5 text-center">
            <p className="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-pink-600">
              Exclusive Offer
            </p>
            <h2 className="m-0 mb-1 text-2xl font-extrabold text-gray-900 max-md:text-xl">
              Get{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #831843 0%, #ec4899 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Rs.100 OFF
              </span>
            </h2>
            <p className="m-0 text-sm text-gray-500">
              On your first order with us
            </p>
          </div>

          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-pink-300 p-3"
            style={{
              background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
            }}
          >
            <div className="flex-1">
              <p className="m-0 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-600">
                Coupon Code
              </p>
              <p
                className="m-0 text-lg font-bold tracking-[3px] text-gray-900"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                WELCOME100
              </p>
            </div>
            <button
              onClick={copyCode}
              className="shrink-0 rounded-lg border-none px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              style={{
                background: "linear-gradient(135deg, #831843, #ec4899)",
              }}
            >
              {copyText === "COPIED" ? (
                <span className="flex items-center gap-1">
                  <span style={matIcon} className="text-[14px]">
                    check
                  </span>
                  COPIED
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span style={matIcon} className="text-[14px]">
                    content_copy
                  </span>
                  COPY
                </span>
              )}
            </button>
          </div>

          <div className="mb-5 space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-pink-50 p-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #831843, #ec4899)",
                }}
              >
                <span style={matIcon} className="text-[18px] text-white">
                  local_shipping
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-xs font-bold text-gray-900">
                  FREE Delivery
                </p>
                <p className="m-0 text-[11px] text-gray-600">
                  On all orders above Rs.199
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-pink-50 p-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #831843, #ec4899)",
                }}
              >
                <span style={matIcon} className="text-[18px] text-white">
                  assignment_return
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-xs font-bold text-gray-900">
                  7 Days Easy Returns
                </p>
                <p className="m-0 text-[11px] text-gray-600">
                  Hassle-free return policy
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-pink-50 p-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #831843, #ec4899)",
                }}
              >
                <span style={matIcon} className="text-[18px] text-white">
                  verified
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-xs font-bold text-gray-900">
                  Authentic Products
                </p>
                <p className="m-0 text-[11px] text-gray-600">
                  100% genuine from trusted brands
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/products"
            onClick={handleClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-none px-6 py-3.5 text-sm font-bold text-white no-underline shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            style={{
              background:
                "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
            }}
          >
            Start Shopping Now
            <span style={matIcon} className="text-[20px]">
              arrow_forward
            </span>
          </Link>

          <button
            onClick={handleClose}
            className="mt-3 w-full cursor-pointer border-none bg-transparent text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Maybe later
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wp-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes wp-slide-up {
          from { opacity: 0; transform: translateY(50px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wp-bounce {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes wp-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default WelcomePopup;

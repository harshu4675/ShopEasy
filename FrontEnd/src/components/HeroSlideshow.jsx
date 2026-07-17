import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { bannersAPI } from "../utils/api";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const AUTOPLAY_INTERVAL = 5000;

const HeroSlideshow = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const fontId = "hero-slideshow-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await bannersAPI.getActive();
        const data = Array.isArray(res.data) ? res.data : [];
        setBanners(data);
      } catch (err) {
        console.error("Error loading banners:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setProgress(0);
  }, [banners.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setProgress(0);
  }, [banners.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    intervalRef.current = setInterval(() => {
      goToNext();
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(intervalRef.current);
  }, [banners.length, isPaused, goToNext, currentIndex]);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / AUTOPLAY_INTERVAL) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        progressRef.current = requestAnimationFrame(tick);
      }
    };
    progressRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(progressRef.current);
  }, [currentIndex, isPaused, banners.length]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
  };

  if (loading) {
    return (
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100"
        style={{ aspectRatio: "16/7", minHeight: "300px" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-500"
            style={{ animation: "hero-spin 0.8s linear infinite" }}
          />
        </div>
        <div
          className="absolute inset-0 -translate-x-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            animation: "hero-shimmer 2s infinite",
          }}
        />
        <style>{`
          @keyframes hero-spin { to { transform: rotate(360deg); } }
          @keyframes hero-shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const current = banners[currentIndex];

  const textAlign = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  }[current.textPosition || "left"];

  return (
    <div
      className="group relative w-full overflow-hidden bg-gray-900 shadow-lg"
      style={{
        aspectRatio: "16/7",
        minHeight: "300px",
        fontFamily: "'Poppins', sans-serif",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {banners.map((banner, idx) => (
        <div
          key={banner._id}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            idx === currentIndex
              ? "z-10 scale-100 opacity-100"
              : "z-0 scale-105 opacity-0"
          }`}
        >
          <img
            src={banner.image}
            alt={banner.title || "Banner"}
            className="h-full w-full object-cover"
            style={{
              animation:
                idx === currentIndex
                  ? "hero-ken-burns 8s ease-out forwards"
                  : "none",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${
                banner.textPosition === "right"
                  ? "270deg"
                  : banner.textPosition === "center"
                    ? "180deg"
                    : "90deg"
              }, rgba(0,0,0,${banner.overlayOpacity || 0.35}) 0%, rgba(0,0,0,${(banner.overlayOpacity || 0.35) * 0.3}) 100%)`,
            }}
          />
        </div>
      ))}

      <div className="relative z-20 flex h-full items-center px-8 max-md:px-6 max-[480px]:px-5">
        <div
          className={`flex w-full max-w-2xl flex-col gap-4 max-md:gap-3 ${
            current.textPosition === "center"
              ? "mx-auto"
              : current.textPosition === "right"
                ? "ml-auto"
                : ""
          } ${textAlign}`}
          style={{ color: current.textColor || "#ffffff" }}
        >
          {current.subtitle && (
            <span
              className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur-md max-md:text-[10px]"
              style={{
                animation: "hero-slide-up 0.6s ease-out",
                animationDelay: "0.1s",
                animationFillMode: "both",
              }}
              key={`subtitle-${currentIndex}`}
            >
              {current.subtitle}
            </span>
          )}

          {current.title && (
            <h1
              className="text-5xl font-extrabold leading-tight tracking-tight drop-shadow-lg max-md:text-3xl max-[480px]:text-2xl"
              style={{
                animation: "hero-slide-up 0.7s ease-out",
                animationDelay: "0.2s",
                animationFillMode: "both",
                letterSpacing: "-0.02em",
              }}
              key={`title-${currentIndex}`}
            >
              {current.title}
            </h1>
          )}

          {current.buttonText && (
            <div
              style={{
                animation: "hero-slide-up 0.7s ease-out",
                animationDelay: "0.35s",
                animationFillMode: "both",
              }}
              key={`btn-${currentIndex}`}
            >
              <Link
                to={current.link || "/products"}
                className="mt-2 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold no-underline shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl max-md:px-5 max-md:py-3 max-md:text-xs"
                style={{
                  background:
                    "linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)",
                  color: "#ffffff",
                }}
              >
                {current.buttonText}
                <span style={matIcon} className="text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-white/20 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/40 group-hover:opacity-100 max-md:left-2 max-md:h-9 max-md:w-9 max-md:opacity-100"
          >
            <span style={matIcon} className="text-[24px]">
              chevron_left
            </span>
          </button>
          <button
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-white/20 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/40 group-hover:opacity-100 max-md:right-2 max-md:h-9 max-md:w-9 max-md:opacity-100"
          >
            <span style={matIcon} className="text-[24px]">
              chevron_right
            </span>
          </button>

          <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 max-md:bottom-4">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`relative overflow-hidden rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "h-2.5 w-10 bg-white/40"
                    : "h-2.5 w-2.5 bg-white/50 hover:bg-white/80"
                }`}
              >
                {idx === currentIndex && (
                  <span
                    className="absolute left-0 top-0 h-full rounded-full bg-white"
                    style={{
                      width: `${progress}%`,
                      transition: "width 0.1s linear",
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="absolute right-6 top-6 z-30 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md max-md:right-3 max-md:top-3 max-md:text-[10px]">
            {currentIndex + 1} / {banners.length}
          </div>
        </>
      )}

      <style>{`
        @keyframes hero-slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-ken-burns {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
};

export default HeroSlideshow;

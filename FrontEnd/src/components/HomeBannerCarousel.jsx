import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SmartImage from "./SmartImage";
import { matIcon } from "../utils/fonts";

/**
 * Self-contained home banner carousel.
 *
 * Why this component exists
 * -------------------------
 * The rotating banner index used to live in `DesktopHome` / `MobileHome`
 * state. Every 4-5s tick called `setBannerIndex` on the *page* component, so
 * React re-rendered the entire home tree: all product sections, every
 * <ProductCard>, and both horizontal carousels. Because the carousels are
 * plain overflow-x containers whose children were recreated, the browser
 * reset their `scrollLeft`, and card-level state (wishlist/cart flags, image
 * load state) was thrown away on every rotation.
 *
 * Owning the timer *inside* this leaf component means a rotation now re-renders
 * this subtree only. Scroll positions, filters, wishlist state and every other
 * piece of page state survive untouched.
 *
 * The markup, classes, gradients, dots and transition timings are copied
 * verbatim from the original inline JSX so the visuals are unchanged.
 */

const useAutoRotate = (length, intervalMs, paused) => {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;

  useEffect(() => {
    // Reset when the banner set changes (e.g. admin toggles one off).
    if (index >= length && length > 0) setIndex(0);
  }, [length, index]);

  useEffect(() => {
    if (length <= 1 || paused) return;

    // Respect the user's motion preference: no automatic movement.
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [length, intervalMs, paused]);

  return [index, setIndex];
};

/** Desktop variant — matches the previous DesktopHome banner block exactly. */
const DesktopBanner = ({ banners, intervalMs = 5000 }) => {
  const [paused, setPaused] = useState(false);
  const [bannerIndex, setBannerIndex] = useAutoRotate(
    banners.length,
    intervalMs,
    paused,
  );

  const currentBanner = banners[bannerIndex];
  if (!currentBanner) return null;

  return (
    <div className="mt-3 px-3">
      <Link
        to={currentBanner.link || "/products"}
        className="relative block w-full overflow-hidden rounded-2xl bg-gray-100 no-underline shadow-lg"
        style={{ maxHeight: "568px" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <SmartImage
          src={currentBanner.image}
          alt={currentBanner.title || "Banner"}
          className="block w-full object-cover"
          style={{ maxHeight: "568px", objectPosition: "center" }}
          sizes="(max-width: 1400px) 100vw, 1400px"
          width={1440}
          priority={bannerIndex === 0}
        />
        {(currentBanner.title || currentBanner.subtitle) && (
          <div
            className="absolute inset-0 flex flex-col justify-end p-6"
            style={{
              background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,${currentBanner.overlayOpacity || 0.4}) 100%)`,
              color: currentBanner.textColor || "#ffffff",
            }}
          >
            {currentBanner.subtitle && (
              <span className="mb-2 inline-block self-start rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                {currentBanner.subtitle}
              </span>
            )}
            {currentBanner.title && (
              <h3 className="m-0 max-w-2xl text-2xl font-extrabold leading-tight drop-shadow-lg">
                {currentBanner.title}
              </h3>
            )}
            {currentBanner.buttonText && (
              <div className="mt-3">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white shadow-xl"
                  style={{
                    background: "linear-gradient(135deg, #831843, #ec4899)",
                  }}
                >
                  {currentBanner.buttonText}
                  <span style={matIcon} className="text-[14px]">
                    arrow_forward
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  setBannerIndex(i);
                }}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === bannerIndex ? "w-8 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </Link>
    </div>
  );
};

/** Mobile variant — matches the previous MobileHome banner block exactly. */
const MobileBanner = ({ banners, intervalMs = 4000 }) => {
  const [paused, setPaused] = useState(false);
  const [bannerIndex] = useAutoRotate(banners.length, intervalMs, paused);
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }, []);

  const handleTouchEnd = useCallback(() => setPaused(false), []);

  const currentBanner = banners[bannerIndex];
  if (!currentBanner) return null;

  return (
    <div className="mt-2 px-3">
      <Link
        to={currentBanner.link || "/products"}
        className="relative block overflow-hidden rounded-2xl no-underline shadow-md"
        style={{ aspectRatio: "16/9" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <SmartImage
          src={currentBanner.image}
          alt={currentBanner.title || "Banner"}
          className="h-full w-full object-cover"
          sizes="100vw"
          width={828}
          priority={bannerIndex === 0}
        />
        {(currentBanner.title || currentBanner.subtitle) && (
          <div
            className="absolute inset-0 flex flex-col justify-end p-4"
            style={{
              background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,${currentBanner.overlayOpacity || 0.4}) 100%)`,
              color: currentBanner.textColor || "#ffffff",
            }}
          >
            {currentBanner.subtitle && (
              <span className="mb-1 inline-block self-start rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur-md">
                {currentBanner.subtitle}
              </span>
            )}
            {currentBanner.title && (
              <h3 className="m-0 text-lg font-extrabold leading-tight drop-shadow-lg">
                {currentBanner.title}
              </h3>
            )}
          </div>
        )}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {banners.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === bannerIndex ? "w-4 bg-white" : "w-1 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </Link>
    </div>
  );
};

const HomeBannerCarousel = ({ banners = [], variant = "desktop" }) => {
  if (!banners.length) return null;
  return variant === "mobile" ? (
    <MobileBanner banners={banners} />
  ) : (
    <DesktopBanner banners={banners} />
  );
};

/**
 * Memoised on the banner array identity: the parent passes a stable reference
 * (set once after fetch), so parent re-renders never re-render the carousel.
 */
export default memo(HomeBannerCarousel);

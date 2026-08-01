import React, { memo, useState } from "react";
import { optimizeImage, buildSrcSet } from "../utils/image";

/**
 * Drop-in <img> replacement with progressive loading.
 *
 * Responsibilities:
 *  - AVIF/WebP + compression via Cloudinary URL transforms (see utils/image)
 *  - responsive `srcset`/`sizes`
 *  - native lazy-loading + async decoding below the fold
 *  - `fetchpriority="high"` + eager loading for the single hero/LCP image
 *  - a neutral placeholder tint that fades out on load, preventing the
 *    "flash of empty box" without changing final appearance
 *
 * Visual output after load is byte-identical to a plain <img> with the same
 * className, so existing layouts are untouched.
 */
const SmartImage = ({
  src,
  alt = "",
  className = "",
  style,
  width,
  height,
  sizes,
  priority = false,
  onLoad,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = (e) => {
    setLoaded(true);
    onLoad?.(e);
  };

  const optimized = optimizeImage(src, { width });
  const srcSet = buildSrcSet(src);

  return (
    <img
      src={optimized}
      srcSet={srcSet}
      sizes={srcSet ? sizes || (width ? `${width}px` : "100vw") : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={handleLoad}
      className={className}
      style={{
        // Fade in only for non-priority images; the hero must paint instantly.
        ...(priority
          ? null
          : {
              opacity: loaded ? 1 : 0,
              transition: "opacity 220ms ease-out",
              backgroundColor: loaded ? undefined : "#f3f4f6",
            }),
        ...style,
      }}
      {...rest}
    />
  );
};

export default memo(SmartImage);

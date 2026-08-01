/**
 * Image delivery helpers.
 *
 * Every product / banner image in the app is served from Cloudinary, so the
 * cheapest possible "convert to WebP/AVIF + compress + responsive" win is to
 * rewrite the delivery URL rather than to re-encode anything by hand:
 *
 *   f_auto  -> Cloudinary negotiates AVIF/WebP per browser via Accept headers
 *   q_auto  -> perceptual quality compression (no visible loss)
 *   w_<n>   -> exact width needed by the layout (responsive srcset)
 *   dpr_auto-> retina handling
 *
 * Non-Cloudinary URLs (data URIs, local assets, third parties) are returned
 * untouched so nothing can break.
 */

const CLOUDINARY_UPLOAD_RE = /\/(image|video)\/upload\//;

const isCloudinary = (url) =>
  typeof url === "string" &&
  url.includes("res.cloudinary.com") &&
  CLOUDINARY_UPLOAD_RE.test(url);

/** Default responsive widths, tuned to the grid/carousel sizes used in the UI. */
export const DEFAULT_WIDTHS = [160, 240, 320, 480, 640, 828, 1080, 1440];

/**
 * Returns an optimised Cloudinary URL.
 * @param {string} url    original image url
 * @param {object} [opts]
 * @param {number} [opts.width]   target width in CSS px
 * @param {string} [opts.quality] cloudinary quality token (default `auto`)
 * @param {boolean} [opts.dpr]    append dpr_auto (default true)
 */
export const optimizeImage = (url, opts = {}) => {
  if (!isCloudinary(url)) return url;

  const { width, quality = "auto", dpr = true } = opts;

  // Do not double-transform if the caller already injected f_auto/q_auto.
  if (/\/upload\/[^/]*[fq]_auto/.test(url)) return url;

  const transforms = ["f_auto", `q_${quality}`];
  if (width) transforms.push(`w_${Math.round(width)}`, "c_limit");
  if (dpr) transforms.push("dpr_auto");

  return url.replace(CLOUDINARY_UPLOAD_RE, (match, type) => {
    return `/${type}/upload/${transforms.join(",")}/`;
  });
};

/**
 * Builds a `srcSet` string for responsive delivery.
 * Returns undefined for non-Cloudinary URLs so the attribute is omitted.
 */
export const buildSrcSet = (url, widths = DEFAULT_WIDTHS) => {
  if (!isCloudinary(url)) return undefined;
  return widths
    .map((w) => `${optimizeImage(url, { width: w, dpr: false })} ${w}w`)
    .join(", ");
};

/**
 * Convenience bundle of the props an <img> needs for fast, CLS-free loading.
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.width]     layout width used to pick the base source
 * @param {string} [opts.sizes]     CSS `sizes` descriptor
 * @param {boolean} [opts.priority] true for LCP/hero images (eager + high prio)
 */
export const imageProps = (url, opts = {}) => {
  const { width, sizes, priority = false, widths } = opts;

  return {
    src: optimizeImage(url, { width }),
    srcSet: buildSrcSet(url, widths),
    sizes: sizes || (width ? `${width}px` : undefined),
    loading: priority ? "eager" : "lazy",
    decoding: priority ? "sync" : "async",
    fetchPriority: priority ? "high" : "auto",
  };
};

export default optimizeImage;

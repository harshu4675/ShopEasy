/**
 * Centralised Google Fonts management.
 *
 * Previously every component injected its own <link rel="stylesheet"> for the
 * same handful of families at runtime. That produced ~15 duplicate,
 * render-blocking stylesheet requests, a flash of un-styled Material Symbols
 * (icon names rendered as raw text) and avoidable layout shift.
 *
 * All families used by the app are now requested once from index.html with
 * `display=swap`, so this module only exists as a safety net for families that
 * are *not* part of the pre-loaded set.
 */

// Families already delivered by the single stylesheet in index.html.
const PRELOADED_FAMILIES = [
  "poppins",
  "inter",
  "great vibes",
  "great+vibes",
  "cinzel",
  "material symbols outlined",
  "material+symbols+outlined",
];

const injected = new Set();

const isPreloaded = (href) => {
  const families = [...href.matchAll(/family=([^&:]+)/g)].map((m) =>
    decodeURIComponent(m[1]).toLowerCase(),
  );
  if (!families.length) return false;
  return families.every((family) => PRELOADED_FAMILIES.includes(family));
};

/**
 * Injects a Google Fonts stylesheet only when it is not already covered by the
 * document-level stylesheet. Safe to call repeatedly.
 */
export const ensureGoogleFonts = (id, href) => {
  if (typeof document === "undefined") return;
  if (!href || isPreloaded(href)) return;
  if (injected.has(id) || document.getElementById(id)) return;

  injected.add(id);
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

/**
 * Shared inline style for Material Symbols glyph spans.
 * Kept identical to the per-component objects it replaces.
 */
export const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

export default ensureGoogleFonts;

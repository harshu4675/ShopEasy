const REJECTED_ASSET =
  /(?:^|[\W_])(logo|icon|sprite|pixel|spacer|avatar|badge|advert|banner)(?:[\W_]|$)/i;
const LOW_QUALITY_HINT =
  /(?:thumb(?:nail)?|tiny|small|lowres|placeholder|blur|icon)(?:[\W_]|$)/i;
const HIGH_QUALITY_HINT =
  /(?:zoom|original|master|full(?:size)?|large|hires|high-res)(?:[\W_]|$)/i;

function positiveNumber(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function resolveHttpUrl(value, baseUrl) {
  const original = String(value || "").trim();
  if (!original) return null;

  try {
    const parsed = new URL(original, baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    // Preserve an absolute source URL byte-for-byte so importer selection never
    // rewrites marketplace transformations or tracking-like image parameters.
    return {
      url: /^[a-z][a-z\d+.-]*:\/\//i.test(original) ? original : parsed.href,
      dedupeKey: parsed.href,
    };
  } catch {
    return null;
  }
}

function dimensionsFromUrl(value) {
  const text = String(value || "");
  const widths = [];
  const heights = [];
  const pairs = [];

  for (const match of text.matchAll(
    /(?:^|[?&/_.,-])(?:w|width|sx)[=_/-]?(\d{2,4})(?=$|[?&#/_.,-])/gi,
  )) {
    widths.push(positiveNumber(match[1]));
  }
  for (const match of text.matchAll(
    /(?:^|[?&/_.,-])(?:h|height|sy)[=_/-]?(\d{2,4})(?=$|[?&#/_.,-])/gi,
  )) {
    heights.push(positiveNumber(match[1]));
  }
  for (const match of text.matchAll(
    /(?:^|[\W_])(\d{2,4})[xX](\d{2,4})(?:[\W_]|$)/g,
  )) {
    pairs.push([positiveNumber(match[1]), positiveNumber(match[2])]);
  }
  for (const match of text.matchAll(/\/image\/(\d{2,4})\/(\d{2,4})\//gi)) {
    pairs.push([positiveNumber(match[1]), positiveNumber(match[2])]);
  }

  return {
    width: Math.max(0, ...widths, ...pairs.map(([width]) => width)),
    height: Math.max(0, ...heights, ...pairs.map(([, height]) => height)),
  };
}

function candidateScore(candidate, resolvedUrl) {
  const source = String(candidate.source || "").toLowerCase();
  const semantics = `${source} ${candidate.semantic || ""} ${candidate.context || ""}`;
  const urlDimensions = dimensionsFromUrl(resolvedUrl);
  const width = positiveNumber(candidate.width) || urlDimensions.width;
  const height = positiveNumber(candidate.height) || urlDimensions.height;
  const largest = Math.min(Math.max(width, height), 5000);
  const smallest = Math.min(
    Math.min(width || largest, height || largest),
    5000,
  );

  let score = largest * 5 + smallest * 2;
  if (/zoom/.test(semantics)) score += 9000;
  if (/original|master|full/.test(semantics)) score += 8000;
  if (/srcset/.test(source)) score += 3500;
  if (/open.?graph|og:image/.test(source)) score += 2200;
  if (/json.?ld|structured/.test(source)) score += 1800;
  if (/lazy|data-src/.test(semantics)) score += 1200;
  if (/twitter/.test(source)) score += 900;
  if (HIGH_QUALITY_HINT.test(`${resolvedUrl} ${semantics}`)) score += 4000;
  if (LOW_QUALITY_HINT.test(`${resolvedUrl} ${semantics}`)) score -= 7000;

  return { score, width, height };
}

/**
 * Evidence-based, stable image selection shared by both importer pipelines.
 * It ranks declared dimensions, srcset widths, full/zoom semantics and common
 * marketplace URL size hints. It never creates a larger URL or transforms the
 * selected asset, so there is no artificial upscaling.
 */
function rankImageCandidates(candidates, { baseUrl, limit = 12 } = {}) {
  const bestByUrl = new Map();

  (Array.isArray(candidates) ? candidates : []).forEach((input, index) => {
    const candidate = typeof input === "string" ? { url: input } : input || {};
    const resolved = resolveHttpUrl(candidate.url, baseUrl);
    if (!resolved) return;

    const context = `${resolved.url} ${candidate.context || ""}`;
    if (REJECTED_ASSET.test(context)) return;

    const ranked = candidateScore(candidate, resolved.url);
    // Explicit 1x1/tracking pixels and declared tiny UI assets are not product
    // photographs. Unknown dimensions are retained because many sites omit them.
    if (
      (ranked.width && ranked.width < 80) ||
      (ranked.height && ranked.height < 80)
    ) {
      return;
    }

    const record = { ...ranked, url: resolved.url, index };
    const previous = bestByUrl.get(resolved.dedupeKey);
    if (!previous || record.score > previous.score) {
      bestByUrl.set(resolved.dedupeKey, record);
    }
  });

  return [...bestByUrl.values()]
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ url }) => url);
}

module.exports = {
  dimensionsFromUrl,
  rankImageCandidates,
  resolveHttpUrl,
};

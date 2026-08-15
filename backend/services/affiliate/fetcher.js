const { ImportError, CODES } = require("./errors");

/**
 * Shared, well-behaved page fetcher.
 *
 * This is deliberately NOT a scraper that evades platform protections:
 *
 *  - It uses a transparent, non-spoofed identity. We do not impersonate a
 *    browser, and we do not solve CAPTCHAs, rotate proxies, or otherwise try
 *    to get past bot protection.
 *  - It only reads the publicly served HTML metadata (JSON-LD, OpenGraph,
 *    meta tags, canonical URL) that a normal visitor's browser receives.
 *  - It honours access restrictions: a 401/403 (login wall / bot block),
 *    a 429 (rate limit) or a 5xx is reported as a graceful error rather than
 *    retried aggressively.
 */

const DEFAULT_TIMEOUT_MS = 12000;
const MAX_BYTES = 3 * 1024 * 1024;

const USER_AGENT =
  "TalishClothes-Import/1.0 (product metadata import; +https://talishclothes.netlify.app)";

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fetches a page and returns its HTML text plus the final (post-redirect) URL.
 * Throws a typed ImportError when the page cannot be accessed.
 */
async function fetchPage(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!isHttpUrl(url)) {
    throw new ImportError(CODES.INVALID_URL, "Please enter a valid product URL.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "en-IN,en;q=0.9",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === "AbortError") {
      throw new ImportError(
        CODES.PAGE_UNAVAILABLE,
        "The product page timed out and could not be accessed.",
        502,
      );
    }
    throw new ImportError(
      CODES.PAGE_UNAVAILABLE,
      "The product page could not be accessed. You can enter the product information manually.",
      502,
    );
  }
  clearTimeout(timer);

  const status = response.status;

  if (status === 404 || status === 410) {
    throw new ImportError(
      CODES.PRODUCT_UNAVAILABLE,
      "This product page could not be found on the marketplace. Check the URL and try again.",
      404,
    );
  }
  if (status === 401 || status === 403) {
    throw new ImportError(
      CODES.BLOCKED,
      "The product page could not be accessed (the marketplace restricted automated access). You can enter the product information manually.",
      403,
    );
  }
  if (status === 429) {
    throw new ImportError(
      CODES.RATE_LIMITED,
      "The marketplace rate-limited the request. Please try again in a moment.",
      429,
    );
  }
  if (status >= 500) {
    throw new ImportError(
      CODES.SOURCE_ERROR,
      "The marketplace is currently unavailable. Please try again shortly.",
      502,
    );
  }
  if (!response.ok) {
    throw new ImportError(
      CODES.PAGE_UNAVAILABLE,
      "The product page could not be accessed. You can enter the product information manually.",
      status,
    );
  }

  let text;
  try {
    text = await response.text();
  } catch {
    throw new ImportError(
      CODES.PAGE_UNAVAILABLE,
      "The product page could not be read. You can enter the product information manually.",
      502,
    );
  }

  return {
    html: text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text,
    finalUrl: response.url || url,
    status,
  };
}

module.exports = { fetchPage, isHttpUrl };

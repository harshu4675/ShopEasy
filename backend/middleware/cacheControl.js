/**
 * Shared public-cache policy. Product responses may be stored but must be
 * revalidated so successful create/edit/delete mutations are visible on the
 * next request. Small reference-data endpoints retain a short edge TTL.
 */
function publicCacheControl(req, res, next) {
  if (req.method !== "GET" || req.headers.authorization) return next();

  if (/^\/api\/products(?:\/|$)/.test(req.path)) {
    res.set("Cache-Control", "public, no-cache, must-revalidate");
  } else if (/^\/api\/(categories|banners|trending)(?:\/|$)/.test(req.path)) {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  }
  return next();
}

module.exports = publicCacheControl;

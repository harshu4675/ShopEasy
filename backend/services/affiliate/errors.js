/**
 * Typed import errors.
 *
 * Every failure the importer can produce carries a stable `code` and a
 * human-readable `message`, so the admin UI can render a useful explanation
 * instead of a generic "something went wrong".
 *
 * None of these require marketplace API credentials: extraction is based on
 * publicly visible page metadata, and every access problem is reported as a
 * graceful, actionable message (the admin can then complete fields manually).
 */
class ImportError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = "ImportError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const CODES = {
  INVALID_URL: "INVALID_URL",
  // The page could not be fetched or parsed. Not fatal — admin completes fields.
  PAGE_UNAVAILABLE: "PAGE_UNAVAILABLE",
  BLOCKED: "BLOCKED", // 401/403 — marketplace restricted automated access
  RATE_LIMITED: "RATE_LIMITED",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE", // 404/410
  SOURCE_ERROR: "SOURCE_ERROR", // 5xx or unexpected upstream failure
  METADATA_NOT_FOUND: "METADATA_NOT_FOUND", // page fetched but no useful metadata
  NOT_SUPPORTED: "NOT_SUPPORTED", // provider exists but has no public path yet
  IMPORT_ERROR: "IMPORT_ERROR",
};

module.exports = { ImportError, CODES };

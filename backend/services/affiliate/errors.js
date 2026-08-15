/**
 * Typed import errors.
 *
 * Every failure the importer can produce carries a stable `code` and a
 * human-readable `message`, so the admin UI can render a useful explanation
 * instead of a generic "something went wrong". Route handlers map these to
 * appropriate HTTP statuses.
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
  UNSUPPORTED_PLATFORM: "UNSUPPORTED_PLATFORM",
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  NOT_SUPPORTED: "NOT_SUPPORTED",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE",
  SOURCE_ERROR: "SOURCE_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  IMPORT_ERROR: "IMPORT_ERROR",
};

module.exports = { ImportError, CODES };

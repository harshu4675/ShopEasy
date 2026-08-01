const { validationResult } = require("express-validator");

/**
 * Terminates an express-validator chain.
 *
 * Collects failures into a stable shape so the frontend can highlight the
 * offending field, and short-circuits before the handler runs.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    })),
  });
};

/**
 * Normalises `page` / `limit` query params.
 * Caps the page size so a client can't request the entire collection.
 */
const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

/** Standard paginated envelope used by every list endpoint. */
const paginated = (items, total, { page, limit }) => ({
  success: true,
  data: items,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

/**
 * Whitelist-based sort builder.
 * Prevents clients from sorting on unindexed or private fields.
 */
const buildSort = (sortParam, allowed, fallback = { createdAt: -1 }) => {
  if (!sortParam) return fallback;
  const desc = sortParam.startsWith("-");
  const field = desc ? sortParam.slice(1) : sortParam;
  if (!allowed.includes(field)) return fallback;
  return { [field]: desc ? -1 : 1 };
};

module.exports = { validate, parsePagination, paginated, buildSort };

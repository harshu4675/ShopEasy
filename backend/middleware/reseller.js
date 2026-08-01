const Reseller = require("../models/Reseller");

/**
 * Role-based access control for the reseller programme.
 *
 * Must be mounted *after* `auth`, which populates `req.user`.
 * Attaches the resolved profile as `req.reseller` so handlers don't refetch it.
 */

/** Requires an approved, non-suspended reseller. */
const requireReseller = async (req, res, next) => {
  try {
    const reseller = await Reseller.findOne({ user: req.user._id });

    if (!reseller) {
      return res.status(403).json({
        success: false,
        code: "NOT_A_RESELLER",
        message: "You are not registered as a reseller",
      });
    }

    if (reseller.status === "pending") {
      return res.status(403).json({
        success: false,
        code: "RESELLER_PENDING",
        message: "Your reseller application is awaiting approval",
      });
    }

    if (reseller.status === "rejected") {
      return res.status(403).json({
        success: false,
        code: "RESELLER_REJECTED",
        message: reseller.statusReason || "Your reseller application was rejected",
      });
    }

    if (reseller.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "RESELLER_SUSPENDED",
        message: reseller.statusReason || "Your reseller account is suspended",
      });
    }

    req.reseller = reseller;

    // Fire-and-forget activity ping; never blocks the response.
    Reseller.updateOne(
      { _id: reseller._id },
      { $set: { lastActiveAt: new Date() } },
    ).catch(() => {});

    next();
  } catch (error) {
    console.error("requireReseller error:", error);
    res.status(500).json({ success: false, message: "Authorization check failed" });
  }
};

/**
 * Attaches the reseller profile when one exists, but never blocks the request.
 * Used by endpoints that behave differently for resellers (e.g. onboarding
 * status checks).
 */
const attachReseller = async (req, res, next) => {
  try {
    if (req.user) {
      req.reseller = await Reseller.findOne({ user: req.user._id });
    }
    next();
  } catch {
    next();
  }
};

module.exports = { requireReseller, attachReseller };

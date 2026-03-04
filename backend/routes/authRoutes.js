const express = require("express");
const router = express.Router();
const {
  register,
  verifyEmail,
  resendOTP,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  refreshToken,
  logout,
  getMe,
  checkPhone, // 🆕 Added
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// ==================== PUBLIC ROUTES ====================

// 🆕 Phone Availability Check (must be before other routes)
router.get("/check-phone/:phone", checkPhone);

// Registration & Verification
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);

// Login & Authentication
router.post("/login", login);
router.post("/refresh-token", refreshToken);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// ==================== PROTECTED ROUTES ====================

// User Profile & Logout
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

module.exports = router;

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// ==================== PUBLIC ROUTES ====================
router.get("/check-phone/:phone", authController.checkPhone);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);

// ==================== PROTECTED ROUTES ====================
router.get("/me", protect, authController.getMe);
router.post("/logout", protect, authController.logout);
router.put("/profile", protect, authController.updateProfile);
router.put("/change-password", protect, authController.changePassword);

// Address Management
router.post("/address", protect, authController.addAddress);
router.put("/address/:id", protect, authController.updateAddress);
router.delete("/address/:id", protect, authController.deleteAddress);

module.exports = router;

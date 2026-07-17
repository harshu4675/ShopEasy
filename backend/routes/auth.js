const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OTP = require("../models/OTP");
const auth = require("../middleware/auth");
const { sendOTPEmail } = require("../utils/emailService");

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "15m",
  });
};

const generateRefreshToken = (id, rememberMe = false) => {
  const expiresIn = rememberMe
    ? process.env.JWT_REMEMBER_EXPIRE || "30d"
    : process.env.JWT_REFRESH_EXPIRE || "7d";
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn });
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const getCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
});

router.get("/check-phone/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Invalid phone number format. Must be 10 digits.",
      });
    }

    const existingUser = await User.findOne({ phone: phone.trim() });

    res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser
        ? "This phone number is already in use"
        : "Phone number available",
    });
  } catch (error) {
    console.error("Check phone error:", error);
    res.status(500).json({
      success: false,
      available: false,
      message: "Error checking phone number",
    });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { name, email, password, phone, rememberMe, purpose } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const emailLower = email.toLowerCase().trim();
    const otpPurpose =
      purpose === "reset-password" ? "reset-password" : "register";

    if (otpPurpose === "register") {
      if (!name || !phone || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, phone, and password are required",
        });
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid 10-digit phone number",
        });
      }

      const existingEmail = await User.findOne({ email: emailLower });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "This email is already registered. Please login.",
          field: "email",
        });
      }

      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "This phone number is already in use.",
          field: "phone",
        });
      }
    } else {
      const user = await User.findOne({ email: emailLower });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No account found with this email",
        });
      }
    }

    const existingOTP = await OTP.findOne({
      email: emailLower,
      purpose: otpPurpose,
    });

    if (existingOTP) {
      const secondsSinceLastSend =
        (Date.now() - existingOTP.lastSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(60 - secondsSinceLastSend)} seconds before requesting a new OTP`,
          waitTime: Math.ceil(60 - secondsSinceLastSend),
        });
      }
      await OTP.deleteOne({ _id: existingOTP._id });
    }

    const otp = OTP.generateOTP();
    const otpHash = OTP.hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const userData =
      otpPurpose === "register"
        ? {
            name: name.trim(),
            email: emailLower,
            password,
            phone: phone.trim(),
            rememberMe: !!rememberMe,
          }
        : null;

    await OTP.create({
      email: emailLower,
      otpHash,
      purpose: otpPurpose,
      userData,
      expiresAt,
      lastSentAt: new Date(),
    });

    const emailResult = await sendOTPEmail(
      emailLower,
      otp,
      name || "there",
      otpPurpose,
    );

    if (!emailResult.success) {
      await OTP.deleteOne({ email: emailLower, purpose: otpPurpose });
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to ${emailLower}`,
      email: emailLower,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
});

router.post("/verify-otp-register", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const emailLower = email.toLowerCase().trim();

    const otpRecord = await OTP.findOne({
      email: emailLower,
      purpose: "register",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new one.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    if (!otpRecord.verifyOTP(otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`,
      });
    }

    const userData = otpRecord.userData;
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: "Registration data not found. Please try again.",
      });
    }

    const existingEmail = await User.findOne({ email: userData.email });
    if (existingEmail) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    const existingPhone = await User.findOne({ phone: userData.phone });
    if (existingPhone) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "This phone number is already in use.",
      });
    }

    const user = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
    });

    await OTP.deleteOne({ _id: otpRecord._id });

    const rememberMe = userData.rememberMe;
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, rememberMe);

    const tokenExpiry = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.refreshTokens = [];
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      expiresAt: tokenExpiry,
      device: req.headers["user-agent"],
    });
    user.lastLogin = Date.now();
    await user.save();

    res.cookie("refreshToken", refreshToken, getCookieOptions(rememberMe));

    res.status(201).json({
      success: true,
      message: "Email verified! Welcome to Talish Clothes.",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
});

router.post("/verify-otp-reset", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const emailLower = email.toLowerCase().trim();

    const otpRecord = await OTP.findOne({
      email: emailLower,
      purpose: "reset-password",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new one.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    if (!otpRecord.verifyOTP(otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`,
      });
    }

    const user = await User.findOne({ email: emailLower });
    if (!user) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = newPassword;
    user.refreshTokens = [];
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message:
        "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
});

router.post("/register", async (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Please use /send-otp and /verify-otp-register for registration",
  });
});

router.post("/login", async (req, res) => {
  try {
    const { phone, password, rememberMe } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide phone number and password",
      });
    }

    const user = await User.findOne({ phone }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockTime} minutes`,
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
        await user.save();
        return res.status(423).json({
          success: false,
          message:
            "Account locked for 15 minutes due to too many failed attempts",
        });
      }

      await user.save();
      const attemptsLeft = 5 - user.loginAttempts;

      return res.status(401).json({
        success: false,
        message: `Invalid phone number or password. ${attemptsLeft} attempts left`,
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = Date.now();

    if (user.refreshTokens) {
      user.refreshTokens = user.refreshTokens.filter(
        (t) => t.expiresAt > Date.now(),
      );
    } else {
      user.refreshTokens = [];
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, rememberMe);

    const tokenExpiry = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.refreshTokens.push({
      token: hashToken(refreshToken),
      expiresAt: tokenExpiry,
      device: req.headers["user-agent"],
    });

    await user.save();

    res.cookie("refreshToken", refreshToken, getCookieOptions(rememberMe));

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        accessToken,
        rememberMe,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

router.post("/refresh-token", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedToken = hashToken(refreshToken);
    const tokenExists =
      user.refreshTokens &&
      user.refreshTokens.find(
        (t) => t.token === hashedToken && t.expiresAt > Date.now(),
      );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: "Token expired or revoked",
      });
    }

    const accessToken = generateAccessToken(user._id);

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          addresses: req.user.addresses,
        },
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});

router.post("/address", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      data: { addresses: user.addresses },
    });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
});

router.put("/address/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    Object.assign(address, req.body);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: { addresses: user.addresses },
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
});

router.delete("/address/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.id);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: { addresses: user.addresses },
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
});

router.post("/logout", auth, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: hashedToken } },
      });
    }

    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

module.exports = router;

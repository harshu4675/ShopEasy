const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../utils/jwtUtils");

// Cookie options
const getCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
});

// @desc    Check if phone number is available
// @route   GET /api/auth/check-phone/:phone
// @access  Public
exports.checkPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    console.log("📞 Checking phone availability:", phone);

    // Validate phone format
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Invalid phone number format",
      });
    }

    const existingUser = await User.findOne({ phone: phone.trim() });

    console.log("🔍 Phone check result:", existingUser ? "Taken" : "Available");

    res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser
        ? "Phone number already registered"
        : "Phone number available",
    });
  } catch (error) {
    console.error("❌ Check phone error:", error);
    res.status(500).json({
      success: false,
      available: false,
      message: "Error checking phone number",
    });
  }
};

// @desc    Register user & send OTP
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    console.log("📥 Registration request:", { name, email, phone });

    // ✅ Check if email already exists
    let user = await User.findOne({ email });

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email already registered. Please login.",
          field: "email",
        });
      }
      // User exists but not verified - resend OTP
      const otp = user.generateEmailVerificationOTP();
      await user.save();
      await sendEmail(email, "verificationOTP", user.name, otp);

      return res.status(200).json({
        success: true,
        message: "OTP resent to your email",
        data: { email, requiresVerification: true },
      });
    }

    // ✅ Check if phone already exists (IMPROVED)
    if (phone && phone.trim() !== "") {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      console.log("📞 Phone check result:", existingPhone);

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message:
            "This phone number is already registered with another account.",
          field: "phone",
        });
      }
    }

    // Create new user
    user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : undefined,
    });

    console.log("✅ User created:", user._id);

    // Generate and send OTP
    const otp = user.generateEmailVerificationOTP();
    await user.save();

    await sendEmail(email, "verificationOTP", name, otp);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: { email, requiresVerification: true },
    });
  } catch (error) {
    console.error("❌ Register error:", error);

    // ✅ Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message =
        field === "phone"
          ? "This phone number is already registered with another account."
          : field === "email"
            ? "This email is already registered. Please login."
            : "This value is already in use.";

      return res.status(400).json({
        success: false,
        message,
        field,
      });
    }

    // ✅ Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || "Validation failed",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

// @desc    Verify email OTP
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email,
      emailVerificationOTP: hashedOTP,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Verify user
    user.isVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Send welcome email
    await sendEmail(email, "welcomeEmail", user.name);

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      device: req.headers["user-agent"],
    });
    await user.save();

    // Set cookie
    res.cookie("refreshToken", refreshToken, getCookieOptions());

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

// @desc    Resend verification OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body; // type: 'verification' or 'reset'

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let otp;
    if (type === "verification") {
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email already verified",
        });
      }
      otp = user.generateEmailVerificationOTP();
      await user.save();
      await sendEmail(email, "verificationOTP", user.name, otp);
    } else if (type === "reset") {
      otp = user.generatePasswordResetOTP();
      await user.save();
      await sendEmail(email, "passwordResetOTP", user.name, otp);
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockTime} minutes`,
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incrementLoginAttempts();
      const attemptsLeft = 5 - (user.loginAttempts + 1);
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${attemptsLeft > 0 ? `${attemptsLeft} attempts left` : "Account locked for 15 minutes"}`,
      });
    }

    // Check if verified
    if (!user.isVerified) {
      // Send new OTP
      const otp = user.generateEmailVerificationOTP();
      await user.save();
      await sendEmail(email, "verificationOTP", user.name, otp);

      return res.status(403).json({
        success: false,
        message: "Please verify your email first. OTP sent.",
        data: { email, requiresVerification: true },
      });
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Clean expired tokens
    user.cleanExpiredTokens();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, rememberMe);

    // Calculate expiry
    const tokenExpiry = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store refresh token
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      expiresAt: tokenExpiry,
      device: req.headers["user-agent"],
    });
    await user.save();

    // Set cookie
    res.cookie("refreshToken", refreshToken, getCookieOptions(rememberMe));

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isVerified: user.isVerified,
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
};

// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: "If the email exists, you will receive an OTP",
      });
    }

    // Generate OTP
    const otp = user.generatePasswordResetOTP();
    await user.save();

    // Send email
    await sendEmail(email, "passwordResetOTP", user.name, otp);

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      data: { email },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process request",
    });
  }
};

// @desc    Verify reset OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email,
      passwordResetOTP: hashedOTP,
      passwordResetExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Generate reset token for password change
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetOTP = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified",
      data: { resetToken, email },
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      email,
      passwordResetOTP: hashedToken,
      passwordResetExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    user.password = password;
    user.passwordResetOTP = undefined;
    user.passwordResetExpire = undefined;
    // Invalidate all refresh tokens
    user.refreshTokens = [];
    await user.save();

    // Send confirmation email
    await sendEmail(user.email, "passwordChanged", user.name);

    res.status(200).json({
      success: true,
      message: "Password reset successful. Please login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset failed",
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token",
      });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Find user and validate token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedToken = hashToken(refreshToken);
    const tokenExists = user.refreshTokens.find(
      (t) => t.token === hashedToken && t.expiresAt > Date.now(),
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: "Token expired or revoked",
      });
    }

    // Generate new access token
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
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken && req.user) {
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
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isVerified: user.isVerified,
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
};

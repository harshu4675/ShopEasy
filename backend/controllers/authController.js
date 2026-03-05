const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==================== HELPER FUNCTIONS ====================

// Generate Access Token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "15m",
  });
};

// Generate Refresh Token
const generateRefreshToken = (id, rememberMe = false) => {
  const expiresIn = rememberMe
    ? process.env.JWT_REMEMBER_EXPIRE || "30d"
    : process.env.JWT_REFRESH_EXPIRE || "7d";

  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
};

// Hash token
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Cookie options
const getCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
});

// ==================== AUTH CONTROLLERS ====================

// @desc    Check phone availability
// @route   GET /api/auth/check-phone/:phone
exports.checkPhone = async (req, res) => {
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
    console.error("❌ Check phone error:", error);
    res.status(500).json({
      success: false,
      available: false,
      message: "Error checking phone number",
    });
  }
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, rememberMe } = req.body;

    console.log("📥 Registration request:", { name, email, phone });

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, and password are required",
      });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit phone number",
        field: "phone",
      });
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone: phone.trim() });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "This phone number is already in use. Please login.",
        field: "phone",
      });
    }

    // Check if email already exists
    if (email && email.trim() !== "") {
      const existingEmail = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "This email is already registered.",
          field: "email",
        });
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      password,
      phone: phone.trim(),
    });

    console.log("✅ User created:", user._id);

    // Generate tokens
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
      message: "Registration successful. Welcome!",
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
    console.error("❌ Register error:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message =
        field === "phone"
          ? "This phone number is already in use."
          : field === "email"
            ? "This email is already registered."
            : "This value is already in use.";

      return res.status(400).json({ success: false, message, field });
    }

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

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { phone, password, rememberMe } = req.body;

    console.log("📞 Login request for:", phone);

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

    // Check if locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockTime} minutes`,
      });
    }

    // Check password
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

    // Reset attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = Date.now();

    // Clean expired tokens
    if (user.refreshTokens) {
      user.refreshTokens = user.refreshTokens.filter(
        (t) => t.expiresAt > Date.now(),
      );
    } else {
      user.refreshTokens = [];
    }

    // Generate tokens
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

    console.log("✅ Login successful for:", phone);

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
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
exports.refreshToken = async (req, res) => {
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
    console.error("❌ Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
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
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
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
};

// @desc    Change password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
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
};

// @desc    Add address
// @route   POST /api/auth/address
exports.addAddress = async (req, res) => {
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
};

// @desc    Update address
// @route   PUT /api/auth/address/:id
exports.updateAddress = async (req, res) => {
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
};

// @desc    Delete address
// @route   DELETE /api/auth/address/:id
exports.deleteAddress = async (req, res) => {
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
};

// @desc    Logout
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
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
};

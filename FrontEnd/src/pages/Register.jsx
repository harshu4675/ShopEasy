import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import Logo from "../components/Logo";
import api from "../utils/api";
import "../styles/Auth.css";

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Phone validation states
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState(null);
  const [phoneError, setPhoneError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: numericValue });
      setPhoneAvailable(null);
      setPhoneError("");
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Check phone availability (debounced)
  useEffect(() => {
    const checkPhone = async () => {
      if (formData.phone && /^[0-9]{10}$/.test(formData.phone)) {
        setPhoneChecking(true);
        try {
          const response = await api.get(`/auth/check-phone/${formData.phone}`);
          setPhoneAvailable(response.data.available);
          setPhoneError(response.data.available ? "" : response.data.message);
        } catch (error) {
          console.error("Phone check error:", error);
          setPhoneError("Error checking phone number");
        } finally {
          setPhoneChecking(false);
        }
      } else if (formData.phone.length > 0) {
        setPhoneError("Please enter a valid 10-digit phone number");
        setPhoneAvailable(false);
      }
    };

    const debounce = setTimeout(checkPhone, 500);
    return () => clearTimeout(debounce);
  }, [formData.phone]);

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast("Please enter your name", "error");
      return false;
    }

    if (!formData.phone.trim()) {
      showToast("Please enter your phone number", "error");
      return false;
    }

    if (!/^[0-9]{10}$/.test(formData.phone)) {
      showToast("Please enter a valid 10-digit phone number", "error");
      return false;
    }

    if (phoneAvailable === false) {
      showToast("This phone number is already in use", "error");
      return false;
    }

    if (formData.email && formData.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showToast("Please enter a valid email", "error");
        return false;
      }
    }

    if (formData.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return false;
    }

    if (!agreedToTerms) {
      showToast("Please agree to the Terms & Conditions", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.phone,
        rememberMe,
      );

      if (response.success) {
        showToast("Account created successfully! Welcome! 🎉", "success");
        navigate("/");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Registration failed";
      const errorField = error.response?.data?.field;

      if (errorField === "phone") {
        setPhoneAvailable(false);
        setPhoneError(errorMessage);
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { strength: "", text: "" };
    if (password.length < 4) return { strength: "weak", text: "Weak" };
    if (password.length < 6) return { strength: "medium", text: "Medium" };
    if (
      password.length >= 6 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return { strength: "strong", text: "Strong" };
    }
    return { strength: "medium", text: "Medium" };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Features Section */}
        <div className="auth-features">
          <div className="features-content">
            <div className="features-icon">🎉</div>
            <h2>Member Benefits</h2>
            <p className="features-subtitle">
              Create an account and unlock exclusive perks
            </p>
            <ul>
              <li>
                <span className="feature-icon">💰</span>
                <div className="feature-text">
                  <strong>₹100 Welcome Bonus</strong>
                  <span>Get ₹100 off on your first order</span>
                </div>
              </li>
              <li>
                <span className="feature-icon">🎟️</span>
                <div className="feature-text">
                  <strong>Exclusive Coupons</strong>
                  <span>Access to member-only deals</span>
                </div>
              </li>
              <li>
                <span className="feature-icon">📦</span>
                <div className="feature-text">
                  <strong>Order Tracking</strong>
                  <span>Track your orders in real-time</span>
                </div>
              </li>
              <li>
                <span className="feature-icon">♡</span>
                <div className="feature-text">
                  <strong>Wishlist</strong>
                  <span>Save items for later</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <div className="auth-header">
            <Logo size="large" />
            <h1>Create Account</h1>
            <p>Join ShopEasy for exclusive deals</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>
                Full Name <span className="required">*</span>
              </label>
              <div className="input-icon">
                <span className="icon">👤</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Phone Number <span className="required">*</span>
              </label>
              <div
                className={`input-icon ${phoneError ? "error" : ""} ${phoneAvailable === true ? "success" : ""}`}
              >
                <span className="icon">📱</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength="10"
                  disabled={loading}
                  required
                />
                {phoneChecking && <span className="input-status">⏳</span>}
                {!phoneChecking && phoneAvailable === true && (
                  <span className="input-status success">✓</span>
                )}
                {!phoneChecking && phoneAvailable === false && (
                  <span className="input-status error">✗</span>
                )}
              </div>
              {phoneError && <span className="error-text">{phoneError}</span>}
            </div>

            <div className="form-group">
              <label>Email Address (Optional)</label>
              <div className="input-icon">
                <span className="icon">📧</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Password <span className="required">*</span>
                </label>
                <div className="input-icon">
                  <span className="icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create password"
                    required
                    minLength="6"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Confirm Password <span className="required">*</span>
                </label>
                <div className="input-icon">
                  <span className="icon">🔒</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>

            {formData.password && (
              <div className="password-strength">
                <div
                  className={`strength-bar ${passwordStrength.strength}`}
                ></div>
                <span className="strength-text">{passwordStrength.text}</span>
              </div>
            )}

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  I agree to the <Link to="/terms">Terms & Conditions</Link> and{" "}
                  <Link to="/privacy">Privacy Policy</Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading || phoneAvailable === false || phoneChecking}
            >
              {loading ? (
                <>
                  <span className="btn-loader"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

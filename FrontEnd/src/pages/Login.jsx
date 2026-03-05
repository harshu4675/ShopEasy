import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import Logo from "../components/Logo";
import "../styles/Auth.css";

const Login = () => {
  const { login, getRememberedPhone } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || "/";

  // Load remembered phone
  useEffect(() => {
    const rememberedPhone = getRememberedPhone();
    if (rememberedPhone) {
      setFormData((prev) => ({ ...prev, phone: rememberedPhone }));
      setRememberMe(true);
    }
  }, [getRememberedPhone]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Only allow numbers for phone
    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: numericValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone || !formData.password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (formData.phone.length !== 10) {
      showToast("Please enter a valid 10-digit phone number", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await login(
        formData.phone,
        formData.password,
        rememberMe,
      );

      if (response.success) {
        showToast("Welcome back! 🎉", "success");
        navigate(from, { replace: true });
      }
    } catch (error) {
      const errorData = error.response?.data;
      showToast(errorData?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Features Section */}
        <div className="auth-features">
          <div className="features-content">
            <div className="features-icon">🛍️</div>
            <h2>Why Shop with Us?</h2>
            <p className="features-subtitle">
              Join thousands of happy customers
            </p>
            <ul>
              <li>
                <span className="feature-icon">✨</span>
                <div className="feature-text">
                  <strong>Latest Fashion Trends</strong>
                  <span>Curated collections updated weekly</span>
                </div>
              </li>
              <li>
                <span className="feature-icon">🚚</span>
                <div className="feature-text">
                  <strong>Free Delivery</strong>
                  <span>On orders above ₹199</span>
                </div>
              </li>
              <li>
                <span className="feature-icon">↩️</span>
                <div className="feature-text">
                  <strong>Easy Returns</strong>
                  <span>7-day hassle-free returns</span>
                </div>
              </li>
              <li>
                <span className="feature-icon">💳</span>
                <div className="feature-text">
                  <strong>Secure Payments</strong>
                  <span>100% secure transactions</span>
                </div>
              </li>
              <li>
                <span className="feature-icon">🎁</span>
                <div className="feature-text">
                  <strong>Member Discounts</strong>
                  <span>Exclusive deals for members</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <div className="auth-header">
            <Logo size="large" />
            <h1>Welcome Back!</h1>
            <p>Login to continue shopping</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-icon">
                <span className="icon">📱</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  maxLength="10"
                  required
                  disabled={loading}
                />
              </div>
              {formData.phone && formData.phone.length === 10 && (
                <span className="success-text" style={{ fontSize: "12px" }}>
                  ✓ Valid phone number
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon">
                <span className="icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
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
              <Link to="/contact" className="forgot-password">
                Need Help?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading || formData.phone.length !== 10}
            >
              {loading ? (
                <>
                  <span className="btn-loader"></span>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

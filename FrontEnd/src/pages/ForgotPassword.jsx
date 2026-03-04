import React, { useState, useContext, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import Logo from "../components/Logo";
import OTPInput from "../components/OTPInput";
import "../styles/Auth.css";

const ForgotPassword = () => {
  const { forgotPassword, verifyResetOTP, resetPassword, resendOTP } =
    useContext(AuthContext);

  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [cooldown, setCooldown] = useState(0);

  // ================= EMAIL VALIDATION =================

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // ================= PASSWORD STRENGTH =================

  const passwordStrength = useMemo(() => {
    const password = passwords.password;

    if (!password) return { strength: "", text: "" };

    if (password.length < 6) {
      return { strength: "weak", text: "Weak" };
    }

    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: "strong", text: "Strong" };
    }

    return { strength: "medium", text: "Medium" };
  }, [passwords.password]);

  // ================= COOLDOWN TIMER =================

  useEffect(() => {
    if (cooldown === 0) return;

    const timer = setTimeout(() => {
      setCooldown(cooldown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  // ================= STEP 1 : SEND EMAIL =================

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      showToast("Enter a valid email address", "error");
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email);

      setStep(2);
      setCooldown(30);

      showToast("OTP sent to your email 📧", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= STEP 2 : VERIFY OTP =================

  const handleOTPComplete = async (otp) => {
    setLoading(true);

    try {
      const response = await verifyResetOTP(email, otp);

      if (response.success) {
        setResetToken(response.data.resetToken);
        setStep(3);

        showToast("OTP verified successfully 🔐", "success");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Invalid OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= RESEND OTP =================

  const handleResendOTP = async () => {
    if (cooldown > 0) return;

    try {
      await resendOTP(email, "reset");

      setCooldown(30);

      showToast("OTP resent successfully 📧", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to resend OTP",
        "error",
      );
    }
  };

  // ================= STEP 3 : RESET PASSWORD =================

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwords.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email, resetToken, passwords.password);

      showToast("Password reset successful 🎉 Please login", "success");

      navigate("/login");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to reset password",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-centered">
        <div className="auth-card">
          {/* STEP 1 */}

          {step === 1 && (
            <>
              <div className="auth-header">
                <Logo size="large" />
                <h1>Forgot Password?</h1>
                <p>Enter your email to receive reset OTP</p>
              </div>

              <form onSubmit={handleEmailSubmit} className="auth-form">
                <div className="form-group">
                  <label>Email Address</label>

                  <div className="input-icon">
                    <span className="icon">📧</span>

                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "Send Reset OTP"}
                </button>
              </form>

              <p className="auth-footer">
                Remember password? <Link to="/login">Back to login</Link>
              </p>
            </>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <>
              <button
                className="back-btn"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                ← Back
              </button>

              <OTPInput
                length={6}
                email={email}
                onComplete={handleOTPComplete}
                onResend={handleResendOTP}
                loading={loading}
              />

              {cooldown > 0 && (
                <p style={{ textAlign: "center", marginTop: "10px" }}>
                  Resend available in {cooldown}s
                </p>
              )}
            </>
          )}

          {/* STEP 3 */}

          {step === 3 && (
            <>
              <div className="auth-header">
                <h1>Create New Password</h1>
                <p>Your new password must be different</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="auth-form">
                <div className="form-group">
                  <label>New Password</label>

                  <div className="input-icon">
                    <span className="icon">🔒</span>

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={passwords.password}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          password: e.target.value,
                        })
                      }
                      minLength="6"
                      required
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

                {passwords.password && (
                  <div className="password-strength">
                    <div
                      className={`strength-bar ${passwordStrength.strength}`}
                    ></div>
                    <span className="strength-text">
                      {passwordStrength.text}
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label>Confirm Password</label>

                  <div className="input-icon">
                    <span className="icon">🔒</span>

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          confirmPassword: e.target.value,
                        })
                      }
                      minLength="6"
                      required
                    />

                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {passwords.confirmPassword && (
                  <div className="password-match">
                    {passwords.password === passwords.confirmPassword ? (
                      <span className="match">✓ Passwords match</span>
                    ) : (
                      <span className="no-match">✗ Passwords do not match</span>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import Logo from "../components/Logo";
import OTPVerification from "../components/OTPVerification";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const ForgotPassword = () => {
  const { sendResetOTP, verifyResetOTP } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const fontId = "forgot-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast("Please enter your email", "error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await sendResetOTP(email);
      if (response.success) {
        showToast(`OTP sent to ${email}`, "success");
        setStep("otp");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    setOtpLoading(true);
    setOtp(code);
    setTimeout(() => {
      setOtpLoading(false);
      setStep("password");
    }, 300);
  };

  const handleResendOTP = async () => {
    return sendResetOTP(email);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast("Please fill all fields", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setResetLoading(true);
    try {
      const response = await verifyResetOTP(email, otp, newPassword);
      if (response.success) {
        showToast("Password reset successful. Please login.", "success");
        navigate("/login");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to reset password";
      showToast(errorMessage, "error");
      if (errorMessage.toLowerCase().includes("otp")) {
        setStep("otp");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (newPassword.length === 0) return { strength: "", text: "", pct: 0 };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { strength: "weak", text: "Weak", pct: 33 };
    if (score <= 3) return { strength: "medium", text: "Medium", pct: 66 };
    return { strength: "strong", text: "Strong", pct: 100 };
  };

  const passwordStrength = getPasswordStrength();
  const strengthColors = {
    weak: "bg-red-500",
    medium: "bg-amber-500",
    strong: "bg-green-500",
  };
  const strengthTextColors = {
    weak: "text-red-600",
    medium: "text-amber-600",
    strong: "text-green-600",
  };

  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword && newPassword !== confirmPassword;

  return (
    <div
      className="flex min-h-[calc(100vh-80px)] max-md:min-h-[calc(100vh-70px)] max-[480px]:min-h-[calc(100vh-64px)]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        className="relative hidden w-1/2 overflow-hidden lg:flex"
        style={{
          background:
            "linear-gradient(135deg, #4a0e2e 0%, #831843 40%, #be185d 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-16">
          <Logo size="large" linkTo={null} />

          <div className="max-w-md">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-pink-200">
              Account Recovery
            </p>
            <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white">
              Forgot your password?
            </h1>
            <p className="mb-10 text-base leading-relaxed text-pink-100">
              No worries! We'll help you reset it in 3 simple steps. Just verify
              your email and choose a new password.
            </p>

            <div className="space-y-3">
              {[
                {
                  num: "1",
                  title: "Enter your email",
                  desc: "The email linked to your account",
                  active: step === "email",
                  done: step !== "email",
                },
                {
                  num: "2",
                  title: "Verify OTP",
                  desc: "6-digit code sent to your email",
                  active: step === "otp",
                  done: step === "password",
                },
                {
                  num: "3",
                  title: "New password",
                  desc: "Create a strong new password",
                  active: step === "password",
                  done: false,
                },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-start gap-4 rounded-2xl border p-4 backdrop-blur-md transition-all ${
                    s.active
                      ? "border-white/40 bg-white/15"
                      : s.done
                        ? "border-white/20 bg-white/10 opacity-70"
                        : "border-white/10 bg-white/5 opacity-50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      s.done
                        ? "bg-green-500 text-white"
                        : s.active
                          ? "bg-white text-pink-700"
                          : "bg-white/20 text-white"
                    }`}
                  >
                    {s.done ? (
                      <span style={matIcon} className="text-[18px]">
                        check
                      </span>
                    ) : (
                      s.num
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-0.5 text-sm font-semibold text-white">
                      {s.title}
                    </h4>
                    <p className="m-0 text-xs text-pink-200">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-pink-200 opacity-60">
            &copy; {new Date().getFullYear()} Talish Clothes
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-gradient-to-br from-pink-50/40 via-white to-pink-50/40 px-6 py-10 lg:w-1/2 max-md:px-4 max-md:py-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex w-full items-center justify-center lg:hidden">
            <Logo size="large" linkTo={null} />
          </div>

          {step === "email" && (
            <>
              <Link
                to="/login"
                className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-600 no-underline hover:text-pink-600"
              >
                <span style={matIcon} className="text-[20px]">
                  arrow_back
                </span>
                Back to Login
              </Link>

              <div
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #831843 0%, #ec4899 100%)",
                }}
              >
                <span style={matIcon} className="text-[32px] text-white">
                  lock_reset
                </span>
              </div>

              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink-600">
                  Step 1 of 3
                </p>
                <h2 className="mb-2 text-3xl font-extrabold text-gray-900 max-md:text-2xl">
                  Reset your password
                </h2>
                <p className="m-0 text-sm text-gray-500">
                  Enter your registered email and we'll send you a verification
                  code
                </p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-white transition-all duration-200 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-100">
                    <span
                      style={matIcon}
                      className="ml-4 text-[22px] text-gray-400"
                    >
                      mail
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                      className="flex-1 border-none bg-transparent px-4 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-6 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
                    boxShadow: "0 8px 20px rgba(190, 24, 93, 0.35)",
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                        style={{ animation: "fp-spin 0.7s linear infinite" }}
                      />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <span style={matIcon} className="text-[20px]">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  or
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-4 text-center">
                <p className="m-0 mb-1 text-sm text-gray-600">
                  Remember your password?
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-base font-bold text-pink-600 no-underline transition-all hover:gap-2 hover:text-pink-700"
                >
                  Sign in instead
                  <span style={matIcon} className="text-[18px]">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </>
          )}

          {step === "otp" && (
            <OTPVerification
              email={email}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP}
              onBack={() => setStep("email")}
              loading={otpLoading}
              title="Verify Your Email"
              subtitle="Enter the 6-digit code sent to"
              submitText="Verify & Continue"
            />
          )}

          {step === "password" && (
            <>
              <button
                onClick={() => setStep("otp")}
                type="button"
                disabled={resetLoading}
                className="mb-4 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-sm font-semibold text-gray-600 hover:text-pink-600 disabled:opacity-50"
              >
                <span style={matIcon} className="text-[20px]">
                  arrow_back
                </span>
                Back
              </button>

              <div
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #831843 0%, #ec4899 100%)",
                }}
              >
                <span style={matIcon} className="text-[32px] text-white">
                  key
                </span>
              </div>

              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink-600">
                  Step 3 of 3
                </p>
                <h2 className="mb-2 text-3xl font-extrabold text-gray-900 max-md:text-2xl">
                  Create new password
                </h2>
                <p className="m-0 text-sm text-gray-500">
                  Choose a strong password to secure your account
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    New Password
                  </label>
                  <div className="relative flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-white transition-all duration-200 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-100">
                    <span
                      style={matIcon}
                      className="ml-4 text-[22px] text-gray-400"
                    >
                      lock
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength="6"
                      disabled={resetLoading}
                      autoComplete="new-password"
                      autoFocus
                      className="flex-1 border-none bg-transparent px-4 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="mr-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    >
                      <span style={matIcon} className="text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {newPassword && passwordStrength.strength && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">
                        Password strength
                      </span>
                      <span
                        className={`text-xs font-bold ${strengthTextColors[passwordStrength.strength]}`}
                      >
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColors[passwordStrength.strength]}`}
                        style={{ width: `${passwordStrength.pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Confirm New Password
                  </label>
                  <div
                    className={`relative flex items-center overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 focus-within:ring-4 ${
                      passwordsMatch
                        ? "border-green-500 focus-within:border-green-500 focus-within:ring-green-100"
                        : passwordsMismatch
                          ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-100"
                          : "border-gray-200 focus-within:border-pink-500 focus-within:ring-pink-100"
                    }`}
                  >
                    <span
                      style={matIcon}
                      className="ml-4 text-[22px] text-gray-400"
                    >
                      lock
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      disabled={resetLoading}
                      autoComplete="new-password"
                      className="flex-1 border-none bg-transparent px-4 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="mr-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    >
                      <span style={matIcon} className="text-[20px]">
                        {showConfirmPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                      <span style={matIcon} className="text-[14px]">
                        error
                      </span>
                      Passwords do not match
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-600">
                      <span style={matIcon} className="text-[14px]">
                        check_circle
                      </span>
                      Passwords match
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="m-0 mb-1 flex items-center gap-1 text-xs font-bold text-blue-800">
                    <span style={matIcon} className="text-[14px]">
                      info
                    </span>
                    Password tips
                  </p>
                  <ul className="m-0 list-inside list-disc space-y-0.5 text-[11px] text-blue-700">
                    <li>Use at least 8 characters</li>
                    <li>Mix uppercase and lowercase letters</li>
                    <li>Include numbers and symbols</li>
                    <li>Avoid common words or personal info</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={
                    resetLoading ||
                    !newPassword ||
                    !confirmPassword ||
                    !passwordsMatch ||
                    newPassword.length < 6
                  }
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-6 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
                    boxShadow: "0 8px 20px rgba(190, 24, 93, 0.35)",
                  }}
                >
                  {resetLoading ? (
                    <>
                      <span
                        className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                        style={{ animation: "fp-spin 0.7s linear infinite" }}
                      />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <span style={matIcon} className="text-[20px]">
                        check_circle
                      </span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fp-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;

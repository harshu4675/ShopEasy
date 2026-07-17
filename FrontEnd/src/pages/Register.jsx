import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import Logo from "../components/Logo";
import OTPVerification from "../components/OTPVerification";
import api from "../utils/api";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Register = () => {
  const { sendRegisterOTP, verifyRegisterOTP } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState("form");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState(null);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    const fontId = "register-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

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
    if (!formData.email.trim()) {
      showToast("Please enter your email", "error");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast("Please enter a valid email", "error");
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
    if (formData.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return false;
    }
    if (!agreedToTerms) {
      showToast("Please agree to the Terms and Conditions", "error");
      return false;
    }
    return true;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await sendRegisterOTP(
        formData.name,
        formData.email,
        formData.password,
        formData.phone,
      );
      if (response.success) {
        showToast(`OTP sent to ${formData.email}`, "success");
        setStep("otp");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to send OTP";
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

  const handleVerifyOTP = async (otp) => {
    setOtpLoading(true);
    try {
      const response = await verifyRegisterOTP(formData.email, otp);
      if (response.success) {
        showToast("Welcome to Talish Clothes!", "success");
        navigate("/");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Invalid OTP", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    return sendRegisterOTP(
      formData.name,
      formData.email,
      formData.password,
      formData.phone,
    );
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { strength: "", text: "", pct: 0 };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

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

  const passwordsMatch =
    formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsMismatch =
    formData.confirmPassword && formData.password !== formData.confirmPassword;

  const canSubmit =
    formData.name &&
    formData.email &&
    formData.phone.length === 10 &&
    phoneAvailable === true &&
    formData.password.length >= 6 &&
    passwordsMatch &&
    agreedToTerms &&
    !phoneChecking;

  return (
    <div
      className="flex min-h-[calc(100vh-80px)] max-md:min-h-[calc(100vh-70px)] max-[480px]:min-h-[calc(100vh-64px)]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-pink-50/40 via-white to-pink-50/40 px-6 py-10 lg:w-1/2 max-md:px-4 max-md:py-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex w-full items-center justify-center lg:hidden">
            <Logo size="large" linkTo={null} />
          </div>

          {step === "form" ? (
            <>
              <div className="mb-6 max-md:mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink-600">
                  Join Talish Clothes
                </p>
                <h2 className="mb-2 text-3xl font-extrabold text-gray-900 max-md:text-2xl">
                  Create your account
                </h2>
                <p className="m-0 text-sm text-gray-500">
                  We'll send a verification code to your email
                </p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Full Name <span className="text-pink-600">*</span>
                  </label>
                  <div className="relative flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-white transition-all duration-200 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-100">
                    <span
                      style={matIcon}
                      className="ml-4 text-[22px] text-gray-400"
                    >
                      person
                    </span>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                      disabled={loading}
                      autoComplete="name"
                      className="flex-1 border-none bg-transparent px-4 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Email Address <span className="text-pink-600">*</span>
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
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      autoComplete="email"
                      className="flex-1 border-none bg-transparent px-4 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    OTP will be sent to this email
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Phone Number <span className="text-pink-600">*</span>
                  </label>
                  <div
                    className={`relative flex items-center overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 focus-within:ring-4 ${
                      phoneAvailable === true
                        ? "border-green-500 focus-within:border-green-500 focus-within:ring-green-100"
                        : phoneAvailable === false || phoneError
                          ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-100"
                          : "border-gray-200 focus-within:border-pink-500 focus-within:ring-pink-100"
                    }`}
                  >
                    <span
                      style={matIcon}
                      className="ml-4 text-[22px] text-gray-400"
                    >
                      smartphone
                    </span>
                    <div className="flex items-center border-r border-gray-200 px-3 py-3.5">
                      <span className="text-sm font-semibold text-gray-600">
                        +91
                      </span>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      required
                      disabled={loading}
                      autoComplete="tel"
                      className="flex-1 border-none bg-transparent px-4 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                    />
                    <div className="mr-4 flex items-center">
                      {phoneChecking && (
                        <span
                          className="inline-block h-4 w-4 rounded-full border-2 border-pink-200 border-t-pink-500"
                          style={{ animation: "reg-spin 0.7s linear infinite" }}
                        />
                      )}
                      {!phoneChecking && phoneAvailable === true && (
                        <span
                          style={matIcon}
                          className="text-[22px] text-green-500"
                        >
                          check_circle
                        </span>
                      )}
                      {!phoneChecking && phoneAvailable === false && (
                        <span
                          style={matIcon}
                          className="text-[22px] text-red-500"
                        >
                          cancel
                        </span>
                      )}
                    </div>
                  </div>
                  {phoneError && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                      <span style={matIcon} className="text-[14px]">
                        error
                      </span>
                      {phoneError}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Password <span className="text-pink-600">*</span>
                    </label>
                    <div className="relative flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-white transition-all duration-200 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-100">
                      <span
                        style={matIcon}
                        className="ml-3 text-[20px] text-gray-400"
                      >
                        lock
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Password"
                        required
                        minLength="6"
                        disabled={loading}
                        autoComplete="new-password"
                        className="flex-1 border-none bg-transparent px-3 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="mr-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <span style={matIcon} className="text-[18px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Confirm <span className="text-pink-600">*</span>
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
                        className="ml-3 text-[20px] text-gray-400"
                      >
                        lock
                      </span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm"
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        className="flex-1 border-none bg-transparent px-3 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="mr-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <span style={matIcon} className="text-[18px]">
                          {showConfirmPassword
                            ? "visibility_off"
                            : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {formData.password && passwordStrength.strength && (
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

                {passwordsMismatch && (
                  <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <span style={matIcon} className="text-[14px]">
                      error
                    </span>
                    Passwords do not match
                  </p>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all hover:border-pink-200 hover:bg-pink-50/40 select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-pink-600"
                  />
                  <span className="text-xs leading-relaxed text-gray-700">
                    I agree to Talish Clothes{" "}
                    <Link
                      to="/terms"
                      className="font-semibold text-pink-600 no-underline hover:underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="font-semibold text-pink-600 no-underline hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
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
                        style={{ animation: "reg-spin 0.7s linear infinite" }}
                      />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send Verification OTP
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
                  Already have an account?
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
          ) : (
            <OTPVerification
              email={formData.email}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP}
              onBack={() => setStep("form")}
              loading={otpLoading}
              title="Verify Your Email"
              subtitle="We've sent a 6-digit code to"
              submitText="Verify & Create Account"
            />
          )}
        </div>
      </div>

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
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-16">
          <Logo size="large" linkTo={null} />

          <div className="max-w-md">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-pink-200">
              Member Benefits
            </p>
            <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white">
              Join a community of fashion lovers
            </h1>
            <p className="mb-10 text-base leading-relaxed text-pink-100">
              Create your account and unlock exclusive member perks and early
              access.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: "verified_user",
                  title: "Verified Account",
                  desc: "Email verification for security",
                },
                {
                  icon: "redeem",
                  title: "Rs.100 Welcome Bonus",
                  desc: "On your first order",
                },
                {
                  icon: "local_offer",
                  title: "Exclusive Deals",
                  desc: "Member-only discounts",
                },
                {
                  icon: "favorite",
                  title: "Save Favorites",
                  desc: "Build your wishlist",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))",
                    }}
                  >
                    <span style={matIcon} className="text-[22px] text-pink-100">
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="mb-0.5 text-sm font-semibold text-white">
                      {item.title}
                    </h4>
                    <p className="m-0 text-xs text-pink-200">{item.desc}</p>
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

      <style>{`
        @keyframes reg-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Register;

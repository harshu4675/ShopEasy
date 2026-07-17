import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import Logo from "../components/Logo";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Login = () => {
  const { login, getRememberedPhone } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    const fontId = "login-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const rememberedPhone = getRememberedPhone();
    if (rememberedPhone) {
      setFormData((prev) => ({ ...prev, phone: rememberedPhone }));
      setRememberMe(true);
    }
  }, [getRememberedPhone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
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
        showToast("Welcome back!", "success");
        navigate(from, { replace: true });
      }
    } catch (error) {
      const errorData = error.response?.data;
      showToast(errorData?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const isValidPhone = formData.phone.length === 10;

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

        <div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(236, 72, 153, 0.4), transparent)",
            animation: "login-blob 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(244, 114, 182, 0.4), transparent)",
            animation: "login-blob 8s ease-in-out 2s infinite",
          }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-16">
          <Logo size="large" linkTo={null} showText />

          <div className="max-w-md">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-pink-200"
              style={{ letterSpacing: "0.3em" }}
            >
              Fashion Redefined
            </p>
            <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white">
              Welcome to your style destination
            </h1>
            <p className="mb-10 text-base leading-relaxed text-pink-100">
              Discover curated collections, exclusive drops, and personalized
              recommendations. Sign in to continue your fashion journey.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: "verified",
                  title: "Authentic Products",
                  desc: "100% original from trusted brands",
                },
                {
                  icon: "local_shipping",
                  title: "Free Delivery",
                  desc: "On all orders above Rs.199",
                },
                {
                  icon: "assignment_return",
                  title: "Easy Returns",
                  desc: "7 days hassle-free returns",
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

          <div className="flex items-center gap-4 text-xs text-pink-200">
            <span
              className="font-normal"
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: 20,
                color: "#fce7f3",
              }}
            >
              Talish Clothes
            </span>
            <span className="opacity-50">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-gradient-to-br from-pink-50/40 via-white to-pink-50/40 px-6 py-10 lg:w-1/2 max-md:px-4 max-md:py-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex w-full items-center justify-center lg:hidden">
            <Logo size="large" linkTo={null} />
          </div>

          <div className="mb-8 max-md:mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink-600">
              Welcome Back
            </p>
            <h2 className="mb-2 text-3xl font-extrabold text-gray-900 max-md:text-2xl">
              Sign in to your account
            </h2>
            <p className="m-0 text-sm text-gray-500">
              Enter your credentials to continue shopping
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Phone Number
              </label>
              <div
                className={`relative flex items-center overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 ${
                  formData.phone
                    ? isValidPhone
                      ? "border-green-500 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100"
                      : "border-gray-200 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-100"
                    : "border-gray-200 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-100"
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
                {isValidPhone && (
                  <span
                    style={matIcon}
                    className="mr-4 text-[22px] text-green-500"
                  >
                    check_circle
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Password
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="flex-1 border-none bg-transparent px-4 py-3.5 text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="mr-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <span style={matIcon} className="text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 cursor-pointer rounded accent-pink-600"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-pink-600 no-underline transition-colors hover:text-pink-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !isValidPhone || !formData.password}
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
                    style={{ animation: "login-spin 0.7s linear infinite" }}
                  />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span style={matIcon} className="text-[20px]">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4 max-md:my-6">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              or
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-5 text-center max-md:p-4">
            <p className="m-0 mb-1 text-sm text-gray-600">
              New to Talish Clothes?
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-base font-bold text-pink-600 no-underline transition-all hover:gap-2 hover:text-pink-700"
            >
              Create an account
              <span style={matIcon} className="text-[18px]">
                arrow_forward
              </span>
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400 max-md:mt-6">
            By continuing, you agree to our{" "}
            <Link
              to="/terms"
              className="font-medium text-gray-600 no-underline hover:text-pink-600 hover:underline"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="font-medium text-gray-600 no-underline hover:text-pink-600 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes login-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes login-blob {
          0%, 100% { transform: scale(1) translate(0, 0); }
          33% { transform: scale(1.1) translate(20px, -20px); }
          66% { transform: scale(0.95) translate(-20px, 20px); }
        }
      `}</style>
    </div>
  );
};

export default Login;

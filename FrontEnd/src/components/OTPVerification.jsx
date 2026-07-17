import React, { useState, useEffect, useRef } from "react";
import { showToast } from "../utils/toast";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const OTPVerification = ({
  email,
  onVerify,
  onResend,
  onBack,
  loading = false,
  title = "Verify Your Email",
  subtitle = "We've sent a 6-digit code to",
  submitText = "Verify & Continue",
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      showToast("Please enter the complete 6-digit OTP", "error");
      return;
    }
    onVerify(code);
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      await onResend();
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(60);
      inputRefs.current[0]?.focus();
      showToast("New OTP sent to your email", "success");
    } catch (err) {
      showToast(err.message || "Failed to resend OTP", "error");
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(
        /(.{2})(.*)(@.*)/,
        (_, a, b, c) => a + "*".repeat(Math.min(b.length, 6)) + c,
      )
    : "";

  return (
    <div className="w-full max-w-md">
      <button
        onClick={onBack}
        type="button"
        disabled={loading}
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
          background: "linear-gradient(135deg, #831843 0%, #ec4899 100%)",
        }}
      >
        <span style={matIcon} className="text-[32px] text-white">
          mark_email_read
        </span>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-3xl font-extrabold text-gray-900 max-md:text-2xl">
          {title}
        </h2>
        <p className="m-0 text-sm text-gray-500">
          {subtitle}{" "}
          <span className="font-semibold text-gray-800">{maskedEmail}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex justify-between gap-2 max-[380px]:gap-1.5">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={loading}
              autoComplete="one-time-code"
              className={`h-14 w-full max-w-[52px] rounded-xl border-2 bg-white text-center text-2xl font-bold text-gray-900 outline-none transition-all max-[380px]:h-12 max-[380px]:text-xl ${
                digit
                  ? "border-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.1)]"
                  : "border-gray-200 focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || otp.some((d) => !d)}
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
                style={{ animation: "otp-spin 0.7s linear infinite" }}
              />
              Verifying...
            </>
          ) : (
            <>
              {submitText}
              <span style={matIcon} className="text-[20px]">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-4 text-center">
        <p className="m-0 mb-1 text-xs text-gray-600">
          Didn't receive the code?
        </p>
        {resendTimer > 0 ? (
          <p className="m-0 text-sm font-semibold text-gray-500">
            Resend in{" "}
            <span className="font-bold text-pink-600">{resendTimer}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending || loading}
            className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-sm font-bold text-pink-600 hover:text-pink-700 disabled:opacity-60"
          >
            {resending ? (
              <>
                <span
                  className="inline-block h-3 w-3 rounded-full border-2 border-pink-200 border-t-pink-500"
                  style={{ animation: "otp-spin 0.7s linear infinite" }}
                />
                Sending...
              </>
            ) : (
              <>
                <span style={matIcon} className="text-[16px]">
                  refresh
                </span>
                Resend OTP
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-6 rounded-xl bg-amber-50 p-3">
        <p className="m-0 flex items-start gap-2 text-xs text-amber-800">
          <span style={matIcon} className="text-[16px] shrink-0">
            info
          </span>
          <span>
            Check your spam folder if you don't see the email. OTP expires in 10
            minutes.
          </span>
        </p>
      </div>

      <style>{`
        @keyframes otp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default OTPVerification;

import React, { useState, useRef, useEffect } from "react";
import "../styles/OTPInput.css";

const OTPInput = ({ length = 6, onComplete, onResend, phone, loading }) => {
  // ✅ Changed email to phone
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Auto focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Handle input change
  const handleChange = (e, index) => {
    const value = e.target.value;

    if (isNaN(value)) return;

    const newOtp = [...otp];

    // Handle paste
    if (value.length > 1) {
      const pastedValue = value.slice(0, length).split("");
      for (let i = 0; i < pastedValue.length; i++) {
        if (index + i < length && !isNaN(pastedValue[i])) {
          newOtp[index + i] = pastedValue[i];
        }
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedValue.length, length - 1);
      inputRefs.current[nextIndex]?.focus();

      if (newOtp.every((digit) => digit !== "")) {
        onComplete(newOtp.join(""));
      }
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every((digit) => digit !== "")) {
      onComplete(newOtp.join(""));
    }
  };

  // Handle key down
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle resend
  const handleResend = () => {
    if (canResend && onResend) {
      onResend();
      setTimer(60);
      setCanResend(false);
      setOtp(new Array(length).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  // ✅ Format phone for display (mask middle digits)
  const formatPhone = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.length !== 10) return phoneNumber;
    return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(7)}`;
  };

  return (
    <div className="otp-container">
      <div className="otp-header">
        {/* ✅ Changed icon and text for phone */}
        <div className="otp-icon">📱</div>
        <h2>Verify Your Phone</h2>
        <p>
          We've sent a 6-digit code to <strong>+91 {formatPhone(phone)}</strong>
        </p>
      </div>

      <div className="otp-inputs">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={length}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`otp-input ${digit ? "filled" : ""}`}
            disabled={loading}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      <div className="otp-footer">
        <p>
          Didn't receive the code?{" "}
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="resend-btn"
              disabled={loading}
            >
              Resend Code
            </button>
          ) : (
            <span className="timer">Resend in {timer}s</span>
          )}
        </p>
      </div>

      {loading && (
        <div className="otp-loading">
          <div className="spinner"></div>
          <p>Verifying...</p>
        </div>
      )}
    </div>
  );
};

export default OTPInput;

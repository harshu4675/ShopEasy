import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";

const ProfileSettings = () => {
  const { user, changePassword } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fontId = "profile-settings-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (formData.newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);

    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      showToast("Password changed successfully", "success");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to change password",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mx-auto max-w-[600px] px-5 py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="flex max-w-[520px] flex-col justify-center rounded-[16px] bg-white p-[50px] shadow-[0_4px_24px_rgba(102,126,234,0.10)] max-[600px]:p-8 max-[400px]:p-5">
        <div className="mb-9 text-center">
          <h1 className="mb-2 mt-5 text-[28px] font-bold text-[#1a1a2e] max-[600px]:text-[24px]">
            Profile Settings
          </h1>
          <p className="m-0 text-[15px] text-[#6b7280]">
            Manage your account settings
          </p>
        </div>

        <div className="mb-[30px]">
          <h3 className="mb-3 text-[17px] font-semibold text-[#1a1a2e]">
            Account Information
          </h3>
          <p className="mb-2 text-[15px] text-[#4b5563]">
            <strong className="font-semibold text-[#374151]">Name:</strong>{" "}
            {user?.name}
          </p>
          <p className="mb-2 text-[15px] text-[#4b5563]">
            <strong className="font-semibold text-[#374151]">Phone:</strong>{" "}
            {user?.phone}
          </p>
          <p className="mb-2 text-[15px] text-[#4b5563]">
            <strong className="font-semibold text-[#374151]">Email:</strong>{" "}
            {user?.email || "Not provided"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <h3 className="mb-5 text-[17px] font-semibold text-[#1a1a2e]">
            Change Password
          </h3>

          <div className="mb-5">
            <label className="mb-2 block text-[14px] font-semibold text-[#374151]">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Enter current password"
              required
              disabled={loading}
              className="h-12 w-full rounded-[8px] border border-[#ccc] px-4 text-[16px] text-[#1a1a2e] placeholder-[#9ca3af] outline-none transition-all duration-300 focus:border-[#667eea] focus:shadow-[0_0_0_4px_rgba(102,126,234,0.1)] disabled:cursor-not-allowed disabled:opacity-70 max-[400px]:text-[14px]"
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-[14px] font-semibold text-[#374151]">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              required
              minLength="6"
              disabled={loading}
              className="h-12 w-full rounded-[8px] border border-[#ccc] px-4 text-[16px] text-[#1a1a2e] placeholder-[#9ca3af] outline-none transition-all duration-300 focus:border-[#667eea] focus:shadow-[0_0_0_4px_rgba(102,126,234,0.1)] disabled:cursor-not-allowed disabled:opacity-70 max-[400px]:text-[14px]"
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-[14px] font-semibold text-[#374151]">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              required
              disabled={loading}
              className="h-12 w-full rounded-[8px] border border-[#ccc] px-4 text-[16px] text-[#1a1a2e] placeholder-[#9ca3af] outline-none transition-all duration-300 focus:border-[#667eea] focus:shadow-[0_0_0_4px_rgba(102,126,234,0.1)] disabled:cursor-not-allowed disabled:opacity-70 max-[400px]:text-[14px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full cursor-pointer items-center justify-center gap-[10px] rounded-[12px] border-none px-6 py-4 text-[16px] font-semibold text-white shadow-[0_4px_15px_rgba(102,126,234,0.4)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(102,126,234,0.5)] disabled:cursor-not-allowed disabled:opacity-70 disabled:translate-y-0 disabled:shadow-none max-[400px]:py-[14px] max-[400px]:text-[15px]"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {loading && (
              <span
                className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                style={{ animation: "spin-btn 0.8s linear infinite" }}
              />
            )}
            {loading ? "Changing Password..." : "Change Password"}
          </button>

          <style>{`
            @keyframes spin-btn {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;

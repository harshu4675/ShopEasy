import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const AdminBroadcast = () => {
  const [form, setForm] = useState({ title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fontId = "admin-broadcast-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showToast("Title and message required", "error");
      return;
    }
    if (
      !window.confirm(
        `Send push notification to ALL subscribed users?\n\nTitle: ${form.title}\nMessage: ${form.message}`,
      )
    )
      return;

    setSending(true);
    try {
      await api.post("/push/broadcast", form);
      showToast("Broadcast sent to all users", "success");
      setForm({ title: "", message: "", link: "" });
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 p-6 max-md:p-4"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="m-0 mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <span style={matIcon} className="text-[28px] text-pink-600">
            campaign
          </span>
          Broadcast Notification
        </h1>

        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
            <span style={matIcon} className="mt-0.5 text-[18px] text-amber-600">
              warning
            </span>
            <p className="m-0 text-xs text-amber-900">
              This will send a push notification to{" "}
              <strong>all subscribed users</strong>. Use responsibly.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Flash Sale - 50% Off!"
                maxLength={60}
                required
                className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-500"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                {form.title.length}/60 characters
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="e.g., Shop now and get 50% off on all fashion items. Limited time offer!"
                rows={4}
                maxLength={150}
                required
                className="w-full resize-none rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-500"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                {form.message.length}/150 characters
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Link (optional)
              </label>
              <input
                type="text"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="e.g., /coupons or /products?category=..."
                className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-500"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Where users go when they click the notification
              </p>
            </div>

            {(form.title || form.message) && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Preview
                </p>
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{
                      background: "linear-gradient(135deg, #831843, #ec4899)",
                    }}
                  >
                    <span style={matIcon} className="text-[20px]">
                      shopping_bag
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-bold text-gray-900">
                      {form.title || "Notification title"}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-gray-600">
                      {form.message || "Notification message"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-none py-3 text-sm font-bold text-white shadow-md disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
              }}
            >
              {sending ? (
                <>
                  <span
                    className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    style={{ animation: "ab-spin 0.7s linear infinite" }}
                  />
                  Sending...
                </>
              ) : (
                <>
                  <span style={matIcon} className="text-[20px]">
                    send
                  </span>
                  Send to All Users
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes ab-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminBroadcast;

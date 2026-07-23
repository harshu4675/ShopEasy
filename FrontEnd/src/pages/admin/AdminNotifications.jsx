import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAdminNotifications } from "../../context/AdminNotificationContext";
import Loader from "../../components/Loader";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const typeConfig = {
  order: { icon: "shopping_bag", color: "#3b82f6", bg: "#dbeafe" },
  refund: { icon: "payments", color: "#f59e0b", bg: "#fef3c7" },
  return: { icon: "assignment_return", color: "#8b5cf6", bg: "#ede9fe" },
  delivery: { icon: "local_shipping", color: "#10b981", bg: "#d1fae5" },
  system: { icon: "notifications", color: "#831843", bg: "#fce7f3" },
};

const AdminNotifications = () => {
  const {
    adminNotifications,
    fetchAdminNotifications,
    markAdminAsRead,
    markAllAdminAsRead,
    adminUnreadCount,
  } = useAdminNotifications();

  useEffect(() => {
    const fontId = "admin-notif-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
    fetchAdminNotifications();
  }, [fetchAdminNotifications]);

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString("en-IN");
  };

  if (!adminNotifications) return <Loader />;

  return (
    <div
      className="min-h-screen bg-gray-50 p-6 max-md:p-4"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <span style={matIcon} className="text-[28px] text-pink-600">
                notifications_active
              </span>
              Admin Notifications
            </h1>
            {adminUnreadCount > 0 && (
              <p className="m-0 mt-1 text-sm text-gray-500">
                {adminUnreadCount} unread{" "}
                {adminUnreadCount === 1 ? "notification" : "notifications"}
              </p>
            )}
          </div>
          {adminUnreadCount > 0 && (
            <button
              onClick={markAllAdminAsRead}
              className="cursor-pointer rounded-lg border-none bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
            >
              Mark all as read
            </button>
          )}
        </div>

        {adminNotifications.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <span
              style={matIcon}
              className="mb-4 block text-[64px] text-gray-300"
            >
              notifications_off
            </span>
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              No notifications yet
            </h3>
            <p className="text-sm text-gray-500">
              You will be notified about new orders, returns, and refund
              requests here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {adminNotifications.map((n) => {
              const cfg = typeConfig[n.type] || typeConfig.system;
              return (
                <div
                  key={n._id}
                  className={`flex items-start gap-4 rounded-xl border-2 p-4 shadow-sm transition-all ${
                    n.isRead
                      ? "border-transparent bg-white"
                      : "border-pink-200 bg-pink-50"
                  }`}
                  onClick={() => !n.isRead && markAdminAsRead(n._id)}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    style={{ background: cfg.bg }}
                  >
                    <span
                      style={{ ...matIcon, color: cfg.color }}
                      className="text-[24px]"
                    >
                      {cfg.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="m-0 text-base font-bold text-gray-900">
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-pink-600" />
                      )}
                    </div>
                    <p className="m-0 mb-2 text-sm text-gray-700">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">
                        {formatTime(n.createdAt)}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-white no-underline"
                          style={{
                            background:
                              "linear-gradient(135deg, #831843, #ec4899)",
                          }}
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;

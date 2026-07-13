import React from "react";
import { Link } from "react-router-dom";
import { Package, Truck, Tag, Ticket, Megaphone, Bell } from "lucide-react";

const NotificationItem = ({ notification, onMarkRead }) => {
  const getIcon = (type) => {
    const icons = {
      order: <Package size={22} style={{ color: "#667eea" }} />,
      delivery: <Truck size={22} style={{ color: "#10b981" }} />,
      offer: <Tag size={22} style={{ color: "#f59e0b" }} />,
      coupon: <Ticket size={22} style={{ color: "#e91e63" }} />,
      system: <Megaphone size={22} style={{ color: "#9c27b0" }} />,
    };
    return icons[type] || <Bell size={22} style={{ color: "#667eea" }} />;
  };

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

  return (
    <div
      className="rounded-xl p-5 flex items-start gap-4 cursor-pointer relative border-2 transition-all duration-300"
      style={{
        background: notification.isRead
          ? "white"
          : "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)",
        borderColor: notification.isRead ? "transparent" : "#f8bbd9",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      }}
      onClick={() => !notification.isRead && onMarkRead(notification._id)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#f8bbd9";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = notification.isRead
          ? "transparent"
          : "#f8bbd9";
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
      >
        {getIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className="text-base font-semibold mb-1.5"
          style={{ color: "#343a40" }}
        >
          {notification.title}
        </h4>
        <p
          className="text-sm leading-relaxed mb-2"
          style={{ color: "#6c757d" }}
        >
          {notification.message}
        </p>
        <span className="text-xs" style={{ color: "#adb5bd" }}>
          {formatTime(notification.createdAt)}
        </span>
      </div>
      {notification.orderId && (
        <Link
          to="/my-orders"
          className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-white no-underline transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #e91e63, #9c27b0)" }}
          onClick={(e) => e.stopPropagation()}
        >
          View Order
        </Link>
      )}
      {!notification.isRead && (
        <div
          className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full"
          style={{ background: "#e91e63", animation: "pulse 2s infinite" }}
        />
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default NotificationItem;

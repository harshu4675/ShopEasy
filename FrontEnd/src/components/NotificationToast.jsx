import { useEffect } from "react";
import { toast } from "react-toastify";
import { useNotifications } from "../context/NotificationContext";

const getTypeColor = (type) => {
  const colors = {
    order: "#667eea",
    delivery: "#10b981",
    offer: "#f59e0b",
    coupon: "#e91e63",
    system: "#9c27b0",
  };
  return colors[type] || "#667eea";
};

const NotificationToastContent = ({ title, message, type }) => {
  const color = getTypeColor(type);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: "700",
          color: color,
          marginBottom: "2px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#4b5563",
          lineHeight: "1.4",
          maxWidth: "280px",
          wordBreak: "break-word",
        }}
      >
        {message}
      </div>
    </div>
  );
};

const NotificationToast = () => {
  const { toasts, dismissToast } = useNotifications();

  useEffect(() => {
    if (toasts.length === 0) return;

    const latest = toasts[0];

    toast(
      <NotificationToastContent
        title={latest.title}
        message={latest.message}
        type={latest.type}
      />,
      {
        toastId: latest._id,
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        onClose: () => dismissToast(latest._id),
        style: {
          borderLeft: `4px solid ${getTypeColor(latest.type)}`,
          borderRadius: "12px",
          padding: "12px 16px",
        },
      },
    );
  }, [toasts, dismissToast]);

  return null;
};

export default NotificationToast;

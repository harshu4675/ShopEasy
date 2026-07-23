import { useEffect } from "react";
import { toast } from "react-toastify";
import { useAdminNotifications } from "../context/AdminNotificationContext";

const typeColors = {
  order: "#3b82f6",
  refund: "#f59e0b",
  return: "#8b5cf6",
  delivery: "#10b981",
  system: "#831843",
};

const AdminToastContent = ({ title, message, type }) => {
  const color = typeColors[type] || "#831843";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: "700",
          color,
          marginBottom: "2px",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.4" }}>
        {message}
      </div>
    </div>
  );
};

const AdminNotificationToast = () => {
  const { adminToasts, dismissAdminToast } = useAdminNotifications();

  useEffect(() => {
    if (adminToasts.length === 0) return;
    const latest = adminToasts[0];

    toast(
      <AdminToastContent
        title={latest.title}
        message={latest.message}
        type={latest.type}
      />,
      {
        toastId: `admin-${latest._id}`,
        position: "top-right",
        autoClose: 6000,
        onClose: () => dismissAdminToast(latest._id),
        style: {
          borderLeft: `4px solid ${typeColors[latest.type] || "#831843"}`,
          borderRadius: "12px",
        },
      },
    );
  }, [adminToasts, dismissAdminToast]);

  return null;
};

export default AdminNotificationToast;

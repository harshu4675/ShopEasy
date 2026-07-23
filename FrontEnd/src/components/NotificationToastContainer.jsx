import React from "react";
import { useNotificationToasts } from "../context/NotificationContext";
import NotificationToast from "./NotificationToast";

const NotificationToastContainer = () => {
  const { toasts, dismissToast } = useNotificationToasts();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed z-[9999] flex flex-col gap-3"
      style={{
        top: "16px",
        right: "16px",
        maxHeight: "calc(100vh - 32px)",
        overflow: "hidden",
      }}
    >
      {toasts.slice(0, 3).map((toast) => (
        <NotificationToast
          key={toast._id}
          notification={toast}
          onClose={dismissToast}
        />
      ))}
    </div>
  );
};

export default NotificationToastContainer;

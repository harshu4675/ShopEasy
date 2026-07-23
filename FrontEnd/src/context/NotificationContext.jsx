import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { api } from "../utils/api";
import { useAuth } from "./AuthContext";

export const NotificationContext = createContext(null);

const showBrowserNotification = (title, message) => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body: message,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "talish-notification",
      silent: false,
    });

    setTimeout(() => notification.close(), 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {}
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const lastSeenIdRef = useRef(null);
  const initialLoadDoneRef = useRef(false);
  const shownToastIdsRef = useRef(new Set());

  const requestBrowserPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showToast = useCallback((notification) => {
    if (shownToastIdsRef.current.has(notification._id)) return;
    shownToastIdsRef.current.add(notification._id);
    setToasts((prev) => [notification, ...prev].slice(0, 5));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t._id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const response = await api.get("/notifications");
      const newNotifs = response.data || [];

      if (initialLoadDoneRef.current && newNotifs.length > 0) {
        for (const notif of newNotifs) {
          if (notif._id === lastSeenIdRef.current) break;
          if (!notif.isRead) {
            showToast(notif);
            showBrowserNotification(notif.title, notif.message);
          }
        }
      }

      setNotifications(newNotifs);
      setUnreadCount(newNotifs.filter((n) => !n.isRead).length);

      if (newNotifs.length > 0) {
        lastSeenIdRef.current = newNotifs[0]._id;
      }
      initialLoadDoneRef.current = true;
    } catch {
      setNotifications([]);
    }
  }, [user, showToast]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await api.get("/notifications/unread-count");
      setUnreadCount(response.data.count);
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      initialLoadDoneRef.current = false;
      lastSeenIdRef.current = null;
      shownToastIdsRef.current = new Set();
      fetchNotifications();

      const notifInterval = setInterval(fetchNotifications, 20000);

      return () => {
        clearInterval(notifInterval);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setToasts([]);
      initialLoadDoneRef.current = false;
      shownToastIdsRef.current = new Set();
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (user) {
      const promptTimer = setTimeout(() => {
        requestBrowserPermission();
      }, 5000);
      return () => clearTimeout(promptTimer);
    }
  }, [user, requestBrowserPermission]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        dismissToast,
        requestBrowserPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  return context;
};

export const useNotificationToasts = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return { toasts: [], dismissToast: () => {} };
  }
  return {
    toasts: context.toasts,
    dismissToast: context.dismissToast,
  };
};

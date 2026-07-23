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

const defaultValue = {
  adminNotifications: [],
  adminUnreadCount: 0,
  adminToasts: [],
  fetchAdminNotifications: () => {},
  markAdminAsRead: () => {},
  markAllAdminAsRead: () => {},
  dismissAdminToast: () => {},
};

export const AdminNotificationContext = createContext(defaultValue);

export const AdminNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [adminToasts, setAdminToasts] = useState([]);
  const lastSeenIdRef = useRef(null);
  const initialLoadDoneRef = useRef(false);
  const shownToastIdsRef = useRef(new Set());

  const isAdmin = user?.role === "admin";

  const showAdminToast = useCallback((notification) => {
    if (shownToastIdsRef.current.has(notification._id)) return;
    shownToastIdsRef.current.add(notification._id);
    setAdminToasts((prev) => [notification, ...prev].slice(0, 5));
  }, []);

  const dismissAdminToast = useCallback((id) => {
    setAdminToasts((prev) => prev.filter((t) => t._id !== id));
  }, []);

  const fetchAdminNotifications = useCallback(async () => {
    if (!isAdmin) {
      setAdminNotifications([]);
      setAdminUnreadCount(0);
      return;
    }
    try {
      const response = await api.get("/notifications/admin");
      const newNotifs = response.data || [];

      if (initialLoadDoneRef.current && newNotifs.length > 0) {
        for (const notif of newNotifs) {
          if (notif._id === lastSeenIdRef.current) break;
          if (!notif.isRead) {
            showAdminToast(notif);
          }
        }
      }

      setAdminNotifications(newNotifs);
      setAdminUnreadCount(newNotifs.filter((n) => !n.isRead).length);

      if (newNotifs.length > 0) {
        lastSeenIdRef.current = newNotifs[0]._id;
      }
      initialLoadDoneRef.current = true;
    } catch {
      setAdminNotifications([]);
    }
  }, [isAdmin, showAdminToast]);

  useEffect(() => {
    if (isAdmin) {
      initialLoadDoneRef.current = false;
      lastSeenIdRef.current = null;
      shownToastIdsRef.current = new Set();
      fetchAdminNotifications();
      const interval = setInterval(fetchAdminNotifications, 15000);
      return () => clearInterval(interval);
    } else {
      setAdminNotifications([]);
      setAdminUnreadCount(0);
      setAdminToasts([]);
    }
  }, [isAdmin, fetchAdminNotifications]);

  const markAdminAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setAdminNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setAdminUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAdminAsRead = async () => {
    try {
      await api.put("/notifications/admin/read-all");
      setAdminNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true })),
      );
      setAdminUnreadCount(0);
    } catch {}
  };

  return (
    <AdminNotificationContext.Provider
      value={{
        adminNotifications,
        adminUnreadCount,
        adminToasts,
        fetchAdminNotifications,
        markAdminAsRead,
        markAllAdminAsRead,
        dismissAdminToast,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
};

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationContext);
  return context || defaultValue;
};

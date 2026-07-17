import React, { useContext, useEffect, useCallback } from "react";
import { NotificationContext } from "../context/NotificationContext";
import NotificationItem from "../components/Notification";
import Loader from "../components/Loader";

const Notifications = () => {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } =
    useContext(NotificationContext);

  const loadNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications
    ? notifications.filter((n) => !n.isRead).length
    : 0;

  if (!notifications) return <Loader fullScreen />;

  return (
    <div className="py-10 min-h-[calc(100vh-200px)]">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-gray-800">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-[14px] text-gray-500 mt-1">
                {unreadCount} unread notifications
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-transparent border-none text-[#6366f1] font-semibold cursor-pointer text-[14px] transition-all duration-200 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-[80px] px-[20px]">
            <span className="block text-[80px] mb-5 opacity-50 leading-none">
              <span
                style={{
                  fontFamily: '"Material Symbols Outlined"',
                  fontWeight: "normal",
                  fontStyle: "normal",
                  fontSize: "80px",
                  lineHeight: 1,
                  display: "inline-block",
                }}
              >
                notifications
              </span>
            </span>
            <h3 className="text-[22px] text-gray-700 mb-[10px] font-semibold">
              No notifications yet
            </h3>
            <p className="text-gray-500 text-[15px]">
              We'll notify you when something important happens
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

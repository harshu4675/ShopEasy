const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendPushToAllAdmins } = require("./pushService");

const notifyAllAdmins = async ({ type, title, message, orderId, link }) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    if (!admins.length) return;

    const notifications = admins.map((admin) => ({
      user: admin._id,
      type: type || "system",
      title,
      message,
      orderId: orderId || undefined,
      link: link || "",
      forAdmin: true,
    }));

    await Notification.insertMany(notifications);

    sendPushToAllAdmins({
      title,
      body: message,
      icon: "/logo192.png",
      badge: "/logo192.png",
      url: link || "/admin/notifications",
      tag: `admin-${type}-${Date.now()}`,
    }).catch((err) => console.error("Admin push error:", err.message));
  } catch (err) {
    console.error("Admin notification error:", err.message);
  }
};

module.exports = { notifyAllAdmins };

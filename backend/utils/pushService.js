const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@talish.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log("Web Push service ready");
} else {
  console.warn("VAPID keys not set - push notifications disabled");
}

const sendPushToSubscription = async (subscription, payload) => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
    );
    return { success: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
    }
    return { success: false, error: err.message };
  }
};

const sendPushToUser = async (userId, payload) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const subs = await PushSubscription.find({ user: userId });
    await Promise.all(subs.map((s) => sendPushToSubscription(s, payload)));
  } catch (err) {
    console.error("Push to user error:", err.message);
  }
};

const sendPushToAllAdmins = async (payload) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    const adminIds = admins.map((a) => a._id);
    const subs = await PushSubscription.find({ user: { $in: adminIds } });
    await Promise.all(subs.map((s) => sendPushToSubscription(s, payload)));
  } catch (err) {
    console.error("Push to admins error:", err.message);
  }
};

const sendPushToAllUsers = async (payload) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const subs = await PushSubscription.find({});
    await Promise.all(subs.map((s) => sendPushToSubscription(s, payload)));
  } catch (err) {
    console.error("Push broadcast error:", err.message);
  }
};

module.exports = {
  sendPushToUser,
  sendPushToAllAdmins,
  sendPushToAllUsers,
};

import { api } from "./api";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = () => {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

export const getPushPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

export const requestPushPermission = async () => {
  if (!isPushSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
};

const getVapidPublicKey = async () => {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;
  try {
    const res = await api.get("/push/vapid-public-key");
    return res.data.publicKey;
  } catch {
    return null;
  }
};

export const subscribeToPush = async () => {
  if (!isPushSupported()) return { success: false, error: "Not supported" };

  try {
    const permission = await requestPushPermission();
    if (permission !== "granted") {
      return { success: false, error: "Permission denied" };
    }

    const registration = await navigator.serviceWorker.ready;
    const publicKey = await getVapidPublicKey();

    if (!publicKey) {
      return { success: false, error: "VAPID key not available" };
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await api.post("/push/subscribe", {
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    });

    return { success: true };
  } catch (err) {
    console.error("Push subscribe error:", err);
    return { success: false, error: err.message };
  }
};

export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return { success: false };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await api.post("/push/unsubscribe", { endpoint });
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

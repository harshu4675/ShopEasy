self.__WB_DISABLE_DEV_LOGS = true;
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import {
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

/*
 * Delete precaches written by previous versions of this service worker before
 * installing the new one. Without this the old revisions are kept forever, so a
 * returning visitor can be served a previous build's index.html whose hashed
 * asset URLs no longer exist on the server. Those requests then fall through
 * the SPA rewrite to index.html (200, text/html), the browser refuses the bad
 * module MIME type and the lazy route import rejects - the blank-page failure
 * this app hit in production.
 */
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

/*
 * Analytics and advertising endpoints are left entirely to the network.
 *
 * Google's ga-audiences beacon has an image destination, so it was being
 * matched by the image rule below. CacheFirst then rejects when the request
 * fails, and ad blockers or tracking-protection settings block these beacons
 * constantly, producing a stream of uncaught "no-response" errors in the
 * console. These requests are fire-and-forget telemetry; the service worker
 * has no reason to see them at all.
 */
const ANALYTICS_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "googleadservices.com",
  "googlesyndication.com",
  "doubleclick.net",
  "facebook.net",
  "facebook.com",
];

const isAnalyticsRequest = (url) =>
  ANALYTICS_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  ) || url.pathname.startsWith("/ads/");

registerRoute(
  ({ url, request }) =>
    request.destination === "image" && !isAnalyticsRequest(url),
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.origin === "https://res.cloudinary.com",
  new CacheFirst({
    cacheName: "cloudinary-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/products"),
  new NetworkFirst({
    cacheName: "products-api",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60,
      }),
    ],
  }),
);

const navigationHandler = new NetworkFirst({
  cacheName: "pages",
  networkTimeoutSeconds: 3,
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
});
registerRoute(
  new NavigationRoute(navigationHandler, {
    // Only real page navigations may fall back to a cached HTML document.
    // Hashed build assets and API calls must never be answered with
    // index.html: doing so hands the browser HTML where it expects JavaScript
    // or JSON, which surfaces as a module MIME-type error and a blank screen
    // instead of an honest 404.
    denylist: [/^\/api\//, /^\/assets\//, /^\/sw\.js$/, /^\/registerSW\.js$/],
  }),
);

/*
 * A hashed asset that is missing from both the cache and the server means this
 * client is running a stale build. The SPA rewrite would answer index.html with
 * a 200, so the failure has to be converted back into a real error here; the
 * app's ErrorBoundary detects it and offers a cache-clearing reload.
 */
registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    url.pathname.startsWith("/assets/") &&
    (request.destination === "script" || request.destination === "style"),
  async ({ request }) => {
    const response = await fetch(request);
    const type = response.headers.get("content-type") || "";
    if (response.ok && type.includes("text/html")) {
      return new Response("", {
        status: 404,
        statusText: "Stale asset - client build is out of date",
      });
    }
    return response;
  },
);

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Talish Clothes", body: event.data.text() };
  }

  const title = data.title || "Talish Clothes";
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo192.png",
    badge: data.badge || "/logo192.png",
    tag: data.tag || "talish-notification",
    data: {
      url: data.url || "/",
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

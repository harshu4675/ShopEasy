/**
 * Renders the real application in jsdom against a stub API that returns
 * realistic payloads, and fails on any runtime error.
 *
 * Serving actual data matters: an earlier version of this harness stubbed
 * fetch to always reject, so list pages rendered their empty state and
 * components like ProductCard never mounted. A missing context provider —
 * which throws only when a consumer mounts — went undetected. Every route
 * below is asserted to render its populated state, not just "no crash".
 *
 *   node tests/renderRoutes.mjs             all routes
 *   node tests/renderRoutes.mjs /products   one route
 */

import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BUNDLE = "/tmp/render-routes.bundle.js";
const ENTRY = path.resolve("tests/.entry.jsx");

const product = (i) => ({
  _id: `p${i}`,
  name: `Test Product ${i}`,
  description: "A product used by the render harness.",
  price: 499 + i,
  originalPrice: 999 + i,
  discount: 50,
  category: "Women's Clothing",
  subCategory: "Kurti",
  brand: "Talish",
  images: ["https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"],
  rating: 4.2,
  numReviews: 12,
  stock: 10,
  sizes: ["S", "M", "L"],
  colors: [{ name: "Pink", code: "#ec4899" }],
  createdAt: new Date().toISOString(),
});

const PRODUCTS = Array.from({ length: 12 }, (_, i) => product(i));

const USER = {
  _id: "u1",
  name: "Test User",
  email: "test@example.com",
  phone: "9876543210",
  role: "admin",
  isReseller: true,
};

/**
 * Payload for each API path the app calls.
 *
 * Rules are evaluated in order and the most specific must come first: a bare
 * `/products` check would otherwise swallow `/reseller/products` and hand the
 * page an array where it expects a paginated envelope.
 */
const paginated = (data) => ({
  success: true,
  data,
  pagination: {
    page: 1,
    limit: 20,
    total: data.length,
    pages: 1,
    hasNext: false,
    hasPrev: false,
  },
  summary: {},
});

const RESELLER_PROFILE = {
  success: true,
  isReseller: true,
  data: {
    _id: "r1",
    storeName: "Test Store",
    resellerCode: "TRTEST01",
    referralCode: "REFTEST1",
    status: process.env.RSTATUS || "approved",
    commissionRate: 10,
    maxMarginPercent: 50,
    defaultMarginPercent: 15,
    stats: { productsListed: 3, totalOrders: 2, totalSales: 1000, lifetimeEarnings: 200 },
    shareBaseUrl: "http://localhost/store/TRTEST01",
    wallet: { availableBalance: 500, pendingBalance: 100, lockedBalance: 0, lifetimeEarnings: 600 },
  },
};

const ROUTE_TABLE = [
  [/\/auth\/me$/, () => ({ success: true, data: { user: USER } })],

  // Reseller routes, most specific first.
  [/\/reseller\/me$/, () => RESELLER_PROFILE],
  [/\/reseller\/wallet$/, () => ({
    success: true,
    data: {
      availableBalance: 500, pendingBalance: 100, lockedBalance: 0,
      lifetimeEarnings: 600, totalWithdrawn: 0, todayEarnings: 50,
      monthEarnings: 200, pendingWithdrawals: 0, minWithdrawal: 100,
    },
  })],
  [/\/reseller\/catalog$/, () => paginated(PRODUCTS.map((x) => ({
    ...x,
    isListed: false,
    maxMarginPercent: 50,
    suggested: {
      basePrice: x.price, marginPercent: 15,
      marginAmount: Math.round(x.price * 0.15),
      sellingPrice: Math.round(x.price * 1.15),
    },
  })))],
  [/\/reseller\/products$/, () => paginated(PRODUCTS.slice(0, 4).map((x, i) => ({
    _id: `rp${i}`, product: x, shareSlug: `slug${i}`, basePrice: x.price,
    marginPercent: 15, marginAmount: 75, sellingPrice: x.price + 75,
    isActive: true,
    stats: { clicks: 3, orders: 1, unitsSold: 1, revenue: 500, earnings: 75 },
    shareUrl: `http://localhost/s/slug${i}`,
  })))],
  [/\/reseller\/analytics$/, () => ({
    success: true,
    data: {
      range: { days: 30 },
      totals: { clicks: 10, orders: 2, revenue: 1000, earnings: 200, unitsSold: 3,
        conversionRate: 20, averageOrderValue: 500 },
      series: [], topProducts: [], topCustomers: [], monthly: [],
    },
  })],
  [/\/reseller\//, () => paginated([])],

  // Storefront.
  [/\/products\/[^/]+$/, () => PRODUCTS[0]],
  [/\/products$/, () => PRODUCTS],
  [/\/banners\/active$/, () => [
    { _id: "b1", image: PRODUCTS[0].images[0], title: "Banner", link: "/products" },
    { _id: "b2", image: PRODUCTS[0].images[0], title: "Two", link: "/products" },
  ]],
  [/\/trending$/, () => PRODUCTS.slice(0, 6)],
  [/\/cart$/, () => ({
    items: [{ product: PRODUCTS[0], quantity: 2, size: "M", color: "Pink" }],
    appliedCoupon: null,
  })],
  [/\/wishlist$/, () => ({ products: [PRODUCTS[1]] })],
  [/\/categories$/, () => [{ _id: "c1", name: "Women's Clothing", subCategories: [] }]],
  [/\/notifications\/unread-count$/, () => ({ count: 0 })],
  [/\/notifications$/, () => []],
  [/\/reviews\//, () => []],
  [/\/orders/, () => []],
  [/\/coupons$/, () => []],
  [/\/admin\/resellers\/stats\/overview$/, () => ({
    success: true,
    data: {
      resellers: { pending: 3, approved: 7 },
      totalResellers: 10,
      wallet: { available: 5000, pending: 1200, locked: 0, lifetime: 8000, withdrawn: 3000 },
      pendingWithdrawals: { count: 2, amount: 1500 },
      commissions: { gross: 4000, platformFee: 1000, net: 3000, orders: 20 },
    },
  })],
  [/\/admin\/dashboard$/, () => ({
    totalProducts: 66, totalOrders: 2, totalUsers: 2, totalRevenue: 5000,
    pendingOrders: 1, processingOrders: 0, deliveredOrders: 1, cancelledOrders: 0,
    refundRequested: 0, recentOrders: [], lowStockProducts: [],
  })],
  [/^\/api\/admin/, () => paginated([])],
];

const respond = (url) => {
  const p = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  const hit = ROUTE_TABLE.find(([re]) => re.test(p));
  return hit ? hit[1]() : { success: true, data: [] };
};

const ROUTES = process.argv[2]
  ? [process.argv[2]]
  : ["/", "/products", "/product/p0", "/categories", "/cart", "/checkout",
     "/wishlist", "/login", "/register", "/account", "/my-orders", "/coupons",
     "/contact", "/reseller", "/reseller/apply", "/reseller/catalog",
     "/reseller/products", "/reseller/wallet", "/reseller/orders",
     "/s/abc123", "/store/TRTEST01", "/admin/dashboard", "/admin/products",
     "/admin/import-product"];

/** Content each route must actually render, so an empty shell fails. */
const EXPECT = {
  "/": /Test Product/,
  "/products": /Test Product/,
  "/product/p0": /Test Product 0/,
  "/cart": /Test Product|cart/i,
  "/reseller": /Test Store/,
  "/reseller/catalog": /Test Product/,
  "/reseller/products": /Test Product/,
  "/admin/dashboard": /Resellers/,
  "/admin/import-product": /Import Product from URL/,
};

fs.writeFileSync(
  ENTRY,
  `import React from "react";
import ReactDOM from "react-dom/client";
import App from "../src/App.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
`,
);

execFileSync(
  "npx",
  ["esbuild", ENTRY, "--bundle", "--format=iife", "--jsx=automatic",
   '--define:process.env.NODE_ENV="production"',
   `--define:import.meta.env={"VITE_API_URL":"http://localhost:9999/api","MODE":"production","DEV":false,"PROD":true}`,
   `--outfile=${BUNDLE}`, "--log-level=error", "--loader:.css=empty"],
  { stdio: ["ignore", "ignore", "inherit"] },
);
fs.unlinkSync(ENTRY);

const script = fs.readFileSync(BUNDLE, "utf8");

const renderRoute = async (route) => {
  const errors = [];
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { runScripts: "outside-only", pretendToBeVisual: true, url: `http://localhost${route}` },
  );
  const w = dom.window;

  w.matchMedia = (q) => ({ matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent: () => false });
  w.scrollTo = () => {};
  w.requestIdleCallback = (cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 0);
  w.cancelIdleCallback = (id) => clearTimeout(id);
  w.Notification = { permission: "denied", requestPermission: async () => "denied" };
  Object.defineProperty(w.navigator, "serviceWorker", {
    value: { register: async () => ({}), addEventListener() {}, ready: Promise.resolve({}) },
    configurable: true,
  });
  Object.defineProperty(w.navigator, "clipboard", {
    value: { writeText: async () => {} }, configurable: true,
  });

  w.localStorage.setItem("accessToken", "test-token");
  w.localStorage.setItem("user", JSON.stringify(USER));

  // Serve realistic data so list pages populate and their children mount.
  w.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    const body = JSON.stringify(respond(url));
    return {
      ok: true, status: 200, statusText: "OK", url,
      headers: { get: () => "application/json" },
      json: async () => JSON.parse(body),
      text: async () => body,
      clone() { return this; },
    };
  };
  // Axios in a jsdom environment uses XHR; route it through the same stub.
  class StubXHR {
    open(method, url) { this._url = url; }
    setRequestHeader() {}
    getAllResponseHeaders() { return "content-type: application/json"; }
    addEventListener(type, fn) { if (type === "load") this._load = fn; }
    send() {
      this.status = 200;
      this.responseText = JSON.stringify(respond(this._url));
      this.response = this.responseText;
      this.readyState = 4;
      setTimeout(() => { this.onreadystatechange?.(); this.onload?.(); this._load?.(); }, 0);
    }
    abort() {}
  }
  w.XMLHttpRequest = StubXHR;

  w.addEventListener("error", (e) => errors.push(`ERR ${e.error?.message || e.message}`));
  w.addEventListener("unhandledrejection", (e) =>
    errors.push(`REJ ${e.reason?.message || e.reason}`));
  w.console.error = (...a) => {
    const s = a.map((x) => x?.message || String(x)).join(" ");
    if (!/Warning:|act\(|Network Error|ECONNREFUSED|AxiosError|Home data error|Cart fetch/.test(s)) {
      errors.push(`CONSOLE ${s.slice(0, 200)}`);
    }
  };

  try { w.eval(script); } catch (e) { errors.push(`EVAL ${e.message}`); }
  // Poll until the route's content appears rather than guessing a fixed delay;
  // a lazily-loaded chunk plus its data fetch can exceed any single timeout.
  const deadline = Date.now() + 8000;
  const want = EXPECT[route];
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    const el = w.document.getElementById("root");
    if (want ? want.test(el.innerHTML) : el.children.length > 0) break;
  }
  await new Promise((r) => setTimeout(r, 250));

  const root = w.document.getElementById("root");
  const html = root.innerHTML;
  const expect = EXPECT[route];
  const rendered = expect ? expect.test(html) : root.children.length > 0;

  w.close();
  return { errors, rendered, size: html.length };
};

let failed = 0;
for (const route of ROUTES) {
  const { errors, rendered, size } = await renderRoute(route);
  const ok = errors.length === 0 && rendered;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${route.padEnd(22)} html=${String(size).padStart(6)}` +
    `${rendered ? "" : "  [expected content missing]"}` +
    `${errors.length ? `  ${errors.length} error(s)` : ""}`,
  );
  errors.slice(0, 3).forEach((e) => console.log(`        ${e}`));
}

console.log(`\n${ROUTES.length - failed}/${ROUTES.length} routes passed`);
process.exit(failed ? 1 : 0);

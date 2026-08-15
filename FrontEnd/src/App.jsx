import React, { lazy, Suspense, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CatalogStateProvider } from "./context/CatalogStateContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import MobileTopBar from "./components/MobileTopBar";
import MobileBottomNav from "./components/MobileBottomNav";
import RouteFallback from "./components/RouteFallback";
import { prefetchRoute } from "./utils/routePrefetch";

/* ------------------------------------------------------------------ *
 * Below-the-fold / non-critical shell widgets.
 * None of these are needed for first paint, so they load after hydration.
 * ------------------------------------------------------------------ */
const Footer = lazy(() => import("./components/Footer"));
const WelcomePopup = lazy(() => import("./components/WelcomePopup"));
const NotificationToast = lazy(() => import("./components/NotificationToast"));
const AdminNotificationToast = lazy(
  () => import("./components/AdminNotificationToast"),
);
const InstallPWABanner = lazy(() => import("./components/InstallPWABanner"));
const PushPermissionPrompt = lazy(
  () => import("./components/PushPermissionPrompt"),
);

/* ------------------------------------------------------------------ *
 * Route-level code splitting.
 * Home stays eager: it is the LCP route and lazy-loading it would add a
 * network round-trip before the hero can paint.
 * ------------------------------------------------------------------ */
import Home from "./pages/Home";

const ProductListing = lazy(() => import("./pages/ProductListing"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Coupons = lazy(() => import("./pages/Coupons"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const Categories = lazy(() => import("./pages/Categories"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Checkout = lazy(() => import("./pages/Checkout"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const MyReturns = lazy(() => import("./pages/MyReturns"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ReturnRequest = lazy(() => import("./pages/ReturnRequest"));
const Account = lazy(() => import("./pages/Account"));

/* Public affiliate redirect (resolves and forwards to the external product). */
const AffiliateRedirect = lazy(() => import("./pages/AffiliateRedirect"));

/* Admin — an entirely separate bundle from the storefront */
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AddProduct = lazy(() => import("./pages/admin/AddProduct"));
const ImportProduct = lazy(() => import("./pages/admin/ImportProduct"));
const EditProduct = lazy(() => import("./pages/admin/EditProduct"));
const AllProducts = lazy(() => import("./pages/admin/AllProducts"));
const AllOrders = lazy(() => import("./pages/admin/AllOrders"));
const AllUsers = lazy(() => import("./pages/admin/AllUsers"));
const AllReviews = lazy(() => import("./pages/admin/AllReviews"));
const ManageCoupons = lazy(() => import("./pages/admin/ManageCoupons"));
const ManageCategories = lazy(() => import("./pages/admin/ManageCategories"));
const DeliveryManagement = lazy(
  () => import("./pages/admin/DeliveryManagement"),
);
const RefundManagement = lazy(() => import("./pages/admin/RefundManagement"));
const ManageBanners = lazy(() => import("./pages/admin/ManageBanners"));
const ManageTrending = lazy(() => import("./pages/admin/ManageTrending"));
const AdminBroadcast = lazy(() => import("./pages/admin/AdminBroadcast"));
const AdminNotifications = lazy(
  () => import("./pages/admin/AdminNotifications"),
);
const AffiliateProducts = lazy(() => import("./pages/admin/AffiliateProducts"));
const AffiliateProductEditor = lazy(
  () => import("./pages/admin/AffiliateProductEditor"),
);

/** Mobile header titles, keyed by pathname. */
const MOBILE_TITLES = {
  "/cart": "MY CART",
  "/checkout": "CHECKOUT",
  "/wishlist": "WISHLIST",
  "/my-orders": "MY ORDERS",
  "/my-returns": "RETURNS",
  "/notifications": "NOTIFICATIONS",
  "/coupons": "OFFERS",
  "/account": "ACCOUNT",
  "/contact": "CONTACT",
  "/privacy": "PRIVACY",
  "/terms": "TERMS",
  "/return-request": "RETURN REQUEST",
  "/categories": "CATEGORIES",
};

const getMobileTitle = (pathname) => {
  if (pathname === "/") return "";
  if (pathname.startsWith("/products")) return "";
  if (pathname.startsWith("/product/")) return "";
  return MOBILE_TITLES[pathname] || "";
};

const AppLayout = () => {
  const location = useLocation();
  const { pathname } = location;

  // Derived layout flags — memoised so the shell doesn't recompute on every
  // unrelated context update.
  const layout = useMemo(() => {
    const isAdminRoute = pathname.startsWith("/admin");
    const isAuthRoute = pathname === "/login" || pathname === "/register";
    return {
      isAdminRoute,
      isAuthRoute,
      showMobileBars: !isAdminRoute && !isAuthRoute,
      showBackOnMobile: pathname !== "/" && !isAdminRoute && !isAuthRoute,
      title: getMobileTitle(pathname),
    };
  }, [pathname]);

  const { isAdminRoute, isAuthRoute, showMobileBars, showBackOnMobile, title } =
    layout;

  const mainClassName = isAdminRoute
    ? ""
    : showMobileBars
      ? "min-h-screen pb-16 pt-14 md:pb-0 md:pt-0"
      : "min-h-screen";

  return (
    <>
      {/* Deferred shell widgets: never block the first paint. */}
      <Suspense fallback={null}>
        <NotificationToast />
        <AdminNotificationToast />
        <InstallPWABanner />
        <PushPermissionPrompt />
        {!isAdminRoute && !isAuthRoute && <WelcomePopup />}
      </Suspense>

      {!isAdminRoute && (
        <>
          <div className="hidden md:block">
            <Navbar />
          </div>
          {showMobileBars && (
            <div className="md:hidden">
              <MobileTopBar showBack={showBackOnMobile} title={title} />
            </div>
          )}
        </>
      )}

      <main className={mainClassName}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductListing />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Resolves an affiliate product to its external destination. */}
            <Route path="/go/product/:id" element={<AffiliateRedirect />} />

            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-orders"
              element={
                <ProtectedRoute>
                  <MyOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-returns"
              element={
                <ProtectedRoute>
                  <MyReturns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/return-request"
              element={
                <ProtectedRoute>
                  <ReturnRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route
              path="/admin/broadcast"
              element={
                <AdminRoute>
                  <AdminBroadcast />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <AdminRoute>
                  <AdminNotifications />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <AdminRoute>
                  <ManageCategories />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/add-product"
              element={
                <AdminRoute>
                  <AddProduct />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/import-product"
              element={
                <AdminRoute>
                  <ImportProduct />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/edit-product/:id"
              element={
                <AdminRoute>
                  <EditProduct />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <AllProducts />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AllOrders />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AllUsers />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reviews"
              element={
                <AdminRoute>
                  <AllReviews />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <AdminRoute>
                  <ManageCoupons />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/delivery"
              element={
                <AdminRoute>
                  <DeliveryManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/refunds"
              element={
                <AdminRoute>
                  <RefundManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/banners"
              element={
                <AdminRoute>
                  <ManageBanners />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/trending"
              element={
                <AdminRoute>
                  <ManageTrending />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/affiliate"
              element={
                <AdminRoute>
                  <AffiliateProducts />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/affiliate/new"
              element={
                <AdminRoute>
                  <AffiliateProductEditor />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/affiliate/:id"
              element={
                <AdminRoute>
                  <AffiliateProductEditor />
                </AdminRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>

      {/* Desktop only. On phones the bottom nav already carries the primary
          links, and dropping the footer plus newsletter removes a lazy chunk,
          a form and an icon font dependency from the mobile critical path. */}
      {!isAdminRoute && !isAuthRoute && (
        <div className="hidden md:block">
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </div>
      )}

      {showMobileBars && (
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      )}
    </>
  );
};

function App() {
  // Warm the chunks a shopper is most likely to hit next, once the browser is
  // idle. Costs nothing on the critical path and makes navigation instant.
  React.useEffect(() => {
    prefetchRoute([
      () => import("./pages/ProductListing"),
      () => import("./pages/ProductDetails"),
      () => import("./pages/Cart"),
    ]);
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <WishlistProvider>
            <CatalogStateProvider>
              <Router>
                <AppLayout />
                <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="light"
                  limit={4}
                />
              </Router>
            </CatalogStateProvider>
          </WishlistProvider>
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

import React from "react";
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
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WelcomePopup from "./components/WelcomePopup";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ReturnRequest from "./pages/ReturnRequest";
import Categories from "./pages/Categories";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import ProductListing from "./pages/ProductListing";
import ProductDetails from "./pages/ProductDetails";
import Coupons from "./pages/Coupons";
import ManageCategories from "./pages/admin/ManageCategories";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MobileTopBar from "./components/MobileTopBar";
import MobileBottomNav from "./components/MobileBottomNav";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";
import Notifications from "./pages/Notifications";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import MyReturns from "./pages/MyReturns";

import Dashboard from "./pages/admin/Dashboard";
import AddProduct from "./pages/admin/AddProduct";
import EditProduct from "./pages/admin/EditProduct";
import AllProducts from "./pages/admin/AllProducts";
import AllOrders from "./pages/admin/AllOrders";
import AllUsers from "./pages/admin/AllUsers";
import AllReviews from "./pages/admin/AllReviews";
import ManageCoupons from "./pages/admin/ManageCoupons";
import DeliveryManagement from "./pages/admin/DeliveryManagement";
import RefundManagement from "./pages/admin/RefundManagement";
import ManageBanners from "./pages/admin/ManageBanners";
import ManageTrending from "./pages/admin/ManageTrending";

const AppLayout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  const showMobileBars = !isAdminRoute && !isAuthRoute;

  const getMobileTitle = () => {
    const p = location.pathname;
    if (p === "/") return "";
    if (p.startsWith("/products")) return "";
    if (p.startsWith("/product/")) return "";
    if (p === "/cart") return "MY CART";
    if (p === "/checkout") return "CHECKOUT";
    if (p === "/wishlist") return "WISHLIST";
    if (p === "/my-orders") return "MY ORDERS";
    if (p === "/my-returns") return "RETURNS";
    if (p === "/notifications") return "NOTIFICATIONS";
    if (p === "/coupons") return "OFFERS";
    if (p === "/account") return "ACCOUNT";
    if (p === "/contact") return "CONTACT";
    if (p === "/privacy") return "PRIVACY";
    if (p === "/terms") return "TERMS";
    if (p === "/return-request") return "RETURN REQUEST";
    if (p === "/categories") return "CATEGORIES";
    return "";
  };

  const showBackOnMobile =
    location.pathname !== "/" && !isAdminRoute && !isAuthRoute;

  return (
    <>
      {!isAdminRoute && !isAuthRoute && <WelcomePopup />}
      {!isAdminRoute && (
        <>
          <div className="hidden md:block">
            <Navbar />
          </div>
          {showMobileBars && (
            <div className="md:hidden">
              <MobileTopBar
                showBack={showBackOnMobile}
                title={getMobileTitle()}
              />
            </div>
          )}
        </>
      )}

      <main
        className={
          isAdminRoute
            ? ""
            : showMobileBars
              ? "min-h-screen pb-16 pt-14 md:pb-0 md:pt-0"
              : "min-h-screen"
        }
      >
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
            path="/admin/categories"
            element={
              <AdminRoute>
                <ManageCategories />
              </AdminRoute>
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
        </Routes>
      </main>

      {!isAdminRoute && !isAuthRoute && (
        <div className="hidden md:block">
          <Footer />
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
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <AppLayout />
              <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                limit={3}
              />
            </Router>
          </WishlistProvider>
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

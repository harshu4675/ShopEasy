import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ReturnRequest from "./pages/ReturnRequest";

// Public Pages
import Home from "./pages/Home";
import ProductListing from "./pages/ProductListing";
import ProductDetails from "./pages/ProductDetails";
import Coupons from "./pages/Coupons";

// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Protected Pages
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";
import Notifications from "./pages/Notifications";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";

// Admin Pages
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

// Styles
import "./App.css";
import "./styles/AdminPages.css";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <div className="app">
                <Navbar />
                <main className="main-content">
                  <Routes>
                    {/* ==================== PUBLIC ROUTES ==================== */}
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<ProductListing />} />
                    <Route path="/product/:id" element={<ProductDetails />} />
                    <Route path="/coupons" element={<Coupons />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/contact" element={<Contact />} />

                    {/* ==================== AUTH ROUTES ==================== */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* ==================== PROTECTED ROUTES ==================== */}
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

                    {/* ==================== ADMIN ROUTES ==================== */}
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
                  </Routes>
                </main>
                <Footer />
              </div>

              {/* Toast Notifications */}
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

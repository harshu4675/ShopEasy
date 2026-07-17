import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://shopeasy-ecommerce-app.onrender.com/api";
console.log("API URL:", API_URL);
console.log("API Configuration:", {
  baseURL: API_URL,
  env: import.meta.env.MODE,
});

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url.includes("/auth/login") ||
        originalRequest.url.includes("/auth/register") ||
        originalRequest.url.includes("/auth/refresh-token")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true },
        );

        const newToken = data.data.accessToken;
        localStorage.setItem("accessToken", newToken);

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  verifyEmail: (data) => api.post("/auth/verify-email", data),
  resendOTP: (data) => api.post("/auth/resend-otp", data),
  login: (data) => api.post("/auth/login", data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  verifyResetOTP: (data) => api.post("/auth/verify-reset-otp", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
  refreshToken: () => api.post("/auth/refresh-token"),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/update-profile", data),
  changePassword: (data) => api.put("/auth/change-password", data),
};
export const categoriesAPI = {
  getAll: (activeOnly = false) =>
    api.get(`/categories${activeOnly ? "?activeOnly=true" : ""}`),
  getOne: (idOrSlug) => api.get(`/categories/${idOrSlug}`),
  create: (data) => api.post("/categories", data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  toggle: (id) => api.patch(`/categories/${id}/toggle`),
  delete: (id) => api.delete(`/categories/${id}`),
  addSubCategory: (id, data) =>
    api.post(`/categories/${id}/subcategories`, data),
  updateSubCategory: (id, subId, data) =>
    api.put(`/categories/${id}/subcategories/${subId}`, data),
  deleteSubCategory: (id, subId) =>
    api.delete(`/categories/${id}/subcategories/${subId}`),
  seed: () => api.post("/categories/seed"),
};
export const productsAPI = {
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByCategory: (category, params) =>
    api.get(`/products/category/${category}`, { params }),
  search: (query) => api.get(`/products/search?q=${query}`),
};

export const cartAPI = {
  get: () => api.get("/cart"),
  add: (data) => api.post("/cart", data),
  update: (itemId, data) => api.put(`/cart/${itemId}`, data),
  remove: (itemId) => api.delete(`/cart/${itemId}`),
  clear: () => api.delete("/cart"),
  applyCoupon: (code) => api.post("/cart/coupon", { code }),
  removeCoupon: () => api.delete("/cart/coupon"),
};

export const wishlistAPI = {
  get: () => api.get("/wishlist"),
  add: (productId) => api.post("/wishlist", { productId }),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
  check: (productId) => api.get(`/wishlist/check/${productId}`),
};

export const ordersAPI = {
  create: (data) => api.post("/orders", data),
  getAll: () => api.get("/orders"),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
  track: (id) => api.get(`/orders/${id}/track`),
};

export const returnsAPI = {
  create: (data) => api.post("/returns", data),
  getMyReturns: () => api.get("/returns/my-returns"),
  getById: (id) => api.get(`/returns/${id}`),
  cancel: (id) => api.delete(`/returns/${id}`),
  getAll: () => api.get("/returns/admin/all"),
  updateStatus: (id, data) => api.put(`/returns/${id}/status`, data),
};

export const addressAPI = {
  getAll: () => api.get("/addresses"),
  add: (data) => api.post("/addresses", data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  delete: (id) => api.delete(`/addresses/${id}`),
  setDefault: (id) => api.put(`/addresses/${id}/default`),
};

export const reviewsAPI = {
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  add: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export const bannersAPI = {
  getActive: () => api.get("/banners/active"),
  getAll: () => api.get("/banners"),
  getOne: (id) => api.get(`/banners/${id}`),
  create: (formData) =>
    api.post("/banners", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.put(`/banners/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  toggle: (id) => api.patch(`/banners/${id}/toggle`),
  reorder: (orders) => api.patch("/banners/reorder", { orders }),
  delete: (id) => api.delete(`/banners/${id}`),
};

export const formatPrice = (price) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const trendingAPI = {
  get: (limit = 8) => api.get(`/trending?limit=${limit}`),
  getBestSellers: (limit = 10, days = 30) =>
    api.get(`/trending/best-sellers?limit=${limit}&days=${days}`),
  getAdminAll: () => api.get("/trending/admin/all"),
  toggle: (productId) => api.patch(`/trending/${productId}/toggle`),
  reorder: (orders) => api.patch("/trending/reorder", { orders }),
  recalculateSales: () => api.post("/trending/recalculate-sales"),
};
export const calculateDiscount = (originalPrice, salePrice) => {
  if (!originalPrice || !salePrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const generateId = (length = 8) => {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
};

export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: "", color: "" };

  let strength = 0;

  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  const levels = [
    { strength: 0, label: "", color: "" },
    { strength: 1, label: "Very Weak", color: "#ef4444" },
    { strength: 2, label: "Weak", color: "#f97316" },
    { strength: 3, label: "Medium", color: "#eab308" },
    { strength: 4, label: "Strong", color: "#22c55e" },
    { strength: 5, label: "Very Strong", color: "#10b981" },
  ];

  return levels[strength];
};

export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
};

export default api;

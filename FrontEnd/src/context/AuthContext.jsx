import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { api } from "../utils/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      try {
        const response = await api.get("/auth/me");
        const userData =
          response.data.data?.user || response.data.user || response.data.data;

        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          clearAuth();
        }
      } catch (error) {
        try {
          const refreshResponse = await api.post("/auth/refresh-token");
          if (refreshResponse.data.success) {
            localStorage.setItem(
              "accessToken",
              refreshResponse.data.data.accessToken,
            );
            const meResponse = await api.get("/auth/me");
            const userData =
              meResponse.data.data?.user ||
              meResponse.data.user ||
              meResponse.data.data;

            if (userData) {
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              clearAuth();
            }
          }
        } catch {
          clearAuth();
        }
      }
    }
    setLoading(false);
  }, [clearAuth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const sendRegisterOTP = async (
    name,
    email,
    password,
    phone,
    rememberMe = false,
  ) => {
    const response = await api.post("/auth/send-otp", {
      name,
      email,
      password,
      phone,
      rememberMe,
      purpose: "register",
    });
    return response.data;
  };

  const verifyRegisterOTP = async (email, otp) => {
    const response = await api.post("/auth/verify-otp-register", {
      email,
      otp,
    });

    if (response.data.success && response.data.data) {
      const { user: userData, accessToken } = response.data.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
    }

    return response.data;
  };

  const sendResetOTP = async (email) => {
    const response = await api.post("/auth/send-otp", {
      email,
      purpose: "reset-password",
    });
    return response.data;
  };

  const verifyResetOTP = async (email, otp, newPassword) => {
    const response = await api.post("/auth/verify-otp-reset", {
      email,
      otp,
      newPassword,
    });
    return response.data;
  };

  const login = async (phone, password, rememberMe = false) => {
    const response = await api.post("/auth/login", {
      phone,
      password,
      rememberMe,
    });

    if (response.data.success && response.data.data) {
      const { user: userData, accessToken } = response.data.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      if (rememberMe) localStorage.setItem("rememberedPhone", phone);
      else localStorage.removeItem("rememberedPhone");
      setUser(userData);
      setIsAuthenticated(true);
    }

    return response.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const response = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  };

  const updateProfile = async (profileData) => {
    const response = await api.put("/auth/profile", profileData);
    if (response.data.success && response.data.data) {
      const updatedUser = response.data.data.user || response.data.data;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    return response.data;
  };

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const getRememberedPhone = () =>
    localStorage.getItem("rememberedPhone") || "";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        sendRegisterOTP,
        verifyRegisterOTP,
        sendResetOTP,
        verifyResetOTP,
        login,
        logout,
        checkAuth,
        updateProfile,
        updateUser,
        changePassword,
        getRememberedPhone,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

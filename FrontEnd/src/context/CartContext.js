import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { api } from "../utils/api";
import { useAuth } from "./AuthContext"; // ✅ Changed

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth(); // ✅ Changed from useContext(AuthContext)
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }

    try {
      const response = await api.get("/cart");
      const count = response.data?.items?.length || 0;
      setCartCount(count);
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  const updateCartCount = (count) => {
    setCartCount(count);
  };

  const refreshCart = () => {
    fetchCartCount();
  };

  const value = {
    cartCount,
    updateCartCount,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// ✅ Add custom hook
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

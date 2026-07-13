import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { api } from "../utils/api";
import { useAuth } from "./AuthContext";

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const response = await api.get("/cart");
      setCartCount(response.data?.items?.length || 0);
    } catch {
      setCartCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  const updateCartCount = (count) => setCartCount(count);
  const refreshCart = () => fetchCartCount();

  return (
    <CartContext.Provider value={{ cartCount, updateCartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

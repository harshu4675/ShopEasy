import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { api } from "../utils/api";
import { useAuth } from "./AuthContext";

export const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlistCount, setWishlistCount] = useState(0);

  const fetchWishlistCount = useCallback(async () => {
    if (!user) {
      setWishlistCount(0);
      return;
    }
    try {
      const response = await api.get("/wishlist");
      setWishlistCount(response.data?.products?.length || 0);
    } catch {
      setWishlistCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlistCount();
  }, [fetchWishlistCount]);

  const updateWishlistCount = (count) => setWishlistCount(count);
  const refreshWishlist = () => fetchWishlistCount();

  return (
    <WishlistContext.Provider
      value={{ wishlistCount, updateWishlistCount, refreshWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context)
    throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
};

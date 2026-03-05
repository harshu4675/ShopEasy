import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { api } from "../utils/api";
import { useAuth } from "./AuthContext"; // ✅ Changed

export const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth(); // ✅ Changed from useContext(AuthContext)
  const [wishlistCount, setWishlistCount] = useState(0);

  const fetchWishlistCount = useCallback(async () => {
    if (!user) {
      setWishlistCount(0);
      return;
    }

    try {
      const response = await api.get("/wishlist");
      const count = response.data?.products?.length || 0;
      setWishlistCount(count);
    } catch (error) {
      console.error("Error fetching wishlist count:", error);
      setWishlistCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlistCount();
  }, [fetchWishlistCount]);

  const updateWishlistCount = (count) => {
    setWishlistCount(count);
  };

  const refreshWishlist = () => {
    fetchWishlistCount();
  };

  const value = {
    wishlistCount,
    updateWishlistCount,
    refreshWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

// ✅ Add custom hook
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};

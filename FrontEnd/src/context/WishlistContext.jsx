import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { cachedGet, invalidateCache, CACHE_KEYS } from "../utils/api";
import { useAuth } from "./AuthContext";

/**
 * Split for the same reason as CartContext: the wishlist count changes often,
 * but the components that mutate the wishlist do not display it. Keeping the
 * actions in their own never-changing context stops a wishlist toggle from
 * re-rendering every product card on the page.
 */
export const WishlistContext = createContext(null);
const WishlistActionsContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlistCount, setWishlistCount] = useState(0);

  const userId = user?._id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchWishlistCount = useCallback(async ({ force = false } = {}) => {
    if (!userIdRef.current) {
      setWishlistCount(0);
      return;
    }
    try {
      if (force) invalidateCache(CACHE_KEYS.wishlist);
      const response = await cachedGet("/wishlist", { ttl: 15_000, force });
      setWishlistCount(response.data?.products?.length || 0);
    } catch {
      setWishlistCount(0);
    }
  }, []);

  useEffect(() => {
    fetchWishlistCount();
  }, [fetchWishlistCount, userId]);

  const actions = useMemo(
    () => ({
      updateWishlistCount: setWishlistCount,
      refreshWishlist: () => fetchWishlistCount({ force: true }),
    }),
    [fetchWishlistCount],
  );

  const value = useMemo(
    () => ({ wishlistCount, ...actions }),
    [wishlistCount, actions],
  );

  return (
    <WishlistActionsContext.Provider value={actions}>
      <WishlistContext.Provider value={value}>
        {children}
      </WishlistContext.Provider>
    </WishlistActionsContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};

/** Actions only. Stable reference; never triggers a consumer re-render. */
export const useWishlistActions = () => {
  const context = useContext(WishlistActionsContext);
  if (!context) {
    throw new Error(
      "useWishlistActions must be used within a WishlistProvider",
    );
  }
  return context;
};

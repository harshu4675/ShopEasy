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
 * Cart state is exposed through two contexts rather than one.
 *
 * `cartCount` changes every time an item is added or removed. Components that
 * only need the *actions* (every ProductCard needs `refreshCart`, none of them
 * display the count) would re-render on each of those changes if actions and
 * value shared a context, because context propagation bypasses React.memo.
 *
 * Splitting them means adding to cart re-renders the badge in the navbar and
 * nothing else. CartActionsContext holds only stable useCallback references,
 * so its value never changes for the lifetime of the provider.
 */
export const CartContext = createContext(null);
const CartActionsContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const userId = user?._id;
  // Read the current user inside callbacks without making them depend on it,
  // which keeps the actions object referentially stable across logins.
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchCartCount = useCallback(async ({ force = false } = {}) => {
    if (!userIdRef.current) {
      setCartCount(0);
      return;
    }
    try {
      if (force) invalidateCache(CACHE_KEYS.cart);
      const response = await cachedGet("/cart", { ttl: 15_000, force });
      setCartCount(response.data?.items?.length || 0);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount, userId]);

  const actions = useMemo(
    () => ({
      updateCartCount: setCartCount,
      refreshCart: () => fetchCartCount({ force: true }),
    }),
    [fetchCartCount],
  );

  const value = useMemo(
    () => ({ cartCount, ...actions }),
    [cartCount, actions],
  );

  return (
    <CartActionsContext.Provider value={actions}>
      <CartContext.Provider value={value}>{children}</CartContext.Provider>
    </CartActionsContext.Provider>
  );
};

/** Full cart state including the count. Re-renders when the count changes. */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

/** Actions only. Never re-renders the consumer when the count changes. */
export const useCartActions = () => {
  const context = useContext(CartActionsContext);
  if (!context) {
    throw new Error("useCartActions must be used within a CartProvider");
  }
  return context;
};

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cachedGet, invalidateCache, CACHE_KEYS } from "../utils/api";
import { useAuth } from "./AuthContext";

/**
 * Membership sets for "is this product in my cart / wishlist".
 *
 * Every ProductCard previously answered that question by fetching `/cart` and
 * `/wishlist` itself. Request de-duplication reduced the network cost to two
 * calls, but each card still ran its own effect, held its own copy of the
 * answer, and re-derived it on every mount, so scrolling a long grid meant
 * hundreds of redundant effects and array scans.
 *
 * Fetching the two lists once and exposing them as Sets turns each card's
 * lookup into an O(1) read with no effect at all. The sets are also the single
 * source of truth, so a mutation in one card is immediately reflected in every
 * other card showing the same product.
 */
const CatalogStateContext = createContext(null);

const EMPTY_SET = new Set();

export const CatalogStateProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?._id;

  const [cartIds, setCartIds] = useState(EMPTY_SET);
  const [wishlistIds, setWishlistIds] = useState(EMPTY_SET);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!userId) {
        setCartIds(EMPTY_SET);
        setWishlistIds(EMPTY_SET);
        return;
      }

      if (force) {
        invalidateCache(CACHE_KEYS.cart);
        invalidateCache(CACHE_KEYS.wishlist);
      }

      const [cartRes, wishRes] = await Promise.all([
        cachedGet("/cart", { ttl: 30_000, force }).catch(() => null),
        cachedGet("/wishlist", { ttl: 30_000, force }).catch(() => null),
      ]);

      if (!mountedRef.current) return;

      if (cartRes) {
        const ids = (cartRes.data?.items || [])
          .map((i) => (i.product?._id || i.product || i._id)?.toString())
          .filter(Boolean);
        setCartIds(new Set(ids));
      }

      if (wishRes) {
        const ids = (wishRes.data?.products || [])
          .map((p) => (p._id || p.product?._id || p)?.toString())
          .filter(Boolean);
        setWishlistIds(new Set(ids));
      }
    },
    [userId],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Local set mutations so a card reflects its own action instantly, without
  // waiting for a refetch.
  const markInCart = useCallback((productId, present) => {
    setCartIds((prev) => {
      const id = String(productId);
      if (prev.has(id) === present) return prev;
      const next = new Set(prev);
      if (present) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const markInWishlist = useCallback((productId, present) => {
    setWishlistIds((prev) => {
      const id = String(productId);
      if (prev.has(id) === present) return prev;
      const next = new Set(prev);
      if (present) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      cartIds,
      wishlistIds,
      markInCart,
      markInWishlist,
      refreshCatalogState: () => load({ force: true }),
    }),
    [cartIds, wishlistIds, markInCart, markInWishlist, load],
  );

  return (
    <CatalogStateContext.Provider value={value}>
      {children}
    </CatalogStateContext.Provider>
  );
};

export const useCatalogState = () => {
  const context = useContext(CatalogStateContext);
  if (!context) {
    throw new Error(
      "useCatalogState must be used within a CatalogStateProvider",
    );
  }
  return context;
};

import { useCallback, useEffect, useState } from "react";
import { resellerAPI } from "../utils/api";

/**
 * Loads the signed-in user's reseller profile.
 *
 * Returns a discriminated state so screens can branch cleanly between
 * "not a reseller", "awaiting approval" and "active", without every page
 * re-implementing the same status checks.
 */
const useReseller = () => {
  const [reseller, setReseller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      const { data } = await resellerAPI.getMe({ signal });
      setReseller(data?.data || null);
      setError(null);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setError(err);
      setReseller(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const status = reseller?.status ?? null;

  return {
    reseller,
    loading,
    error,
    refresh: () => load(),
    isReseller: Boolean(reseller),
    isApproved: status === "approved",
    isPending: status === "pending",
    isRejected: status === "rejected",
    isSuspended: status === "suspended",
    status,
  };
};

export default useReseller;

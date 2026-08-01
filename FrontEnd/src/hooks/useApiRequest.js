import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import { cachedRequest, buildKey } from "../utils/requestCache";

/**
 * Data-fetching hook with caching, de-duplication, abort-on-unmount and
 * bounded retry.
 *
 * @param {string|null} url      endpoint; pass null to skip the request
 * @param {object} [options]
 * @param {object} [options.params]
 * @param {boolean} [options.enabled=true]
 * @param {number} [options.ttl]        cache lifetime in ms
 * @param {number} [options.retries=2]  retry attempts for network/5xx errors
 * @param {any}    [options.initialData]
 * @param {(data:any)=>any} [options.select] transform applied to the payload
 */
const useApiRequest = (url, options = {}) => {
  const {
    params,
    enabled = true,
    ttl,
    retries = 2,
    initialData = null,
    select,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(url) && enabled);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const selectRef = useRef(select);
  selectRef.current = select;

  const key = url ? buildKey(url, params) : null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const run = useCallback(
    async ({ force = false } = {}) => {
      if (!url || !enabled) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const attempt = async (remaining) => {
        try {
          return await cachedRequest(
            key,
            async () => {
              const res = await api.get(url, {
                params,
                signal: controller.signal,
              });
              return res.data;
            },
            { ttl, force },
          );
        } catch (err) {
          const canceled =
            err?.name === "CanceledError" ||
            err?.name === "AbortError" ||
            err?.code === "ERR_CANCELED";
          const status = err?.response?.status;
          const retryable = !canceled && (!status || status >= 500);

          if (retryable && remaining > 0) {
            // Exponential backoff: 300ms, 900ms.
            const delay = 300 * 3 ** (retries - remaining);
            await new Promise((r) => setTimeout(r, delay));
            if (controller.signal.aborted) throw err;
            return attempt(remaining - 1);
          }
          throw err;
        }
      };

      try {
        const payload = await attempt(retries);
        if (!mountedRef.current || controller.signal.aborted) return;
        setData(selectRef.current ? selectRef.current(payload) : payload);
      } catch (err) {
        const canceled =
          err?.name === "CanceledError" ||
          err?.name === "AbortError" ||
          err?.code === "ERR_CANCELED";
        if (!mountedRef.current || canceled) return;
        setError(err);
      } finally {
        if (mountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    // `params` is intentionally tracked through `key` to avoid re-running on
    // a new object identity with identical values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, enabled, ttl, retries, url],
  );

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }
    run();
  }, [run, url, enabled]);

  const refetch = useCallback(() => run({ force: true }), [run]);

  return { data, loading, error, refetch, setData };
};

export default useApiRequest;

import { useEffect, useRef } from "react";

/**
 * Interval polling that pauses while the tab is hidden.
 *
 * A plain setInterval keeps firing in a background tab, so a user with the
 * site open in a spare tab was generating a request every 15-20 seconds
 * indefinitely: wasted battery on mobile, and sustained load on an instance
 * that sleeps to stay within a free tier.
 *
 * This runs the callback only while the document is visible, and fires once
 * immediately on becoming visible again so the UI is never stale after a
 * return to the tab.
 */
const usePolling = (callback, intervalMs, enabled = true) => {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;

    let timer = null;

    const run = () => {
      savedCallback.current?.();
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(run, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        run();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, enabled]);
};

export default usePolling;

/**
 * Idle-time route chunk prefetching.
 *
 * React.lazy only downloads a chunk when the route is first rendered, which
 * adds a visible delay on the very first navigation. Warming the two or three
 * most likely next routes while the main thread is idle removes that delay
 * without competing with the initial page load.
 */

const requested = new Set();

const idle = (fn) => {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: 3000 });
  } else {
    setTimeout(fn, 1500);
  }
};

/** Skip prefetching for users on slow links or data-saver mode. */
const shouldPrefetch = () => {
  if (typeof navigator === "undefined") return false;
  const conn = navigator.connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return !/(^|-)(2g|slow-2g)$/.test(conn.effectiveType || "");
};

/**
 * @param {Function|Function[]} importers dynamic import factories
 */
export const prefetchRoute = (importers) => {
  if (!shouldPrefetch()) return;

  const list = Array.isArray(importers) ? importers : [importers];

  idle(() => {
    list.forEach((importer) => {
      const key = importer.toString();
      if (requested.has(key)) return;
      requested.add(key);
      // Swallow errors: a failed prefetch must never surface to the user, the
      // real navigation will retry the request.
      importer().catch(() => requested.delete(key));
    });
  });
};

export default prefetchRoute;

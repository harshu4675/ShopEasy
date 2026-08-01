import React from "react";

/**
 * Suspense fallback for lazily-loaded routes.
 *
 * Deliberately minimal: it reserves the viewport height so swapping a route
 * chunk in never collapses the layout (CLS = 0) and shows the same brand-pink
 * spinner used elsewhere, without pulling the full <Loader> (and its font
 * request) onto the critical path.
 */
const RouteFallback = () => (
  <div
    className="flex min-h-[60vh] items-center justify-center bg-gray-50"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span className="sr-only">Loading page…</span>
    <span
      className="inline-block h-10 w-10 rounded-full border-[3px] border-pink-100 border-t-pink-500"
      style={{ animation: "rf-spin 0.8s linear infinite" }}
    />
    <style>{`
      @keyframes rf-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        [style*="rf-spin"] { animation-duration: 2s !important; }
      }
    `}</style>
  </div>
);

export default RouteFallback;

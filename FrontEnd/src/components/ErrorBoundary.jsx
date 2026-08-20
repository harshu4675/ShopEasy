import { Component } from "react";

/**
 * Top-level error boundary.
 *
 * Without one, a single throw anywhere in the tree makes React unmount the
 * whole application and leaves an empty <div id="root"> — the classic
 * "works locally, blank page in production".
 *
 * The dominant trigger in a hashed-asset build is a failed lazy chunk. Every
 * route in App.jsx is React.lazy(), asset filenames carry a content hash, and
 * old files are removed on redeploy. A visitor holding a cached (or
 * service-worker precached) index.html then requests a chunk that no longer
 * exists; the SPA rewrite answers 200 text/html, the browser rejects it for a
 * bad module MIME type, and the lazy import rejects. <Suspense> only handles
 * the pending state, not rejection, so the error reaches the root and the page
 * goes blank with no way out except a manual hard refresh.
 *
 * A chunk error means the client is running against a stale deployment, so the
 * recovery is a cache-busting reload. That is offered explicitly, and attempted
 * once automatically, rather than being left to the user.
 */
const RELOAD_FLAG = "shopeasy:chunk-reload";

const isChunkLoadError = (error) => {
  const message = `${error?.name || ""} ${error?.message || ""}`;
  return (
    /Loading chunk|Loading CSS chunk|ChunkLoadError/i.test(message) ||
    /dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /expected a JavaScript(?:-or-Wasm)? module/i.test(message)
  );
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return { error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info?.componentStack);

    // A stale-deployment chunk error is fully recoverable, so self-heal once.
    // The sessionStorage flag makes it strictly one attempt: if the reload
    // lands on the same failure the UI below is shown instead of looping.
    if (isChunkLoadError(error)) {
      let alreadyTried = true;
      try {
        alreadyTried = sessionStorage.getItem(RELOAD_FLAG) === "1";
        if (!alreadyTried) sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        // Private mode / storage disabled: skip the auto-reload, keep the UI.
      }
      if (!alreadyTried) this.hardReload();
    }
  }

  hardReload = async () => {
    // Clear the service worker and its caches first, otherwise the reload is
    // served the very same stale index.html that caused the failure.
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if (navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
    } catch {
      // Best effort only - reloading still helps in the common case.
    }
    window.location.reload();
  };

  handleRetry = () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* ignore */
    }
    this.hardReload();
  };

  render() {
    const { error, isChunkError } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: "#f8f9fa",
          color: "#343a40",
        }}
      >
        <div style={{ maxWidth: "460px", textAlign: "center" }}>
          <h1
            style={{ fontSize: "22px", marginBottom: "12px", color: "#1a1a2e" }}
          >
            {isChunkError ? "A new version is available" : "Something went wrong"}
          </h1>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.6,
              marginBottom: "24px",
              color: "#6c757d",
            }}
          >
            {isChunkError
              ? "This page was updated while you had it open. Reload to get the latest version."
              : "An unexpected error stopped this page from loading. Reloading usually fixes it."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: "12px 28px",
              fontSize: "15px",
              fontWeight: 600,
              color: "#fff",
              background: "#e91e63",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

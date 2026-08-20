import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

// The boundary sits outside <App /> so it also covers the context providers and
// the router themselves, not just the lazily loaded route components. Any
// uncaught error below this point would otherwise unmount the entire tree and
// leave a blank page.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

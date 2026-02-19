import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

// ── Error boundary ─────────────────────────────────────────────────────────
// Catches render errors in any child component so the whole app doesn't
// go white. Shows a friendly message instead.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-gray-50 dark:bg-gray-900">
          <h1 className="text-3xl font-bold text-red-600 mb-3">
            Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
            An unexpected error occurred. Please refresh the page or try again
            later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Mount ──────────────────────────────────────────────────────────────────
// FIX: removed the redundant <Routes><Route path="/*"> wrapper that was
// creating a double-router context. App manages its own <Routes> internally.
const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "./api";

export default function ProductLinker() {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // ── Fetch suggested products ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // FIX: apiFetch checks for token and throws a typed error instead of
    // silently sending "Authorization: Bearer null".
    apiFetch(`/products/${id}/suggest_links/`, {}, true)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setMatches(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.message === "AUTH_MISSING" || err.code === "UNAUTHORIZED") {
            setError("Your session has expired. Please log in again.");
          } else {
            console.error(err);
            setError("Failed to fetch suggestions.");
          }
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Link selected product ──────────────────────────────────────────────────
  const linkProduct = async () => {
    if (!selected) {
      setError("Please select a product to link.");
      return;
    }

    setLinking(true);
    setError(null);
    setMessage(null);

    try {
      const res = await apiFetch(
        `/products/${id}/link/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canonical_id: selected }),
        },
        true // auth required
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Linking failed.");
      } else {
        setMessage("Product linked successfully!");
      }
    } catch (err) {
      if (err.message === "AUTH_MISSING" || err.code === "UNAUTHORIZED") {
        setError("Your session has expired. Please log in again.");
      } else {
        console.error(err);
        setError("Network error. Please try again.");
      }
    } finally {
      setLinking(false);
    }
  };

  if (loading)
    return (
      <p className="text-gray-600 dark:text-gray-300 text-center mt-6">
        Loading suggestions...
      </p>
    );

  return (
    <div className="p-6 bg-white dark:bg-gray-700 rounded-2xl shadow-md max-w-md mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Link Canonical Product
      </h2>

      {error && (
        <p className="text-red-500 dark:text-red-400 mb-3 text-sm">{error}</p>
      )}

      {matches.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">
          No suggested products found.
        </p>
      ) : (
        <>
          {/* FIX: label linked via htmlFor/id for accessibility */}
          <label
            htmlFor="product-link-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            Select a product to link
          </label>
          <select
            id="product-link-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="mb-4 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-2 focus:ring focus:ring-blue-200"
          >
            <option value="">-- Select a product --</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.hotel?.name ?? "Unknown Hotel"})
              </option>
            ))}
          </select>

          <button
            onClick={linkProduct}
            disabled={linking || !selected}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {linking ? "Linking..." : "Link Product"}
          </button>

          {message && (
            <p className="text-green-600 dark:text-green-400 mt-3 text-sm">
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}

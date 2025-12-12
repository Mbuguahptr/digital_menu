import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ProductLinker() {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Fetch suggested products on mount
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/products/${id}/suggest_links/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setMatches(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch suggestions.");
        setLoading(false);
      });
  }, [id]);

  // Link selected product
  const linkProduct = async () => {
    if (!selected) {
      setError("Please select a product to link.");
      return;
    }

    setLinking(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/products/${id}/link/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ canonical_id: selected }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Linking failed.");
      } else {
        setMessage("Product linked successfully!");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
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

      {matches.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">
          No suggested products found.
        </p>
      ) : (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="mb-4 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-2 focus:ring focus:ring-blue-200"
          >
            <option value="">-- Select a product --</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.hotel.name})
              </option>
            ))}
          </select>

          <button
            onClick={linkProduct}
            disabled={linking}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {linking ? "Linking..." : "Link Product"}
          </button>

          {message && (
            <p className="text-green-600 dark:text-green-400 mt-3">{message}</p>
          )}
          {error && <p className="text-red-500 dark:text-red-400 mt-2">{error}</p>}
        </>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import getImageUrl from "../utils/getImageUrl";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ComparePage() {
  const query = useQuery();
  const initialName = query.get("name") || "";

  const [name, setName] = useState(initialName);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComparison = () => {
    if (!name) {
      setItems([]);
      return;
    }

    const source = axios.CancelToken.source();
    setLoading(true);
    setError(null);

    const API_BASE = "/api"; // relative path for frontend inside backend

    const params = new URLSearchParams();
    params.append("name", name);

    axios
      .get(`${API_BASE}/products/compare/?${params.toString()}`, {
        cancelToken: source.token,
      })
      .then((res) => {
        setItems(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          console.error(err);
          setError("Failed to fetch comparison data.");
          setLoading(false);
        }
      });

    return () => source.cancel();
  };

  useEffect(() => {
    if (name) fetchComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial fetch if query param exists

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComparison();
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 min-h-screen p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-center">
        Compare Products
      </h2>

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        className="flex justify-center items-center mb-6"
      >
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full sm:w-64"
        />
        <button
          type="submit"
          className="ml-3 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow"
        >
          Search
        </button>
      </form>

      {/* Messages */}
      {!name && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
          Please enter a product name to search.
        </div>
      )}
      {loading && (
        <p className="text-center text-gray-600 dark:text-gray-300 mt-10">
          Loading comparison...
        </p>
      )}
      {error && (
        <p className="text-center text-red-500 dark:text-red-400 mt-10">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && name && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-10">
          No matching products found.
        </p>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((it) => (
          <div
            key={it.id}
            className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow hover:shadow-lg transition-shadow"
          >
            {it.image && (
              <img
                src={getImageUrl(it.image)}
                alt={it.name}
                className="w-full h-40 object-cover rounded-t-xl mb-4"
              />
            )}
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-2">
              {it.hotel.name}
            </h3>
            <p className="text-indigo-600 font-bold text-xl mb-2">
              {it.price} {it.currency}
            </p>
            {it.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {it.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

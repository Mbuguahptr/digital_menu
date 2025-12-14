import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import getImageUrl from "../utils/getImageUrl";

// ----------------- Updated API Base -----------------
// Relative path works for frontend served from backend
const API_BASE = "";

export default function MenuPage() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cancelToken = axios.CancelToken.source();

    const fetchProducts = async (url) => {
      try {
        const res = await axios.get(url, { cancelToken: cancelToken.token });

        const fetchedProducts = Array.isArray(res.data.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : [];

        setProducts((prev) => [...prev, ...fetchedProducts]);

        if (res.data.next) {
          await fetchProducts(res.data.next);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError("Failed to load products.");
          setLoading(false);
        }
      }
    };

    setProducts([]);
    setLoading(true);
    setError(null);

    // Fetch only food items for the menu
    fetchProducts(
      `${API_BASE}/api/products/?hotel_slug=${slug}&product_type=food`
    );

    return () => cancelToken.cancel();
  }, [slug]);

  if (loading) {
    // Skeleton loader for grid
    return (
      <div className="max-w-6xl mx-auto px-4 mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden h-[450px]"
          >
            <div className="w-full aspect-square bg-gray-300 dark:bg-gray-600" />
            <div className="p-6 space-y-3">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error)
    return <p className="text-red-500 text-center mt-10 text-lg">{error}</p>;

  if (!products.length)
    return (
      <p className="text-gray-600 dark:text-gray-300 text-center mt-10 text-lg">
        No products found.
      </p>
    );

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-center">
        Menu
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transform hover:scale-105 transition duration-300 flex flex-col overflow-hidden"
          >
            {/* IMAGE CONTAINER WITH BLUE GRADIENT AND OVERLAY */}
            <div className="w-full aspect-square overflow-hidden rounded-t-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center relative">
              {p.image ? (
                <img
                  src={getImageUrl(p.image)}
                  alt={p.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-white font-semibold">No Image</div>
              )}
              <div className="absolute inset-0 bg-black opacity-10 pointer-events-none"></div>
            </div>

            {/* CONTENT */}
            <div className="p-6 flex flex-col justify-between flex-grow">
              <div className="flex flex-col">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {p.name}
                </h3>

                <p className="text-gray-700 dark:text-gray-300 mb-1">
                  {p.price} {p.currency}
                </p>

                {p.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 overflow-hidden">
                    {p.description}
                  </p>
                )}
              </div>

              <div className="flex justify-end items-center">
                <Link
                  to={`/compare?name=${encodeURIComponent(p.name)}`}
                  className="bg-green-600 text-white text-sm font-medium px-4 py-1 rounded-full shadow-sm hover:bg-green-700 transition-colors"
                >
                  Compare
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

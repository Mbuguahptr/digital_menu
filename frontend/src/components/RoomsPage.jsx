import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import getImageUrl from "../utils/getImageUrl";

const API_BASE = "";

export default function RoomsPage() {
  const { slug } = useParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cancelToken = axios.CancelToken.source();

    const fetchRooms = async (url) => {
      try {
        const res = await axios.get(url, { cancelToken: cancelToken.token });
        console.log("Rooms API response:", res.data);

        const fetchedRooms = Array.isArray(res.data.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : [];

        setRooms((prev) => [...prev, ...fetchedRooms]);
        setLoading(false);

        if (res.data.next) {
          await fetchRooms(res.data.next);
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error(err);
          setError("Failed to load rooms.");
          setLoading(false);
        }
      }
    };

    setRooms([]);
    setLoading(true);
    setError(null);

    const productType = "room";
    fetchRooms(
      `${API_BASE}/api/products/?hotel_slug=${slug}&product_type=${productType}`
    );

    return () => cancelToken.cancel();
  }, [slug]);

  if (loading) {
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

  if (!rooms.length)
    return (
      <p className="text-gray-600 dark:text-gray-300 text-center mt-10 text-lg">
        No rooms available.
      </p>
    );

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-center">
        Available Rooms
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transform hover:scale-105 transition duration-300 flex flex-col overflow-hidden"
          >
            <div className="w-full aspect-square overflow-hidden rounded-t-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center relative">
              {room.image ? (
                <img
                  src={getImageUrl(room.image)}
                  alt={room.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-white font-semibold">No Image</div>
              )}
              <div className="absolute inset-0 bg-black opacity-10 pointer-events-none"></div>
            </div>

            <div className="p-6 flex flex-col justify-between flex-grow">
              <div className="flex flex-col">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {room.name}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-1">
                  {room.price} {room.currency} / night
                </p>
                {room.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 overflow-hidden">
                    {room.description}
                  </p>
                )}
                {room.available_rooms != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {room.available_rooms} rooms available
                  </p>
                )}
              </div>

              {/* Updated Book Now link */}
              <Link
                to={`/book/${room.id}?hotel=${slug}`}
                className="mt-4 block bg-indigo-600 text-white text-center py-2 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm"
              >
                Book Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

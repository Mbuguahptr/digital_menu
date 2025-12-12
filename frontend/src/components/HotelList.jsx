import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import getImageUrl from "../utils/getImageUrl";
import axios from "axios";

// ---------------- API BASE URL ----------------
// Vite-compatible
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function HotelList() {
  const [hotelsByCity, setHotelsByCity] = useState({});
  const [selectedCity, setSelectedCity] = useState("All");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  // ---------------- FETCH HOTELS ----------------
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/hotels/`);
        const hotels = Array.isArray(res.data.results) ? res.data.results : [];

        // Fetch rooms and food counts per hotel

      
        const hotelsWithCounts = await Promise.all(
          hotels.map(async (hotel) => {
            const roomsRes = await axios.get(
              `${BASE_URL}/products/?hotel=${hotel.slug}&product_type=room`
            );
            const foodRes = await axios.get(
              `${BASE_URL}/products/?hotel=${hotel.slug}&product_type=food`
            );

            return {
              ...hotel,
              rooms_count: Array.isArray(roomsRes.data.results)
                ? roomsRes.data.results.length
                : 0,
              food_count: Array.isArray(foodRes.data.results)
                ? foodRes.data.results.length
                : 0,
            };
          })
        );

        




        // Group hotels by city
        const grouped = hotelsWithCounts.reduce((acc, hotel) => {
          const city = hotel.city || "Other";
          if (!acc[city]) acc[city] = [];
          acc[city].push(hotel);
          return acc;
        }, {});

        setHotelsByCity(grouped);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch hotels.");
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, []);

  //  DROPDOWN CLICK OUTSIDE 
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allCities = ["All", ...Object.keys(hotelsByCity)];
  const filteredHotels =
    selectedCity === "All"
      ? Object.values(hotelsByCity).flat()
      : hotelsByCity[selectedCity] || [];

  // M-PESA STK Push 
  const onBookRoom = async (hotelSlug, roomId, amount, phone) => {
    if (!phone || !amount) {
      alert("Phone number and amount are required.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await axios.post(`${BASE_URL}/payments/mpesa/stk_push/`, {
        phone,
        amount,
        room_id: roomId,
        hotel_slug: hotelSlug,
      });
      alert("STK push initiated. Check your phone.");
      console.log(res.data);
    } catch (err) {
      console.error(err);
      alert("Payment failed. Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <p className="text-gray-600 dark:text-gray-300 text-center mt-8 text-lg">
        Loading hotels...
      </p>
    );

  if (error)
    return <p className="text-red-500 text-center mt-8 text-lg">{error}</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* HEADER & CITY FILTER */}
      <div className="text-center mb-12 relative">
        <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Explore Our Hotels
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Browse hotels by city and find your perfect stay.
        </p>

        <div className="relative inline-block text-left" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="inline-flex justify-between w-48 rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition"
          >
            {selectedCity}
            <svg
              className={`-mr-1 ml-2 h-5 w-5 transition-transform duration-300 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.354a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div
            className={`absolute mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-50 transform transition-all duration-300 ${
              dropdownOpen
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <div className="py-1">
              {allCities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HOTEL GRID */}
      {filteredHotels.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300 text-center mt-8 text-lg">
          No hotels found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHotels.map((hotel) => (
            <div
              key={hotel.id}
              className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col justify-between"
            >
              <div className="w-full aspect-[4/3] bg-gray-100 rounded-t-2xl overflow-hidden flex items-center justify-center">
                <img
                  src={getImageUrl(hotel.image || "hotels/default-image.jpg")}
                  alt={hotel.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-6 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    {hotel.name}
                  </h3>
                  {hotel.address && (
                    <p className="text-gray-500 dark:text-gray-300 text-sm line-clamp-3">
                      {hotel.address}
                    </p>
                  )}

                  <div className="mt-2 flex gap-2 flex-wrap">
                    {hotel.rooms_count > 0 && (
                      <span className="px-2 py-1 text-xs bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-100 rounded-full">
                        {hotel.rooms_count} Rooms
                      </span>
                    )}
                    {hotel.food_count > 0 && (
                      <span className="px-2 py-1 text-xs bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-100 rounded-full">
                        {hotel.food_count} Menu Items
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/hotels/${hotel.slug}?product_type=food`}
                    className="flex-1 text-center bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    View Menu
                  </Link>

                  <Link
                    to={`/hotels/${hotel.slug}/rooms?product_type=room`}
                    className="flex-1 text-center bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-sm hover:bg-green-700 transition-colors"
                  >
                    View Rooms
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOADING OVERLAY */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <p className="text-white text-lg font-medium">
            Processing payment...
          </p>
        </div>
      )}
    </div>
  );
}

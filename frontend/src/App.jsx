import React, { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import HotelList from "./components/HotelList";
import MenuPage from "./components/MenuPage";
import RoomsPage from "./components/RoomsPage";
import ComparePage from "./components/ComparePage";
import CsvUpload from "./components/CsvUpload";
import RoomBooking from "./components/RoomBooking";
import ProductLinker from "./components/ProductLinker";
import ImageUpload from "./components/ImageUpload";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Safe JWT check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return setIsAdmin(false);

    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        setIsAdmin(false);
        return; // exit silently
      }
      const payload = JSON.parse(atob(parts[1]));
      setIsAdmin(Boolean(payload.is_staff || payload.is_superuser));
    } catch (err) {
      setIsAdmin(false); // silently fail
    }
  }, []);

  // Dark mode preference
  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored !== null ? stored === "true" : prefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      document.documentElement.classList.toggle("dark", newMode);
      localStorage.setItem("darkMode", newMode);
      return newMode;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-md bg-white dark:bg-gray-800 transition-colors duration-500">
        <div className="container mx-auto flex items-center justify-between p-4">
          <Link
            to="/"
            className="text-2xl font-bold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            Digital Menu
          </Link>

          <div className="flex items-center space-x-4">
            <nav className="space-x-6 flex items-center">
              <Link to="/" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition">Hotels</Link>
              <Link to="/compare" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition">Compare</Link>
              {/* Admin hidden menu */}
              {isAdmin && (
                <Link to="/admin/csv" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition">
                  CSV Upload
                </Link>
              )}
            </nav>

            {/* Dark/Light Mode Toggle */}
            <div
              onClick={toggleDarkMode}
              className="w-14 h-7 flex items-center bg-gray-300 dark:bg-gray-700 rounded-full p-1 cursor-pointer transition-colors duration-500"
              title="Toggle Dark/Light Mode"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform duration-500 ease-in-out ${
                  darkMode ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            Discover Your Perfect Hotel
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Browse menus, compare prices, and book rooms at the best hotels.
          </p>
          <Link
            to="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition"
          >
            Browse Hotels
          </Link>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 flex-1">
        <Routes>
          <Route path="/" element={<HotelList />} />
          <Route path="/hotels/:slug" element={<MenuPage />} />
          <Route path="/hotels/:slug/rooms" element={<RoomsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          {isAdmin && <Route path="/admin/csv" element={<CsvUpload />} />}
          <Route path="/book/:roomId" element={<RoomBooking />} />
          <Route path="/product/:id/link" element={<ProductLinker />} />
          <Route path="/product/:id/image" element={<ImageUpload />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-8 text-center text-gray-700 dark:text-gray-400 transition-colors duration-500">
        &copy; 2025 Digital Menu. All rights reserved.
      </footer>
    </div>
  );
}

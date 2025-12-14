import React, { useState } from "react";

export default function CsvUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    // ✅ Fetch token from localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You need to log in first.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/products/upload-csv/", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Upload failed");
      } else {
        setMessage(`✅ Created: ${data.created}, Skipped: ${data.skipped}`);
        setFile(null); // reset file input after success
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-600 pb-2">
        CSV Import
      </h2>

      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-200 mb-2 font-medium">
          Select CSV
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-gray-700 dark:text-gray-200 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        onClick={handleUpload}
        className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "Uploading..." : "Upload CSV"}
      </button>

      {error && (
        <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-800 border border-red-200 dark:border-red-700 p-2 rounded">
          {error}
        </p>
      )}
      {message && (
        <pre className="mt-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
          {message}
        </pre>
      )}
    </div>
  );
}

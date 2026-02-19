import React, { useState } from "react";
import { apiFetch } from "./api";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function CsvUpload({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    // Validate MIME / extension
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      setFile(null);
      return;
    }

    // Validate file size
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      return;
    }

    setFile(selected);
    setError(null);
  };

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

    try {
      const res = await apiFetch(
        "/products/upload-csv/",
        { method: "POST", body: formData },
        true // auth required — throws AUTH_MISSING or UNAUTHORIZED
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Upload failed. Please check the file format.");
      } else {
        setMessage(`Upload successful — Created: ${data.created}, Skipped: ${data.skipped}`);
        setFile(null);
        // Reset the file input visually
        const input = document.getElementById("csv-file-input");
        if (input) input.value = "";
        onSuccess?.();
      }
    } catch (err) {
      if (err.message === "AUTH_MISSING" || err.code === "UNAUTHORIZED") {
        setError("Your session has expired. Please log in again.");
      } else {
        console.error(err);
        setError("Network error. Please try again.");
      }
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
        <label
          htmlFor="csv-file-input"
          className="block text-gray-700 dark:text-gray-200 mb-2 font-medium"
        >
          Select CSV{" "}
          <span className="text-xs text-gray-400">(max {MAX_FILE_SIZE_MB} MB)</span>
        </label>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-gray-700 dark:text-gray-200 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {file && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {file.name} &mdash; {(file.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>

      <button
        onClick={handleUpload}
        className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading || !file}
      >
        {loading ? "Uploading..." : "Upload CSV"}
      </button>

      {error && (
        <p className="mt-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 rounded-lg text-sm">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-3 rounded-lg text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

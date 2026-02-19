import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "./api";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ImageUpload({ onSuccess }) {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP, etc.).");
      setFile(null);
      setPreview(null);
      return;
    }

    // FIX: validate file size before upload attempt
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`Image is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selected);
    // Revoke any previous object URL to avoid memory leaks
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
    setError(null);
    setMessage(null);
  };

  // Revoke object URL on unmount
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = async () => {
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      // FIX: apiFetch handles missing/expired tokens explicitly
      const res = await apiFetch(
        `/products/${id}/upload_image/`,
        { method: "POST", body: formData },
        true // auth required
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Upload failed. Please try again.");
      } else {
        setMessage("Image uploaded successfully!");
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
    <div className="p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md max-w-md mx-auto transition hover:shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Upload Product Image
      </h2>

      {/* FIX: label linked to input via htmlFor/id for accessibility */}
      <label
        htmlFor="image-upload-input"
        className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
      >
        Choose image{" "}
        <span className="text-xs text-gray-400">(max {MAX_FILE_SIZE_MB} MB)</span>
      </label>
      <input
        id="image-upload-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4 w-full text-gray-700 dark:text-gray-200"
      />

      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="h-36 w-full object-cover rounded mb-4 border border-gray-300 dark:border-gray-600"
        />
      )}

      {file && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {file.name} &mdash; {(file.size / 1024).toFixed(1)} KB
        </p>
      )}

      <button
        onClick={upload}
        disabled={loading || !file}
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p className="text-green-600 dark:text-green-400 mt-4 text-sm">{message}</p>
      )}
      {error && (
        <p className="text-red-500 dark:text-red-400 mt-4 text-sm">{error}</p>
      )}
    </div>
  );
}

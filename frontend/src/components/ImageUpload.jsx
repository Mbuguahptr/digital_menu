import React, { useState } from "react";
import { useParams } from "react-router-dom";

export default function ImageUpload() {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError(null);
  };

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
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You must be logged in to upload.");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/products/${id}/upload_image/`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Upload failed.");
      } else {
        setMessage("✅ Image uploaded successfully!");
        // Optionally, keep the preview after successful upload
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md max-w-md mx-auto transition hover:shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Upload Product Image
      </h2>

      <input
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

      <button
        onClick={upload}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p className="text-green-600 dark:text-green-400 mt-4">{message}</p>
      )}
      {error && (
        <p className="text-red-500 dark:text-red-400 mt-4">{error}</p>
      )}
    </div>
  );
}

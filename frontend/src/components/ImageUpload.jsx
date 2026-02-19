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
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`Image is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(selected);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
    setError(null);
    setMessage(null);
  };

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
      const res = await apiFetch(
        `/products/${id}/upload_image/`,
        { method: "POST", body: formData },
        true,
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
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "3rem auto", padding: "0 1.5rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <p
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: "0.4rem",
          }}
        >
          Admin
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            fontWeight: 300,
            color: "var(--text)",
          }}
        >
          Upload{" "}
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Image</em>
        </h2>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "1.75rem",
        }}
      >
        <label
          htmlFor="image-upload-input"
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--muted)",
            display: "block",
            marginBottom: "0.5rem",
          }}
        >
          Choose image{" "}
          <span style={{ color: "var(--border)" }}>
            (max {MAX_FILE_SIZE_MB} MB)
          </span>
        </label>
        <input
          id="image-upload-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{
            width: "100%",
            color: "var(--muted)",
            fontSize: "0.8rem",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            padding: "0.6rem 0.75rem",
            boxSizing: "border-box",
            marginBottom: "1rem",
          }}
        />

        {preview && (
          <div
            style={{
              width: "100%",
              height: 200,
              overflow: "hidden",
              marginBottom: "0.75rem",
              border: "1px solid var(--border)",
            }}
          >
            <img
              src={preview}
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        {file && (
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--muted)",
              marginBottom: "1rem",
            }}
          >
            {file.name} — {(file.size / 1024).toFixed(1)} KB
          </p>
        )}

        <button
          onClick={upload}
          disabled={loading || !file}
          style={{
            width: "100%",
            padding: "0.7rem",
            background: loading || !file ? "transparent" : "var(--gold)",
            border: "1px solid var(--gold)",
            color: loading || !file ? "var(--gold-dim)" : "var(--bg)",
            fontSize: "0.7rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            cursor: loading || !file ? "not-allowed" : "pointer",
            opacity: loading || !file ? 0.5 : 1,
            transition: "background 0.2s, color 0.2s",
          }}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

        {message && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              border: "1px solid var(--gold-dim)",
              background: "rgba(201,169,110,0.05)",
              fontSize: "0.8rem",
              color: "var(--gold)",
            }}
          >
            {message}
          </div>
        )}
        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              border: "1px solid #5a1a1a",
              background: "rgba(200,0,0,0.05)",
              fontSize: "0.8rem",
              color: "#e05",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

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
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      setFile(null);
      return;
    }
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
        true,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Upload failed. Please check the file format.");
      } else {
        setMessage(
          `Upload successful — Created: ${data.created}, Skipped: ${data.skipped}`,
        );
        setFile(null);
        const input = document.getElementById("csv-file-input");
        if (input) input.value = "";
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
    <div style={{ maxWidth: 520, margin: "3rem auto", padding: "0 1.5rem" }}>
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
          CSV{" "}
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Import</em>
        </h2>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "1.75rem",
        }}
      >
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            htmlFor="csv-file-input"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--muted)",
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            Select CSV{" "}
            <span style={{ color: "var(--border)" }}>
              (max {MAX_FILE_SIZE_MB} MB)
            </span>
          </label>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              width: "100%",
              color: "var(--muted)",
              fontSize: "0.8rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              padding: "0.6rem 0.75rem",
              boxSizing: "border-box",
            }}
          />
          {file && (
            <p
              style={{
                marginTop: "0.4rem",
                fontSize: "0.7rem",
                color: "var(--muted)",
              }}
            >
              {file.name} — {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>

        <button
          onClick={handleUpload}
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
          {loading ? "Uploading..." : "Upload CSV"}
        </button>

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
      </div>
    </div>
  );
}

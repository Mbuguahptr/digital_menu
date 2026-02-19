import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "./api";

export default function ProductLinker() {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/products/${id}/suggest_links/`, {}, true)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setMatches(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message === "AUTH_MISSING" || err.code === "UNAUTHORIZED"
              ? "Your session has expired. Please log in again."
              : "Failed to fetch suggestions.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const linkProduct = async () => {
    if (!selected) {
      setError("Please select a product to link.");
      return;
    }
    setLinking(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(
        `/products/${id}/link/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canonical_id: selected }),
        },
        true,
      );
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Linking failed.");
      else setMessage("Product linked successfully!");
    } catch (err) {
      setError(
        err.message === "AUTH_MISSING" || err.code === "UNAUTHORIZED"
          ? "Your session has expired. Please log in again."
          : "Network error. Please try again.",
      );
    } finally {
      setLinking(false);
    }
  };

  if (loading)
    return (
      <p
        style={{
          color: "var(--muted)",
          textAlign: "center",
          marginTop: "3rem",
        }}
      >
        Loading suggestions...
      </p>
    );

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
          Link{" "}
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Product</em>
        </h2>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "1.75rem",
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: "1rem",
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

        {matches.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            No suggested products found.
          </p>
        ) : (
          <>
            <label
              htmlFor="product-link-select"
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--muted)",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              Select a product to link
            </label>
            <select
              id="product-link-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                padding: "0.65rem 0.75rem",
                fontSize: "0.875rem",
                borderRadius: 2,
                fontFamily: "var(--font-body)",
                outline: "none",
                marginBottom: "1.25rem",
                boxSizing: "border-box",
              }}
            >
              <option value="">— Select a product —</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.hotel?.name ?? "Unknown Hotel"})
                </option>
              ))}
            </select>

            <button
              onClick={linkProduct}
              disabled={linking || !selected}
              style={{
                width: "100%",
                padding: "0.7rem",
                background:
                  linking || !selected ? "transparent" : "var(--gold)",
                border: "1px solid var(--gold)",
                color: linking || !selected ? "var(--gold-dim)" : "var(--bg)",
                fontSize: "0.7rem",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                cursor: linking || !selected ? "not-allowed" : "pointer",
                opacity: linking || !selected ? 0.5 : 1,
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {linking ? "Linking..." : "Link Product"}
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
          </>
        )}
      </div>
    </div>
  );
}

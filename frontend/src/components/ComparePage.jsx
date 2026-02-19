import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import getImageUrl from "../utils/getImageUrl";

const API = import.meta.env.VITE_API_BASE ?? "/api";

export default function ComparePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const sku = params.get("sku");
  const name = params.get("name");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchComparison = useCallback(async () => {
    if (!sku && !name) return;
    setLoading(true);
    setError("");
    try {
      const query = sku ? `sku=${encodeURIComponent(sku)}` : `name=${encodeURIComponent(name)}`;
      const res = await axios.get(`${API}/products/compare/?${query}`);
      setProducts(res.data);
    } catch {
      setError("Failed to load comparison data.");
    } finally {
      setLoading(false);
    }
  }, [sku, name]);

  useEffect(() => { fetchComparison(); }, [fetchComparison]);

  const updateQuery = (field, value) => {
    const p = new URLSearchParams(location.search);
    if (value) p.set(field, value); else p.delete(field);
    navigate({ search: p.toString() }, { replace: true });
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 300, marginBottom: "1.5rem", color: "var(--text)" }}>
        Compare Products
      </h2>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <input
          placeholder="Search by SKU..."
          defaultValue={sku || ""}
          onBlur={e => updateQuery("sku", e.target.value)}
          onKeyDown={e => e.key === "Enter" && updateQuery("sku", e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          placeholder="Search by name..."
          defaultValue={name || ""}
          onBlur={e => updateQuery("name", e.target.value)}
          onKeyDown={e => e.key === "Enter" && updateQuery("name", e.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      {loading && <p style={{ color: "var(--muted)" }}>Loading...</p>}
      {error && <p style={{ color: "#e05" }}>{error}</p>}
      {!loading && !error && products.length === 0 && (sku || name) && (
        <p style={{ color: "var(--muted)" }}>No products found.</p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
        {products.map(p => (
          <div key={p.id} className="card">
            {p.image && (
              <img src={getImageUrl(p.image)} alt={p.name}
                style={{ width: "100%", height: 160, objectFit: "cover", marginBottom: "1rem", borderRadius: 2 }} />
            )}
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--text)", marginBottom: "0.25rem" }}>{p.name}</p>
            <p style={{ color: "var(--gold)", fontWeight: 500, marginBottom: "0.25rem" }}>{p.currency} {p.price}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{p.hotel?.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

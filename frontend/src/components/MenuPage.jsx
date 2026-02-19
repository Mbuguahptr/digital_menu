import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import getImageUrl from "../utils/getImageUrl";
import { API_BASE } from "./api";

// Defined once outside — avoids re-injection on every render
const GRID_STYLE = {
  display: "grid",
  gap: "22px",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
};

/* =======================
   MENU CARD
========================= */
function MenuCard({ p }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          aspectRatio: "2/3",
          overflow: "hidden",
          borderRadius: 4,
          background: "var(--surface)",
          cursor: "pointer",
          transition: "transform 0.3s ease",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      >
        {p.image ? (
          <img
            src={getImageUrl(p.image)}
            alt={p.name}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
            }}
          >
            No Image
          </div>
        )}

        {/* Permanent bottom gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 75%)",
            pointerEvents: "none",
          }}
        />

        {/* Hover overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <Link
            to={`/compare?name=${encodeURIComponent(p.name)}`}
            style={{
              width: "100%",
              textAlign: "center",
              padding: "0.6rem",
              background: "var(--gold)",
              color: "var(--bg)",
              fontSize: "0.65rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Compare
          </Link>
        </div>
      </div>

      {/* Text below card */}
      <div style={{ marginTop: "0.7rem", textAlign: "center" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            color: "var(--text)",
            marginBottom: "0.25rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {p.name}
        </p>
        <p
          style={{ fontSize: "0.8rem", color: "var(--gold)", fontWeight: 500 }}
        >
          {p.currency} {p.price}
        </p>
      </div>
    </div>
  );
}

/* =========================
   MENU PAGE
========================= */
export default function MenuPage() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const cancelSource = axios.CancelToken.source();
    mountedRef.current = true;
    const allProducts = [];

    const fetchPage = async (url) => {
      const res = await axios.get(url, { cancelToken: cancelSource.token });
      const fetched = Array.isArray(res.data.results)
        ? res.data.results
        : Array.isArray(res.data)
          ? res.data
          : [];
      allProducts.push(...fetched);
      if (res.data.next) await fetchPage(res.data.next);
    };

    const run = async () => {
      try {
        setProducts([]);
        setLoading(true);
        setError(null);
        await fetchPage(
          `${API_BASE}/products/?hotel_slug=${slug}&product_type=food`,
        );
        if (mountedRef.current) {
          setProducts(allProducts);
          setLoading(false);
        }
      } catch (err) {
        if (!axios.isCancel(err) && mountedRef.current) {
          setError("Failed to load menu.");
          setLoading(false);
        }
      }
    };

    run();
    return () => cancelSource.cancel();
  }, [slug]);

  if (loading)
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* FIX: inline GRID_STYLE so skeleton renders correctly */}
        <div style={GRID_STYLE}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "2/3",
                background: "var(--surface)",
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <p style={{ color: "#e05", textAlign: "center", marginTop: "3rem" }}>
        {error}
      </p>
    );

  if (!products.length)
    return (
      <p
        style={{
          color: "var(--muted)",
          textAlign: "center",
          marginTop: "3rem",
        }}
      >
        No menu items found.
      </p>
    );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.2rem 4rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <p
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: "0.5rem",
          }}
        >
          Culinary Selection
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.8rem,4vw,2.8rem)",
            fontWeight: 300,
            color: "var(--text)",
          }}
        >
          The{" "}
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Menu</em>
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            marginTop: "0.75rem",
          }}
        >
          <div
            style={{ width: 30, height: 1, background: "var(--gold-dim)" }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              background: "var(--gold)",
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{ width: 30, height: 1, background: "var(--gold-dim)" }}
          />
        </div>
      </div>

      {/* Grid */}
      <div style={GRID_STYLE}>
        {products.map((p) => (
          <MenuCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

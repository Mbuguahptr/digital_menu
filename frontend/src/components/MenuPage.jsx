import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import getImageUrl from "../utils/getImageUrl";
import { API_BASE } from "./api";

export default function MenuPage() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const cancelSource = axios.CancelToken.source();
    mountedRef.current = true;
    const allProducts = [];

    const fetchPage = async (url) => {
      const res = await axios.get(url, { cancelToken: cancelSource.token });
      const fetched = Array.isArray(res.data.results)
        ? res.data.results
        : Array.isArray(res.data) ? res.data : [];
      allProducts.push(...fetched);
      if (res.data.next) await fetchPage(res.data.next);
    };

    const run = async () => {
      try {
        setProducts([]);
        setLoading(true);
        setError(null);
        await fetchPage(`${API_BASE}/products/?hotel_slug=${slug}&product_type=food`);
        if (mountedRef.current) { setProducts(allProducts); setLoading(false); }
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (mountedRef.current) { setError("Failed to load menu."); setLoading(false); }
      }
    };

    run();
    return () => cancelSource.cancel();
  }, [slug]);

  if (loading) return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1.5rem",
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            height: 340, borderRadius: 2,
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <p style={{ color: "#e05", textAlign: "center", marginTop: "3rem" }}>{error}</p>
  );

  if (!products.length) return (
    <p style={{ color: "var(--muted)", textAlign: "center", marginTop: "3rem" }}>
      No menu items found.
    </p>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem 4rem" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <p style={{
          fontSize: "0.65rem", letterSpacing: "0.4em",
          textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.5rem",
        }}>
          Culinary Selection
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 300, color: "var(--text)",
        }}>
          The <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Menu</em>
        </h2>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "0.75rem", marginTop: "0.75rem",
        }}>
          <div style={{ width: 30, height: 1, background: "var(--gold-dim)" }} />
          <div style={{ width: 4, height: 4, background: "var(--gold)", transform: "rotate(45deg)" }} />
          <div style={{ width: 30, height: 1, background: "var(--gold-dim)" }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1.5rem",
      }}>
        {products.map(p => (
          <div
            key={p.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 2,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--gold-dim)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Image */}
            <div style={{
              width: "100%", aspectRatio: "1/1",
              overflow: "hidden", background: "var(--bg)",
              position: "relative",
            }}>
              {p.image ? (
                <img
                  src={getImageUrl(p.image)}
                  alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--border)", fontSize: "0.75rem", letterSpacing: "0.1em",
                }}>
                  No Image
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.15rem", fontWeight: 400,
                color: "var(--text)", marginBottom: "0.25rem",
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {p.name}
              </h3>

              <p style={{ color: "var(--gold)", fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                {p.currency} {p.price}
              </p>

              {p.description && (
                <p style={{
                  color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6,
                  marginBottom: "1rem", flex: 1,
                  display: "-webkit-box", WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {p.description}
                </p>
              )}

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
                <Link
                  to={`/compare?name=${encodeURIComponent(p.name)}`}
                  style={{
                    padding: "0.35rem 0.9rem",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase",
                    textDecoration: "none",
                    transition: "border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-dim)"; e.currentTarget.style.color = "var(--gold)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
                >
                  Compare
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
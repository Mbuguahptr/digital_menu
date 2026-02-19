import React from "react";
import { Link } from "react-router-dom";
import getImageUrl from "../utils/getImageUrl";

export default function ProductCard({ product }) {
  const imageUrl = getImageUrl(product.image);

  return (
    <div
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
      {imageUrl && (
        <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: "var(--bg)" }}>
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.15rem", fontWeight: 400,
          color: "var(--text)", marginBottom: "0.25rem",
        }}>
          {product.name}
        </h3>

        <p style={{ color: "var(--gold)", fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.5rem" }}>
          {product.currency} {product.price}
        </p>

        {product.description && (
          <p style={{
            color: "var(--muted)", fontSize: "0.8rem",
            lineHeight: 1.6, marginBottom: "1rem", flex: 1,
            display: "-webkit-box", WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {product.description}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "auto" }}>
          <Link
            to={`/compare?name=${encodeURIComponent(product.name)}`}
            style={{
              flex: 1, textAlign: "center",
              padding: "0.4rem 0.75rem",
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
          <Link
            to={`/book/${product.id}`}
            style={{
              flex: 1, textAlign: "center",
              padding: "0.4rem 0.75rem",
              border: "1px solid var(--gold)",
              color: "var(--gold)",
              fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase",
              textDecoration: "none",
              transition: "background 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold)"; }}
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}
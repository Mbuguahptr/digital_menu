import React, { useState } from "react";
import { Link } from "react-router-dom";
import getImageUrl from "../utils/getImageUrl";

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
  const imageUrl = getImageUrl(product.image);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        aspectRatio: "2/3",
        overflow: "hidden",
        borderRadius: 2,
        background: "var(--surface)",
        cursor: "pointer",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.5s ease",
            transform: hovered ? "scale(1.07)" : "scale(1)",
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
          }}
        >
          No Image
        </div>
      )}
      {/* Permanent gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Hover overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "1rem",
        }}
      >
        <Link
          to={`/compare?name=${encodeURIComponent(product.name)}`}
          style={{
            width: "100%",
            textAlign: "center",
            padding: "0.55rem",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.5)",
            color: "#fff",
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Compare
        </Link>
        <Link
          to={`/book/${product.id}`}
          style={{
            width: "100%",
            textAlign: "center",
            padding: "0.55rem",
            background: "var(--gold)",
            color: "var(--bg)",
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Book
        </Link>
      </div>
      {/* Bottom info */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0.75rem",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            color: "#fff",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "0.15rem",
          }}
        >
          {product.name}
        </p>
        <p
          style={{ fontSize: "0.75rem", color: "var(--gold)", fontWeight: 500 }}
        >
          {product.currency} {product.price}
        </p>
        {product.description && (
          <p
            style={{
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.5)",
              marginTop: "0.15rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {product.description}
          </p>
        )}
      </div>
    </div>
  );
}

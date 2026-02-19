import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import getImageUrl from "../utils/getImageUrl";
import { API_BASE } from "./api";

export default function RoomsPage() {
  const { slug } = useParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const cancelSource = axios.CancelToken.source();
    mountedRef.current = true;
    const allRooms = [];

    const fetchPage = async (url) => {
      const res = await axios.get(url, { cancelToken: cancelSource.token });
      const fetched = Array.isArray(res.data.results)
        ? res.data.results
        : Array.isArray(res.data) ? res.data : [];
      allRooms.push(...fetched);
      if (res.data.next) await fetchPage(res.data.next);
    };

    const run = async () => {
      try {
        setRooms([]); setLoading(true); setError(null);
        await fetchPage(`${API_BASE}/products/?hotel_slug=${slug}&product_type=room`);
        if (mountedRef.current) { setRooms(allRooms); setLoading(false); }
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (mountedRef.current) { setError("Failed to load rooms."); setLoading(false); }
      }
    };

    run();
    return () => cancelSource.cancel();
  }, [slug]);

  if (loading) return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", height: 380, borderRadius: 2 }} />
        ))}
      </div>
    </div>
  );

  if (error) return <p style={{ color: "#e05", textAlign: "center", marginTop: "3rem" }}>{error}</p>;

  if (!rooms.length) return (
    <p style={{ color: "var(--muted)", textAlign: "center", marginTop: "3rem" }}>No rooms available.</p>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem 4rem" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.4em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.5rem" }}>
          Available Accommodation
        </p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 300, color: "var(--text)" }}>
          Our <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Rooms</em>
        </h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
          <div style={{ width: 30, height: 1, background: "var(--gold-dim)" }} />
          <div style={{ width: 4, height: 4, background: "var(--gold)", transform: "rotate(45deg)" }} />
          <div style={{ width: 30, height: 1, background: "var(--gold-dim)" }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {rooms.map(room => (
          <div
            key={room.id}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 2, overflow: "hidden",
              display: "flex", flexDirection: "column",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-dim)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {/* Image */}
            <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: "var(--bg)" }}>
              {room.image ? (
                <img
                  src={getImageUrl(room.image)} alt={room.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--border)", fontSize: "0.75rem" }}>
                  No Image
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--text)", marginBottom: "0.25rem" }}>
                {room.name}
              </h3>
              <p style={{ color: "var(--gold)", fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                {room.currency} {room.price} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.75rem" }}>/ night</span>
              </p>
              {room.description && (
                <p style={{
                  color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6,
                  marginBottom: "0.75rem", flex: 1,
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {room.description}
                </p>
              )}
              {room.available_rooms != null && (
                <p style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                  {room.available_rooms} rooms available
                </p>
              )}
              <Link
                to={`/book/${room.id}?hotel=${slug}`}
                style={{
                  display: "block", textAlign: "center", marginTop: "auto",
                  padding: "0.6rem",
                  border: "1px solid var(--gold)", color: "var(--gold)",
                  fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase",
                  textDecoration: "none", transition: "background 0.2s, color 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold)"; }}
              >
                Book Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
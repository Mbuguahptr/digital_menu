import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import getImageUrl from "../utils/getImageUrl";
import axios from "axios";
import { API_BASE } from "./api";

export default function HotelList() {
  const [hotelsByCity, setHotelsByCity] = useState({});
  const [selectedCity, setSelectedCity] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const cancelSource = axios.CancelToken.source();
    let cancelled = false;

    const fetchHotels = async () => {
      try {
        const res = await axios.get(`${API_BASE}/hotels/`, {
          cancelToken: cancelSource.token,
        });
        const hotels = Array.isArray(res.data.results) ? res.data.results : [];

        const hotelsWithCounts = await Promise.all(
          hotels.map(async (hotel) => {
            const [roomsRes, foodRes] = await Promise.all([
              axios.get(`${API_BASE}/products/`, {
                params: { hotel: hotel.slug, product_type: "room", page_size: 1 },
                cancelToken: cancelSource.token,
              }),
              axios.get(`${API_BASE}/products/`, {
                params: { hotel: hotel.slug, product_type: "food", page_size: 1 },
                cancelToken: cancelSource.token,
              }),
            ]);
            return {
              ...hotel,
              rooms_count: roomsRes.data.count ?? 0,
              food_count: foodRes.data.count ?? 0,
            };
          })
        );

        if (cancelled) return;

        const grouped = hotelsWithCounts.reduce((acc, hotel) => {
          const city = hotel.city || "Other";
          if (!acc[city]) acc[city] = [];
          acc[city].push(hotel);
          return acc;
        }, {});

        setHotelsByCity(grouped);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError("Failed to fetch hotels. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHotels();
    return () => { cancelled = true; cancelSource.cancel(); };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allCities = ["All", ...Object.keys(hotelsByCity)];
  const filteredHotels =
    selectedCity === "All"
      ? Object.values(hotelsByCity).flat()
      : hotelsByCity[selectedCity] || [];

  if (loading) return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "2rem",
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            overflow: "hidden",
            height: 380,
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <p style={{ color: "#e05", textAlign: "center", marginTop: "3rem" }}>{error}</p>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem 4rem" }}>

      {/* ── Section header ──────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <p style={{
          fontSize: "0.65rem", letterSpacing: "0.4em",
          textTransform: "uppercase", color: "var(--gold)",
          marginBottom: "0.75rem",
        }}>
          Kenya's Finest
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.8rem, 4vw, 3rem)",
          fontWeight: 300,
          color: "var(--text)",
          marginBottom: "0.75rem",
        }}>
          Our <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Hotels</em>
        </h2>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "0.75rem", marginBottom: "1.5rem",
        }}>
          <div style={{ width: 30, height: 1, background: "var(--gold-dim)" }} />
          <div style={{ width: 4, height: 4, background: "var(--gold)", transform: "rotate(45deg)" }} />
          <div style={{ width: 30, height: 1, background: "var(--gold-dim)" }} />
        </div>

        {/* City filter dropdown */}
        <div style={{ position: "relative", display: "inline-block" }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 1.25rem",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase",
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-dim)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
          >
            {selectedCity}
            <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"
              style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.354a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {dropdownOpen && (
            <ul role="listbox" style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0,
              minWidth: "100%", zIndex: 50,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              listStyle: "none", padding: "0.25rem 0",
            }}>
              {allCities.map(city => (
                <li key={city} role="option" aria-selected={selectedCity === city}>
                  <button
                    onClick={() => { setSelectedCity(city); setDropdownOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "0.5rem 1.25rem",
                      background: selectedCity === city ? "var(--border)" : "transparent",
                      color: selectedCity === city ? "var(--gold)" : "var(--muted)",
                      fontSize: "0.75rem", letterSpacing: "0.1em",
                      border: "none", cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = selectedCity === city ? "var(--border)" : "transparent";
                      e.currentTarget.style.color = selectedCity === city ? "var(--gold)" : "var(--muted)";
                    }}
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Hotel grid ──────────────────────────────────────────────────── */}
      {filteredHotels.length === 0 ? (
        <p style={{ color: "var(--muted)", textAlign: "center", marginTop: "3rem" }}>
          No hotels found.
        </p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "2rem",
        }}>
          {filteredHotels.map(hotel => (
            <div
              key={hotel.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
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
              <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: "var(--bg)" }}>
                <img
                  src={getImageUrl(hotel.image || "hotels/default-image.jpg")}
                  alt={hotel.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                />
              </div>

              {/* Content */}
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", flex: 1 }}>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.3rem", fontWeight: 400,
                  color: "var(--text)", marginBottom: "0.4rem",
                }}>
                  {hotel.name}
                </h3>

                {hotel.address && (
                  <p style={{
                    color: "var(--muted)", fontSize: "0.8rem",
                    lineHeight: 1.6, marginBottom: "1rem",
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {hotel.address}
                  </p>
                )}

                {/* Badges */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                  {hotel.rooms_count > 0 && (
                    <span style={{
                      padding: "0.2rem 0.6rem",
                      border: "1px solid var(--gold-dim)",
                      color: "var(--gold)",
                      fontSize: "0.65rem", letterSpacing: "0.1em",
                    }}>
                      {hotel.rooms_count} Rooms
                    </span>
                  )}
                  {hotel.food_count > 0 && (
                    <span style={{
                      padding: "0.2rem 0.6rem",
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                      fontSize: "0.65rem", letterSpacing: "0.1em",
                    }}>
                      {hotel.food_count} Menu Items
                    </span>
                  )}
                </div>

                {/* CTA buttons */}
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "auto" }}>
                  <Link
                    to={`/hotels/${hotel.slug}?product_type=food`}
                    style={{
                      flex: 1, textAlign: "center",
                      padding: "0.5rem",
                      border: "1px solid var(--gold)",
                      color: "var(--gold)",
                      fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase",
                      textDecoration: "none",
                      transition: "background 0.2s, color 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--bg)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold)"; }}
                  >
                    View Menu
                  </Link>
                  <Link
                    to={`/hotels/${hotel.slug}/rooms?product_type=room`}
                    style={{
                      flex: 1, textAlign: "center",
                      padding: "0.5rem",
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                      fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase",
                      textDecoration: "none",
                      transition: "border-color 0.2s, color 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-dim)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
                  >
                    View Rooms
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
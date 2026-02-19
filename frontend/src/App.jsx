import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import HotelList from "./components/HotelList";
import MenuPage from "./components/MenuPage";
import RoomsPage from "./components/RoomsPage";
import ComparePage from "./components/ComparePage";
import CsvUpload from "./components/CsvUpload";
import RoomBooking from "./components/RoomBooking";
import ProductLinker from "./components/ProductLinker";
import ImageUpload from "./components/ImageUpload";

// ── CSS tokens (mirror index.html so everything stays in sync) ──────────────
const T = {
  bg:       "var(--bg)",
  surface:  "var(--surface)",
  border:   "var(--border)",
  gold:     "var(--gold)",
  goldDim:  "var(--gold-dim)",
  text:     "var(--text)",
  muted:    "var(--muted)",
};

// ── Protected route ──────────────────────────────────────────────────────────
function AdminRoute({ isAdmin, children }) {
  if (!isAdmin) {
    return (
      <div style={{ textAlign: "center", marginTop: "6rem", color: T.muted }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem", color: T.text }}>
          Access Denied
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>You don't have permission to view this page.</p>
        <Link to="/" style={{ color: T.gold, textDecoration: "none", borderBottom: `1px solid ${T.goldDim}` }}>
          ← Back to Hotels
        </Link>
      </div>
    );
  }
  return children;
}

// ── 404 ──────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div style={{ textAlign: "center", marginTop: "6rem", color: T.muted }}>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(4rem, 10vw, 7rem)",
        fontWeight: 300,
        color: T.goldDim,
        lineHeight: 1,
        marginBottom: "1rem",
      }}>
        404
      </h2>
      <p style={{ marginBottom: "2rem", color: T.muted, letterSpacing: "0.1em" }}>
        Page not found
      </p>
      <Link to="/" style={{ color: T.gold, textDecoration: "none", borderBottom: `1px solid ${T.goldDim}` }}>
        ← Back to Hotels
      </Link>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [isAdmin, setIsAdmin]   = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Decode JWT and check expiry
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return setIsAdmin(false);
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return setIsAdmin(false);
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        return setIsAdmin(false);
      }
      setIsAdmin(Boolean(payload.is_staff || payload.is_superuser));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isHome = location.pathname === "/";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100dvh",
      background: T.bg,
      color: T.text,
      fontFamily: "var(--font-body)",
    }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(15,14,12,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Wordmark */}
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 300,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: T.text,
            }}>
              Digital<em style={{ fontStyle: "italic", color: T.gold }}>&nbsp;Menu</em>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }}
               aria-label="Main navigation">
            {[
              { to: "/",       label: "Hotels" },
              { to: "/compare", label: "Compare" },
              ...(isAdmin ? [{ to: "/admin/csv", label: "CSV Upload" }] : []),
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                style={{
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: location.pathname === to ? T.gold : T.muted,
                  borderBottom: location.pathname === to
                    ? `1px solid ${T.gold}` : "1px solid transparent",
                  paddingBottom: "2px",
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Hero: home only ─────────────────────────────────────────────── */}
      {isHome && (
        <section style={{
          position: "relative",
          padding: "7rem 1.5rem 6rem",
          textAlign: "center",
          overflow: "hidden",
        }}>
          {/* Radial gold glow behind the headline */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "300px",
            background: `radial-gradient(ellipse, ${T.goldDim}22 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          <p style={{
            fontSize: "0.65rem",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: T.gold,
            marginBottom: "1.5rem",
          }}>
            Hotels &amp; Dining · Kenya
          </p>

          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            fontWeight: 300,
            lineHeight: 1.1,
            color: T.text,
            marginBottom: "1.5rem",
            letterSpacing: "0.02em",
          }}>
            Discover Your<br />
            <em style={{ fontStyle: "italic", color: T.gold }}>Perfect Stay</em>
          </h1>

          {/* Decorative rule */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{ width: "40px", height: "1px", background: T.goldDim }} />
            <div style={{ width: "5px", height: "5px", background: T.gold, transform: "rotate(45deg)" }} />
            <div style={{ width: "40px", height: "1px", background: T.goldDim }} />
          </div>

          <p style={{
            fontSize: "1rem",
            color: T.muted,
            maxWidth: "480px",
            margin: "0 auto 2.5rem",
            lineHeight: 1.7,
            fontWeight: 300,
          }}>
            Browse menus, compare prices, and book rooms at the finest hotels in Kenya.
          </p>

          <a
            href="#hotel-list"
            style={{
              display: "inline-block",
              padding: "0.75rem 2.5rem",
              background: "transparent",
              border: `1px solid ${T.gold}`,
              color: T.gold,
              fontSize: "0.7rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "background 0.2s, color 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = T.gold;
              e.currentTarget.style.color = T.bg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = T.gold;
            }}
          >
            Browse Hotels
          </a>
        </section>
      )}

      {/* ── Thin gold divider ────────────────────────────────────────────── */}
      {isHome && (
        <div style={{ height: "1px", background: `linear-gradient(to right, transparent, ${T.goldDim}, transparent)` }} />
      )}

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main id="hotel-list" style={{ flex: 1, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "3rem 1.5rem" }}>
        <Routes>
          <Route path="/"                   element={<HotelList />} />
          <Route path="/hotels/:slug"        element={<MenuPage />} />
          <Route path="/hotels/:slug/rooms"  element={<RoomsPage />} />
          <Route path="/compare"             element={<ComparePage />} />
          <Route
            path="/admin/csv"
            element={
              <AdminRoute isAdmin={isAdmin}>
                <CsvUpload />
              </AdminRoute>
            }
          />
          <Route path="/book/:roomId"        element={<RoomBooking />} />
          <Route path="/product/:id/link"    element={<ProductLinker />} />
          <Route path="/product/:id/image"   element={<ImageUpload />} />
          <Route path="*"                    element={<NotFound />} />
        </Routes>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        padding: "2.5rem 1.5rem",
        textAlign: "center",
      }}>
        {/* Decorative rule above text */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}>
          <div style={{ width: "30px", height: "1px", background: T.border }} />
          <div style={{ width: "4px", height: "4px", background: T.goldDim, transform: "rotate(45deg)" }} />
          <div style={{ width: "30px", height: "1px", background: T.border }} />
        </div>

        <p style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.1rem",
          fontWeight: 300,
          letterSpacing: "0.15em",
          color: T.muted,
          marginBottom: "0.5rem",
        }}>
          Digital <em style={{ fontStyle: "italic", color: T.goldDim }}>Menu</em>
        </p>

        <p style={{
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: T.border,
        }}>
          &copy; {new Date().getFullYear()} · All rights reserved 
        </p>
      </footer>
    </div>
  );
}
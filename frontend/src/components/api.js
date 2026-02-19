// ─── Shared API Configuration ────────────────────────────────────────────────
// Single source of truth for API base URL and auth headers.
// Import these helpers instead of repeating them across components.

export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/**
 * Returns Authorization headers if a token exists in localStorage.
 * Throws a clear error (instead of silently sending "Bearer null") when missing.
 *
 * @param {boolean} required - If true, throws when no token is found.
 */
export function getAuthHeaders(required = true) {
  const token = localStorage.getItem("token");
  if (!token) {
    if (required) throw new Error("AUTH_MISSING");
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * Wrapper around fetch that:
 *  - Prepends API_BASE automatically
 *  - Injects auth headers when needed
 *  - Throws a typed error on 401 so components can redirect to login
 */
export async function apiFetch(path, options = {}, authRequired = false) {
  const headers = {
    ...(options.headers ?? {}),
    ...(authRequired ? getAuthHeaders(true) : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  return res;
}

/**
 * Validates a Kenyan M-Pesa phone number.
 * Accepts formats: 07XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX
 * Normalises to 2547XXXXXXXX or 2541XXXXXXXX.
 */
export function validateAndNormalisePhone(raw) {
  const cleaned = raw.replace(/\s+/g, "").replace(/^\+/, "");
  // Already in international format
  if (/^254(7|1)\d{8}$/.test(cleaned)) return { valid: true, phone: cleaned };
  // Local 07/01 format
  if (/^0(7|1)\d{8}$/.test(cleaned))
    return { valid: true, phone: `254${cleaned.slice(1)}` };
  return { valid: false, phone: null };
}

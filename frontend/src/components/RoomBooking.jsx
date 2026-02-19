import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { API_BASE, validateAndNormalisePhone } from "./api";

const S = {
  label: {
    fontSize: "0.65rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--muted)",
    display: "block",
    marginBottom: "0.4rem",
  },
  input: {
    width: "100%",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "0.65rem 0.75rem",
    fontSize: "0.875rem",
    borderRadius: 2,
    fontFamily: "var(--font-body)",
    outline: "none",
    boxSizing: "border-box",
  },
};

export default function RoomBooking() {
  const { roomId } = useParams();
  const location = useLocation();
  const hotelSlug = new URLSearchParams(location.search).get("hotel");

  const [product, setProduct] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [available, setAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [phone, setPhone] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [checkoutId, setCheckoutId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const paymentStatusRef = useRef(paymentStatus);
  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);

  const today = new Date().toISOString().split("T")[0];

  const fetchProduct = useCallback(async () => {
    if (!roomId || !hotelSlug) {
      setFetchError("Invalid room or hotel.");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/products/?hotel=${hotelSlug}&product_type=room`,
      );
      if (!res.ok) throw new Error("Failed to fetch products list");
      const data = await res.json();
      const room = data.results.find((p) => p.id === Number(roomId));
      if (!room) throw new Error("Room not found");
      room.price = Number(room.price);
      setProduct(room);
      setFetchError(null);
    } catch (err) {
      setFetchError(err.message);
      setProduct(null);
    }
  }, [roomId, hotelSlug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (start && end && product?.price) {
      const nights = Math.round((new Date(end) - new Date(start)) / 86400000);
      setTotalPrice(nights > 0 ? product.price * nights : 0);
    } else {
      setTotalPrice(0);
    }
  }, [start, end, product]);

  const checkAvailability = async () => {
    if (!start || !end) {
      setActionError("Select both check-in and check-out dates.");
      return;
    }
    if (new Date(end) <= new Date(start)) {
      setActionError("Check-out must be after check-in.");
      return;
    }
    setChecking(true);
    setActionError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `${API_BASE}/availability/?product=${roomId}&check_in=${start}&check_out=${end}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAvailable(data.available);
      setMessage(
        data.available
          ? "Room is available."
          : "Room is not available for the selected dates.",
      );
    } catch {
      setActionError("Failed to check availability.");
    } finally {
      setChecking(false);
    }
  };

  const pollPaymentStatus = async (
    paymentId,
    interval = 5000,
    attempts = 6,
  ) => {
    setPaymentStatus("pending");
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, interval));
      try {
        const res = await fetch(
          `${API_BASE}/payments/status/?payment_id=${paymentId}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.detail || "Failed to check payment status.");
          setPaymentStatus("failed");
          return;
        }
        if (data.status === "success") {
          setPaymentStatus("success");
          setMessage("Payment successful! Your booking is confirmed.");
          fetchProduct();
          return;
        }
        if (data.status === "failed") {
          setPaymentStatus("failed");
          setActionError("Payment was declined. Please try again.");
          return;
        }
      } catch {
        setActionError("Error while checking payment status.");
        setPaymentStatus("failed");
        return;
      }
    }
    setMessage(
      "Payment is taking longer than expected. Check your M-Pesa messages.",
    );
    setPaymentStatus(null);
  };

  const startMpesaPayment = async () => {
    setActionError(null);
    setMessage(null);
    if (!available) {
      setActionError("Please check availability before paying.");
      return;
    }
    if (totalPrice <= 0) {
      setActionError("Invalid total price. Check your selected dates.");
      return;
    }
    const { valid, phone: normalisedPhone } = validateAndNormalisePhone(phone);
    if (!valid) {
      setActionError(
        "Enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678).",
      );
      return;
    }
    setPaymentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/mpesa/stk_push/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalisedPhone,
          product_id: product.id,
          hotel_slug: hotelSlug,
          check_in: start,
          check_out: end,
          amount: totalPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.detail || "Failed to initiate payment.");
        return;
      }
      setCheckoutId(data.checkout_request_id);
      setMessage("STK Push sent. Complete payment on your phone.");
      await pollPaymentStatus(data.payment_id, 5000, 6);
    } catch {
      setActionError("Network error starting payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!product && !fetchError)
    return (
      <p
        style={{
          color: "var(--muted)",
          textAlign: "center",
          marginTop: "4rem",
        }}
      >
        Loading...
      </p>
    );
  if (fetchError)
    return (
      <p style={{ color: "#e05", textAlign: "center", marginTop: "4rem" }}>
        {fetchError}
      </p>
    );

  const dateInvalid = start && end && new Date(end) <= new Date(start);

  return (
    <div
      style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1.5rem 4rem" }}
    >
      {/* Page header */}
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
          Reservation
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            fontWeight: 300,
            color: "var(--text)",
          }}
        >
          Book Your{" "}
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Stay</em>
        </h2>
      </div>

      {/* Room summary card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        {product.image && (
          <div
            style={{
              width: 80,
              height: 60,
              flexShrink: 0,
              overflow: "hidden",
              background: "var(--bg)",
            }}
          >
            <img
              src={product.image}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
        <div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.1rem",
              color: "var(--text)",
              marginBottom: "0.2rem",
            }}
          >
            {product.name}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {product.hotel?.name ?? hotelSlug} &bull;&nbsp;
            <span style={{ color: "var(--gold)" }}>
              {product.currency} {product.price.toFixed(2)}
            </span>{" "}
            / night
          </p>
        </div>
      </div>

      {/* Date pickers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <label htmlFor="check-in" style={S.label}>
            Check-in
          </label>
          <input
            id="check-in"
            type="date"
            min={today}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (end && end <= e.target.value) setEnd("");
              setAvailable(null);
            }}
            style={{
              ...S.input,
              borderColor: start ? "var(--gold-dim)" : "var(--border)",
            }}
          />
        </div>
        <div>
          <label htmlFor="check-out" style={S.label}>
            Check-out
          </label>
          <input
            id="check-out"
            type="date"
            min={start || today}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setAvailable(null);
            }}
            style={{
              ...S.input,
              borderColor: end ? "var(--gold-dim)" : "var(--border)",
            }}
          />
        </div>
      </div>

      {dateInvalid && (
        <p
          style={{
            color: "#c9a96e",
            fontSize: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          Check-out must be after check-in.
        </p>
      )}

      {/* Availability row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <button
          onClick={checkAvailability}
          disabled={checking || !start || !end || !!dateInvalid}
          style={{
            padding: "0.55rem 1.25rem",
            border: "1px solid var(--gold)",
            color: "var(--gold)",
            background: "transparent",
            fontSize: "0.65rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor:
              checking || !start || !end || !!dateInvalid
                ? "not-allowed"
                : "pointer",
            opacity: checking || !start || !end || !!dateInvalid ? 0.4 : 1,
            transition: "background 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = "var(--gold)";
              e.currentTarget.style.color = "var(--bg)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--gold)";
          }}
        >
          {checking ? "Checking..." : "Check Availability"}
        </button>

        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Total
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.4rem",
              fontWeight: 300,
              color: totalPrice > 0 ? "var(--gold)" : "var(--border)",
            }}
          >
            {totalPrice > 0
              ? `${product.currency} ${totalPrice.toFixed(2)}`
              : "—"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "var(--border)",
          marginBottom: "1.5rem",
        }}
      />

      {/* M-Pesa payment section */}
      {available && (
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            padding: "1.25rem",
            marginBottom: "1rem",
          }}
        >
          <p
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: "1rem",
            }}
          >
            Pay with M-Pesa
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label htmlFor="booking-phone" style={S.label}>
                Phone (2547XXXXXXXX)
              </label>
              <input
                id="booking-phone"
                type="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={S.input}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <p style={S.label}>Amount</p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.3rem",
                  fontWeight: 300,
                  color: "var(--gold)",
                }}
              >
                {product.currency} {totalPrice.toFixed(2)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={startMpesaPayment}
              disabled={paymentLoading}
              style={{
                flex: 1,
                padding: "0.65rem",
                background: paymentLoading ? "transparent" : "var(--gold)",
                border: "1px solid var(--gold)",
                color: paymentLoading ? "var(--gold)" : "var(--bg)",
                fontSize: "0.7rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: paymentLoading ? "not-allowed" : "pointer",
                opacity: paymentLoading ? 0.6 : 1,
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {paymentLoading ? "Processing..." : "Pay Now"}
            </button>
            <button
              onClick={() => {
                setPhone("");
                setMessage(null);
                setCheckoutId(null);
                setPaymentStatus(null);
                setActionError(null);
              }}
              style={{
                padding: "0.65rem 1rem",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                fontSize: "0.65rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gold-dim)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              Reset
            </button>
          </div>

          {checkoutId && (
            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "0.75rem",
                color: "var(--muted)",
                fontFamily: "monospace",
              }}
            >
              Checkout ID: {checkoutId}
            </p>
          )}

          {paymentStatus && (
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color:
                  paymentStatus === "success"
                    ? "var(--gold)"
                    : paymentStatus === "failed"
                      ? "#e05"
                      : "var(--muted)",
              }}
            >
              Payment: <strong>{paymentStatus}</strong>
            </p>
          )}
        </div>
      )}

      {/* Status messages */}
      {message && (
        <p
          style={{
            color: "var(--gold)",
            fontSize: "0.85rem",
            textAlign: "center",
            marginBottom: "0.5rem",
          }}
        >
          {message}
        </p>
      )}
      {actionError && (
        <p
          style={{
            color: "#e05",
            fontSize: "0.85rem",
            textAlign: "center",
            marginBottom: "0.5rem",
          }}
        >
          {actionError}
        </p>
      )}
      {available === false && (
        <p style={{ color: "#e05", fontSize: "0.85rem", textAlign: "center" }}>
          Not available for the selected dates.
        </p>
      )}
    </div>
  );
}

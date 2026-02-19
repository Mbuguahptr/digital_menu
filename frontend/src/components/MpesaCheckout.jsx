import React, { useState } from "react";
import { validateAndNormalisePhone } from "./api";

export default function MpesaCheckout() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");

  const validate = () => {
    const { valid } = validateAndNormalisePhone(phone);
    if (!valid) {
      setMsg(
        "Enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678).",
      );
      setMsgType("error");
      return false;
    }
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setMsg("Enter a valid amount greater than 0.");
      setMsgType("error");
      return false;
    }
    return true;
  };

  const payNow = async () => {
    setMsg("");
    if (!validate()) return;
    const { phone: normalisedPhone } = validateAndNormalisePhone(phone);
    setLoading(true);
    try {
      const res = await fetch("/api/mpesa/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalisedPhone,
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Payment request failed. Please try again.");
        setMsgType("error");
      } else {
        setMsg(data.CustomerMessage || "Check your phone to complete payment.");
        setMsgType("success");
      }
    } catch {
      setMsg("Network error. Please check your connection and try again.");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  const msgColor = {
    info: "var(--muted)",
    error: "#e05",
    success: "var(--gold)",
  };

  return (
    <div style={{ maxWidth: 480, margin: "3rem auto", padding: "0 1.5rem" }}>
      {/* Header */}
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
          Secure Payment
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            fontWeight: 300,
            color: "var(--text)",
          }}
        >
          M-Pesa{" "}
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>
            Checkout
          </em>
        </h2>
      </div>

      {/* Form */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "1.75rem",
        }}
      >
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            htmlFor="mpesa-phone"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--muted)",
              display: "block",
              marginBottom: "0.4rem",
            }}
          >
            Phone Number
          </label>
          <input
            id="mpesa-phone"
            type="tel"
            placeholder="0712 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
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
            }}
          />
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--muted)",
              marginTop: "0.25rem",
            }}
          >
            Format: 07XXXXXXXX or 2547XXXXXXXX
          </p>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="mpesa-amount"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--muted)",
              display: "block",
              marginBottom: "0.4rem",
            }}
          >
            Amount (KES)
          </label>
          <input
            id="mpesa-amount"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
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
            }}
          />
        </div>

        <button
          onClick={payNow}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: loading ? "transparent" : "var(--gold)",
            border: "1px solid var(--gold)",
            color: loading ? "var(--gold)" : "var(--bg)",
            fontSize: "0.7rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "background 0.2s, color 0.2s",
          }}
        >
          {loading ? "Processing..." : "Pay Now"}
        </button>

        {msg && (
          <p
            style={{
              marginTop: "1rem",
              textAlign: "center",
              fontSize: "0.85rem",
              color: msgColor[msgType],
            }}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { validateAndNormalisePhone } from "./api";

export default function MpesaCheckout() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info"); // "info" | "error" | "success"

  // FIX: validate inputs before hitting the API
  const validate = () => {
    const { valid } = validateAndNormalisePhone(phone);
    if (!valid) {
      setMsg(
        "Enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678)."
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
        body: JSON.stringify({ phone: normalisedPhone, amount: Number(amount) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || "Payment request failed. Please try again.");
        setMsgType("error");
      } else {
        setMsg(data.CustomerMessage || "Check your phone to complete payment.");
        setMsgType("success");
      }
    } catch (err) {
      console.error(err);
      setMsg("Network error. Please check your connection and try again.");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  const msgClasses = {
    info: "text-gray-700",
    error: "text-red-600",
    success: "text-green-600",
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-lg bg-white">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        M-Pesa Payment
      </h2>

      {/* FIX: labels linked to inputs via htmlFor/id */}
      <label
        htmlFor="mpesa-phone"
        className="block text-gray-700 font-medium mb-1"
      >
        Phone Number
      </label>
      <input
        id="mpesa-phone"
        type="tel"
        className="w-full p-3 border rounded-xl mb-1 focus:outline-none focus:ring-2 focus:ring-green-400"
        placeholder="0712 345 678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <p className="text-xs text-gray-400 mb-4">
        Format: 07XXXXXXXX or 2547XXXXXXXX
      </p>

      <label
        htmlFor="mpesa-amount"
        className="block text-gray-700 font-medium mb-1"
      >
        Amount (KES)
      </label>
      <input
        id="mpesa-amount"
        type="number"
        min="1"
        step="1"
        className="w-full p-3 border rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-green-400"
        placeholder="e.g. 500"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        onClick={payNow}
        disabled={loading}
        className="w-full bg-green-600 text-white p-3 rounded-xl font-semibold transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>

      {msg && (
        <p className={`text-center mt-4 font-medium ${msgClasses[msgType]}`}>
          {msg}
        </p>
      )}
    </div>
  );
}

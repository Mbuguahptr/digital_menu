import { useState } from "react";

export default function MpesaCheckout() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const payNow = async () => {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/mpesa/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amount }),
      });

      const data = await res.json();
      setMsg(data.CustomerMessage || data.error || "Check your phone");

    } catch (err) {
      setMsg("Payment failed");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-lg bg-white">
      <h2 className="text-2xl font-bold mb-4 text-center">M-Pesa Payment</h2>

      <label className="block text-gray-700">Phone Number</label>
      <input
        type="text"
        className="w-full p-3 border rounded-xl mb-4"
        placeholder="07xxxxxxxx"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <label className="block text-gray-700">Amount</label>
      <input
        type="number"
        className="w-full p-3 border rounded-xl mb-4"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        onClick={payNow}
        disabled={loading}
        className="w-full bg-green-600 text-white p-3 rounded-xl font-semibold transition hover:bg-green-700"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>

      {msg && <p className="text-center mt-4 font-medium">{msg}</p>}
    </div>
  );
}

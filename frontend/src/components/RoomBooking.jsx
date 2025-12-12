import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";

// VITE-compatible API base
const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function RoomBooking() {
  const { roomId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const hotelSlug = searchParams.get("hotel");

  const [product, setProduct] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [available, setAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);

  const [phone, setPhone] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [checkoutId, setCheckoutId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // ---------------- FETCH ROOM ----------------
  const fetchProduct = async () => {
    if (!roomId || !hotelSlug) return setError("Invalid room or hotel.");

    try {
      const res = await fetch(
        `${API_BASE}/products/?hotel=${hotelSlug}&product_type=room`
      );
      if (!res.ok) throw new Error("Failed to fetch products list");

      const data = await res.json();
      const room = data.results.find((p) => p.id === Number(roomId));
      if (!room) throw new Error("Room not found");

      room.price = Number(room.price); // ensure numeric
      setProduct(room);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setProduct(null);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [roomId, hotelSlug]);

  // ---------------- CALCULATE TOTAL PRICE ----------------
  useEffect(() => {
    if (start && end && product?.price) {
      const nights = Math.max(
        1,
        Math.round(
          (new Date(end).getTime() - new Date(start).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      setTotalPrice(product.price * nights);
    } else {
      setTotalPrice(0);
    }
  }, [start, end, product]);

  // ---------------- CHECK AVAILABILITY ----------------
  const checkAvailability = async () => {
    if (!start || !end)
      return setError("Please select both start and end dates.");
    setChecking(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `${API_BASE}/availability/?product=${roomId}&check_in=${start}&check_out=${end}`
      );
      if (!res.ok) throw new Error("Failed to check availability");

      const data = await res.json();
      setAvailable(data.available);
      setMessage(
        data.available ? "Room is available." : "Room is not available."
      );
    } catch (err) {
      console.error(err);
      setError("Failed to check availability.");
    } finally {
      setChecking(false);
    }
  };

  // ---------------- MPESA STK PUSH ----------------
  const startMpesaPayment = async () => {
    if (!available) return setError("Check availability first.");
    if (!phone) return setError("Enter phone number (2547XXXXXXXX).");

    setPaymentLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        phone,
        product_id: product.id,
        hotel_slug: hotelSlug,
        check_in: start,
        check_out: end,
        amount: totalPrice,
      };

      const res = await fetch(`${API_BASE}/payments/mpesa/stk_push/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to initiate payment.");
        setPaymentLoading(false);
        return;
      }

      setCheckoutId(data.checkout_request_id);
      setMessage("STK Push sent. Complete payment on your phone.");
      pollPaymentStatus(data.payment_id, 5000, 6);
    } catch (err) {
      console.error(err);
      setError("Network error starting payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId, interval = 5000, attempts = 6) => {
    setPaymentStatus("pending");
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(`${API_BASE}/payments/status/?payment_id=${paymentId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Failed to check payment status.");
          return;
        }
        if (data.status === "success") {
          setPaymentStatus("success");
          setMessage("Payment successful! Booking confirmed.");
          fetchProduct();
          return;
        } else if (data.status === "failed") {
          setPaymentStatus("failed");
          setError("Payment failed. Try again.");
          return;
        }
        setPaymentStatus("pending");
      } catch (err) {
        console.error(err);
        setError("Failed to poll payment status.");
        return;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    setMessage("Payment is taking longer than expected.");
  };

  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;
  if (!product) return <p className="text-center mt-8">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {product.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {product.hotel?.name || hotelSlug} • {product.currency}{" "}
            <span className="font-semibold">{product.price.toFixed(2)}</span> /
            night
          </p>
        </div>
        <div className="w-28 h-20 rounded-xl overflow-hidden shadow-inner bg-white/30 flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-xs text-gray-500">No image</div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Check-in</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Check-out</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Availability & price */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={checkAvailability}
          disabled={checking}
          className="px-5 py-2 rounded-full bg-indigo-600 text-white font-medium shadow hover:scale-[1.02] transition"
        >
          {checking ? "Checking..." : "Check Availability"}
        </button>

        <div className="text-right">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {product.currency} {totalPrice > 0 ? totalPrice.toFixed(2) : "—"}
          </p>
        </div>
      </div>

      {/* Payment */}
      {available && (
        <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/40 border border-white/10 mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Secure your booking — Pay with M-Pesa
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              placeholder="Phone (2547XXXXXXXX)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Amount</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {product.currency} {totalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startMpesaPayment}
              disabled={paymentLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow"
            >
              {paymentLoading ? "Requesting STK..." : "Pay with M-Pesa"}
            </button>
            <button
              onClick={() => {
                setPhone("");
                setMessage(null);
                setCheckoutId(null);
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/40"
            >
              Reset
            </button>
          </div>

          {checkoutId && (
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              STK Checkout ID: <span className="font-mono">{checkoutId}</span>
            </div>
          )}
          {paymentStatus && (
            <div className="mt-2 text-sm">
              Payment status:{" "}
              <span
                className={`font-semibold ${
                  paymentStatus === "success"
                    ? "text-green-600"
                    : paymentStatus === "failed"
                    ? "text-red-500"
                    : "text-yellow-600"
                }`}
              >
                {paymentStatus}
              </span>
            </div>
          )}
        </div>
      )}

      {message && <div className="text-center text-green-600 mb-2">{message}</div>}
      {available === false && (
        <div className="text-center text-red-500 mb-2">
          Not available for selected dates
        </div>
      )}
    </div>
  );
}

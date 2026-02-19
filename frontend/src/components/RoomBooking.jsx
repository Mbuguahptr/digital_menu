import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { API_BASE, validateAndNormalisePhone } from "./api";

export default function RoomBooking() {
  const { roomId } = useParams();
  const location = useLocation();
  const hotelSlug = new URLSearchParams(location.search).get("hotel");

  const [product, setProduct] = useState(null);
  const [fetchError, setFetchError] = useState(null); // separate from action error
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
  const [paymentStatus, setPaymentStatus] = useState(null); // "pending"|"success"|"failed"

  // Ref so pollPaymentStatus never goes stale (avoids stale-closure issues).
  const paymentStatusRef = useRef(paymentStatus);
  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);

  // ── Today's date string for min= attributes ────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  // ── Fetch room ─────────────────────────────────────────────────────────────
  // useCallback so it can be called both from useEffect and after a successful payment.
  const fetchProduct = useCallback(async () => {
    if (!roomId || !hotelSlug) {
      setFetchError("Invalid room or hotel.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/products/?hotel=${hotelSlug}&product_type=room`
      );
      if (!res.ok) throw new Error("Failed to fetch products list");

      const data = await res.json();
      const room = data.results.find((p) => p.id === Number(roomId));
      if (!room) throw new Error("Room not found");

      room.price = Number(room.price);
      setProduct(room);
      setFetchError(null);
    } catch (err) {
      console.error(err);
      setFetchError(err.message);
      setProduct(null);
    }
  }, [roomId, hotelSlug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // ── Total price ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (start && end && product?.price) {
      const nights = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      // FIX: reject invalid ranges (check-out before or equal to check-in)
      setTotalPrice(nights > 0 ? product.price * nights : 0);
    } else {
      setTotalPrice(0);
    }
  }, [start, end, product]);

  // ── Check availability ─────────────────────────────────────────────────────
  const checkAvailability = async () => {
    if (!start || !end) {
      setActionError("Please select both check-in and check-out dates.");
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
      setActionError("Failed to check availability.");
    } finally {
      setChecking(false);
    }
  };

  // ── Poll payment status ────────────────────────────────────────────────────
  // Returns a promise that resolves when polling is complete.
  const pollPaymentStatus = async (paymentId, interval = 5000, attempts = 6) => {
    setPaymentStatus("pending");

    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      try {
        const res = await fetch(
          `${API_BASE}/payments/status/?payment_id=${paymentId}`
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
          fetchProduct(); // refresh room data
          return;
        }

        if (data.status === "failed") {
          setPaymentStatus("failed");
          setActionError("Payment was declined. Please try again.");
          return;
        }
      } catch (err) {
        console.error(err);
        setActionError("Error while checking payment status.");
        setPaymentStatus("failed");
        return;
      }
    }

    // Timed out without a definitive status
    setMessage(
      "Payment is taking longer than expected. Please check your M-Pesa messages."
    );
    setPaymentStatus(null);
  };

  // ── M-Pesa STK push ───────────────────────────────────────────────────────
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

    // FIX: validate and normalise phone before sending
    const { valid, phone: normalisedPhone } = validateAndNormalisePhone(phone);
    if (!valid) {
      setActionError(
        "Enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678)."
      );
      return;
    }

    setPaymentLoading(true);

    try {
      const payload = {
        phone: normalisedPhone,
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
        setActionError(data.detail || "Failed to initiate payment.");
        return; // finally will still run
      }

      setCheckoutId(data.checkout_request_id);
      setMessage("STK Push sent. Complete payment on your phone.");

      // FIX: await polling so paymentLoading stays true for its duration.
      await pollPaymentStatus(data.payment_id, 5000, 6);
    } catch (err) {
      console.error(err);
      setActionError("Network error starting payment.");
    } finally {
      // FIX: paymentLoading is cleared only after polling is done.
      setPaymentLoading(false);
    }
  };

  // ── Render guards — product check first, then error ────────────────────────
  // FIX: check !product before fetchError so we don't show a blank screen
  // when error clears but product hasn't loaded yet.
  if (!product && !fetchError)
    return <p className="text-center mt-8 text-gray-600 dark:text-gray-300">Loading...</p>;

  if (fetchError)
    return <p className="text-center mt-8 text-red-500">{fetchError}</p>;

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/10">
      {/* Room header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {product.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {product.hotel?.name ?? hotelSlug} &bull; {product.currency}{" "}
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

      {/* Date pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="check-in"
            className="block text-xs text-gray-600 dark:text-gray-300 mb-1"
          >
            Check-in
          </label>
          <input
            id="check-in"
            type="date"
            min={today} // FIX: prevent past dates
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              // Reset check-out if it's now before or equal to new check-in
              if (end && end <= e.target.value) setEnd("");
              setAvailable(null);
            }}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label
            htmlFor="check-out"
            className="block text-xs text-gray-600 dark:text-gray-300 mb-1"
          >
            Check-out
          </label>
          <input
            id="check-out"
            type="date"
            // FIX: check-out must be strictly after check-in
            min={start || today}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setAvailable(null);
            }}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Validity warning */}
      {start && end && new Date(end) <= new Date(start) && (
        <p className="text-amber-600 text-xs mb-3">
          Check-out must be after check-in.
        </p>
      )}

      {/* Availability & price summary */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={checkAvailability}
          disabled={checking || !start || !end || new Date(end) <= new Date(start)}
          className="px-5 py-2 rounded-full bg-indigo-600 text-white font-medium shadow hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? "Checking..." : "Check Availability"}
        </button>

        <div className="text-right">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {product.currency}{" "}
            {totalPrice > 0 ? totalPrice.toFixed(2) : "\u2014"}
          </p>
        </div>
      </div>

      {/* Payment section */}
      {available && (
        <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/40 border border-white/10 mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Secure your booking &mdash; Pay with M-Pesa
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label
                htmlFor="booking-phone"
                className="block text-xs text-gray-500 mb-1"
              >
                Phone (2547XXXXXXXX)
              </label>
              <input
                id="booking-phone"
                type="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
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
              className="flex-1 px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading ? "Processing..." : "Pay with M-Pesa"}
            </button>
            <button
              onClick={() => {
                setPhone("");
                setMessage(null);
                setCheckoutId(null);
                setPaymentStatus(null);
                setActionError(null);
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/40"
            >
              Reset
            </button>
          </div>

          {checkoutId && (
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              STK Checkout ID:{" "}
              <span className="font-mono">{checkoutId}</span>
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

      {message && (
        <div className="text-center text-green-600 dark:text-green-400 mb-2 text-sm">
          {message}
        </div>
      )}
      {actionError && (
        <div className="text-center text-red-500 mb-2 text-sm">{actionError}</div>
      )}
      {available === false && (
        <div className="text-center text-red-500 mb-2 text-sm">
          Not available for the selected dates.
        </div>
      )}
    </div>
  );
}

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "../socket";
import api from "../Api";
import "../styles/trip.css";

const TripDetails = () => {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [lockedSeats, setLockedSeats] = useState([]);

  // Initial trip load
  useEffect(() => {
    console.log("📍 Loading trip data for ID:", id);
    api.get(`/trips/${id}`).then((res) => {
      console.log("✅ Trip Data Loaded:", res.data);
      setTrip(res.data);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;

    console.log("🚀 Setting up Socket.IO connection for trip:", id);

    if (!socket.connected) {
      socket.connect();
      console.log("📡 Socket connected");
    }

    socket.emit("join-trip", parseInt(id));
    console.log("📤 Emitted join-trip event for room: trip-" + id);

    // IMPORTANT: Use once() for these one-time handlers, then on() for persistent ones
    const handleSeatBooked = (data) => {
      console.log("📌 seat-booked event received:", data);
      const { seats, allBookedSeats } = data;

      if (allBookedSeats && Array.isArray(allBookedSeats)) {
        console.log("📊 Using allBookedSeats from backend:", allBookedSeats);
        setTrip((prevTrip) => {
          if (!prevTrip) return prevTrip;
          return {
            ...prevTrip,
            bookedSeats: allBookedSeats,
          };
        });
      } else {
        console.warn("⚠️ allBookedSeats missing, using seats:", seats);
        setTrip((prevTrip) => {
          if (!prevTrip) return prevTrip;
          return {
            ...prevTrip,
            bookedSeats: [...(prevTrip.bookedSeats || []), ...seats],
          };
        });
      }

      setLockedSeats((prev) => prev.filter((s) => !seats.includes(s)));
      console.log("✅ Trip state updated successfully");
    };

    const handleSeatLocked = (data) => {
      console.log("🔒 seat-locked event:", data);
      setLockedSeats((prev) => {
        if (prev.includes(data.seat)) return prev;
        return [...prev, data.seat];
      });
    };

    const handleSeatUnlocked = (data) => {
      console.log("🔓 seat-unlocked event:", data);
      setLockedSeats((prev) => prev.filter((s) => s !== data.seat));
    };

    const handleSyncLockedSeats = (seats) => {
      console.log("🔒 sync-locked-seats event:", seats);
      setLockedSeats(seats || []);
    };

    // Register all listeners with .on() so they persist
    socket.on("seat-booked", handleSeatBooked);
    socket.on("seat-locked", handleSeatLocked);
    socket.on("seat-unlocked", handleSeatUnlocked);
    socket.on("sync-locked-seats", handleSyncLockedSeats);

    console.log("✅ Socket event listeners registered");

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up Socket.IO listeners for trip:", id);
      socket.off("seat-booked", handleSeatBooked);
      socket.off("seat-locked", handleSeatLocked);
      socket.off("seat-unlocked", handleSeatUnlocked);
      socket.off("sync-locked-seats", handleSyncLockedSeats);
    };
  }, [id]);

  if (!trip) return <p>Loading...</p>;

  const toggleSeat = (seat) => {
    if (trip.bookedSeats?.includes(seat)) {
      console.log("❌ Seat already booked:", seat);
      return;
    }
    if (lockedSeats.includes(seat) && !selectedSeats.includes(seat)) {
      console.log("❌ Seat already locked:", seat);
      return;
    }

    if (selectedSeats.includes(seat)) {
      console.log("🔓 Unlocking seat:", seat);
      socket.emit("unlock-seat", { tripId: parseInt(id), seat });
      setSelectedSeats((prev) => prev.filter((s) => s !== seat));
    } else {
      console.log("🔒 Locking seat:", seat);
      socket.emit("lock-seat", { tripId: parseInt(id), seat });
      setSelectedSeats((prev) => [...prev, seat]);
    }
  };

  const TOTAL_SEATS = trip?.bus?.totalSeats || 40;

  const handleBooking = async () => {
    try {
      console.log("📤 BOOKING: Sending request with seats:", selectedSeats);
      await api.post("/bookings", {
        tripId: parseInt(trip.id),
        seats: selectedSeats,
      });
      console.log("✅ BOOKING: Server accepted the booking");

      selectedSeats.forEach((seat) => {
        socket.emit("unlock-seat", { tripId: parseInt(id), seat });
      });

      alert("Booking confirmed!");
      setSelectedSeats([]);
      console.log("🧹 BOOKING: Cleared selected seats");
    } catch (error) {
      console.error("❌ BOOKING FAILED:", error);
      alert("Failed to confirm booking. Please try again.");
    }
  };

  return (
    <div className="main-container">
      <div className="ticket-info-section">
        <h2 style={{ marginTop: 0, fontSize: "22px", color: "#1f2937" }}>
          {trip.from} → {trip.to}
        </h2>

        <div className="summary-details">
          <div className="summary-item">
            <span>Bus:</span>
            <span>{trip.bus.busNumber}</span>
          </div>

          <div className="summary-item">
            <span>Seats:</span>
            <span>
              {selectedSeats.length > 0
                ? selectedSeats.sort((a, b) => a - b).join(", ")
                : "None selected"}
            </span>
          </div>
        </div>

        <div className="total-price-row">
          <span className="total-price-label">Total Price</span>
          <span className="total-price-value">
            ${selectedSeats.length * trip.price}
          </span>
        </div>

        <div className="confirm-btn-wrapper">
          <button
            className="book-btn"
            onClick={handleBooking}
            disabled={selectedSeats.length === 0}
          >
            Confirm Booking
          </button>
        </div>
      </div>

      <div className="seat-selection-section">
        <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Select Seats</h3>
        <div className="seat-grid">
          {Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1).map((seat) => {
            const isBooked = trip.bookedSeats?.includes(seat) || false;
            const isSelected = selectedSeats.includes(seat);
            const isLocked = lockedSeats.includes(seat);

            const seatClass = isBooked
              ? "seat booked"
              : isSelected
                ? "seat selected"
                : isLocked
                  ? "seat locked"
                  : "seat available";

            return (
              <button
                key={seat}
                className={seatClass}
                disabled={isBooked || (isLocked && !isSelected)}
                onClick={() => toggleSeat(seat)}
              >
                {seat}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TripDetails;

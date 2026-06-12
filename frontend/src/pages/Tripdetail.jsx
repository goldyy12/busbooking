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

  console.log("Current Trip State:", trip);

  useEffect(() => {
    api.get(`/trips/${id}`).then((res) => {
      console.log("Trip Data Loaded:", res.data);
      setTrip(res.data);
    });
  }, [id]);

  useEffect(() => {
    socket.connect();
    socket.emit("join-trip", id);
    console.log("Joined trip:", id);

    const handleSyncLockedSeats = (seats) => {
      console.log("🔒 sync-locked-seats:", seats);
      setLockedSeats(seats);
    };

    const handleSeatLocked = ({ seat }) => {
      console.log("🔒 seat-locked:", seat);
      setLockedSeats((prev) => (prev.includes(seat) ? prev : [...prev, seat]));
    };

    const handleSeatUnlocked = ({ seat }) => {
      console.log("🔓 seat-unlocked:", seat);
      setLockedSeats((prev) => prev.filter((s) => s !== seat));
    };

    const handleSeatBooked = ({ seats, allBookedSeats }) => {
      console.log("✅ seat-booked event received");
      console.log("📋 Seats just booked:", seats);
      console.log("📊 All booked seats from backend:", allBookedSeats);
      
      setTrip((prev) => {
        if (!prev) {
          console.warn("Trip state is null!");
          return prev;
        }
        const updated = {
          ...prev,
          bookedSeats: allBookedSeats || Array.from(new Set([...(prev.bookedSeats || []), ...seats])),
        };
        console.log("📈 Updated trip bookedSeats:", updated.bookedSeats);
        return updated;
      });

      setLockedSeats((prev) => {
        const updated = prev.filter((s) => !seats.includes(s));
        console.log("🔓 Cleared locked seats for:", seats);
        return updated;
      });
    };

    socket.on("sync-locked-seats", handleSyncLockedSeats);
    socket.on("seat-locked", handleSeatLocked);
    socket.on("seat-unlocked", handleSeatUnlocked);
    socket.on("seat-booked", handleSeatBooked);

    return () => {
      socket.off("sync-locked-seats", handleSyncLockedSeats);
      socket.off("seat-locked", handleSeatLocked);
      socket.off("seat-unlocked", handleSeatUnlocked);
      socket.off("seat-booked", handleSeatBooked);
      socket.disconnect();
      console.log("Disconnected from trip:", id);
    };
  }, [id]);

  if (!trip) return <p>Loading...</p>;

  const toggleSeat = (seat) => {
    if (trip.bookedSeats.includes(seat)) {
      console.log("❌ Seat already booked:", seat);
      return;
    }
    if (lockedSeats.includes(seat) && !selectedSeats.includes(seat)) {
      console.log("❌ Seat already locked by someone else:", seat);
      return;
    }

    if (selectedSeats.includes(seat)) {
      console.log("🔓 Unlocking seat:", seat);
      socket.emit("unlock-seat", { tripId: id, seat });
      setSelectedSeats((prev) => prev.filter((s) => s !== seat));
    } else {
      console.log("🔒 Locking seat:", seat);
      socket.emit("lock-seat", { tripId: id, seat });
      setSelectedSeats((prev) => [...prev, seat]);
    }
  };

  const TOTAL_SEATS = trip?.bus.totalSeats || 40;

  const handleBooking = async () => {
    try {
      console.log("📤 Sending booking request with seats:", selectedSeats);
      const response = await api.post("/bookings", {
        tripId: trip.id,
        seats: selectedSeats,
      });
      console.log("✅ Booking response:", response.data);

      // Unlock seats after booking
      selectedSeats.forEach((seat) => {
        console.log("🔓 Emitting unlock for seat:", seat);
        socket.emit("unlock-seat", { tripId: id, seat });
      });

      alert("Booking confirmed!");
      console.log("🧹 Clearing selected seats");
      setSelectedSeats([]);
      
      // Wait a bit for socket event to arrive, then verify with API
      setTimeout(() => {
        console.log("⏱️ Verifying trip state from backend after 500ms");
        api.get(`/trips/${id}`).then((res) => {
          console.log("✅ Trip verification:", res.data.bookedSeats);
        });
      }, 500);
    } catch (error) {
      console.error("❌ Booking failed:", error);
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
            const isBooked = trip.bookedSeats.includes(seat);
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

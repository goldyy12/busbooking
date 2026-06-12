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

    socket.on("sync-locked-seats", setLockedSeats);

    socket.on("seat-locked", ({ seat }) =>
      setLockedSeats((prev) => (prev.includes(seat) ? prev : [...prev, seat])),
    );

    socket.on("seat-unlocked", ({ seat }) =>
      setLockedSeats((prev) => prev.filter((s) => s !== seat)),
    );

    socket.on("seat-booked", ({ seats }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          bookedSeats: [...(prev.bookedSeats || []), ...seats],
        };
      });

      setLockedSeats((prev) => prev.filter((s) => !seats.includes(s)));
    });

    return () => {
      socket.disconnect();
      socket.off("sync-locked-seats");
      socket.off("seat-locked");
      socket.off("seat-unlocked");
      socket.off("seat-booked");
    };
  }, [id]);

  if (!trip) return <p>Loading...</p>;

  const toggleSeat = (seat) => {
    if (trip.bookedSeats.includes(seat)) return;
    if (lockedSeats.includes(seat) && !selectedSeats.includes(seat)) return;

    if (selectedSeats.includes(seat)) {
      socket.emit("unlock-seat", { tripId: id, seat });
      setSelectedSeats((prev) => prev.filter((s) => s !== seat));
    } else {
      socket.emit("lock-seat", { tripId: id, seat });
      setSelectedSeats((prev) => [...prev, seat]);
    }
  };

  const TOTAL_SEATS = trip?.bus.totalSeats || 40;

  const handleBooking = async () => {
    try {
      await api.post("/bookings", {
        tripId: trip.id,
        seats: selectedSeats,
      });

      selectedSeats.forEach((seat) =>
        socket.emit("unlock-seat", { tripId: id, seat }),
      );

      alert("Booking confirmed!");

      const res = await api.get(`/trips/${id}`);
      setTrip(res.data);
      setSelectedSeats([]);
    } catch (error) {
      console.error("Booking failed:", error);
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

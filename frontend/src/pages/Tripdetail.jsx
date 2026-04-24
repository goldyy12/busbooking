import { useParams } from "react-router-dom";
import { use, useEffect, useState } from "react";
import { socket } from "../socket";
import api from "../Api";
import "../styles/trip.css";

const TripDetails = () => {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [lockedSeats, setLockedSeats] = useState([]);

  console.log(trip);

  useEffect(() => {
    socket.on("seat-booked", ({ seats }) => {
      setTrip((prev) => ({
        ...prev,
        bookedSeats: [...prev.bookedSeats, ...seats],
      }));
      setLockedSeats((prev) => prev.filter((s) => !seats.includes(s)));
    });

    return () => socket.off("seat-booked");
  }, []);
  useEffect(() => {
    api.get(`/trips/${id}`).then((res) => {
      console.log("Trip Data:", res.data);
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

    return () => {
      socket.disconnect();
      socket.off();
    };
  }, [id]);

  useEffect(() => {
    api.get(`/trips/${id}`).then((res) => setTrip(res.data));
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
  };

  return (
    <div className="main-container">
      {/* COLUMN 1: LEFT SIDE (Booking Summary) */}
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

      {/* COLUMN 2: RIGHT SIDE (Seat Selection) */}
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

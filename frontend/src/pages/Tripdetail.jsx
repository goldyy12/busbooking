import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "../socket";
import api from "../Api";
import "../styles/trip.css";

const TOTAL_SEATS = 40;

const TripDetails = () => {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [lockedSeats, setLockedSeats] = useState([]);

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
    <div className="trip-container">
      <h2>
        {trip.from} → {trip.to}
      </h2>

      <h3>Select Seats</h3>

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

      <button
        className="book-btn"
        disabled={selectedSeats.length === 0}
        onClick={handleBooking}
      >
        Book Seats ({selectedSeats.length})
      </button>
    </div>
  );
};

export default TripDetails;

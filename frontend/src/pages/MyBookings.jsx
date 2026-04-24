import { useState, useEffect } from "react";
import api from "../Api.jsx";
import { useNavigate } from "react-router-dom";
import "../styles/pages.css";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("No token found, please login first.");
        navigate("/login");
        return;
      }

      const res = await api.get("/bookings/my");

      setBookings(res.data);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchBookings();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page-container">
      <h1>My Bookings</h1>

      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        bookings.map((booking) => (
          <div key={booking.id} className="card">
            <h3>
              Booking ID: {booking.id} –{" "}
              <span className="booking-status">{booking.status}</span>
            </h3>
            <p>
              Trip: {booking.trip.from} → {booking.trip.to}
            </p>
            <p>Date: {new Date(booking.trip.date).toLocaleString()}</p>
            <p>Seats: {booking.seats.join(", ")}</p>
            <p>Bus Number: {booking.trip.bus.busNumber}</p>
            <p>Total Price: €{booking.seats.length * booking.trip.price}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookings;

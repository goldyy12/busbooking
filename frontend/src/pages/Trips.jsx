import { useEffect, useState } from "react";
import api from "../Api";
import "../styles/pages.css";

const TripsPage = () => {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    api.get("/trips").then((res) => setTrips(res.data));
  }, []);

  return (
    <div className="page-container">
      <h1>Available Trips</h1>

      {trips.map((trip) => (
        <div key={trip.id} className="card">
          <h3>
            {trip.from} → {trip.to}
          </h3>
          <p>Price: €{trip.price}</p>
          <p>Date: {new Date(trip.date).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

export default TripsPage;

import { useState } from "react";
import api from "../Api.jsx";
import { useNavigate } from "react-router-dom";
import "../styles/pages.css";

const HomePage = () => {
  const cities = [
    "Ferizaj",
    "Prishtina",
    "Gjilan",
    "Prizren",
    "Peja",
    "Mitrovica",
  ];

  // 1. All State Hooks first
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  const navigate = useNavigate();

  // 2. Logic derived from state
  const showFromDropdown = fromSuggestions.length > 0 && !cities.includes(from);
  const showToDropdown = toSuggestions.length > 0 && !cities.includes(to);

  const filterCities = (value) =>
    cities.filter((city) => city.toLowerCase().startsWith(value.toLowerCase()));

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get("/trips/search", {
        params: { from, to, date },
      });
      setTrips(res.data);
    } catch (err) {
      console.error(err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Search Bus Trips</h1>

      <form onSubmit={handleSearch} className="search-form">
        {/* FROM INPUT */}
        <div style={{ position: "relative" }}>
          <input
            placeholder="From"
            value={from}
            onChange={(e) => {
              const val = e.target.value;
              setFrom(val);
              setFromSuggestions(val ? filterCities(val) : []);
            }}
            onBlur={() => setTimeout(() => setFromSuggestions([]), 200)}
            required
          />
          {showFromDropdown && (
            <div className="dropdown">
              {fromSuggestions.map((city) => (
                <div
                  key={city}
                  className="dropdown-item"
                  onMouseDown={() => {
                    setFrom(city);
                    setFromSuggestions([]);
                  }}
                >
                  {city}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TO INPUT */}
        <div style={{ position: "relative" }}>
          <input
            placeholder="To"
            value={to}
            onChange={(e) => {
              const val = e.target.value;
              setTo(val);
              setToSuggestions(val ? filterCities(val) : []);
            }}
            onBlur={() => setTimeout(() => setToSuggestions([]), 200)}
            required
          />
          {showToDropdown && (
            <div className="dropdown">
              {toSuggestions.map((city) => (
                <div
                  key={city}
                  className="dropdown-item"
                  onMouseDown={() => {
                    setTo(city);
                    setToSuggestions([]);
                  }}
                >
                  {city}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="results-container">
        {trips.length > 0
          ? trips.map((trip) => (
              <div key={trip.id} className="card">
                <p>
                  <strong>{trip.from}</strong> → <strong>{trip.to}</strong>
                </p>
                <p>
                  Bus: {trip.busNumber} | Price: €{trip.price}
                </p>
                <p>Date: {new Date(trip.date).toLocaleString()}</p>
                <button onClick={() => navigate(`/trips/${trip.id}`)}>
                  View Seats
                </button>
              </div>
            ))
          : !loading && <p>No trips found.</p>}
      </div>
    </div>
  );
};

export default HomePage;

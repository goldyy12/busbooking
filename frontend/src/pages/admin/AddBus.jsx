import { useState } from "react";
import api from "../../Api";
import "../../styles/admin.css";

const AddBusPage = () => {
  const [busNumber, setBusNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/buses", {
        busNumber,
        capacity: Number(capacity),
      });

      setSuccess(true);
      setMessage("Bus added successfully ✅");
      setBusNumber("");
      setCapacity("");
    } catch (err) {
      setSuccess(false);
      setMessage("Failed to add bus ❌");
      console.error(err);
    }
  };

  return (
    <div className="admin-container">
      <h2>Add New Bus</h2>

      {message && (
        <p className={`admin-message ${success ? "success" : "error"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <input
          placeholder="Bus Number (e.g. BUS-101)"
          value={busNumber}
          onChange={(e) => setBusNumber(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Total Seats"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
        />

        <button type="submit">Add Bus</button>
      </form>
    </div>
  );
};

export default AddBusPage;

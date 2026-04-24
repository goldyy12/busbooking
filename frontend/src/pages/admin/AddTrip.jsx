import { useEffect, useState } from "react";
import api from "../../Api";
import "../../styles/admin.css";

const AddTripPage = () => {
  const [buses, setBuses] = useState([]);
  const [form, setForm] = useState({
    from: "",
    to: "",
    date: "",
    price: "",
    busId: "",
  });

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/buses").then((res) => setBuses(res.data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/trips", {
        ...form,
        price: Number(form.price),
        busId: Number(form.busId),
      });

      setSuccess(true);
      setMessage("Trip created successfully ✅");
      setForm({ from: "", to: "", date: "", price: "", busId: "" });
    } catch (err) {
      setSuccess(false);
      setMessage("Error creating trip ❌");
      console.error(err);
    }
  };

  return (
    <div className="admin-container">
      <h2>Create Trip</h2>

      {message && (
        <p className={`admin-message ${success ? "success" : "error"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <input
          name="from"
          placeholder="From"
          value={form.from}
          onChange={handleChange}
          required
        />
        <input
          name="to"
          placeholder="To"
          value={form.to}
          onChange={handleChange}
          required
        />
        <input
          type="datetime-local"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="price"
          placeholder="Price (€)"
          value={form.price}
          onChange={handleChange}
          required
        />

        <select
          name="busId"
          value={form.busId}
          onChange={handleChange}
          required
        >
          <option value="">Select Bus</option>
          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.busNumber} ({bus.totalSeats} seats)
            </option>
          ))}
        </select>

        <button type="submit">Create Trip</button>
      </form>
    </div>
  );
};

export default AddTripPage;

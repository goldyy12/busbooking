import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <h1 onClick={() => navigate("/")}>Travel App</h1>

      <ul>
        {user?.role === "ADMIN" && (
          <>
            <li onClick={() => navigate("/admin/trips")}>Manage Trips</li>
            <li onClick={() => navigate("/admin/buses")}>Manage Buses</li>
            <li onClick={() => navigate("/trips")}>Trips</li>
          </>
        )}

        {!user ? (
          <li onClick={() => navigate("/login")}>Login</li>
        ) : (
          <>
            <li onClick={() => navigate("/")}>Search Trips</li>
            <li onClick={() => navigate("/mybookings")}>My Bookings</li>
            <li onClick={logout}>Logout</li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;

import { Link } from "react-router-dom";
import "../../styles/admin.css";

const AdminDashboard = () => {
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="admin-actions">
        <Link to="/admin/buses">
          <button className="admin-action-btn">Add / Manage Buses</button>
        </Link>

        <Link to="/admin/trips">
          <button className="admin-action-btn">Add / Manage Trips</button>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;

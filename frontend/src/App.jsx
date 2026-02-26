import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoutes.jsx";
import Layout from "./components/Layout";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/Login";
import TripsPage from "./pages/Trips";

import Signup from "./pages/Signup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AddBusPage from "./pages/admin/AddBus";
import AddTripPage from "./pages/admin/AddTrip";
import Tripdetail from "./pages/Tripdetail.jsx";
import MyBookings from "./pages/MyBookings.jsx";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Routes WITH navbar */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/homepage" element={<HomePage />} />
            <Route path="/mybookings" element={<MyBookings />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/:id" element={<Tripdetail />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/buses"
              element={
                <ProtectedRoute>
                  <AddBusPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/trips"
              element={
                <ProtectedRoute>
                  <AddTripPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Routes WITHOUT navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

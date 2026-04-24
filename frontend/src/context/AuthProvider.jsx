import { useState, useEffect } from "react"; // Added useEffect
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "./AuthContext";

function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000; // JWT time is in seconds

    // If token is expired, remove it and return null
    if (decoded.exp < currentTime) {
      localStorage.removeItem("token");
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUserFromToken);
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };
  useEffect(() => {
    const interval = setInterval(() => {
      const currentUser = getUserFromToken();
      if (!currentUser && user) {
        logout();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  const login = (token) => {
    localStorage.setItem("token", token);
    setUser(jwtDecode(token));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

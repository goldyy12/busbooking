import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "./AuthContext";
import axios from "axios";
import { reconnectSocket } from "../socket";

function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      localStorage.removeItem("token");
      return null;
    }
    return decoded;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUserFromToken);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const login = (token) => {
    localStorage.setItem("token", token);
    setUser(jwtDecode(token));
  };
  // Reconnect the socket whenever the logged-in user changes, so seat locks
  // are attributed to the right account (skip the very first render).
  const userId = user?.userId ?? null;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    reconnectSocket();
  }, [userId]);

  // On first load, try to restore the session from the refresh cookie.
  useEffect(() => {
    if (!getUserFromToken()) {
      axios
        .post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .then((res) => {
          localStorage.setItem("token", res.data.token);
          setUser(jwtDecode(res.data.token));
        })
        .catch(() => {
          // no valid refresh cookie either — genuinely logged out
        });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

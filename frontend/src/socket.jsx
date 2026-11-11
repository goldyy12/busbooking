import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  autoConnect: false,
  // Sent on every (re)connect so the server knows who is locking seats.
  auth: (cb) => cb({ token: localStorage.getItem("token") }),
});

// The server only reads the token during the handshake, so after a login or
// logout an open socket has to reconnect to pick up the new identity.
// Rooms are re-joined by the "connect" handler in the trip page.
export const reconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
};

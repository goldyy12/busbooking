import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  autoConnect: false,
  // Sent on every (re)connect so the server knows who is locking seats.
  auth: (cb) => cb({ token: localStorage.getItem("token") }),
});

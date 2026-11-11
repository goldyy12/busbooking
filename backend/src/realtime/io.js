let io;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const emitSeatBooked = (tripId, payload) => {
  if (io) io.to(`trip-${tripId}`).emit("seat-booked", payload);
};

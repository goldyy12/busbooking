export const errorHandler = (err, req, res, next) => {
  console.error(err.message);

  if (err.code === "P2002") {
    return res.status(409).json({ error: "Duplicate entry" });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  if (err.code === "P2003") {
    return res
      .status(400)
      .json({ error: "Invalid reference — related record does not exist" });
  }

  res.status(err.status || 500).json({
    error: err.message || "Something went wrong",
  });
};

import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.user = {
      id: decoded.id || decoded.userId || decoded.sub,
      role: decoded.role,
    };

    console.log("🟢 Middleware Decoded User:", req.user);
    next();
  });
};
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};

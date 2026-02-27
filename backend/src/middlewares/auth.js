import jwt from "jsonwebtoken";

// Middleware to protect routes and extract user data
export const protect = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    // 1. Map the decoded payload to req.user
    // This handles different naming conventions (id, userId, sub)
    req.user = {
      id: decoded.id || decoded.userId || decoded.sub,
      role: decoded.role,
    };

    console.log("Auth Middleware - Mapped User:", req.user);

    // 2. Safety check: if no ID was found in the token, stop here
    if (!req.user.id) {
      return res
        .status(403)
        .json({ error: "Token does not contain user identification" });
    }

    next();
  });
};

// Middleware to restrict access to ADMIN only
export const isAdmin = (req, res, next) => {
  // We check req.user, which was just populated by the 'protect' middleware
  if (!req.user || req.user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin privileges required." });
  }

  next();
};

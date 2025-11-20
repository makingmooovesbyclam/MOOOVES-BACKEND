const jwt = require("jsonwebtoken");
const Host = require("../models/host");
const User = require("../models/user");

exports.authMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    // No Authorization header
    if (!auth) {
      return res.status(400).json({ message: "Token not found" });
    }

    // Extract token
    const token = auth.split(" ")[1];
    if (!token) {
      return res.status(404).json({ message: "Invalid Token" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let account = null;

    // ─── CHECK HOST LOGIN ─────────────────────────────────────
    if (decoded.hostId) {
      account = await Host.findById(decoded.hostId).select("-password");

      if (!account) {
        return res.status(400).json({
          message: "Authentication failed: Host not found",
        });
      }

      // Optional: If you stored isLoggedIn inside JWT
      if (decoded.isLoggedIn !== undefined && account.isLoggedIn !== decoded.isLoggedIn) {
        return res.status(401).json({ message: "Host is not logged in" });
      }

      req.host = account;
    }

    // ─── CHECK USER LOGIN ─────────────────────────────────────
    else if (decoded.userId) {
      account = await User.findById(decoded.userId).select("-password");

      if (!account) {
        return res.status(400).json({
          message: "Authentication failed: User not found",
        });
      }

      // Optional login check
      if (decoded.isLoggedIn !== undefined && account.isLoggedIn !== decoded.isLoggedIn) {
        return res.status(401).json({ message: "User is not logged in" });
      }

      req.user = account;
    }

    // No hostId or userId inside token
    else {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    next();
  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({
        message: "Session timeout: Please login to continue",
        error:error.message
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};
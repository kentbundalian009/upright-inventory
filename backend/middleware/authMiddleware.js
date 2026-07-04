import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import User from "../models/User.js";

// 1. AUTHENTICATION: Tinitignan kung logged in
export const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key_123");

    const redisSession = await redis.get(`session:${decoded.id}`);
    if (!redisSession || redisSession !== token) {
      return res.status(401).json({ message: "Session expired or invalid. Please login again." });
    }

    const user = await User.findById(decoded.id).select("-Password");
    if (!user) {
      return res.status(401).json({ message: "User not found in database." });
    }

    // Isinasaksak ang user object sa req para magamit sa susunod na middleware
    req.user = user; 
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed", error: error.message });
  }
};

// 2. AUTHORIZATION: 🌟 BAGONG DAGDAG para sa Role Restriction
// Tumtanggap ito ng array ng mga allowed roles, halimbawa: restrictTo("Admin")
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Siguraduhing dumaan muna sa protectRoute para may req.user
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Tignan kung ang SystemRole ng user ay kasama sa allowed roles
    if (!allowedRoles.includes(req.user.SystemRole)) {
      return res.status(403).json({ 
        message: `Forbidden: Your role (${req.user.SystemRole}) is not authorized to access this action.` 
      });
    }

    next(); // Kapag pasado ang role, tuloy ang request sa controller
  };
};
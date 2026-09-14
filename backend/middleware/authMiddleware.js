import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import User from "../models/User.js";

// ⚡ Fast In-Memory Session Cache (30 seconds TTL)
// Binabawasan nito ang paulit-ulit na HTTPS REST calls papunta kay Upstash Redis sa bawat endpoint
const sessionCache = new Map();

export const clearSessionCache = (userId) => {
  if (userId) {
    sessionCache.delete(userId.toString());
  } else {
    sessionCache.clear();
  }
};

// 1. AUTHENTICATION: Tinitignan kung logged in
export const protectRoute = async (req, res, next) => {
  try {
    // 🚀 Kung verified na ang user sa naunang middleware, diretso na agad (iwas duplicate query)
    if (req.user) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key_123");

    // Tignan muna sa memory cache para sa instantaneous response (< 1ms)
    const now = Date.now();
    const cached = sessionCache.get(decoded.id);
    if (cached && cached.token === token && cached.expiresAt > now) {
      req.user = cached.user;
      return next();
    }

    const redisSession = await redis.get(`session:${decoded.id}`);
    if (!redisSession || redisSession !== token) {
      sessionCache.delete(decoded.id);
      return res.status(401).json({ message: "Session expired or invalid. Please login again." });
    }

    const user = await User.findById(decoded.id).select("-Password");
    if (!user) {
      sessionCache.delete(decoded.id);
      return res.status(401).json({ message: "User not found in database." });
    }

    // I-cache ng 30 segundo para mabilis ang mga sabay-sabay na tawag sa Dashboard/Records
    sessionCache.set(decoded.id, {
      token,
      user,
      expiresAt: now + 30 * 1000,
    });

    req.user = user; 
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed", error: error.message });
  }
};

// 2. AUTHORIZATION: 🌟 Role Restriction
// Tumatanggap ng array ng mga allowed roles, halimbawa: restrictTo("Inventory", "Admin")
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // 👑 Superuser Override: Laging may buong access ang Admin sa lahat ng inventory modules
    if (req.user.SystemRole === "Admin") {
      return next();
    }

    // Tignan kung ang SystemRole ng user ay kasama sa allowed roles
    if (!allowedRoles.includes(req.user.SystemRole)) {
      return res.status(403).json({ 
        message: `Forbidden: Your role (${req.user.SystemRole}) is not authorized to access this action.` 
      });
    }

    next();
  };
};
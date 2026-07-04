import { rateLimit } from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  // Gagamit muna tayo ng localized MemoryStore para sa IP connection limiters
  // para maiwasan ang compatibility errors sa pagitan ng rate-limit-redis at Upstash REST API
  windowMs: 10 * 60 * 1000, // 10 Minuto na lockout window
  max: 6, // 6 na subok lang kada IP Address sa loob ng 10 minuto
  
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts from this device. Please try again after 10 minutes."
    });
  },
  
  standardHeaders: true, 
  legacyHeaders: false, 
});
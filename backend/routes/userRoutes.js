import express from "express";
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  changePassword, 
  restoreUser,
  getUserProfile // 🌟 1. IDINAGDAG: Ini-import ang profile controller
} from "../controllers/userController.js";
import { loginUser } from "../controllers/authController.js"; 
import User from "../models/User.js";

// I-import ang mga security middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";
import { loginRateLimiter } from "../middleware/limiter.js"; 

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (Walang protectRoute kasi hindi pa sila naka-login)
// ==========================================
router.post("/login", loginRateLimiter, loginUser); 


// ==========================================
// PROTECTED ROUTES (Kailangan may token muna)
// ==========================================
router.use(protectRoute);

// 🌟 2. INAYOS: Ikinabit ang totoong `getUserProfile` function para sa GET request
router.get("/profile/:id", getUserProfile); 

router.put("/change-password/:id", restrictTo("Admin", "Inventory"), changePassword);

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================
router.get("/", restrictTo("Admin"), getAllUsers);
router.post("/", restrictTo("Admin"), createUser);
router.put("/:id", restrictTo("Admin"), updateUser);
router.delete("/:id", restrictTo("Admin"), deleteUser);
router.put("/restore/:id", restrictTo("Admin"), restoreUser);

export default router;
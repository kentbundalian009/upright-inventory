import express from "express";
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  changePassword, 
  restoreUser,
  getUserProfile 
} from "../controllers/userController.js";
import { loginUser } from "../controllers/authController.js"; 
import User from "../models/User.js";

// I-import ang mga security middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";
import { loginRateLimiter } from "../middleware/limiter.js"; 

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.post("/login", loginRateLimiter, loginUser); 

// ==========================================
// PROTECTED ROUTES
// ==========================================
router.use(protectRoute);

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
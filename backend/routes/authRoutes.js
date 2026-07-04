import express from "express";
import { signupUser, loginUser, logoutUser } from "../controllers/authController.js";
import { protectRoute } from "../middleware/authMiddleware.js"; // Siguraduhing tama ang folder (middleware o middlewares)

const router = express.Router();

// 🔓 Public routes (Dito maglo-log in ang parehong Admin at Inventory)
router.post("/signup", signupUser); // Kung admin lang ang pwedeng mag-signup ng iba, pwedeng lagyan ito ng restrictTo("Admin") kung hindi ito gamit sa public registration.
router.post("/login", loginUser);

// 🔒 Protected route (Kahit anong role basta may valid token, pwedeng mag-logout)
router.post("/logout", protectRoute, logoutUser);

export default router;
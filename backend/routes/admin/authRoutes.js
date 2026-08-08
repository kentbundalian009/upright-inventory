import express from "express";
import { signupUser, loginUser, logoutUser } from "../../controllers/admin/authController.js";
import { protectRoute } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/logout", protectRoute, logoutUser);

export default router;

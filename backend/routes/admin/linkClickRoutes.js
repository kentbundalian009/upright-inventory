import express from "express";
import { recordClick, getClickLogs } from "../../controllers/admin/linkClickController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Public: allows logging shared link clicks (upon page load of shared link)
router.post("/click", recordClick);

// Protected: Admin only access to view link click audit trail
router.get("/click", protectRoute, restrictTo("Admin"), getClickLogs);

export default router;

import express from "express";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";
import ActivityLog from "../../models/ActivityLog.js";

const router = express.Router();

router.get("/", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 });
    
    const formattedLogs = logs.map(log => {
      const logDate = new Date(log.createdAt);
      return {
        id: log._id,
        username: log.username,
        role: log.role,
        module: log.module,
        operation: log.operation,
        action: log.action,
        timestamp: logDate.toTimeString().split(' ')[0], 
        date: logDate.toISOString().split('T')[0]
      };
    });

    res.status(200).json(formattedLogs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activity logs", error: error.message });
  }
});

export default router;

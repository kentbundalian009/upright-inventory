import express from "express";
import SystemSetting from "../../models/SystemSetting.js";
import ActivityLog from "../../models/ActivityLog.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/system/maintenance - Public/All roles can check maintenance status
router.get("/maintenance", async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: "system_maintenance" });
    if (!setting) {
      setting = await SystemSetting.create({
        key: "system_maintenance",
        isMaintenanceActive: false,
        maintenanceMessage: "System is currently undergoing scheduled maintenance or database updates. Access for standard accounts is temporarily suspended. Please contact your System Administrator."
      });
    }
    return res.status(200).json({
      isMaintenanceActive: setting.isMaintenanceActive,
      maintenanceMessage: setting.maintenanceMessage,
      scheduledEndTime: setting.scheduledEndTime,
      updatedBy: setting.updatedBy,
      updatedAt: setting.updatedAt
    });
  } catch (err) {
    console.error("Error fetching maintenance status:", err);
    return res.status(500).json({ message: "Failed to retrieve maintenance status", error: err.message });
  }
});

// PUT /api/system/maintenance - Only Admin can toggle or configure maintenance mode
router.put("/maintenance", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const { isMaintenanceActive, maintenanceMessage, scheduledEndTime } = req.body;

    const adminName = req.user?.Fullname || req.user?.Username || "System Admin";

    let setting = await SystemSetting.findOne({ key: "system_maintenance" });
    if (!setting) {
      setting = new SystemSetting({ key: "system_maintenance" });
    }

    const previousState = setting.isMaintenanceActive;

    if (typeof isMaintenanceActive === "boolean") {
      setting.isMaintenanceActive = isMaintenanceActive;
    }
    if (maintenanceMessage !== undefined) {
      setting.maintenanceMessage = maintenanceMessage;
    }
    if (scheduledEndTime !== undefined) {
      setting.scheduledEndTime = scheduledEndTime ? new Date(scheduledEndTime) : null;
    }
    setting.updatedBy = adminName;

    await setting.save();

    // Log this critical action in ActivityLog
    try {
      await ActivityLog.create({
        username: req.user?.Username || adminName,
        role: "Admin",
        module: "System Maintenance",
        operation: setting.isMaintenanceActive ? "UPDATE" : "UPDATE",
        action: setting.isMaintenanceActive 
          ? `Activated System Maintenance / Shutdown Mode: "${setting.maintenanceMessage}"`
          : `Deactivated System Maintenance Mode. Live system restored for all user roles.`
      });
    } catch (logErr) {
      console.warn("Failed to write activity log for maintenance change:", logErr.message);
    }

    return res.status(200).json({
      message: setting.isMaintenanceActive 
        ? "System Maintenance / Shutdown mode activated successfully." 
        : "System restored to normal live operation.",
      setting
    });
  } catch (err) {
    console.error("Error updating maintenance settings:", err);
    return res.status(500).json({ message: "Failed to update maintenance settings", error: err.message });
  }
});

export default router;

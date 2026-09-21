import express from "express";
import fs from "fs";
import path from "path";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";
import ActivityLog from "../../models/ActivityLog.js";
import { 
  getScheduleSetting, 
  computeNextRun, 
  createServerSnapshot, 
  listServerSnapshots, 
  BACKUPS_DIR 
} from "../../lib/backupScheduler.js";

// Import all models
import User from "../../models/User.js";
import RawMaterial from "../../models/RawMaterial.js";
import Supplies from "../../models/Supplies.js";
import SuppliesMovement from "../../models/SuppliesMovement.js";
import Consumable from "../../models/Consumable.js";
import PackingList from "../../models/PackingList.js";
import Conversion from "../../models/Conversion.js";
import PurchaseOrder from "../../models/PurchaseOrder.js";
import Setting from "../../models/Setting.js";
import Palette from "../../models/Palette.js";
import PaletteSup from "../../models/PaletteSup.js";

const router = express.Router();

// GET /api/backup/stats - Overview of collection record counts
router.get("/stats", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const [
      usersCount,
      rawMatCount,
      suppliesCount,
      movementsCount,
      consumablesCount,
      packingListCount,
      conversionsCount,
      poCount,
      logsCount
    ] = await Promise.all([
      User.countDocuments(),
      RawMaterial.countDocuments(),
      Supplies.countDocuments(),
      SuppliesMovement.countDocuments(),
      Consumable.countDocuments(),
      PackingList.countDocuments(),
      Conversion.countDocuments(),
      PurchaseOrder.countDocuments(),
      ActivityLog.countDocuments()
    ]);

    const totalRecords = usersCount + rawMatCount + suppliesCount + 
      movementsCount + consumablesCount + packingListCount + conversionsCount + poCount;

    return res.status(200).json({
      totalRecords,
      breakdown: {
        users: usersCount,
        rawMaterials: rawMatCount,
        supplies: suppliesCount,
        suppliesMovements: movementsCount,
        consumables: consumablesCount,
        packingLists: packingListCount,
        conversions: conversionsCount,
        purchaseOrders: poCount,
        activityLogs: logsCount
      },
      lastChecked: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error retrieving backup stats:", err);
    return res.status(500).json({ message: "Failed to load database stats", error: err.message });
  }
});

// GET /api/backup/export - Full or Selective Export of database
router.get("/export", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const { collection } = req.query; // optional: single collection filter

    const backupPayload = {
      system: "ONEINVENTORY",
      version: "2.0",
      exportDate: new Date().toISOString(),
      exportedBy: req.user?.Fullname || req.user?.Username || "System Admin",
      collections: {}
    };

    if (!collection || collection === "all" || collection === "users") {
      backupPayload.collections.users = await User.find().select("-Password").lean();
    }
    if (!collection || collection === "all" || collection === "rawMaterials") {
      backupPayload.collections.rawMaterials = await RawMaterial.find().lean();
    }
    if (!collection || collection === "all" || collection === "supplies") {
      backupPayload.collections.supplies = await Supplies.find().lean();
    }
    if (!collection || collection === "all" || collection === "suppliesMovements") {
      backupPayload.collections.suppliesMovements = await SuppliesMovement.find().lean();
    }
    if (!collection || collection === "all" || collection === "consumables") {
      backupPayload.collections.consumables = await Consumable.find().lean();
    }
    if (!collection || collection === "all" || collection === "packingLists") {
      backupPayload.collections.packingLists = await PackingList.find().lean();
    }
    if (!collection || collection === "all" || collection === "conversions") {
      backupPayload.collections.conversions = await Conversion.find().lean();
    }
    if (!collection || collection === "all" || collection === "purchaseOrders") {
      backupPayload.collections.purchaseOrders = await PurchaseOrder.find().lean();
    }
    if (!collection || collection === "all" || collection === "settings") {
      backupPayload.collections.settings = await Setting.find().lean();
      backupPayload.collections.palette = await Palette.find().lean();
      backupPayload.collections.paletteSup = await PaletteSup.find().lean();
    }

    // Log the backup creation in ActivityLog
    try {
      await ActivityLog.create({
        username: req.user?.Username || "Admin",
        role: "Admin",
        module: "Database Backup",
        operation: "APPROVE",
        action: `Generated JSON database export snapshot [Target: ${collection || "Full DB"}]`
      });
    } catch (logErr) {
      console.warn("Failed to write activity log for backup export:", logErr.message);
    }

    const filename = `oneinventory_backup_${collection || "full"}_${new Date().toISOString().split("T")[0]}.json`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json(backupPayload);
  } catch (err) {
    console.error("Error generating backup export:", err);
    return res.status(500).json({ message: "Failed to generate database backup", error: err.message });
  }
});

// POST /api/backup/restore - Restore or sync collection records from verified backup file
router.post("/restore", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const { backupData, restoreMode = "merge", confirmationPasskey } = req.body;

    if (!confirmationPasskey || confirmationPasskey !== "RESTORE-CONFIRM-2026") {
      return res.status(403).json({ message: "ACCESS DENIED: Invalid restore authorization passkey." });
    }

    if (!backupData || !backupData.collections) {
      return res.status(400).json({ message: "Invalid backup data structure. Missing 'collections' container." });
    }

    const restoredCounts = {};
    const cols = backupData.collections;

    // 1. Raw Materials
    if (Array.isArray(cols.rawMaterials) && cols.rawMaterials.length > 0) {
      if (restoreMode === "replace") {
        await RawMaterial.deleteMany({});
      }
      for (const item of cols.rawMaterials) {
        const { _id, ...doc } = item;
        await RawMaterial.findByIdAndUpdate(_id || new mongoose.Types.ObjectId(), doc, { upsert: true, new: true });
      }
      restoredCounts.rawMaterials = cols.rawMaterials.length;
    }

    // 2. Supplies
    if (Array.isArray(cols.supplies) && cols.supplies.length > 0) {
      if (restoreMode === "replace") {
        await Supplies.deleteMany({});
      }
      for (const item of cols.supplies) {
        const { _id, ...doc } = item;
        await Supplies.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.supplies = cols.supplies.length;
    }

    // 3. Consumables
    if (Array.isArray(cols.consumables) && cols.consumables.length > 0) {
      if (restoreMode === "replace") {
        await Consumable.deleteMany({});
      }
      for (const item of cols.consumables) {
        const { _id, ...doc } = item;
        await Consumable.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.consumables = cols.consumables.length;
    }

    // 5. Packing Lists
    if (Array.isArray(cols.packingLists) && cols.packingLists.length > 0) {
      if (restoreMode === "replace") {
        await PackingList.deleteMany({});
      }
      for (const item of cols.packingLists) {
        const { _id, ...doc } = item;
        await PackingList.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.packingLists = cols.packingLists.length;
    }

    // 6. Conversions (WIP)
    if (Array.isArray(cols.conversions) && cols.conversions.length > 0) {
      if (restoreMode === "replace") {
        await Conversion.deleteMany({});
      }
      for (const item of cols.conversions) {
        const { _id, ...doc } = item;
        await Conversion.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.conversions = cols.conversions.length;
    }

    // 7. Purchase Orders
    if (Array.isArray(cols.purchaseOrders) && cols.purchaseOrders.length > 0) {
      if (restoreMode === "replace") {
        await PurchaseOrder.deleteMany({});
      }
      for (const item of cols.purchaseOrders) {
        const { _id, ...doc } = item;
        await PurchaseOrder.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.purchaseOrders = cols.purchaseOrders.length;
    }

    // Log restore action
    try {
      await ActivityLog.create({
        username: req.user?.Username || "Admin",
        role: "Admin",
        module: "Database Restore",
        operation: "UPDATE",
        action: `Restored database collections (${restoreMode} mode): ${JSON.stringify(restoredCounts)}`
      });
    } catch (logErr) {
      console.warn("Failed to write activity log for restore:", logErr.message);
    }

    return res.status(200).json({
      message: "Database restore executed successfully.",
      restoredCounts
    });
  } catch (err) {
    console.error("Error executing database restore:", err);
    return res.status(500).json({ message: "Failed to execute database restore", error: err.message });
  }
});

// GET /api/backup/schedule - Fetch current backup schedule and server snapshots
router.get("/schedule", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const setting = await getScheduleSetting();
    const snapshots = listServerSnapshots();

    return res.status(200).json({
      frequency: setting.maintenanceMessage || "daily", // daily | weekly | monthly | disabled
      enabled: setting.isMaintenanceActive !== false,
      nextRun: setting.scheduledEndTime,
      lastRun: setting.updatedAt,
      updatedBy: setting.updatedBy || "System Admin",
      snapshots
    });
  } catch (err) {
    console.error("Error fetching backup schedule:", err);
    return res.status(500).json({ message: "Failed to load backup schedule", error: err.message });
  }
});

// PUT /api/backup/schedule - Update backup schedule (daily, weekly, monthly, disabled)
router.put("/schedule", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const { frequency = "daily", enabled = true } = req.body;
    const validFrequencies = ["daily", "weekly", "monthly", "disabled"];

    if (!validFrequencies.includes(frequency.toLowerCase())) {
      return res.status(400).json({ message: "Invalid frequency. Must be 'daily', 'weekly', 'monthly', or 'disabled'." });
    }

    const setting = await getScheduleSetting();
    setting.maintenanceMessage = frequency.toLowerCase();
    setting.isMaintenanceActive = enabled && frequency !== "disabled";
    setting.updatedBy = req.user?.Fullname || req.user?.Username || "System Admin";

    if (setting.isMaintenanceActive && frequency !== "disabled") {
      setting.scheduledEndTime = computeNextRun(frequency.toLowerCase());
    } else {
      setting.scheduledEndTime = null;
    }

    await setting.save();

    try {
      await ActivityLog.create({
        username: req.user?.Username || "Admin",
        role: "Admin",
        module: "Database Vault",
        operation: "UPDATE",
        action: `Configured automated backup schedule: ${frequency.toUpperCase()} (Enabled: ${setting.isMaintenanceActive})`
      });
    } catch (logErr) {
      console.warn("Activity log failed for schedule change:", logErr.message);
    }

    return res.status(200).json({
      message: `Automated backup schedule set to ${frequency.toUpperCase()}.`,
      frequency: setting.maintenanceMessage,
      enabled: setting.isMaintenanceActive,
      nextRun: setting.scheduledEndTime,
      snapshots: listServerSnapshots()
    });
  } catch (err) {
    console.error("Error updating backup schedule:", err);
    return res.status(500).json({ message: "Failed to update backup schedule", error: err.message });
  }
});

// POST /api/backup/snapshots/generate - Run an immediate server snapshot
router.post("/snapshots/generate", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const adminName = req.user?.Fullname || req.user?.Username || "System Admin";
    const snapshot = await createServerSnapshot("manual", adminName);
    const snapshots = listServerSnapshots();

    return res.status(200).json({
      message: "Server backup snapshot created successfully.",
      snapshot,
      snapshots
    });
  } catch (err) {
    console.error("Error creating snapshot:", err);
    return res.status(500).json({ message: "Failed to create server snapshot", error: err.message });
  }
});

// GET /api/backup/snapshots/:filename/download - Download a snapshot file
router.get("/snapshots/:filename/download", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Snapshot file not found on server." });
    }

    return res.download(filePath, safeFilename);
  } catch (err) {
    console.error("Error downloading snapshot:", err);
    return res.status(500).json({ message: "Failed to download snapshot file", error: err.message });
  }
});

// DELETE /api/backup/snapshots/:filename - Delete a server snapshot
router.delete("/snapshots/:filename", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(BACKUPS_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    try {
      await ActivityLog.create({
        username: req.user?.Username || "Admin",
        role: "Admin",
        module: "Database Vault",
        operation: "DELETE",
        action: `Deleted server backup snapshot: ${safeFilename}`
      });
    } catch (logErr) {
      console.warn("Activity log failed for snapshot delete:", logErr.message);
    }

    return res.status(200).json({
      message: "Snapshot deleted successfully.",
      snapshots: listServerSnapshots()
    });
  } catch (err) {
    console.error("Error deleting snapshot:", err);
    return res.status(500).json({ message: "Failed to delete snapshot file", error: err.message });
  }
});

// POST /api/backup/snapshots/:filename/restore - 1-Click Restore directly from a server snapshot file
router.post("/snapshots/:filename/restore", protectRoute, restrictTo("Admin"), async (req, res) => {
  try {
    const { confirmationPasskey, restoreMode = "merge" } = req.body;

    if (!confirmationPasskey || confirmationPasskey !== "RESTORE-CONFIRM-2026") {
      return res.status(403).json({ message: "ACCESS DENIED: Invalid restore authorization passkey." });
    }

    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Snapshot file not found on server." });
    }

    const rawData = fs.readFileSync(filePath, "utf8");
    const backupData = JSON.parse(rawData);

    if (!backupData || !backupData.collections) {
      return res.status(400).json({ message: "Invalid snapshot structure. Missing 'collections' container." });
    }

    const restoredCounts = {};
    const cols = backupData.collections;

    // 1. Raw Materials
    if (Array.isArray(cols.rawMaterials) && cols.rawMaterials.length > 0) {
      if (restoreMode === "replace") await RawMaterial.deleteMany({});
      for (const item of cols.rawMaterials) {
        const { _id, ...doc } = item;
        await RawMaterial.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.rawMaterials = cols.rawMaterials.length;
    }

    // 2. Supplies
    if (Array.isArray(cols.supplies) && cols.supplies.length > 0) {
      if (restoreMode === "replace") await Supplies.deleteMany({});
      for (const item of cols.supplies) {
        const { _id, ...doc } = item;
        await Supplies.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.supplies = cols.supplies.length;
    }

    // 3. Consumables
    if (Array.isArray(cols.consumables) && cols.consumables.length > 0) {
      if (restoreMode === "replace") await Consumable.deleteMany({});
      for (const item of cols.consumables) {
        const { _id, ...doc } = item;
        await Consumable.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.consumables = cols.consumables.length;
    }

    // 5. Packing Lists
    if (Array.isArray(cols.packingLists) && cols.packingLists.length > 0) {
      if (restoreMode === "replace") await PackingList.deleteMany({});
      for (const item of cols.packingLists) {
        const { _id, ...doc } = item;
        await PackingList.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.packingLists = cols.packingLists.length;
    }

    // 6. Conversions
    if (Array.isArray(cols.conversions) && cols.conversions.length > 0) {
      if (restoreMode === "replace") await Conversion.deleteMany({});
      for (const item of cols.conversions) {
        const { _id, ...doc } = item;
        await Conversion.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.conversions = cols.conversions.length;
    }

    // 7. Purchase Orders
    if (Array.isArray(cols.purchaseOrders) && cols.purchaseOrders.length > 0) {
      if (restoreMode === "replace") await PurchaseOrder.deleteMany({});
      for (const item of cols.purchaseOrders) {
        const { _id, ...doc } = item;
        await PurchaseOrder.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.purchaseOrders = cols.purchaseOrders.length;
    }

    try {
      await ActivityLog.create({
        username: req.user?.Username || "Admin",
        role: "Admin",
        module: "Database Restore",
        operation: "UPDATE",
        action: `Restored database directly from server snapshot "${safeFilename}" (${restoreMode} mode)`
      });
    } catch (logErr) {
      console.warn("Activity log failed for snapshot restore:", logErr.message);
    }

    return res.status(200).json({
      message: `Database successfully restored from snapshot ${safeFilename}!`,
      restoredCounts
    });
  } catch (err) {
    console.error("Error restoring from snapshot:", err);
    return res.status(500).json({ message: "Failed to restore database from snapshot", error: err.message });
  }
});

export default router;


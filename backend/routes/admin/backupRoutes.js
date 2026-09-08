import express from "express";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";
import ActivityLog from "../../models/ActivityLog.js";

// Import all models
import User from "../../models/User.js";
import RawMaterial from "../../models/RawMaterial.js";
import Product from "../../models/Product.js";
import Supplies from "../../models/Supplies.js";
import SuppliesMovement from "../../models/SuppliesMovement.js";
import Assets from "../../models/Assets.js";
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
      productsCount,
      suppliesCount,
      movementsCount,
      assetsCount,
      packingListCount,
      conversionsCount,
      poCount,
      logsCount
    ] = await Promise.all([
      User.countDocuments(),
      RawMaterial.countDocuments(),
      Product.countDocuments(),
      Supplies.countDocuments(),
      SuppliesMovement.countDocuments(),
      Assets.countDocuments(),
      PackingList.countDocuments(),
      Conversion.countDocuments(),
      PurchaseOrder.countDocuments(),
      ActivityLog.countDocuments()
    ]);

    const totalRecords = usersCount + rawMatCount + productsCount + suppliesCount + 
      movementsCount + assetsCount + packingListCount + conversionsCount + poCount;

    return res.status(200).json({
      totalRecords,
      breakdown: {
        users: usersCount,
        rawMaterials: rawMatCount,
        products: productsCount,
        supplies: suppliesCount,
        suppliesMovements: movementsCount,
        assets: assetsCount,
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
    if (!collection || collection === "all" || collection === "products") {
      backupPayload.collections.products = await Product.find().lean();
    }
    if (!collection || collection === "all" || collection === "supplies") {
      backupPayload.collections.supplies = await Supplies.find().lean();
    }
    if (!collection || collection === "all" || collection === "suppliesMovements") {
      backupPayload.collections.suppliesMovements = await SuppliesMovement.find().lean();
    }
    if (!collection || collection === "all" || collection === "assets") {
      backupPayload.collections.assets = await Assets.find().lean();
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

    // 3. Products
    if (Array.isArray(cols.products) && cols.products.length > 0) {
      if (restoreMode === "replace") {
        await Product.deleteMany({});
      }
      for (const item of cols.products) {
        const { _id, ...doc } = item;
        await Product.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.products = cols.products.length;
    }

    // 4. Assets
    if (Array.isArray(cols.assets) && cols.assets.length > 0) {
      if (restoreMode === "replace") {
        await Assets.deleteMany({});
      }
      for (const item of cols.assets) {
        const { _id, ...doc } = item;
        await Assets.findByIdAndUpdate(_id, doc, { upsert: true, new: true });
      }
      restoredCounts.assets = cols.assets.length;
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

export default router;

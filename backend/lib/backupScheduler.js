import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import SystemSetting from "../models/SystemSetting.js";
import ActivityLog from "../models/ActivityLog.js";

// Models to backup
import User from "../models/User.js";
import RawMaterial from "../models/RawMaterial.js";
import Product from "../models/Product.js";
import Supplies from "../models/Supplies.js";
import SuppliesMovement from "../models/SuppliesMovement.js";
import Assets from "../models/Assets.js";
import PackingList from "../models/PackingList.js";
import Conversion from "../models/Conversion.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Setting from "../models/Setting.js";
import Palette from "../models/Palette.js";
import PaletteSup from "../models/PaletteSup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, "../backups");

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Compute next run date based on frequency
export const computeNextRun = (frequency, fromDate = new Date()) => {
  const next = new Date(fromDate);
  next.setSeconds(0);
  next.setMilliseconds(0);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0); // 12:00 AM Midnight
  } else if (frequency === "weekly") {
    // Next Sunday at 12:00 AM
    const day = next.getDay();
    const diff = (7 - day) % 7 || 7;
    next.setDate(next.getDate() + diff);
    next.setHours(0, 0, 0, 0);
  } else if (frequency === "monthly") {
    // 1st day of next month at 12:00 AM
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(0, 0, 0, 0);
  } else {
    return null;
  }
  return next;
};

// Retrieve or create schedule settings in MongoDB
export const getScheduleSetting = async () => {
  let setting = await SystemSetting.findOne({ key: "backup_schedule" });
  if (!setting) {
    const defaultNext = computeNextRun("daily");
    setting = await SystemSetting.create({
      key: "backup_schedule",
      maintenanceMessage: "daily", // stores frequency: daily | weekly | monthly | disabled
      scheduledEndTime: defaultNext, // stores nextRun
      updatedBy: "System",
      isMaintenanceActive: true // true = schedule enabled
    });
  }
  return setting;
};

// Generate Full Database JSON Payload
export const generateFullBackupPayload = async (sourceTag = "automated") => {
  const [
    users,
    rawMaterials,
    products,
    supplies,
    suppliesMovements,
    assets,
    packingLists,
    conversions,
    purchaseOrders,
    settings,
    palette,
    paletteSup
  ] = await Promise.all([
    User.find().select("-Password").lean(),
    RawMaterial.find().lean(),
    Product.find().lean(),
    Supplies.find().lean(),
    SuppliesMovement.find().lean(),
    Assets.find().lean(),
    PackingList.find().lean(),
    Conversion.find().lean(),
    PurchaseOrder.find().lean(),
    Setting.find().lean(),
    Palette.find().lean(),
    PaletteSup.find().lean()
  ]);

  return {
    system: "ONEINVENTORY",
    version: "2.0",
    backupType: sourceTag,
    exportDate: new Date().toISOString(),
    collections: {
      users,
      rawMaterials,
      products,
      supplies,
      suppliesMovements,
      assets,
      packingLists,
      conversions,
      purchaseOrders,
      settings,
      palette,
      paletteSup
    }
  };
};

// Execute Backup and Save to Server Storage
export const createServerSnapshot = async (frequencyTag = "manual", adminName = "System Scheduler") => {
  try {
    const payload = await generateFullBackupPayload(frequencyTag);
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `snapshot_${frequencyTag}_${dateStr}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");

    // Enforce retention: keep newest 10 files
    cleanOldSnapshots(10);

    // Update lastRun and nextRun in MongoDB
    const setting = await getScheduleSetting();
    setting.updatedAt = new Date();
    setting.updatedBy = adminName;
    if (setting.isMaintenanceActive && setting.maintenanceMessage !== "disabled") {
      setting.scheduledEndTime = computeNextRun(setting.maintenanceMessage);
    }
    await setting.save();

    // Log action
    try {
      await ActivityLog.create({
        username: adminName,
        role: "Admin",
        module: "Database Vault",
        operation: "APPROVE",
        action: `Generated server backup snapshot: ${filename} (${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)`
      });
    } catch (err) {
      console.warn("Activity log failed for auto backup:", err.message);
    }

    return {
      filename,
      filePath,
      sizeBytes: fs.statSync(filePath).size,
      created: new Date().toISOString()
    };
  } catch (err) {
    console.error("Error creating server snapshot:", err);
    throw err;
  }
};

// Retention cleaner: deletes oldest snapshots exceeding limit
export const cleanOldSnapshots = (retentionLimit = 10) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const fullPath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(fullPath);
        return { name: f, fullPath, time: stats.mtimeMs };
      })
      .sort((a, b) => b.time - a.time); // newest first

    if (files.length > retentionLimit) {
      const toDelete = files.slice(retentionLimit);
      for (const file of toDelete) {
        fs.unlinkSync(file.fullPath);
        console.log(`🧹 Cleaned old backup snapshot: ${file.name}`);
      }
    }
  } catch (err) {
    console.warn("Snapshot cleaner note:", err.message);
  }
};

// List all snapshots in server storage
export const listServerSnapshots = () => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return [];

    return fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const fullPath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(fullPath);
        const isAuto = f.includes("daily") || f.includes("weekly") || f.includes("monthly");
        const type = f.includes("daily") ? "Daily Auto"
          : f.includes("weekly") ? "Weekly Auto"
          : f.includes("monthly") ? "Monthly Auto"
          : "Manual Snapshot";

        return {
          filename: f,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
          createdAt: stats.mtime.toISOString(),
          type,
          isAuto
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error("Error listing snapshots:", err);
    return [];
  }
};

// Background Scheduler Worker (checks every 60 seconds)
export const initBackupScheduler = () => {
  console.log("⏰ Initializing Database Vault Automated Scheduler...");

  // Run check every 60 seconds
  setInterval(async () => {
    try {
      const setting = await getScheduleSetting();
      if (!setting || !setting.isMaintenanceActive || setting.maintenanceMessage === "disabled") {
        return;
      }

      const frequency = setting.maintenanceMessage; // daily | weekly | monthly
      const nextRun = setting.scheduledEndTime ? new Date(setting.scheduledEndTime) : null;
      const now = new Date();

      if (nextRun && now >= nextRun) {
        console.log(`🚀 Executing Scheduled ${frequency.toUpperCase()} Database Backup...`);
        await createServerSnapshot(frequency, `AutoScheduler (${frequency})`);
      }
    } catch (err) {
      console.error("Scheduler run error:", err.message);
    }
  }, 60 * 1000);
};

export { BACKUPS_DIR };

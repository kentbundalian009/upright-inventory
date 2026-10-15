import express from "express";
import multer from "multer";
import {
  getConsumables,
  getConsumableImage,
  getConsumableById,
  createConsumable,
  updateConsumable,
  deleteConsumable,
  unarchiveConsumable,
  permanentDeleteConsumable,
  getTransactions,
  createTransaction,
  batchUpdateActualCounts
} from "../../controllers/inventory/consumableController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// 🖼️ Public & Browser-Cacheable Image Endpoint
router.get("/:id/image", getConsumableImage);

router.use(protectRoute);

// Consumables items
router.route("/")
  .get(restrictTo("Inventory", "Viewer", "Admin", "Purchasing"), getConsumables)
  .post(restrictTo("Inventory", "Admin", "Purchasing"), createConsumable);

router.route("/batch-counts")
  .put(restrictTo("Inventory", "Admin", "Purchasing"), batchUpdateActualCounts);

router.route("/transactions")
  .get(restrictTo("Inventory", "Viewer", "Admin", "Purchasing"), getTransactions)
  .post(restrictTo("Inventory", "Admin", "Purchasing"), createTransaction);

router.route("/:id/unarchive")
  .put(restrictTo("Inventory", "Admin", "Purchasing"), unarchiveConsumable);

router.route("/:id/permanent")
  .delete(restrictTo("Inventory", "Admin", "Purchasing"), permanentDeleteConsumable);

router.route("/:id")
  .get(restrictTo("Inventory", "Viewer", "Admin", "Purchasing"), getConsumableById)
  .put(restrictTo("Inventory", "Admin", "Purchasing"), updateConsumable)
  .delete(restrictTo("Inventory", "Admin", "Purchasing"), deleteConsumable);

export default router;


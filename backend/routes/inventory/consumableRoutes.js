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
  createTransaction
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
  .get(restrictTo("Inventory", "Viewer", "Admin"), getConsumables)
  .post(restrictTo("Inventory", "Admin"), createConsumable);

router.route("/transactions")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getTransactions)
  .post(restrictTo("Inventory", "Admin"), createTransaction);

router.route("/:id/unarchive")
  .put(restrictTo("Inventory", "Admin"), unarchiveConsumable);

router.route("/:id/permanent")
  .delete(restrictTo("Inventory", "Admin"), permanentDeleteConsumable);

router.route("/:id")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getConsumableById)
  .put(restrictTo("Inventory", "Admin"), updateConsumable)
  .delete(restrictTo("Inventory", "Admin"), deleteConsumable);

export default router;


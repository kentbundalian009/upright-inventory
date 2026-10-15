import express from "express";
import multer from "multer";
import path from "path";
import {
  getAllSupplies,
  getSuppliesImage,
  getSuppliesById,
  createSupplies,
  updateSupplies,
  deleteSupplies,
  unarchiveSupplies,
  permanentDeleteSupplies,
  batchUpdateSuppliesActualCounts,
} from "../../controllers/inventory/suppliesController.js";
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

// 🖼️ Public & Browser-Cacheable Image Endpoint (walang Bearer header na kailangan ang <img> tags)
router.get("/:id/image", getSuppliesImage);

router.use(protectRoute);

router.route("/batch-counts")
  .put(restrictTo("Inventory", "Admin", "Purchasing"), batchUpdateSuppliesActualCounts);

router.route("/")
  .get(restrictTo("Inventory", "Viewer", "Admin", "Purchasing"), getAllSupplies)    
  .post(restrictTo("Inventory", "Admin", "Purchasing"), createSupplies);

router.route("/:id/unarchive")
  .put(restrictTo("Inventory", "Admin", "Purchasing"), unarchiveSupplies); 

router.route("/:id/permanent")
  .delete(restrictTo("Inventory", "Admin", "Purchasing"), permanentDeleteSupplies);

router.route("/:id")
  .get(restrictTo("Inventory", "Viewer", "Admin", "Purchasing"), getSuppliesById)   
  .put(restrictTo("Inventory", "Admin", "Purchasing"), updateSupplies)
  .delete(restrictTo("Inventory", "Admin", "Purchasing"), deleteSupplies); 

export default router;

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

router.route("/")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getAllSupplies)    
  .post(restrictTo("Inventory", "Admin"), upload.single("image"), createSupplies);

router.route("/:id/unarchive")
  .put(restrictTo("Inventory", "Admin"), unarchiveSupplies); 

router.route("/:id/permanent")
  .delete(restrictTo("Inventory", "Admin"), permanentDeleteSupplies);

router.route("/:id")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getSuppliesById)   
  .put(restrictTo("Inventory", "Admin"), upload.single("image"), updateSupplies)
  .delete(restrictTo("Inventory", "Admin"), deleteSupplies); 

export default router;

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getAllRawMaterials,
  getRawMaterialImage,
  getRawMaterialById,
  getUniqueImageLibrary,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  unarchiveRawMaterial,
  permanentDeleteRawMaterial,
} from "../../controllers/inventory/rawMaterialController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload an image file."), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});
const router = express.Router();

// 🖼️ Public & Browser-Cacheable Image Endpoint (walang Bearer header na kailangan ang <img> tags)
router.get("/:id/image", getRawMaterialImage);

// 🔗 Public Read-Only Endpoint for Shared Link Viewers
router.get("/shared", getAllRawMaterials);

// 🖼️ Dedicated unique image library endpoint (deduplicated across all items in DB)
router.get("/image-library", getUniqueImageLibrary);

router.use(protectRoute);

router.route("/")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getAllRawMaterials)
  .post(restrictTo("Inventory", "Admin"), upload.single("image"), createRawMaterial);

router.route("/:id/unarchive")
  .put(restrictTo("Inventory", "Admin"), unarchiveRawMaterial);

router.route("/:id/permanent")
  .delete(restrictTo("Inventory", "Admin"), permanentDeleteRawMaterial);

router.route("/:id")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getRawMaterialById)
  .put(restrictTo("Inventory", "Admin"), upload.single("image"), updateRawMaterial)
  .delete(restrictTo("Inventory", "Admin"), deleteRawMaterial);

export default router;

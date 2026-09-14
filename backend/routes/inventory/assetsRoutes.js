import express from "express";
import multer from "multer";
import {
  getAllAssets,
  getAssetsById,
  createAssets,
  updateAssets,
  deleteAssets,
} from "../../controllers/inventory/assetsController.js";
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

router.use(protectRoute);

router.route("/")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getAllAssets)
  .post(restrictTo("Inventory", "Admin"), upload.single("image"), createAssets);

router.route("/:id")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getAssetsById)
  .put(restrictTo("Inventory", "Admin"), upload.single("image"), updateAssets)
  .delete(restrictTo("Inventory", "Admin"), deleteAssets);

export default router;

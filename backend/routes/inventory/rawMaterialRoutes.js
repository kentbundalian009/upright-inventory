import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getAllRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  unarchiveRawMaterial,
  permanentDeleteRawMaterial,
} from "../../controllers/inventory/rawMaterialController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload an image file."), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });
const router = express.Router();

router.use(protectRoute, restrictTo("Inventory"));

router.route("/")
  .get(getAllRawMaterials)
  .post(upload.single("image"), createRawMaterial);

router.route("/:id/unarchive")
  .put(unarchiveRawMaterial);

router.route("/:id/permanent")
  .delete(permanentDeleteRawMaterial);

router.route("/:id")
  .get(getRawMaterialById)
  .put(upload.single("image"), updateRawMaterial)
  .delete(deleteRawMaterial);

export default router;

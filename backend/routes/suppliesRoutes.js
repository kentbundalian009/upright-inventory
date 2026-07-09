import express from "express";
import multer from "multer";
import path from "path";
import {
  getAllSupplies,
  getSuppliesById,
  createSupplies,
  updateSupplies,
  deleteSupplies,
  unarchiveSupplies,
} from "../controllers/suppliesController.js";
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer Storage Configuration
const storage = dicsStorage => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Tiyaking gawa na ang folder na ito sa iyong backend root
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File Filter para masigurong imahe lang ang tinatanggap
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed!"), false);
  }
};

const upload = multer({ storage: storage(), fileFilter: fileFilter });

// 🔒 Selyado para sa Inventory Role lamang
router.use(protectRoute, restrictTo("Inventory"));

router.route("/")
  .get(getAllSupplies)    
  .post(upload.single("image"), createSupplies); // Isinama ang Multer middleware dito

router.route("/:id/unarchive")
  .put(unarchiveSupplies); 

router.route("/:id")
  .get(getSuppliesById)   
  .put(upload.single("image"), updateSupplies) // Isinama ang Multer middleware dito   
  .delete(deleteSupplies); 

export default router;
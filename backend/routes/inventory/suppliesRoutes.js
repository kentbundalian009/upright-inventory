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
  permanentDeleteSupplies,
} from "../../controllers/inventory/suppliesController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

const storage = () => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed!"), false);
  }
};

const upload = multer({ storage: storage(), fileFilter: fileFilter });

router.use(protectRoute, restrictTo("Inventory"));

router.route("/")
  .get(getAllSupplies)    
  .post(upload.single("image"), createSupplies);

router.route("/:id/unarchive")
  .put(unarchiveSupplies); 

router.route("/:id/permanent")
  .delete(permanentDeleteSupplies);

router.route("/:id")
  .get(getSuppliesById)   
  .put(upload.single("image"), updateSupplies)
  .delete(deleteSupplies); 

export default router;

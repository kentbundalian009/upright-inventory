import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  changePassword, 
  restoreUser,
  getUserProfile 
} from "../../controllers/admin/userController.js";
import { loginUser } from "../../controllers/admin/authController.js"; 

import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";
import { loginRateLimiter } from "../../middleware/limiter.js"; 

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

router.post("/login", loginRateLimiter, loginUser); 

router.use(protectRoute);

router.get("/profile/:id", getUserProfile); 
router.put("/change-password/:id", restrictTo("Admin", "Inventory", "Viewer"), changePassword);
router.put("/:id", upload.single("image"), updateUser);

router.get("/", restrictTo("Admin"), getAllUsers);
router.post("/", restrictTo("Admin"), upload.single("image"), createUser);
router.delete("/:id", restrictTo("Admin"), deleteUser);
router.put("/restore/:id", restrictTo("Admin"), restoreUser);

export default router;

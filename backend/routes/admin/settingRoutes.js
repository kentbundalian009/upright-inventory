import express from "express";
import { getThresholdByCategory, updateThresholdByCategory } from "../../controllers/admin/settingController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute);

router.route("/:categoryType")
  .get(restrictTo("Inventory", "Viewer"), getThresholdByCategory)
  .put(restrictTo("Inventory"), updateThresholdByCategory);

export default router;

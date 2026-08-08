import express from "express";
import { getThresholdByCategory, updateThresholdByCategory } from "../../controllers/admin/settingController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute, restrictTo("Inventory"));

router.route("/:categoryType")
  .get(getThresholdByCategory)
  .put(updateThresholdByCategory);

export default router;

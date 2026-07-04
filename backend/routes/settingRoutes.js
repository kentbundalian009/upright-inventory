import express from "express";
import { getThresholdByCategory, updateThresholdByCategory } from "../controllers/settingController.js";
// 🌟 I-import ang security middlewares mula sa iyong middleware folder
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Siguraduhing logged in, at strictly "Inventory" role lamang ang makakagalaw ng threshold settings
router.use(protectRoute, restrictTo("Inventory"));

// Ang endpoint mapping nito ay papasok bilang /api/settings/:categoryType
router.route("/:categoryType")
  .get(getThresholdByCategory)
  .put(updateThresholdByCategory);

export default router;
import express from "express";
import {
  getAllAssets,
  getAssetsById,
  createAssets,
  updateAssets,
  deleteAssets,
} from "../../controllers/inventory/assetsController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute);

router.route("/")
  .get(restrictTo("Inventory", "Viewer"), getAllAssets)
  .post(restrictTo("Inventory"), createAssets);

router.route("/:id")
  .get(restrictTo("Inventory", "Viewer"), getAssetsById)
  .put(restrictTo("Inventory"), updateAssets)
  .delete(restrictTo("Inventory"), deleteAssets);

export default router;

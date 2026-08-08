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
router.use(restrictTo("Inventory"));

router.route("/")
  .get(getAllAssets)
  .post(createAssets);

router.route("/:id")
  .get(getAssetsById)
  .put(updateAssets)
  .delete(deleteAssets);

export default router;

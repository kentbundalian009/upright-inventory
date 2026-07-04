import express from "express";
import {
  getAllAssets,
  getAssetsById,
  createAssets,
  updateAssets,
  deleteAssets,
} from "../controllers/assetsController.js";
// 🌟 I-import ang middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Lahat ng sumusunod na endpoints ay para sa logged-in Inventory personnel lamang
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
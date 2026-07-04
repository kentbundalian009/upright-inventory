import express from "express";
import {
  getAllRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  unarchiveRawMaterial, 
} from "../controllers/rawMaterialController.js";
// 🌟 I-import ang security middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Selyado para sa Inventory Role lamang
router.use(protectRoute, restrictTo("Inventory"));

router.route("/")
  .get(getAllRawMaterials)    // Kumuha ng lahat ng raw materials
  .post(createRawMaterial);   // Mag-save ng bagong raw material

router.route("/:id/unarchive")
  .put(unarchiveRawMaterial); // I-restore ang isang naka-archive na raw material

router.route("/:id")
  .get(getRawMaterialById)    // Kumuha ng ispesipikong raw material gamit ang ID
  .put(updateRawMaterial)     // I-modify ang raw material gamit ang ID
  .delete(deleteRawMaterial); // I-archive o burahin ang raw material gamit ang ID

export default router;
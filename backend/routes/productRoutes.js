import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  unarchiveProduct,
} from "../controllers/productController.js";
// 🌟 I-import ang middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Selyado para sa Inventory Role lamang
router.use(protectRoute, restrictTo("Inventory"));

router.route("/")
  .get(getAllProducts)    // Kumuha ng lahat ng produkto
  .post(createProduct);   // Mag-save ng bagong produkto

router.route("/:id/unarchive")
  .put(unarchiveProduct); // I-restore ang isang naka-archive na produkto

router.route("/:id")
  .get(getProductById)    // Kumuha ng specific na produkto gamit ang ID
  .put(updateProduct)     // I-modify ang details ng produkto gamit ang ID
  .delete(deleteProduct); // I-archive o burahin ang produkto gamit ang ID

export default router;
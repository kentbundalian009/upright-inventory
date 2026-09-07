import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  unarchiveProduct,
} from "../../controllers/inventory/productController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute, restrictTo("Inventory", "Viewer"));

router.route("/")
  .get(getAllProducts)
  .post(createProduct);

router.route("/:id/unarchive")
  .put(unarchiveProduct);

router.route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

export default router;

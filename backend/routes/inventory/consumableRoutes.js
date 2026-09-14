import express from "express";
import {
  getConsumables,
  createConsumable,
  updateConsumable,
  deleteConsumable,
  getTransactions,
  createTransaction
} from "../../controllers/inventory/consumableController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute);

// Consumables items
router.route("/")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getConsumables)
  .post(restrictTo("Inventory", "Admin"), createConsumable);

router.route("/transactions")
  .get(restrictTo("Inventory", "Viewer", "Admin"), getTransactions)
  .post(restrictTo("Inventory", "Admin"), createTransaction);

router.route("/:id")
  .put(restrictTo("Inventory", "Admin"), updateConsumable)
  .delete(restrictTo("Inventory", "Admin"), deleteConsumable);

export default router;

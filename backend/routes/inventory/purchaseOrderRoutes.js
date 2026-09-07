import express from "express";
import { 
  createPurchaseOrder, 
  getPurchaseOrders 
} from "../../controllers/inventory/purchaseOrderController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute, restrictTo("Inventory", "Viewer"));

router.post("/", createPurchaseOrder);
router.get("/", getPurchaseOrders);

export default router;

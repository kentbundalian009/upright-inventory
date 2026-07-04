import express from "express";
import { 
  createPurchaseOrder, 
  getPurchaseOrders 
} from "../controllers/purchaseOrderController.js";
// 🌟 I-import ang middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Selyado para sa Inventory Role lamang
router.use(protectRoute, restrictTo("Inventory"));

router.post("/", createPurchaseOrder);
router.get("/", getPurchaseOrders);

export default router;
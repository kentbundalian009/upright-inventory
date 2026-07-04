import express from "express";
import { 
  createDeliveryReceipt, 
  getDeliveryReceipts 
} from "../controllers/deliveryReceiptController.js";

const router = express.Router();

// Route lines para sa /api/delivery-receipts
router.post("/", createDeliveryReceipt);
router.get("/", getDeliveryReceipts);

export default router;
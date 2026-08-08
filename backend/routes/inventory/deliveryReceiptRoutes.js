import express from "express";
import { 
  createDeliveryReceipt, 
  getDeliveryReceipts 
} from "../../controllers/inventory/deliveryReceiptController.js";

const router = express.Router();

router.post("/", createDeliveryReceipt);
router.get("/", getDeliveryReceipts);

export default router;

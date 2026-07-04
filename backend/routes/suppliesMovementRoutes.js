import express from "express";
import { createMovement, getAllMovements } from "../controllers/suppliesMovementController.js";
// 🌟 I-import din si restrictTo mula sa middleware folder mo
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// 🔒 Mas malinis tingnan: Inilagay sa itaas para sakop ang lahat ng routes sa ibaba
router.use(protectRoute, restrictTo("Inventory"));

// Dahil may router.use sa taas, automatic nang protektado ang mga ito:
router.post("/", createMovement);
router.get("/", getAllMovements);

export default router;
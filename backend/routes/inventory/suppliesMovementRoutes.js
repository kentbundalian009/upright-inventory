import express from "express";
import { createMovement, getAllMovements } from "../../controllers/inventory/suppliesMovementController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js"; 

const router = express.Router();

router.use(protectRoute, restrictTo("Inventory", "Viewer", "Admin", "Purchasing"));

router.post("/", createMovement);
router.get("/", getAllMovements);

export default router;

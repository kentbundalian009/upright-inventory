import express from "express";
import {
  getAllSupplies,
  getSuppliesById,
  createSupplies,
  updateSupplies,
  deleteSupplies,
  unarchiveSupplies,
} from "../controllers/suppliesController.js";
// 🌟 I-import ang security middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Selyado para sa Inventory Role lamang
router.use(protectRoute, restrictTo("Inventory"));

router.route("/")
  .get(getAllSupplies)    
  .post(createSupplies);  

router.route("/:id/unarchive")
  .put(unarchiveSupplies); 

router.route("/:id")
  .get(getSuppliesById)   
  .put(updateSupplies)    
  .delete(deleteSupplies); 

export default router;
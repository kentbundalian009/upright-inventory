import express from "express";
import { 
  createPackingList, 
  getPackingLists, 
  cancelPackingList 
} from "../controllers/packingListController.js";
// 🌟 I-import ang middlewares
import { protectRoute, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Selyado para sa Inventory Role lamang
router.use(protectRoute, restrictTo("Inventory"));

router.route("/")
  .get(getPackingLists)
  .post(createPackingList);

router.route("/:id")
  .delete(cancelPackingList);

export default router;
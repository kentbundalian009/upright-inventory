import express from "express";
import { 
  createPackingList, 
  getPackingLists, 
  updatePackingList,
  cancelPackingList 
} from "../../controllers/inventory/packingListController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute, restrictTo("Inventory", "Viewer"));

router.route("/")
  .get(getPackingLists)
  .post(createPackingList);

router.route("/:id")
  .put(updatePackingList)
  .delete(cancelPackingList);

export default router;

import express from "express";
import { 
  createPackingList, 
  getPackingLists, 
  updatePackingList,
  cancelPackingList,
  revertPackingListToReserve
} from "../../controllers/inventory/packingListController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute, restrictTo("Inventory", "Viewer", "Admin", "Purchasing"));

router.route("/")
  .get(getPackingLists)
  .post(createPackingList);

router.route("/:id")
  .put(updatePackingList)
  .delete(cancelPackingList);

router.put("/:id/revert-reserve", revertPackingListToReserve);

export default router;

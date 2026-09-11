import express from "express";
import {
  createSharedLink,
  getAllSharedLinks,
  updateSharedLink,
  terminateSharedLink,
  unterminateSharedLink,
  deleteSharedLink,
  validateSharedLink,
} from "../../controllers/admin/sharedLinkController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

// 🔓 Public validation endpoint (checked when someone opens the shared link)
router.get("/:id/validate", validateSharedLink);

// 🔒 Protected routes
router.use(protectRoute);

router
  .route("/")
  .post(restrictTo("Admin", "Inventory"), createSharedLink)
  .get(restrictTo("Admin"), getAllSharedLinks);

router.put("/:id/terminate", restrictTo("Admin"), terminateSharedLink);
router.put("/:id/unterminate", restrictTo("Admin"), unterminateSharedLink);

router
  .route("/:id")
  .put(restrictTo("Admin"), updateSharedLink)
  .delete(restrictTo("Admin"), deleteSharedLink);

export default router;

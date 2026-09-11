import express from "express";
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  unarchiveClient,
  permanentDeleteClient,
} from "../../controllers/inventory/clientController.js";
import { protectRoute, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute);

router
  .route("/")
  .get(restrictTo("Admin", "Inventory"), getAllClients)
  .post(restrictTo("Admin", "Inventory"), createClient);

router
  .route("/:id/unarchive")
  .put(restrictTo("Admin", "Inventory"), unarchiveClient);

router
  .route("/:id/permanent")
  .delete(restrictTo("Admin"), permanentDeleteClient);

router
  .route("/:id")
  .get(restrictTo("Admin", "Inventory"), getClientById)
  .put(restrictTo("Admin", "Inventory"), updateClient)
  .delete(restrictTo("Admin", "Inventory"), deleteClient);

export default router;

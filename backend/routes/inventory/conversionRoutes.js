import express from 'express';
import { 
  getAllConversions, 
  createConversion 
} from '../../controllers/inventory/conversionController.js';
import { protectRoute, restrictTo } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectRoute, restrictTo("Inventory", "Viewer"));

router.route('/')
  .get(getAllConversions)
  .post(createConversion);

export default router;

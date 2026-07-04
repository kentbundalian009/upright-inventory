import express from 'express';
import { 
  getAllConversions, 
  createConversion 
} from '../controllers/conversionController.js';
// 🌟 I-import ang middlewares
import { protectRoute, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔒 Selyado para sa Inventory Role lamang
router.use(protectRoute, restrictTo("Inventory"));

router.route('/')
  .get(getAllConversions)   // GET /api/conversions
  .post(createConversion);  // POST /api/conversions

export default router;
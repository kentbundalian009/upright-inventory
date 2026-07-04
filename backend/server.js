import express from "express";
import dotenv from "dotenv";
import cors from "cors"; 
import mongoose from "mongoose"; // 👈 IDINAGDAG: Kailangan ito para gumana ang index dropping core sa ibaba
import connectDB from "./lib/db.js";
import "./lib/redis.js"; // Sinisigurong mag-co-connect si Upstash sa boot-up ng server

// API Routes Imports
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import rawMaterialRoutes from "./routes/rawMaterialRoutes.js"; 
import assetsRoutes from "./routes/assetsRoutes.js"; 
import suppliesRoutes from "./routes/suppliesRoutes.js"; 
import suppliesMovementRoutes from "./routes/suppliesMovementRoutes.js"; 
import conversionRoutes from "./routes/conversionRoutes.js";
import productRoutes from "./routes/productRoutes.js"; 
import packingListRoutes from "./routes/packingListRoutes.js"; 
import activityLogRoutes from "./routes/userActivityRoutes.js"; 
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import settingRoutes from "./routes/settingRoutes.js"; // 🔧 IDINAGDAG: Para sa threshold settings


// 🌟 I-import ang protectRoute middleware para sa backend filtering
import { protectRoute } from "./middleware/authMiddleware.js"; 

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); 
app.use(express.json());

// 🔓 PUBLIC API ROUTES
app.use("/api/auth", authRoutes);

// 🔒 PROTECTED API ROUTES (Hinaharang at tsine-tsek muna kay Upstash Redis bago mag-load)
app.use("/api/users", protectRoute, userRoutes);
app.use("/api/assets", protectRoute, assetsRoutes);
app.use("/api/supplies", protectRoute, suppliesRoutes); 
app.use("/api/supplies-movements", protectRoute, suppliesMovementRoutes); 
app.use("/api/conversions", protectRoute, conversionRoutes);
app.use("/api/products", protectRoute, productRoutes); 
app.use("/api/packing-lists", protectRoute, packingListRoutes); 
app.use("/api/raw-materials", protectRoute, rawMaterialRoutes); 
app.use("/api/activity-logs", protectRoute, activityLogRoutes);
app.use("/api/purchase-orders", protectRoute, purchaseOrderRoutes);
app.use("/api/settings/thresholds", protectRoute, settingRoutes); // 🔧 IDINAGDAG: Para sa threshold settings


// Test Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// 🛠️ DATABASE FIXER: Awtomatikong lilinisin ang lumang sirang index kapag naka-connect na ang MongoDB
mongoose.connection.once('open', async () => {
  try {
    // Pilitin nating i-drop ang multo ng "wipNo_1" index na nagpapahirap sa system mo
    await mongoose.connection.db.collection('conversions').dropIndex('wipNo_1');
    console.log("🔥 SUCCESS: Ang mapaminsalang wipNo index ay tuluyan nang nabura!");
  } catch (err) {
    // Kung wala na ito o nabura na dati, magpapakita lang ito bilang note nang hindi sumasabog ang node server mo
    console.log("Index Sync Note:", err.message);
  }
});
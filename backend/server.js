import express from "express";
import dotenv from "dotenv";
import cors from "cors"; 
import mongoose from "mongoose"; // 👈 IDINAGDAG: Kailangan ito para gumana ang index dropping core sa ibaba
import connectDB from "./lib/db.js";
import "./lib/redis.js"; // Sinisigurong mag-co-connect si Upstash sa boot-up ng server

import path from "path";
import { fileURLToPath } from "url";



// API Routes Imports - Admin
import authRoutes from "./routes/admin/authRoutes.js";
import userRoutes from "./routes/admin/userRoutes.js";
import activityLogRoutes from "./routes/admin/userActivityRoutes.js"; 
import settingRoutes from "./routes/admin/settingRoutes.js";
import paletteRoutes from "./routes/admin/paletteRoutes.js"; 
import paletteSupRoutes from "./routes/admin/paletteSupRoutes.js"; 
import systemRoutes from "./routes/admin/systemRoutes.js";
import backupRoutes from "./routes/admin/backupRoutes.js";
import { initBackupScheduler } from "./lib/backupScheduler.js";

// API Routes Imports - Inventory
import rawMaterialRoutes from "./routes/inventory/rawMaterialRoutes.js"; 
import assetsRoutes from "./routes/inventory/assetsRoutes.js"; 
import suppliesRoutes from "./routes/inventory/suppliesRoutes.js"; 
import suppliesMovementRoutes from "./routes/inventory/suppliesMovementRoutes.js"; 
import conversionRoutes from "./routes/inventory/conversionRoutes.js";
import productRoutes from "./routes/inventory/productRoutes.js"; 
import packingListRoutes from "./routes/inventory/packingListRoutes.js"; 
import purchaseOrderRoutes from "./routes/inventory/purchaseOrderRoutes.js"; 
import clientRoutes from "./routes/inventory/clientRoutes.js"; 


// 🌟 I-import ang protectRoute middleware para sa backend filtering
import { protectRoute } from "./middleware/authMiddleware.js"; 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); 
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// 🔓 PUBLIC API ROUTES
app.use("/api/auth", authRoutes);

// 🔒 PROTECTED API ROUTES (Hinaharang at tsine-tsek muna kay Upstash Redis bago mag-load)
app.use("/api/users", protectRoute, userRoutes);
app.use("/api/assets", protectRoute, assetsRoutes);
app.use("/api/supplies", suppliesRoutes); 
app.use("/api/supplies-movements", protectRoute, suppliesMovementRoutes); 
app.use("/api/conversions", protectRoute, conversionRoutes);
app.use("/api/products", protectRoute, productRoutes); 
app.use("/api/packing-lists", protectRoute, packingListRoutes); 
app.use("/api/raw-materials", rawMaterialRoutes); 
app.use("/api/clients", clientRoutes);
app.use("/api/activity-logs", protectRoute, activityLogRoutes);
app.use("/api/purchase-orders", protectRoute, purchaseOrderRoutes);
app.use("/api/settings/thresholds", protectRoute, settingRoutes);
app.use("/api/settings", protectRoute, paletteRoutes); 
app.use("/api/settings", protectRoute, paletteSupRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/backup", backupRoutes);


app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === "production") {
  // Ituro sa "dist" folder ng frontend
  app.use(express.static(path.resolve(__dirname, "../frontend/dist")));

  /// PINAKALIGTAS AT TAMA NA CONFIG:
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
} else {
  // Gagana lang ito kapag local development (npm run dev)
  app.get("/", (req, res) => {
    res.send("API is running in development mode...");
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  initBackupScheduler();
});

// 🛠️ DATABASE FIXER: Awtomatikong lilinisin ang lumang sirang index...
mongoose.connection.once('open', async () => {
  try {
    await mongoose.connection.db.collection('conversions').dropIndex('wipNo_1');
    console.log("🔥 SUCCESS: Ang mapaminsalang wipNo index ay tuluyan nang nabura!");
  } catch (err) {
    console.log("Index Sync Note:", err.message);
  }
});
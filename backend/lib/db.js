import mongoose from "mongoose";
import dns from "dns";

// 🌟 FIX FOR WINDOWS / ISP DNS SRV ETIMEOUT (MongoDB Atlas Cluster Lookup)
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  console.warn("DNS Configuration Notice:", err.message);
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("✅ MongoDB Connected Successfully");

    // ⚡ Automatic Index Optimization for fast queries & sorting
    try {
      const db = mongoose.connection.db;
      Promise.allSettled([
        db.collection("activitylogs").createIndex({ createdAt: -1 }),
        db.collection("suppliesmovements").createIndex({ createdAt: -1 }),
        db.collection("suppliesmovements").createIndex({ isReturned: 1, transactionType: 1 }),
        db.collection("packinglists").createIndex({ createdAt: -1 }),
        db.collection("packinglists").createIndex({ transactionType: 1, isVoided: 1 }),
        db.collection("assets").createIndex({ createdAt: -1 }),
        db.collection("assets").createIndex({ isArchived: 1 }),
        db.collection("supplies").createIndex({ isArchived: 1 }),
        db.collection("rawmaterials").createIndex({ isArchived: 1 }),
        db.collection("consumables").createIndex({ isArchived: 1 }),
      ]).catch(() => {});
    } catch {
      // Non-blocking background index check
    }
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    console.log("🔄 Retrying database connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;
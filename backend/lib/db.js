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
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    console.log("🔄 Retrying database connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;
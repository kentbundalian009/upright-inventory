import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Kumokonekta gamit ang tamang variable mula sa .env
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1); // Ititigil ang app kapag nag-fail ang koneksyon
  }
};

export default connectDB;
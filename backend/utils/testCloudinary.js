import { cloudinary, getOptimizedImageUrl, getSquareCroppedUrl, isCloudinaryConfigured } from "../lib/cloudinary.js";

(async function() {
  console.log("--- Cloudinary Test ---");
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
  console.log("API Key:", process.env.CLOUDINARY_API_KEY);
  console.log("Is Configured:", isCloudinaryConfigured());

  if (!isCloudinaryConfigured()) {
    console.log("\n⚠️ PAALALA: Ilagay ang iyong totoong CLOUDINARY_API_SECRET sa .env bago mag-upload.\n");
    return;
  }

  try {
    // Upload an image (Sample shoes demo image)
    const uploadResult = await cloudinary.uploader.upload(
      "https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg",
      {
        public_id: "demo_shoes",
        folder: "oneinventory/demo"
      }
    );

    console.log("✅ Upload Success:", uploadResult.secure_url);

    // Optimize delivery by resizing and applying auto-format and auto-quality
    const optimizeUrl = getOptimizedImageUrl(uploadResult.public_id);
    console.log("✅ Optimized URL:", optimizeUrl);

    // Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = getSquareCroppedUrl(uploadResult.public_id, 500, 500);
    console.log("✅ Auto-crop URL (500x500):", autoCropUrl);
  } catch (error) {
    console.error("❌ Cloudinary Error:", error);
  }
})();

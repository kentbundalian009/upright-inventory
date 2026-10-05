import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "naiyyfqi",
  api_key: process.env.CLOUDINARY_API_KEY || "782826755253794",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

/**
 * Checks if Cloudinary credentials are fully provided
 */
export const isCloudinaryConfigured = () => {
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    secret &&
    secret !== "<your_api_secret>" &&
    secret.trim() !== ""
  );
};

/**
 * Upload an image buffer or base64 data to Cloudinary.
 * If Cloudinary API secret is not set, it gracefully returns a base64 Data URI.
 * 
 * @param {Buffer} buffer - Multer file buffer (req.file.buffer)
 * @param {string} mimetype - Multer file mimetype (req.file.mimetype)
 * @param {string} folder - Target folder in Cloudinary (e.g. 'oneinventory/supplies')
 * @param {object} customOptions - Optional Cloudinary upload options
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadImageBuffer = async (
  buffer,
  mimetype = "image/jpeg",
  folder = "oneinventory",
  customOptions = {}
) => {
  const base64Data = `data:${mimetype};base64,${buffer.toString("base64")}`;

  if (!isCloudinaryConfigured()) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : "jpg";
      const filename = `image-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      return `/uploads/${filename}`;
    } catch (saveErr) {
      console.warn("⚠️ [Local Storage] Failed to save to /uploads, fallback to base64:", saveErr.message);
      return base64Data;
    }
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(base64Data, {
      folder,
      resource_type: "image",
      transformation: [
        { quality: "auto", fetch_format: "auto" }
      ],
      ...customOptions,
    });

    return uploadResult.secure_url;
  } catch (error) {
    console.error("❌ [Cloudinary] Upload failed, falling back to local file:", error.message || error);
    try {
      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : "jpg";
      const filename = `image-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      return `/uploads/${filename}`;
    } catch (fallbackErr) {
      return base64Data;
    }
  }
};

/**
 * Generate an optimized delivery URL with auto-format and auto-quality
 */
export const getOptimizedImageUrl = (publicIdOrUrl) => {
  return cloudinary.url(publicIdOrUrl, {
    fetch_format: "auto",
    quality: "auto",
  });
};

/**
 * Generate a square cropped URL with auto gravity
 */
export const getSquareCroppedUrl = (publicIdOrUrl, width = 500, height = 500) => {
  return cloudinary.url(publicIdOrUrl, {
    crop: "auto",
    gravity: "auto",
    width,
    height,
  });
};

export { cloudinary };
export default cloudinary;

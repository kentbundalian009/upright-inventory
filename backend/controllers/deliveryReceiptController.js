import DeliveryReceipt from "../models/DeliveryReceipt.js";
import RawMaterial from "../models/RawMaterial.js";

// @desc    Create new Delivery Receipt and Update Raw Material Stocks
// @route   POST /api/delivery-receipts
export const createDeliveryReceipt = async (req, res) => {
  try {
    const { drNo, supplier, originAddress, deliveryDate, items } = req.body;

    // 1. Suriin kung may katulad nang DR number sa database
    const existingDr = await DeliveryReceipt.findOne({ drNo });
    if (existingDr) {
      return res.status(400).json({ 
        message: `Delivery receipt number ${drNo} already registered in the system.` 
      });
    }

    // 2. Mabilis na validation para masiguradong may laman ang items array
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot log a delivery receipt without manifest items." });
    }

    // 3. I-save ang mismong Transaction document ng Delivery Receipt sa database
    const newDR = new DeliveryReceipt({
      drNo,
      supplier,
      originAddress,
      deliveryDate,
      items
    });
    const savedDR = await newDR.save();

    // 4. LOOP OPERATION: Awtomatikong i-update ang stock ('ActualCount') ng bawat raw material item
    for (const item of items) {
      await RawMaterial.findByIdAndUpdate(
        item.materialId,
        { 
          // Gagamitin ang $inc para i-add ang pumasok na bilang sa kasalukuyang stocks
          $inc: { ActualCount: item.actualCountReceived } 
        }
      );
    }

    // I-populate ang data para sa magandang return response feedback
    const populatedDR = await DeliveryReceipt.findById(savedDR._id).populate("items.materialId", "Code ItemDescription UOM");

    res.status(201).json(populatedDR);
  } catch (err) {
    res.status(500).json({ 
      message: "Internal server diagnostics failure", 
      error: err.message 
    });
  }
};

// @desc    Get all Delivery Receipt Records with populated material data
// @route   GET /api/delivery-receipts
export const getDeliveryReceipts = async (req, res) => {
  try {
    const records = await DeliveryReceipt.find()
      .populate("items.materialId", "Code ItemDescription UOM") // Isasama ang code, desc, at uom mula sa RawMaterial profile
      .sort({ createdAt: -1 }); // Pinakabagong DR ang unang lalabas

    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to fetch DR logs", 
      error: err.message 
    });
  }
};
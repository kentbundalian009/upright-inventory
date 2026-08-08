import DeliveryReceipt from "../../models/DeliveryReceipt.js";
import RawMaterial from "../../models/RawMaterial.js";

export const createDeliveryReceipt = async (req, res) => {
  try {
    const { drNo, supplier, originAddress, deliveryDate, items } = req.body;

    const existingDr = await DeliveryReceipt.findOne({ drNo });
    if (existingDr) {
      return res.status(400).json({ 
        message: `Delivery receipt number ${drNo} already registered in the system.` 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot log a delivery receipt without manifest items." });
    }

    const newDR = new DeliveryReceipt({
      drNo,
      supplier,
      originAddress,
      deliveryDate,
      items
    });
    const savedDR = await newDR.save();

    for (const item of items) {
      await RawMaterial.findByIdAndUpdate(
        item.materialId,
        { 
          $inc: { ActualCount: item.actualCountReceived } 
        }
      );
    }

    const populatedDR = await DeliveryReceipt.findById(savedDR._id).populate("items.materialId", "Code ItemDescription UOM");

    res.status(201).json(populatedDR);
  } catch (err) {
    res.status(500).json({ 
      message: "Internal server diagnostics failure", 
      error: err.message 
    });
  }
};

export const getDeliveryReceipts = async (req, res) => {
  try {
    const records = await DeliveryReceipt.find()
      .populate("items.materialId", "Code ItemDescription UOM")
      .sort({ createdAt: -1 });

    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to fetch DR logs", 
      error: err.message 
    });
  }
};

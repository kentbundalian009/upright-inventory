import PurchaseOrder from "../../models/PurchaseOrder.js";
import RawMaterial from "../../models/RawMaterial.js";

export const createPurchaseOrder = async (req, res) => {
  try {
    const { poNo, supplier, originAddress, deliveryDate, preparedBy, items } = req.body;

    const existingPo = await PurchaseOrder.findOne({ poNo: poNo?.trim() });
    if (existingPo) {
      return res.status(400).json({ 
        message: `Purchase order number ${poNo} already registered in the system.` 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot log a purchase order without manifest items." });
    }

    if (!deliveryDate || deliveryDate === "") {
      return res.status(400).json({ message: "Please provide a valid delivery/received date." });
    }

    const newPO = new PurchaseOrder({
      poNo,
      supplier: supplier || "N/A",
      originAddress: originAddress || "N/A",
      deliveryDate,
      preparedBy: preparedBy || "System User",
      items
    });
    const savedPO = await newPO.save();

    for (const item of items) {
      const incrementValue = Number(item.actualCountReceived);
      
      if (!isNaN(incrementValue) && item.materialId) {
        await RawMaterial.findByIdAndUpdate(
          item.materialId,
          { 
            $inc: { ActualCount: incrementValue } 
          }
        );
      }
    }

    const populatedPO = await PurchaseOrder.findById(savedPO._id).populate("items.materialId", "Code ItemDescription UOM");

    return res.status(201).json(populatedPO);
  } catch (err) {
    console.error("PO Creation Critical Failure:", err);
    return res.status(500).json({ 
      message: "Internal server diagnostics failure", 
      error: err.message 
    });
  }
};

export const getPurchaseOrders = async (req, res) => {
  try {
    const records = await PurchaseOrder.find()
      .populate("items.materialId", "Code ItemDescription UOM ActualCount")
      .sort({ createdAt: -1 });

    return res.status(200).json(records);
  } catch (err) {
    console.error("PO Fetch Critical Failure:", err);
    return res.status(500).json({ 
      message: "Failed to fetch PO logs", 
      error: err.message 
    });
  }
};

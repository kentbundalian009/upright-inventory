import PurchaseOrder from "../models/PurchaseOrder.js";
import RawMaterial from "../models/RawMaterial.js";

// @desc    Create new Purchase Order and Update Raw Material Stocks
// @route   POST /api/purchase-orders
export const createPurchaseOrder = async (req, res) => {
  try {
    const { poNo, supplier, originAddress, deliveryDate, preparedBy, items } = req.body;

    // 1. Suriin kung may kaparehong PO number na nakarekord
    const existingPo = await PurchaseOrder.findOne({ poNo: poNo?.trim() });
    if (existingPo) {
      return res.status(400).json({ 
        message: `Purchase order number ${poNo} already registered in the system.` 
      });
    }

    // 2. Mabilis na validation para sa array items at tamang petsa
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot log a purchase order without manifest items." });
    }

    if (!deliveryDate || deliveryDate === "") {
      return res.status(400).json({ message: "Please provide a valid delivery/received date." });
    }

    // 3. I-save ang transaction log para sa Purchase Order
    const newPO = new PurchaseOrder({
      poNo,
      supplier: supplier || "N/A",
      originAddress: originAddress || "N/A",
      deliveryDate,
      preparedBy: preparedBy || "System User",
      items
    });
    const savedPO = await newPO.save();

    // 4. SAFE AT RIGOROUS LOOP OPERATION: I-update ang 'ActualCount' ng raw materials
    for (const item of items) {
      // Sinisiguradong may numerong pambato sa $inc para maiwasan ang server diagnostics crash
      const incrementValue = Number(item.actualCountReceived);
      
      if (!isNaN(incrementValue) && item.materialId) {
        await RawMaterial.findByIdAndUpdate(
          item.materialId,
          { 
            // Tandaan: 'ActualCount' ang eksaktong property name sa rawmat model mo!
            $inc: { ActualCount: incrementValue } 
          }
        );
      }
    }

    // I-populate ang data para sa malinis na response payload feedback
    const populatedPO = await PurchaseOrder.findById(savedPO._id).populate("items.materialId", "Code ItemDescription UOM");

    return res.status(201).json(populatedPO);
  } catch (err) {
    // Console log para makita mo agad sa backend terminal mo ang tunay na error trace kailanganin man
    console.error("PO Creation Critical Failure:", err);
    return res.status(500).json({ 
      message: "Internal server diagnostics failure", 
      error: err.message 
    });
  }
};

// @desc    Get all Purchase Order Records with populated material data
// @route   GET /api/purchase-orders
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
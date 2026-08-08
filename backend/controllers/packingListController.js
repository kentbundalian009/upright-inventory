import PackingList from "../models/PackingList.js";
// 🌟 PINALITAN: RawMaterial na ang i-import sa halip na Product
import RawMaterial from "../models/RawMaterial.js"; 

// @desc    Create new Packing List and Handle Stock Management (Outbound & Reserve)
// @route   POST /api/packing-lists
export const createPackingList = async (req, res) => {
  try {
    const { transactionType, shipmentDate, customer, carrier, destinationAddress, preparedBy, referencePlNo, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot log a packing list without manifest items." });
    }

    // I-format ang items array para gamitin ang 'materialId'
    const formattedItems = items.map(item => {
      const idExtract = item.materialId || item.productId;
      const cleanId = idExtract && typeof idExtract === 'object' ? idExtract._id : idExtract;
      
      return {
        materialId: cleanId,
        qtyRequested: Number(item.qtyRequested),
        actualCountShipped: Number(item.actualCountShipped),
        remarks: item.remarks || ""
      };
    });

    // LOGIC PARA SA QUICK-OUTBOUND (FULFILLMENT NG RESERVED STOCK)
    if (referencePlNo && transactionType === "Outbound") {
      const cleanRefNo = referencePlNo.replace("REF: ", "").trim();

      const originalReserve = await PackingList.findOne({ plNo: cleanRefNo, transactionType: "Reserve" });

      if (originalReserve) {
        originalReserve.transactionType = "Outbound";
        originalReserve.shipmentDate = shipmentDate;
        originalReserve.carrier = carrier;
        originalReserve.destinationAddress = destinationAddress;
        originalReserve.preparedBy = preparedBy;
        originalReserve.items = formattedItems;

        const updatedPL = await originalReserve.save();

        const populatedPL = await PackingList.findById(updatedPL._id)
          .populate("items.materialId", "Code ItemDescription UOM");

        return res.status(200).json(populatedPL);
      }
    }

    // AUTO-GENERATE NG ORDINARYONG PL / RES NUMBER
    const count = await PackingList.countDocuments();
    const prefix = transactionType === "Reserve" ? "RES" : "PL";
    const year = new Date().getFullYear();
    const finalPlNo = `${prefix}-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const newPL = new PackingList({
      plNo: finalPlNo,
      transactionType,
      referencePlNo: "", 
      customer,
      carrier,
      destinationAddress,
      shipmentDate,
      preparedBy,
      items: formattedItems
    });
    
    const savedPL = await newPL.save();

    // ATOMIC INVENTORY REDUCTION (Bawas sa RawMaterial stock)
    for (const item of formattedItems) {
      if (!item.materialId) continue; 

      const deductCount = transactionType === "Outbound" ? item.actualCountShipped : item.qtyRequested;

      await RawMaterial.findByIdAndUpdate(
        item.materialId,
        { 
          $inc: { ActualCount: -Number(deductCount) } 
        }
      );
    }

    const populatedPL = await PackingList.findById(savedPL._id)
      .populate("items.materialId", "Code ItemDescription UOM");

    res.status(201).json(populatedPL);
  } catch (err) {
    res.status(500).json({ 
      message: "Internal server diagnostics failure", 
      error: err.message 
    });
  }
};

// @desc    Get all Packing List Records
// @route   GET /api/packing-lists
export const getPackingLists = async (req, res) => {
  try {
    const records = await PackingList.find()
      .populate("items.materialId", "Code ItemDescription UOM")
      .sort({ createdAt: -1 });

    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to fetch PL logs", 
      error: err.message 
    });
  }
};

// @desc    Cancel/Void Packing List and RESTORE Stocks
// @route   DELETE /api/packing-lists/:id
export const cancelPackingList = async (req, res) => {
  try {
    const { id } = req.params;
    const { voidReason, voidedBy } = req.body || {};

    const slip = await PackingList.findById(id);
    if (!slip) {
      return res.status(404).json({ message: "Packing list record not found." });
    }

    if (slip.isVoided) {
      return res.status(400).json({ message: "This transaction log is already voided." });
    }

    // MAGSAULI NG STOCK sa Raw Materials
    for (const item of slip.items) {
      if (!item.materialId) continue;

      const returnCount = slip.transactionType === "Outbound" ? item.actualCountShipped : item.qtyRequested;

      await RawMaterial.findByIdAndUpdate(
        item.materialId,
        { 
          $inc: { ActualCount: Number(returnCount) } 
        }
      );
    }

    slip.isVoided = true;
    slip.voidReason = voidReason || "Erroneous transaction entry voided by user";
    slip.voidedAt = new Date();
    slip.voidedBy = voidedBy || slip.preparedBy || "System User";
    await slip.save();

    res.status(200).json({ message: "Transaction voided successfully. Inventory stock restored and recorded in Discrepancy Audit.", slip });
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to process cancellation diagnostics.", 
      error: err.message 
    });
  }
};
import PackingList from "../../models/PackingList.js";
import RawMaterial from "../../models/RawMaterial.js"; 

export const createPackingList = async (req, res) => {
  try {
    const { transactionType, shipmentDate, customer, carrier, destinationAddress, preparedBy, referencePlNo, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot log a packing list without manifest items." });
    }

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

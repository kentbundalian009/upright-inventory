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
        // Calculate remaining items that were reserved but not shipped (or partially shipped)
        const remainingItems = [];
        
        for (const origItem of originalReserve.items) {
          const origMatId = origItem.materialId ? origItem.materialId.toString() : null;
          if (!origMatId) continue;

          // Find matching item in the current shipped manifest
          const shippedItem = formattedItems.find(fi => fi.materialId && fi.materialId.toString() === origMatId);
          const shippedQty = shippedItem ? Number(shippedItem.actualCountShipped || 0) : 0;
          const origQty = Number(origItem.qtyRequested || 0);
          const remainingQty = origQty - shippedQty;

          if (remainingQty > 0) {
            remainingItems.push({
              materialId: origItem.materialId,
              qtyRequested: remainingQty,
              actualCountShipped: remainingQty,
              remarks: origItem.remarks 
                ? `Remaining balance from ${originalReserve.plNo} (${origItem.remarks})` 
                : `Remaining balance from ${originalReserve.plNo}`
            });
          }
        }

        // Deduct actualCountShipped from warehouse stock since items are now physically shipped out
        for (const shippedItem of formattedItems) {
          if (!shippedItem.materialId) continue;
          const shippedQty = Number(shippedItem.actualCountShipped || 0);

          if (shippedQty > 0) {
            await RawMaterial.findByIdAndUpdate(shippedItem.materialId, {
              $inc: { ActualCount: -shippedQty }
            });
          }
        }

        // Update original reserve into Outbound with verified shipped items
        originalReserve.transactionType = "Outbound";
        originalReserve.shipmentDate = shipmentDate || originalReserve.shipmentDate;
        originalReserve.customer = customer || originalReserve.customer;
        originalReserve.carrier = carrier || originalReserve.carrier;
        originalReserve.destinationAddress = destinationAddress || originalReserve.destinationAddress;
        originalReserve.preparedBy = preparedBy || originalReserve.preparedBy;
        originalReserve.items = formattedItems.filter(it => Number(it.actualCountShipped || 0) > 0);

        const updatedPL = await originalReserve.save();

        let newReservePlNo = null;
        // If there is any remaining balance, automatically create a new Reserve slip
        if (remainingItems.length > 0) {
          const count = await PackingList.countDocuments();
          const year = new Date().getFullYear();
          newReservePlNo = `RES-${year}-${(count + 1).toString().padStart(4, '0')}`;

          const newReserve = new PackingList({
            plNo: newReservePlNo,
            transactionType: "Reserve",
            referencePlNo: `BALANCE OF ${originalReserve.plNo}`,
            customer: originalReserve.customer,
            carrier: originalReserve.carrier,
            destinationAddress: originalReserve.destinationAddress,
            shipmentDate: shipmentDate || originalReserve.shipmentDate,
            preparedBy: preparedBy || originalReserve.preparedBy,
            items: remainingItems
          });

          await newReserve.save();
        }

        const populatedPL = await PackingList.findById(updatedPL._id)
          .populate("items.materialId", "Code ItemDescription UOM Segment Dimension Dimensions Length Width Height ActualCount");

        const responseObj = populatedPL.toObject ? populatedPL.toObject() : populatedPL;
        responseObj.remainingReservePlNo = newReservePlNo;
        responseObj.message = newReservePlNo 
          ? `Outbound slip ${originalReserve.plNo} completed. Remaining balance (${remainingItems.length} item line(s)) automatically re-reserved as ${newReservePlNo}.`
          : `Material Outbound Slip ${originalReserve.plNo} generated and stock updated!`;

        return res.status(200).json(responseObj);
      }
    }

    if (referencePlNo && transactionType === "Reserve") {
      const cleanRefNo = referencePlNo.replace("REF: ", "").trim();
      const originalReserve = await PackingList.findOne({ plNo: cleanRefNo, transactionType: "Reserve" });

      if (originalReserve) {
        // Note: Reserves do NOT deduct physical warehouse stock. We simply update the manifest details.

        originalReserve.customer = customer || originalReserve.customer;
        originalReserve.carrier = carrier || originalReserve.carrier;
        originalReserve.destinationAddress = destinationAddress || originalReserve.destinationAddress;
        originalReserve.shipmentDate = shipmentDate || originalReserve.shipmentDate;
        originalReserve.preparedBy = preparedBy || originalReserve.preparedBy;
        originalReserve.items = formattedItems;

        const updatedReserve = await originalReserve.save();
        const populatedReserve = await PackingList.findById(updatedReserve._id)
          .populate("items.materialId", "Code ItemDescription UOM Segment Dimension Dimensions Length Width Height ActualCount");

        const responseObj = populatedReserve.toObject ? populatedReserve.toObject() : populatedReserve;
        responseObj.message = `Reservation ${originalReserve.plNo} successfully updated.`;

        return res.status(200).json(responseObj);
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

    // Deduct stock ONLY when items physically leave the warehouse (Outbound)
    // Reserves keep the stock count visible until actually sent Outbound
    if (transactionType === "Outbound") {
      for (const item of formattedItems) {
        if (!item.materialId) continue; 

        const deductCount = Number(item.actualCountShipped || 0);
        if (deductCount > 0) {
          await RawMaterial.findByIdAndUpdate(
            item.materialId,
            { 
              $inc: { ActualCount: -deductCount } 
            }
          );
        }
      }
    }

    const populatedPL = await PackingList.findById(savedPL._id)
      .populate("items.materialId", "Code ItemDescription UOM Segment Dimension Dimensions Length Width Height ActualCount");

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
      .populate("items.materialId", "Code ItemDescription UOM Segment Dimension Dimensions Length Width Height ActualCount")
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

    // Restore warehouse stock ONLY if an Outbound slip is being voided
    // (Reserves never deducted physical stock from the warehouse)
    if (slip.transactionType === "Outbound") {
      for (const item of slip.items) {
        if (!item.materialId) continue;

        const returnCount = Number(item.actualCountShipped || 0);
        if (returnCount > 0) {
          await RawMaterial.findByIdAndUpdate(
            item.materialId,
            { 
              $inc: { ActualCount: returnCount } 
            }
          );
        }
      }
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

export const updatePackingList = async (req, res) => {
  try {
    const { id } = req.params;
    const { shipmentDate, customer, carrier, destinationAddress, preparedBy, items } = req.body;

    const originalReserve = await PackingList.findById(id);
    if (!originalReserve) {
      return res.status(404).json({ message: "Packing list not found." });
    }
    if (originalReserve.isVoided) {
      return res.status(400).json({ message: "Cannot edit a voided packing list." });
    }

    const formattedItems = (items || []).map(item => {
      const idExtract = item.materialId || item.productId;
      const cleanId = idExtract && typeof idExtract === 'object' ? idExtract._id : idExtract;
      return {
        materialId: cleanId,
        qtyRequested: Number(item.qtyRequested),
        actualCountShipped: Number(item.actualCountShipped),
        remarks: item.remarks || ""
      };
    });

    // Reconcile stock ONLY if an Outbound slip is being modified
    if (originalReserve.transactionType === "Outbound") {
      const oldItemsMap = new Map();
      for (const item of originalReserve.items) {
        const matId = item.materialId ? item.materialId.toString() : null;
        if (matId) {
          oldItemsMap.set(matId, (oldItemsMap.get(matId) || 0) + Number(item.actualCountShipped || 0));
        }
      }

      const newItemsMap = new Map();
      for (const item of formattedItems) {
        const matId = item.materialId ? item.materialId.toString() : null;
        if (matId) {
          newItemsMap.set(matId, (newItemsMap.get(matId) || 0) + Number(item.actualCountShipped || 0));
        }
      }

      const allMatIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);
      for (const matId of allMatIds) {
        const oldQty = oldItemsMap.get(matId) || 0;
        const newQty = newItemsMap.get(matId) || 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          await RawMaterial.findByIdAndUpdate(matId, {
            $inc: { ActualCount: -diff }
          });
        }
      }
    }

    originalReserve.customer = customer || originalReserve.customer;
    originalReserve.carrier = carrier || originalReserve.carrier;
    originalReserve.destinationAddress = destinationAddress || originalReserve.destinationAddress;
    originalReserve.shipmentDate = shipmentDate || originalReserve.shipmentDate;
    originalReserve.preparedBy = preparedBy || originalReserve.preparedBy;
    originalReserve.items = formattedItems;

    const updated = await originalReserve.save();
    const populated = await PackingList.findById(updated._id)
      .populate("items.materialId", "Code ItemDescription UOM Segment Dimension Dimensions Length Width Height ActualCount");

    const responseObj = populated.toObject ? populated.toObject() : populated;
    responseObj.message = `Packing list ${originalReserve.plNo} successfully updated.`;

    return res.status(200).json(responseObj);
  } catch (err) {
    res.status(500).json({ message: "Failed to update packing list", error: err.message });
  }
};

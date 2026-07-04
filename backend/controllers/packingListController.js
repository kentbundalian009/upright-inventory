import PackingList from "../models/PackingList.js";
import Product from "../models/Product.js";

// @desc    Create new Packing List and Handle Stock Management (Outbound & Reserve)
// @route   POST /api/packing-lists
export const createPackingList = async (req, res) => {
  try {
    const { transactionType, shipmentDate, customer, carrier, destinationAddress, preparedBy, referencePlNo, items } = req.body;

    // 1. Pagsusuri sa mga produkto sa listahan
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot log a packing list without manifest items." });
    }

    // 2. I-format ang items array para laging gumamit ng 'productId'
    const formattedItems = items.map(item => {
      const idExtract = item.productId || item.materialId;
      const cleanId = idExtract && typeof idExtract === 'object' ? idExtract._id : idExtract;
      
      return {
        productId: cleanId,
        qtyRequested: Number(item.qtyRequested),
        actualCountShipped: Number(item.actualCountShipped),
        remarks: item.remarks || ""
      };
    });

    // 3. LOGIC PARA SA QUICK-OUTBOUND (FULFILLMENT NG RESERVED STOCK)
    if (referencePlNo && transactionType === "Outbound") {
      const cleanRefNo = referencePlNo.replace("REF: ", "").trim();

      // Hanapin ang orihinal na Reserve Slip
      const originalReserve = await PackingList.findOne({ plNo: cleanRefNo, transactionType: "Reserve" });

      if (originalReserve) {
        // [OPTION A] UPGRADE METHOD: Baguhin lang ang status ng lumang slip para maging ganap na Outbound
        originalReserve.transactionType = "Outbound";
        originalReserve.shipmentDate = shipmentDate;
        originalReserve.carrier = carrier;
        originalReserve.destinationAddress = destinationAddress;
        originalReserve.preparedBy = preparedBy;
        
        // I-update ang mga remarks o counts kung kinakailangan
        originalReserve.items = formattedItems;

        const updatedPL = await originalReserve.save();

        // Populate bago i-return sa frontend
        const populatedPL = await PackingList.findById(updatedPL._id)
          .populate("items.productId", "Code ItemDescription UOM");

        // NOTICE: HINDI NA NATIN BABAWASAN ANG STOCK DITO DAHIL NABAWASAN NA ITO NUNG NAKA-RESERVE PA.
        return res.status(200).json(populatedPL);
      }
    }

    // 4. AUTO-GENERATE NG ORDINARYONG PL / RES NUMBER (BAGONG TRANSAKSYON)
    const count = await PackingList.countDocuments();
    const prefix = transactionType === "Reserve" ? "RES" : "PL";
    const year = new Date().getFullYear();
    const finalPlNo = `${prefix}-${year}-${(count + 1).toString().padStart(4, '0')}`;

    // 5. I-SAVE ANG BAGONG PACKING LIST / RESERVE RECORD
    const newPL = new PackingList({
      plNo: finalPlNo,
      transactionType,
      referencePlNo: "", // Malinis dahil ito ay bagong log
      customer,
      carrier,
      destinationAddress,
      shipmentDate,
      preparedBy,
      items: formattedItems
    });
    
    const savedPL = await newPL.save();

    // 6. ATOMIC INVENTORY REDUCTION (Kahit Outbound o Reserve, awtomatikong magbabawas sa stock)
    for (const item of formattedItems) {
      if (!item.productId) continue; 

      // Gagamitin kung ano ang may laman, actualCountShipped para sa Outbound o qtyRequested para sa Reserve
      const deductCount = transactionType === "Outbound" ? item.actualCountShipped : item.qtyRequested;

      await Product.findByIdAndUpdate(
        item.productId,
        { 
          $inc: { ActualCount: -Number(deductCount) } 
        }
      );
    }

    // 7. I-populate gamit ang tamang fields ng Product model
    const populatedPL = await PackingList.findById(savedPL._id)
      .populate("items.productId", "Code ItemDescription UOM");

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
      .populate("items.productId", "Code ItemDescription UOM")
      .sort({ createdAt: -1 });

    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to fetch PL logs", 
      error: err.message 
    });
  }
};

// @desc    Cancel/Delete Packing List and RESTORE Stocks (Kahit Outbound o Reserve pa yan)
// @route   DELETE /api/packing-lists/:id
export const cancelPackingList = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Hanapin muna ang slip sa database
    const slip = await PackingList.findById(id);
    if (!slip) {
      return res.status(404).json({ message: "Packing list record not found." });
    }

    // 2. MAGSAULI NG STOCK (Gumagana para sa Outbound at lalong lalo na sa Reserve)
    for (const item of slip.items) {
      if (!item.productId) continue;

      // Alamin kung anong quantity field ang ginamit noong nilikha ito
      const returnCount = slip.transactionType === "Outbound" ? item.actualCountShipped : item.qtyRequested;

      await Product.findByIdAndUpdate(
        item.productId,
        { 
          $inc: { ActualCount: Number(returnCount) } // Ibabalik ang bilang (+ increment)
        }
      );
    }

    // 3. Tuluyan nang burahin ang slip log sa database matapos maisoli ang mga stock
    await PackingList.findByIdAndDelete(id);

    res.status(200).json({ message: "Transaction cancelled successfully. Inventory stock has been restored." });
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to process cancellation diagnostics.", 
      error: err.message 
    });
  }
};
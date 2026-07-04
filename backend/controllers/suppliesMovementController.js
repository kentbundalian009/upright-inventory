import SuppliesMovement from "../models/SuppliesMovement.js";
import Supplies from "../models/Supplies.js"; 

const generateSlipNo = async (type) => {
  let prefix = "RST";
  if (type === "Borrow") prefix = "BRW";
  else if (type === "Return") prefix = "RET";
  else if (type === "Reserved") prefix = "RES";
  else if (type === "Out") prefix = "OUT";
  else if (type === "Scrap") prefix = "SCR";            // 🎯 Slip prefix para sa Scrap
  else if (type === "Return to Vendor") prefix = "VND"; // 🎯 Slip prefix para sa Vendor

  const randomNum = Math.floor(100000 + Math.random() * 900000); 
  const slipNo = `${prefix}-${randomNum}`;
  const exists = await SuppliesMovement.findOne({ slipNo });
  if (exists) return generateSlipNo(type);
  return slipNo;
};

export const createMovement = async (req, res) => {
  try {
    const { 
      transactionType, 
      transactionDate, 
      partyName, 
      originAddress, 
      preparedBy, 
      referenceSlipNo, 
      items 
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Manifest items list cannot be empty." });
    }

    for (const item of items) {
      const supply = await Supplies.findById(item.supplyId);
      if (!supply) {
        return res.status(404).json({ message: `Supply item with ID ${item.supplyId} not found.` });
      }

      // 🛑 KASO A: SCRAP O RETURN TO VENDOR (Deducting from Repair/Damaged pool)
      if (transactionType === "Scrap" || transactionType === "Return to Vendor") {
        if (supply.DamagedCount < item.qty) {
          return res.status(400).json({ 
            message: `Insufficient REPAIR/DAMAGED stock for ${supply.ItemDescription || supply.Code}. Available in repair: ${supply.DamagedCount}` 
          });
        }
        // Bawasan ang Repair count ng item sa database
        supply.DamagedCount -= item.qty; 
      } 
      
      // 🟡 KASO B: STANDARD REMOVALS (Deducting from Good core stock)
      else if (transactionType === "Borrow" || transactionType === "Reserved" || transactionType === "Out") {
        if (supply.ActualCount < item.qty) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${supply.ItemDescription || supply.Code}. Available: ${supply.ActualCount}` 
          });
        }
        supply.ActualCount -= item.qty;
      } 
      
      // 🟢 KASO C: RETURNS AND INCOMING RESTOCK
      else if (transactionType === "Return" || transactionType === "Restock") {
        supply.ActualCount += (item.goodConditionQty || 0);
        supply.UsedCount += (item.usedQty || 0);
        supply.DamagedCount += (item.damagedQty || 0);
      }

      await supply.save();
    }

    const finalSlipNo = await generateSlipNo(transactionType);

    const newMovement = new SuppliesMovement({
      slipNo: finalSlipNo,
      transactionType,
      transactionDate,
      partyName,
      originAddress,
      preparedBy,
      referenceSlipNo: referenceSlipNo ? referenceSlipNo.replace("REF: ", "").trim() : "",
      items: items.map(i => ({
        supplyId: i.supplyId,
        qty: i.qty,
        goodConditionQty: i.goodConditionQty,
        usedQty: i.usedQty || 0,
        damagedQty: i.damagedQty,
        remarks: i.remarks
      }))
    });

    await newMovement.save();

    if (transactionType === "Return" && referenceSlipNo) {
      const cleanRefNo = referenceSlipNo.replace("REF: ", "").trim();
      await SuppliesMovement.findOneAndUpdate(
        { slipNo: cleanRefNo, transactionType: "Borrow" },
        { isReturned: true }
      );
    }

    return res.status(201).json(newMovement);
  } catch (error) {
    console.error("Error in createMovement:", error);
    return res.status(500).json({ message: "Internal server error during transaction registry." });
  }
};

export const getAllMovements = async (req, res) => {
  try {
    const movements = await SuppliesMovement.find()
      .populate("items.supplyId", "Code ItemDescription UOM ActualCount UsedCount DamagedCount ConditionBreakdown")
      .sort({ createdAt: -1 });
    return res.status(200).json(movements);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch history logs." });
  }
};
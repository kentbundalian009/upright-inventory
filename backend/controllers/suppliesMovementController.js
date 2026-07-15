import SuppliesMovement from "../models/SuppliesMovement.js";
import Supplies from "../models/Supplies.js"; 

const generateSlipNo = async (type) => {
  let prefix = "RST";
  if (type === "Borrow") prefix = "BRW";
  else if (type === "Return") prefix = "RET";
  else if (type === "Reserved") prefix = "RES";
  else if (type === "Out") prefix = "OUT";
  else if (type === "Scrap") prefix = "SCR"; 
  else if (type === "Repair") prefix = "RPR";           // 🎯 Slip prefix para sa Scrap
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

    // Linisin agad ang reference slip number kung mayroon man
    const cleanRefNo = referenceSlipNo ? referenceSlipNo.replace("REF: ", "").trim() : "";

    for (const item of items) {
      const supply = await Supplies.findById(item.supplyId);
      if (!supply) {
        return res.status(404).json({ message: `Supply item with ID ${item.supplyId} not found.` });
      }

      // Siguraduhing may initial structure ang ConditionBreakdown kung sakaling wala pa ito
      if (!supply.ConditionBreakdown) {
        supply.ConditionBreakdown = { Good: 0, Damaged: 0 };
      }

      // 🛠️ REPAIR LOGIC
      if (transactionType === "Repair") {
        const damageToDeduct = item.damagedQty || item.qty || 0;
        const goodToAdd = item.goodConditionQty || item.qty || 0;

        if (supply.DamagedCount < damageToDeduct) {
          return res.status(400).json({ 
            message: `Sobra ang isinusumiteng repair sa natitirang damage stock para sa ${supply.ItemDescription || supply.Code}. Available Damaged: ${supply.DamagedCount}` 
          });
        }

        // Bawasan ang damage, idagdag sa actual (good)
        supply.DamagedCount -= damageToDeduct;
        supply.ActualCount += goodToAdd;

        // I-sync sa nested Breakdown
        supply.ConditionBreakdown.Damaged = supply.DamagedCount;
        supply.ConditionBreakdown.Good = supply.ActualCount;
      }

      // 🟠 KASO A: SCRAP O RETURN TO VENDOR (Dito bawas lang sa Damaged/Auto-out)
      else if (transactionType === "Scrap" || transactionType === "Return to Vendor") {
        if (supply.DamagedCount < item.qty) {
          return res.status(400).json({ 
            message: `Insufficient REPAIR/DAMAGED stock for ${supply.ItemDescription || supply.Code}. Available in repair: ${supply.DamagedCount}` 
          });
        }
        supply.DamagedCount -= item.qty;

        // 🔥 SABAY NA I-UPDATE ANG BREAKDOWN
        supply.ConditionBreakdown.Damaged = supply.DamagedCount;
      } 
      
      // 🟡 KASO B: STANDARD REMOVALS (Borrow, Reserved, Out)
      else if (transactionType === "Borrow" || transactionType === "Reserved" || transactionType === "Out") {
        const isAlreadyDeductedFromReserve = (transactionType === "Borrow" && cleanRefNo && cleanRefNo.startsWith("RES-"));
        if (!isAlreadyDeductedFromReserve) {
          if (supply.ActualCount < item.qty) {
            return res.status(400).json({ 
              message: `Insufficient stock for ${supply.ItemDescription || supply.Code}. Available: ${supply.ActualCount}` 
            });
          }
          supply.ActualCount -= item.qty;
        }
        
        // 🔥 SABAY NA I-UPDATE ANG BREAKDOWN DITO KAPAG NABAWASAN ANG STOCK
        supply.ConditionBreakdown.Good = supply.ActualCount;
      } 
      
      // 🟢 KASO C: RETURNS AND INCOMING RESTOCK
      else if (transactionType === "Return" || transactionType === "Restock") {
        supply.ActualCount += (item.goodConditionQty || 0);
        supply.UsedCount += (item.usedQty || 0);
        supply.DamagedCount += (item.damagedQty || 0);

        supply.ConditionBreakdown.Good = supply.ActualCount;
        supply.ConditionBreakdown.Damaged = supply.DamagedCount;
      }

      // 🎯 IMPORTANT: Sabihan ang Mongoose na binago natin ang nested/mixed object para pilitin nitong i-save sa DB
      supply.markModified('ConditionBreakdown');
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
      referenceSlipNo: cleanRefNo,
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

    // 🎯 PAG-UPDATE SA MGA PENDING SLIPS (Para mawala na sila sa Quick-Return Assistant)
    if (cleanRefNo) {
      if (transactionType === "Return") {
        // Kung nagsasauli (Return), hanapin ang orihinal na Borrow slip at i-close
        await SuppliesMovement.findOneAndUpdate(
          { slipNo: cleanRefNo, transactionType: "Borrow" },
          { isReturned: true }
        );
      } else if (transactionType === "Borrow" && cleanRefNo.startsWith("RES-")) {
        // Kung dine-deploy ang Reserved slip bilang isang ganap na Borrow slip,
        // hanapin ang orihinal na Reserved slip at markahan itong tapos na (isReturned: true)
        await SuppliesMovement.findOneAndUpdate(
          { slipNo: cleanRefNo, transactionType: "Reserved" },
          { isReturned: true }
        );
      }
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
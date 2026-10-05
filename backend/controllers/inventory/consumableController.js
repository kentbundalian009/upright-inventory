import Consumable from "../../models/Consumable.js";
import ConsumableTransaction from "../../models/ConsumableTransaction.js";
import Supplies from "../../models/Supplies.js";
import { uploadImageBuffer } from "../../lib/cloudinary.js";

// Helper to generate a unique consumable item code
const generateConsumableCode = async () => {
  const count = await Consumable.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, "0");
  let candidate = `CON-${nextNum}`;
  const exists = await Consumable.findOne({ Code: candidate });
  if (exists) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `CON-${randomSuffix}`;
  }
  return candidate;
};

// Helper to generate transaction slip number
const generateTransactionNo = async (type) => {
  const prefix = type === "IN" ? "CON-IN" : "CON-OUT";
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const candidate = `${prefix}-${dateStr}-${randomNum}`;
  const exists = await ConsumableTransaction.findOne({ transactionNo: candidate });
  if (exists) {
    return generateTransactionNo(type);
  }
  return candidate;
};

// GET all active consumables (supports ?all=true or ?archived=true)
export const getConsumables = async (req, res) => {
  try {
    let filter = { isArchived: { $ne: true } };
    if (req.query.all === "true") {
      filter = {};
    } else if (req.query.archived === "true") {
      filter = { isArchived: true };
    }

    let items = await Consumable.find(filter).sort({ createdAt: -1 }).lean();

    // If no consumables exist yet, we can check if there are supplies to provide seed items
    if (items.length === 0 && !req.query.archived) {
      const sampleSupplies = await Supplies.find({ isArchived: false }).limit(20);
      if (sampleSupplies.length > 0) {
        const seedDocs = sampleSupplies.map((s, idx) => ({
          Code: `CON-${(idx + 1).toString().padStart(4, "0")}`,
          ItemDescription: s.ItemDescription,
          Segment: s.Segment || "General",
          Dimension: s.Dimension || "—",
          Category: s.Category || "Consumables",
          Brand: s.Brand || "—",
          SerialNo: s.SerialNo || "—",
          ActualCount: s.ActualCount || 0,
          Damaged: s.DamagedCount || 0,
          UOM: s.UOM || "pcs",
          AcquisitionCost: s.AcquisitionCost || 0,
          ImageUrl: s.ImageUrl || "",
          isArchived: false
        }));

        try {
          await Consumable.insertMany(seedDocs, { ordered: false });
          items = await Consumable.find({ isArchived: { $ne: true } }).sort({ createdAt: -1 }).lean();
        } catch (seedErr) {
          console.warn("Notice: Seed consumables insert encountered duplicates:", seedErr.message);
          items = await Consumable.find({ isArchived: { $ne: true } }).sort({ createdAt: -1 }).lean();
        }
      }
    }

    items.sort((a, b) => {
      const descA = (a.ItemDescription || "").trim();
      const descB = (b.ItemDescription || "").trim();
      const cmp = descA.localeCompare(descB, undefined, { sensitivity: "base", numeric: true });
      if (cmp !== 0) return cmp;
      const dimA = (a.Dimension || "").trim();
      const dimB = (b.Dimension || "").trim();
      const dimCmp = dimA.localeCompare(dimB, undefined, { sensitivity: "base", numeric: true });
      if (dimCmp !== 0) return dimCmp;
      return (a.Code || "").localeCompare(b.Code || "", undefined, { sensitivity: "base", numeric: true });
    });

    return res.status(200).json(items);
  } catch (err) {
    console.error("Error fetching consumables:", err);
    return res.status(500).json({ message: "Failed to fetch consumables list", error: err.message });
  }
};

// GET consumable image (fallback endpoint)
export const getConsumableImage = async (req, res) => {
  return res.status(404).send("Image not configured");
};

// GET consumable by ID
export const getConsumableById = async (req, res) => {
  try {
    const item = await Consumable.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Consumable item not found." });
    }
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// POST create consumable item
export const createConsumable = async (req, res) => {
  try {
    let {
      Code,
      ItemDescription,
      Segment,
      Dimension,
      Category,
      Brand,
      SerialNo,
      ActualCount,
      Damaged,
      UOM,
      AcquisitionCost,
      Price
    } = req.body;

    if (!ItemDescription || !ItemDescription.trim()) {
      return res.status(400).json({ message: "Item Description is required." });
    }

    if (!Code || !Code.trim()) {
      Code = await generateConsumableCode();
    } else {
      const existing = await Consumable.findOne({ Code: Code.trim() });
      if (existing) {
        return res.status(400).json({ message: `Item code ${Code} already exists.` });
      }
    }

    const costVal = AcquisitionCost !== undefined ? AcquisitionCost : Price;

    const newItem = new Consumable({
      Code: Code.trim(),
      ItemDescription: ItemDescription.trim(),
      Segment: Segment?.trim() || "Consumables",
      Dimension: Dimension?.trim() || "—",
      Category: Category?.trim() || "Consumables",
      Brand: Brand?.trim() || "—",
      SerialNo: SerialNo?.trim() || "—",
      ActualCount: Number(ActualCount) || 0,
      Damaged: Number(Damaged) || 0,
      UOM: UOM?.trim() || "pcs",
      AcquisitionCost: Number(costVal) || 0
    });

    const saved = await newItem.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating consumable:", err);
    return res.status(500).json({ message: "Failed to create consumable", error: err.message });
  }
};

// PUT update consumable item
export const updateConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Consumable.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Consumable item not found." });
    }

    let {
      Code,
      ItemDescription,
      Segment,
      Dimension,
      Category,
      Brand,
      SerialNo,
      ActualCount,
      Damaged,
      UOM,
      AcquisitionCost,
      Price
    } = req.body;

    if (Code && Code.trim() !== existing.Code) {
      const duplicate = await Consumable.findOne({ _id: { $ne: id }, Code: Code.trim() });
      if (duplicate) {
        return res.status(400).json({ message: `Item code ${Code} is already taken.` });
      }
    }

    const updatedCost = AcquisitionCost !== undefined
      ? Number(AcquisitionCost) || 0
      : (Price !== undefined ? Number(Price) || 0 : existing.AcquisitionCost || 0);

    const updateData = {
      ...(Code && { Code: Code.trim() }),
      ...(ItemDescription && { ItemDescription: ItemDescription.trim() }),
      ...(Segment !== undefined && { Segment: Segment?.trim() || "Consumables" }),
      ...(Dimension !== undefined && { Dimension: Dimension?.trim() || "—" }),
      ...(Category !== undefined && { Category: Category?.trim() || "Consumables" }),
      ...(Brand !== undefined && { Brand: Brand?.trim() || "—" }),
      ...(SerialNo !== undefined && { SerialNo: SerialNo?.trim() || "—" }),
      ...(ActualCount !== undefined && { ActualCount: Number(ActualCount) || 0 }),
      ...(Damaged !== undefined && { Damaged: Number(Damaged) || 0 }),
      ...(UOM !== undefined && { UOM: UOM?.trim() || "pcs" }),
      AcquisitionCost: updatedCost
    };

    const updated = await Consumable.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating consumable:", err);
    return res.status(500).json({ message: "Failed to update consumable", error: err.message });
  }
};

// PUT batch update actual counts
export const batchUpdateActualCounts = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "No count updates provided." });
    }

    const bulkOps = updates.map(u => ({
      updateOne: {
        filter: { _id: u.id },
        update: { $set: { ActualCount: Math.max(0, Number(u.actualCount) || 0) } }
      }
    }));

    const result = await Consumable.bulkWrite(bulkOps);
    return res.status(200).json({ 
      message: "Actual counts updated successfully.", 
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    console.error("Error batch updating actual counts:", err);
    return res.status(500).json({ message: "Failed to update actual counts", error: err.message });
  }
};

// DELETE archive consumable item
export const deleteConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const archived = await Consumable.findByIdAndUpdate(id, { isArchived: true }, { new: true });
    if (!archived) {
      return res.status(404).json({ message: "Consumable item not found." });
    }
    return res.status(200).json({ message: "Consumable archived successfully." });
  } catch (err) {
    console.error("Error archiving consumable:", err);
    return res.status(500).json({ message: "Failed to archive consumable", error: err.message });
  }
};

// PUT unarchive consumable item
export const unarchiveConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const restored = await Consumable.findByIdAndUpdate(id, { isArchived: false }, { new: true });
    if (!restored) {
      return res.status(404).json({ message: "Consumable item not found." });
    }
    return res.status(200).json({ message: "Consumable restored successfully.", data: restored });
  } catch (err) {
    console.error("Error restoring consumable:", err);
    return res.status(500).json({ message: "Failed to restore consumable", error: err.message });
  }
};

// DELETE permanent delete consumable item
export const permanentDeleteConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Consumable.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Consumable item not found." });
    }
    return res.status(200).json({ message: "Consumable permanently deleted.", data: deleted });
  } catch (err) {
    console.error("Error permanently deleting consumable:", err);
    return res.status(500).json({ message: "Failed to permanently delete consumable", error: err.message });
  }
};

// GET transaction logs
export const getTransactions = async (req, res) => {
  try {
    const transactions = await ConsumableTransaction.find()
      .populate("items.consumableId")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(transactions);
  } catch (err) {
    console.error("Error fetching consumable transactions:", err);
    return res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
  }
};

// POST create transaction (IN or OUT)
export const createTransaction = async (req, res) => {
  try {
    const { transactionType, name, date, time, items } = req.body;

    if (!transactionType || !["IN", "OUT"].includes(transactionType)) {
      return res.status(400).json({ message: "Transaction type must be 'IN' or 'OUT'." });
    }

    let transactorName = name?.trim();
    if (transactionType === "OUT") {
      if (!transactorName) {
        return res.status(400).json({ message: "Personnel Name is required for Stock OUT." });
      }
    } else {
      if (!transactorName) {
        transactorName = "Stock Addition (Restock)";
      }
    }

    if (!date || !date.trim()) {
      return res.status(400).json({ message: "Date is required in details." });
    }

    if (!time || !time.trim()) {
      return res.status(400).json({ message: "Time is required in details." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cannot submit transaction without manifest items." });
    }

    // Validate items and stock availability
    for (const item of items) {
      const qty = Number(item.qty);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: `Invalid quantity for item ${item.ItemDescription || item.Code}.` });
      }

      const consumable = await Consumable.findById(item.consumableId);
      if (!consumable) {
        return res.status(404).json({ message: `Consumable item not found: ${item.ItemDescription || item.Code}` });
      }

      if (transactionType === "OUT") {
        if (consumable.ActualCount < qty) {
          return res.status(400).json({
            message: `Insufficient stock for "${consumable.ItemDescription}". Available: ${consumable.ActualCount}, Requested OUT: ${qty}`
          });
        }
      }
    }

    // Generate slip number
    const transactionNo = await generateTransactionNo(transactionType);

    // Apply stock adjustments
    for (const item of items) {
      const qty = Number(item.qty);
      const increment = transactionType === "IN" ? qty : -qty;

      await Consumable.findByIdAndUpdate(
        item.consumableId,
        { $inc: { ActualCount: increment } }
      );
    }

    // Save transaction
    const newTransaction = new ConsumableTransaction({
      transactionNo,
      transactionType,
      name: transactorName,
      date: date.trim(),
      time: time.trim(),
      items
    });

    const saved = await newTransaction.save();
    const populated = await ConsumableTransaction.findById(saved._id).populate("items.consumableId");

    return res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating consumable transaction:", err);
    return res.status(500).json({ message: "Transaction processing failed", error: err.message });
  }
};

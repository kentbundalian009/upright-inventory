import Consumable from "../../models/Consumable.js";
import ConsumableTransaction from "../../models/ConsumableTransaction.js";
import Supplies from "../../models/Supplies.js";

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

// GET all active consumables
export const getConsumables = async (req, res) => {
  try {
    let items = await Consumable.find({ isArchived: { $ne: true } }).sort({ createdAt: -1 }).lean();

    // If no consumables exist yet, we can check if there are supplies to provide seed items
    if (items.length === 0) {
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
          isArchived: false
        }));

        try {
          await Consumable.insertMany(seedDocs, { ordered: false });
          items = await Consumable.find({ isArchived: { $ne: true } }).sort({ createdAt: -1 });
        } catch (seedErr) {
          console.warn("Notice: Seed consumables insert encountered duplicates:", seedErr.message);
          items = await Consumable.find({ isArchived: { $ne: true } }).sort({ createdAt: -1 });
        }
      }
    }

    return res.status(200).json(items);
  } catch (err) {
    console.error("Error fetching consumables:", err);
    return res.status(500).json({ message: "Failed to fetch consumables list", error: err.message });
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
      UOM
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
      UOM: UOM?.trim() || "pcs"
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
    const updated = await Consumable.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Consumable item not found." });
    }
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating consumable:", err);
    return res.status(500).json({ message: "Failed to update consumable", error: err.message });
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

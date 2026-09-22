import Supplies from "../../models/Supplies.js";
import { uploadImageBuffer } from "../../lib/cloudinary.js";

export const getAllSupplies = async (req, res) => {
  try {
    const suppliesList = await Supplies.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(suppliesList);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getSuppliesImage = async (req, res) => {
  try {
    const supply = await Supplies.findById(req.params.id).select("ImageUrl");
    if (!supply || !supply.ImageUrl) {
      return res.status(404).send("Image not found");
    }

    if (supply.ImageUrl.startsWith("data:")) {
      const parts = supply.ImageUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const imgBuffer = Buffer.from(parts[1], "base64");

      res.set("Content-Type", mime);
      res.set("Cache-Control", "public, max-age=86400, immutable");
      return res.send(imgBuffer);
    }

    return res.redirect(supply.ImageUrl);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getSuppliesById = async (req, res) => {
  try {
    const suppliesItem = await Supplies.findById(req.params.id);
    if (!suppliesItem) {
      return res.status(404).json({ message: "Supplies item not found" });
    }
    res.status(200).json(suppliesItem);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createSupplies = async (req, res) => {
  try {
    const {
      Category,
      Segment,
      ItemDescription,
      Dimension,
      SerialNo,
      UOM,
      Condition,
      Brand,
      Color,
      AccountTo,
      AcquisitionCost,
      Price,
    } = req.body;

    if (!ItemDescription || !UOM) {
      return res.status(400).json({ message: "Please fill in all required fields (Description, UOM)" });
    }

    const lastSupply = await Supplies.findOne({ 
      Code: /^SPL-USSP-\d{5}$/ 
    }).sort({ Code: -1 });

    let nextNumber = 1;

    if (lastSupply && lastSupply.Code) {
      const parts = lastSupply.Code.split('-');
      const lastNumberStr = parts[parts.length - 1]; 
      nextNumber = parseInt(lastNumberStr, 10) + 1;
    }

    const generatedCode = `SPL-USSP-${String(nextNumber).padStart(5, '0')}`;
    const costVal = AcquisitionCost !== undefined ? AcquisitionCost : Price;

    const newSupplies = await Supplies.create({
      Code: generatedCode,
      Category: Category?.trim() || "General",
      Segment: Segment?.trim() || "General",
      ItemDescription: ItemDescription.trim(),
      Dimension: Dimension?.trim() || "—",
      SerialNo: SerialNo?.trim() || "—",
      ActualCount: Number(req.body.ActualCount) || 0, 
      UsedCount: 0,
      DamagedCount: Number(req.body.DamagedCount) || 0,
      UOM: UOM.trim(),
      Condition: Condition || "Good",
      Brand: Brand?.trim() || "—",
      Color: Color?.trim(),
      AccountTo: AccountTo?.trim(),
      AcquisitionCost: Number(costVal) || 0,
    });

    res.status(201).json(newSupplies);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateSupplies = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Code,
      Category,
      Segment,
      ItemDescription,
      Dimension,
      SerialNo,
      UOM,
      Condition,
      Brand,
      Color,
      AccountTo,
      AcquisitionCost,
      Price,
    } = req.body;

    if (Code) {
      const duplicateCheck = await Supplies.findOne({
        _id: { $ne: id },
        Code: Code.trim(),
      });
      if (duplicateCheck) {
        return res.status(400).json({ message: "Supplies Code is already taken by another item" });
      }
    }

    const existingSupply = await Supplies.findById(id);
    if (!existingSupply) {
      return res.status(404).json({ message: "Supplies item not found" });
    }

    const updatedCost = AcquisitionCost !== undefined
      ? Number(AcquisitionCost) || 0
      : (Price !== undefined ? Number(Price) || 0 : existingSupply.AcquisitionCost || 0);

    const updatedSupplies = await Supplies.findByIdAndUpdate(
      id,
      {
        Code: Code?.trim(),
        Category: Category?.trim(),
        Segment: Segment?.trim(),
        ItemDescription: ItemDescription?.trim(),
        Dimension: Dimension?.trim(),
        SerialNo: SerialNo?.trim(),
        ...(req.body.ActualCount !== undefined && { ActualCount: Number(req.body.ActualCount) || 0 }),
        ...(req.body.DamagedCount !== undefined && { DamagedCount: Number(req.body.DamagedCount) || 0 }),
        UOM: UOM?.trim(),
        Condition,
        Brand: Brand?.trim(),
        Color: Color?.trim(),
        AccountTo: AccountTo?.trim(),
        AcquisitionCost: updatedCost,
      },
      { new: true, runValidators: true }
    );

    if (!updatedSupplies) {
      return res.status(404).json({ message: "Supplies item not found" });
    }

    res.status(200).json(updatedSupplies);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const batchUpdateSuppliesActualCounts = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "No count updates provided." });
    }

    const bulkOps = updates.map(u => {
      const setFields = {};
      if (u.actualCount !== undefined) {
        setFields.ActualCount = Math.max(0, Number(u.actualCount) || 0);
      }
      if (u.damagedCount !== undefined) {
        setFields.DamagedCount = Math.max(0, Number(u.damagedCount) || 0);
      }
      return {
        updateOne: {
          filter: { _id: u.id },
          update: { $set: setFields }
        }
      };
    });

    const result = await Supplies.bulkWrite(bulkOps);
    return res.status(200).json({
      message: "Supplies actual counts updated successfully.",
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("Error batch updating supplies actual counts:", err);
    return res.status(500).json({ message: "Failed to update actual counts", error: err.message });
  }
};

export const deleteSupplies = async (req, res) => {
  try {
    const { id } = req.params;
    const archivedSupply = await Supplies.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true }
    );

    if (!archivedSupply) {
      return res.status(404).json({ message: "Supplies item not found" });
    }

    res.status(200).json({ message: "Supplies item archived successfully", data: archivedSupply });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const unarchiveSupplies = async (req, res) => {
  try {
    const { id } = req.params;
    const unarchivedSupply = await Supplies.findByIdAndUpdate(
      id,
      { isArchived: false },
      { new: true }
    );

    if (!unarchivedSupply) {
      return res.status(404).json({ message: "Supplies item not found" });
    }

    res.status(200).json({ message: "Supplies item restored successfully", data: unarchivedSupply });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const permanentDeleteSupplies = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSupply = await Supplies.findByIdAndDelete(id);

    if (!deletedSupply) {
      return res.status(404).json({ message: "Supplies item not found" });
    }

    res.status(200).json({ message: "Supplies item permanently deleted", data: deletedSupply });
  } catch (error) {
    res.status(500).json({ message: "Server Error during permanent deletion", error: error.message });
  }
};

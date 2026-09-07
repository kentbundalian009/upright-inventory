import RawMaterial from "../../models/RawMaterial.js";

export const getAllRawMaterials = async (req, res) => {
  try {
    const materials = await RawMaterial.find({}).sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getRawMaterialById = async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Raw material not found" });
    }
    res.status(200).json(material);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createRawMaterial = async (req, res) => {
  try {
    const { Code, Category, Segment, ItemDescription, Dimension, UOM, AccountTo } = req.body;

    if (!Code || !ItemDescription || !UOM) {
      return res.status(400).json({ 
        message: "Please fill in all required fields (Code, Description, UOM)" 
      });
    }

    const codeExists = await RawMaterial.findOne({ Code: Code.trim().toUpperCase() });
    if (codeExists) {
      return res.status(400).json({ message: "Material Code already exists" });
    }

    let finalImagePath = "";
    if (req.file) {
      finalImagePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const newMaterial = await RawMaterial.create({
      Code: Code.trim().toUpperCase(),
      ImageUrl: finalImagePath,
      Category: Category?.trim() || "",
      Segment: Segment?.trim() || "N/A",
      ItemDescription: ItemDescription.trim(),
      Dimension: Dimension?.trim() || "N/A",
      ActualCount: 0,
      UOM: UOM.trim(),
      Condition: "Good",
      AccountTo: AccountTo?.trim() || "N/A",
      isArchived: false
    });

    res.status(201).json(newMaterial);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { Code, Category, Segment, ItemDescription, Dimension, ActualCount, UOM, Condition, AccountTo } = req.body;

    if (Code) {
      const duplicateCheck = await RawMaterial.findOne({
        _id: { $ne: id },
        Code: Code.trim().toUpperCase(),
      });
      if (duplicateCheck) {
        return res.status(400).json({ message: "Material Code is already taken by another item" });
      }
    }

    const existingMaterial = await RawMaterial.findById(id);
    if (!existingMaterial) {
      return res.status(404).json({ message: "Raw material not found" });
    }

    let finalImagePath = existingMaterial.ImageUrl;
    if (req.file) {
      finalImagePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const updatedMaterial = await RawMaterial.findByIdAndUpdate(
      id,
      {
        Code: Code?.trim().toUpperCase(),
        ImageUrl: finalImagePath,
        Category: Category?.trim(),
        Segment: Segment?.trim(),
        ItemDescription: ItemDescription?.trim(),
        Dimension: Dimension?.trim(),
        ActualCount,
        UOM: UOM?.trim(),
        Condition,
        AccountTo: AccountTo?.trim(),
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedMaterial);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deleteRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const archivedMaterial = await RawMaterial.findByIdAndUpdate(
      id,
      { $set: { isArchived: true } },
      { new: true }
    );

    if (!archivedMaterial) {
      return res.status(404).json({ message: "Raw material not found" });
    }

    res.status(200).json({ message: "Raw material archived successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error during archiving", error: error.message });
  }
};

export const unarchiveRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const restoredMaterial = await RawMaterial.findByIdAndUpdate(
      id,
      { $set: { isArchived: false } },
      { new: true }
    );

    if (!restoredMaterial) {
      return res.status(404).json({ message: "Raw material not found" });
    }

    res.status(200).json({ message: "Raw material restored successfully", data: restoredMaterial });
  } catch (error) {
    res.status(500).json({ message: "Server Error during restoration", error: error.message });
  }
};

export const permanentDeleteRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMaterial = await RawMaterial.findByIdAndDelete(id);

    if (!deletedMaterial) {
      return res.status(404).json({ message: "Raw material not found" });
    }

    res.status(200).json({ message: "Raw material permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error during permanent deletion", error: error.message });
  }
};

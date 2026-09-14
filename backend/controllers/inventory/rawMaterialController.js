import RawMaterial from "../../models/RawMaterial.js";
import { uploadImageBuffer } from "../../lib/cloudinary.js";

export const getAllRawMaterials = async (req, res) => {
  try {
    const materials = await RawMaterial.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $project: {
          Code: 1,
          Category: 1,
          Segment: 1,
          ItemDescription: 1,
          Dimension: 1,
          ActualCount: 1,
          UOM: 1,
          Condition: 1,
          AccountTo: 1,
          AcquisitionCost: 1,
          isArchived: 1,
          createdAt: 1,
          updatedAt: 1,
          ImageUrl: {
            $cond: {
              if: { $and: [{ $ne: ["$ImageUrl", ""] }, { $ne: ["$ImageUrl", null] }] },
              then: {
                $cond: {
                  if: { $regexMatch: { input: "$ImageUrl", regex: "^https?://" } },
                  then: "$ImageUrl",
                  else: { $concat: ["/api/raw-materials/", { $toString: "$_id" }, "/image"] }
                }
              },
              else: ""
            }
          }
        }
      }
    ]);
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getRawMaterialImage = async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id).select("ImageUrl");
    if (!material || !material.ImageUrl) {
      return res.status(404).send("Image not found");
    }

    if (material.ImageUrl.startsWith("data:")) {
      const parts = material.ImageUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const imgBuffer = Buffer.from(parts[1], "base64");

      res.set("Content-Type", mime);
      res.set("Cache-Control", "public, max-age=86400, immutable");
      return res.send(imgBuffer);
    }

    return res.redirect(material.ImageUrl);
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
    const obj = material.toObject();
    if (obj.ImageUrl && obj.ImageUrl.startsWith("data:")) {
      obj.ImageUrl = `/api/raw-materials/${obj._id}/image`;
    }
    res.status(200).json(obj);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createRawMaterial = async (req, res) => {
  try {
    const { Code, Category, Segment, ItemDescription, Dimension, UOM, AccountTo, AcquisitionCost } = req.body;

    if (!ItemDescription || !UOM) {
      return res.status(400).json({ 
        message: "Please fill in all required fields (Description, UOM)" 
      });
    }

    let finalCode = Code ? Code.trim().toUpperCase() : "";
    if (!finalCode) {
      const lastMat = await RawMaterial.findOne({ Code: /^RCK-USSP-\d+$/ }).sort({ Code: -1 });
      let nextNum = 1;
      if (lastMat && lastMat.Code) {
        const parts = lastMat.Code.split('-');
        nextNum = parseInt(parts[parts.length - 1], 10) + 1;
      }
      finalCode = `RCK-USSP-${String(nextNum).padStart(5, '0')}`;
    }

    const codeExists = await RawMaterial.findOne({ Code: finalCode });
    if (codeExists) {
      finalCode = `RCK-USSP-${Date.now().toString().slice(-6)}`;
    }

    let finalImagePath = "";
    if (req.file) {
      finalImagePath = await uploadImageBuffer(req.file.buffer, req.file.mimetype, "oneinventory/raw_materials");
    }

    const newMaterial = await RawMaterial.create({
      Code: finalCode,
      ImageUrl: finalImagePath,
      Category: Category?.trim() || "",
      Segment: Segment?.trim() || "N/A",
      ItemDescription: ItemDescription.trim(),
      Dimension: Dimension?.trim() || "N/A",
      ActualCount: 0,
      UOM: UOM.trim(),
      Condition: "Good",
      AccountTo: AccountTo?.trim() || "N/A",
      AcquisitionCost: Number(AcquisitionCost) >= 0 ? Number(AcquisitionCost) : 0,
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
    const { Code, Category, Segment, ItemDescription, Dimension, ActualCount, UOM, Condition, AccountTo, AcquisitionCost } = req.body;

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
      finalImagePath = await uploadImageBuffer(req.file.buffer, req.file.mimetype, "oneinventory/raw_materials");
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
        ...(AcquisitionCost !== undefined && { AcquisitionCost: Number(AcquisitionCost) >= 0 ? Number(AcquisitionCost) : 0 })
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

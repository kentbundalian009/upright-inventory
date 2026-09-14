import Assets from "../../models/Assets.js";
import { uploadImageBuffer } from "../../lib/cloudinary.js";

export const getAllAssets = async (req, res) => {
  try {
    const assetsList = await Assets.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json(assetsList);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getAssetsById = async (req, res) => {
  try {
    const assetsItem = await Assets.findById(req.params.id);
    if (!assetsItem) {
      return res.status(404).json({ message: "Assets item not found" });
    }
    res.status(200).json(assetsItem);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createAssets = async (req, res) => {
  try {
    const {
      Code,
      Category,
      Segment,
      ItemDescription,
      Model,
      Brand,
      SerialNo,
      UOM,
      ActualCount,
      ConditionBreakdown,
      AccountTo,
      Location,
      AcquisitionDate
    } = req.body;

    if (!Category || !ItemDescription || !UOM) {
      return res.status(400).json({ message: "Please fill in all required fields (Category, Description, UOM)" });
    }

    let finalCode = Code ? Code.trim() : "";
    if (!finalCode) {
      const lastAsset = await Assets.findOne({ Code: /^AST-USSP-\d+$/ }).sort({ Code: -1 });
      let nextNum = 1;
      if (lastAsset && lastAsset.Code) {
        const parts = lastAsset.Code.split('-');
        nextNum = parseInt(parts[parts.length - 1], 10) + 1;
      }
      finalCode = `AST-USSP-${String(nextNum).padStart(5, '0')}`;
    }

    const codeExists = await Assets.findOne({ Code: finalCode });
    if (codeExists) {
      finalCode = `AST-USSP-${Date.now().toString().slice(-6)}`;
    }

    const finalCount = Number(ActualCount || 0);
    if (finalCount <= 0) {
      return res.status(400).json({ message: "Dapat may laman na quantity ang Actual Count." });
    }

    let finalImageUrl = req.body.ImageUrl || "";
    if (req.file) {
      finalImageUrl = await uploadImageBuffer(req.file.buffer, req.file.mimetype, "oneinventory/assets");
    }

    const newAssets = await Assets.create({
      Code: finalCode,
      ImageUrl: finalImageUrl,
      Category: Category.trim(),
      Segment: Segment?.trim(),
      ItemDescription: ItemDescription.trim(),
      Model: Model?.trim(),
      Brand: Brand?.trim(),
      SerialNo: SerialNo?.trim(),
      ActualCount: finalCount,
      UOM: UOM.trim(),
      ConditionBreakdown: {
        Good: Number(ConditionBreakdown?.Good || finalCount),
        Used: Number(ConditionBreakdown?.Used || 0),
        Damaged: Number(ConditionBreakdown?.Damaged || 0)
      },
      AccountTo: AccountTo?.trim(),
      Location: Location?.trim(),
      AcquisitionDate,
      isArchived: false,
    });

    res.status(201).json(newAssets);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Code,
      Category,
      Segment,
      ItemDescription,
      Model,
      Brand,
      SerialNo,
      UOM,
      ActualCount,
      ConditionBreakdown,
      AccountTo,
      Location,
      AcquisitionDate,
      isArchived,
    } = req.body;

    if (Code) {
      const duplicateCheck = await Assets.findOne({
        _id: { $ne: id },
        Code: Code.trim(),
      });
      if (duplicateCheck) {
        return res.status(400).json({ message: "Assets Code is already taken by another item" });
      }
    }

    let updatedPayload = {
      Code: Code?.trim(),
      Category: Category?.trim(),
      Segment: Segment?.trim(),
      ItemDescription: ItemDescription?.trim(),
      Model: Model?.trim(),
      Brand: Brand?.trim(),
      SerialNo: SerialNo?.trim(),
      UOM: UOM?.trim(),
      ActualCount: Number(ActualCount),
      AccountTo: AccountTo?.trim(),
      Location: Location?.trim(),
      AcquisitionDate,
      isArchived,
    };

    if (ConditionBreakdown) {
      updatedPayload.ConditionBreakdown = {
        Good: Number(ConditionBreakdown.Good || 0),
        Used: Number(ConditionBreakdown.Used || 0),
        Damaged: Number(ConditionBreakdown.Damaged || 0)
      };
    }

    if (req.file) {
      updatedPayload.ImageUrl = await uploadImageBuffer(req.file.buffer, req.file.mimetype, "oneinventory/assets");
    } else if (req.body.ImageUrl !== undefined) {
      updatedPayload.ImageUrl = req.body.ImageUrl;
    }

    const updatedAssets = await Assets.findByIdAndUpdate(
      id,
      updatedPayload,
      { new: true, runValidators: true }
    );

    if (!updatedAssets) {
      return res.status(404).json({ message: "Assets item not found" });
    }

    res.status(200).json(updatedAssets);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deleteAssets = async (req, res) => {
  try {
    const { id } = req.params;
    
    const archivedAsset = await Assets.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true }
    );

    if (!archivedAsset) {
      return res.status(404).json({ message: "Assets item not found" });
    }

    res.status(200).json({ message: "Assets item archived successfully", data: archivedAsset });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

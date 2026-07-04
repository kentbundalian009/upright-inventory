import Assets from "../models/Assets.js";

// READ: Kunin lahat ng Assets
export const getAllAssets = async (req, res) => {
  try {
    const assetsList = await Assets.find({}).sort({ createdAt: -1 });
    res.status(200).json(assetsList);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// READ: Kunin ang isang asset item gamit ang ID
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

// CREATE: Magdagdag ng bagong Assets item
export const createAssets = async (req, res) => {
  try {
    const {
      Code,
      Category,
      Segment,
      ItemDescription,
      Brand,
      UOM,
      ActualCount,
      ConditionBreakdown,
      AcquisitionDate,
      AccountTo
    } = req.body;

    if (!Code || !Category || !ItemDescription || !UOM) {
      return res.status(400).json({ message: "Please fill in all required fields (Code, Category, Description, UOM)" });
    }

    const codeExists = await Assets.findOne({ Code: Code.trim() });
    if (codeExists) {
      return res.status(400).json({ message: "Assets Code already exists" });
    }

    const finalCount = Number(ActualCount || 0);
    if (finalCount <= 0) {
      return res.status(400).json({ message: "Dapat may laman na quantity ang Actual Count." });
    }

    const newAssets = await Assets.create({
      Code: Code.trim(),
      Category: Category.trim(),
      Segment: Segment?.trim(),
      ItemDescription: ItemDescription.trim(),
      Brand: Brand?.trim(),
      ActualCount: finalCount,
      UOM: UOM.trim(),
      ConditionBreakdown: {
        Good: Number(ConditionBreakdown?.Good || finalCount), // If walang breakdown, default sa actual count ang good qty
        Used: Number(ConditionBreakdown?.Used || 0),
        Damaged: Number(ConditionBreakdown?.Damaged || 0)
      },
      AcquisitionDate,
      AccountTo: AccountTo?.trim(),
      isArchived: false,
    });

    res.status(201).json(newAssets);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// UPDATE: Baguhin ang detalye ng Assets item o i-unarchive gamit ang ID
export const updateAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Code,
      Category,
      Segment,
      ItemDescription,
      Brand,
      UOM,
      ActualCount,
      ConditionBreakdown,
      AcquisitionDate,
      AccountTo,
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
      Brand: Brand?.trim(),
      UOM: UOM?.trim(),
      ActualCount: Number(ActualCount),
      AcquisitionDate,
      AccountTo: AccountTo?.trim(),
      isArchived,
    };

    if (ConditionBreakdown) {
      updatedPayload.ConditionBreakdown = {
        Good: Number(ConditionBreakdown.Good || 0),
        Used: Number(ConditionBreakdown.Used || 0),
        Damaged: Number(ConditionBreakdown.Damaged || 0)
      };
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

// DELETE: Soft delete / I-archive ang item gamit ang ID
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
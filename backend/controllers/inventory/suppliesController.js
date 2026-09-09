import Supplies from "../../models/Supplies.js";

export const getAllSupplies = async (req, res) => {
  try {
    const suppliesList = await Supplies.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $project: {
          Code: 1,
          Category: 1,
          Segment: 1,
          ItemDescription: 1,
          Dimension: 1,
          SerialNo: 1,
          ActualCount: 1,
          UsedCount: 1,
          DamagedCount: 1,
          UOM: 1,
          Condition: 1,
          Brand: 1,
          Color: 1,
          AccountTo: 1,
          isArchived: 1,
          createdAt: 1,
          updatedAt: 1,
          ImageUrl: {
            $cond: {
              if: { $and: [{ $ne: ["$ImageUrl", ""] }, { $ne: ["$ImageUrl", null] }] },
              then: { $concat: ["/api/supplies/", { $toString: "$_id" }, "/image"] },
              else: ""
            }
          }
        }
      }
    ]);
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
    const obj = suppliesItem.toObject();
    if (obj.ImageUrl && obj.ImageUrl.startsWith("data:")) {
      obj.ImageUrl = `/api/supplies/${obj._id}/image`;
    }
    res.status(200).json(obj);
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
    } = req.body;

    if (!Category || !ItemDescription || !UOM) {
      return res.status(400).json({ message: "Please fill in all required fields (Category, Description, UOM)" });
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

    let finalImageUrl = "";
    if (req.file) {
      finalImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const newSupplies = await Supplies.create({
      Code: generatedCode,
      Category: Category.trim(),
      Segment: Segment?.trim(),
      ItemDescription: ItemDescription.trim(),
      Dimension: Dimension?.trim(),
      SerialNo: SerialNo?.trim() || "—",
      ImageUrl: finalImageUrl, 
      ActualCount: 0, 
      UsedCount: 0,
      DamagedCount: 0,
      UOM: UOM.trim(),
      Condition: Condition || "Good",
      Brand: Brand?.trim(),
      Color: Color?.trim(),
      AccountTo: AccountTo?.trim(),
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
      ImageUrl,
      UOM,
      Condition,
      Brand,
      Color,
      AccountTo,
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

    let finalImageUrl = existingSupply.ImageUrl || "";
    if (req.file) {
      finalImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    } else if (ImageUrl && !ImageUrl.startsWith("/api/")) {
      finalImageUrl = ImageUrl;
    }

    const updatedSupplies = await Supplies.findByIdAndUpdate(
      id,
      {
        Code: Code?.trim(),
        Category: Category?.trim(),
        Segment: Segment?.trim(),
        ItemDescription: ItemDescription?.trim(),
        Dimension: Dimension?.trim(),
        SerialNo: SerialNo?.trim(),
        ImageUrl: finalImageUrl, 
        UOM: UOM?.trim(),
        Condition,
        Brand: Brand?.trim(),
        Color: Color?.trim(),
        AccountTo: AccountTo?.trim(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedSupplies) {
      return res.status(404).json({ message: "Supplies item not found" });
    }

    const obj = updatedSupplies.toObject();
    if (obj.ImageUrl && obj.ImageUrl.startsWith("data:")) {
      obj.ImageUrl = `/api/supplies/${obj._id}/image`;
    }
    res.status(200).json(obj);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
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

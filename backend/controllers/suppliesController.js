import Supplies from "../models/Supplies.js";

// READ: Kunin lahat ng active Supplies
export const getAllSupplies = async (req, res) => {
  try {
    const suppliesList = await Supplies.find({}).sort({ createdAt: -1 });
    res.status(200).json(suppliesList);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// READ: Kunin ang isang supplies item gamit ang ID
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

// CREATE: Magdagdag ng bagong Supplies item
export const createSupplies = async (req, res) => {
  try {
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
    } = req.body;

    if (!Code || !Category || !ItemDescription || !UOM) {
      return res.status(400).json({ message: "Please fill in all required fields (Code, Category, Description, UOM)" });
    }

    const codeExists = await Supplies.findOne({ Code: Code.trim() });
    if (codeExists) {
      return res.status(400).json({ message: "Supplies Code already exists" });
    }

    // Alamin kung may uploaded file galing sa multer middleware
    let finalImageUrl = "";
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    }

    const newSupplies = await Supplies.create({
      Code: Code.trim(),
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

// UPDATE: Baguhin ang detalye ng Supplies item
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
      ImageUrl, // Gagamitin lang kung walang bagong uploaded file
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

    // Alamin kung may bagong file na inupload, kung wala, gamitin ang luma
    let finalImageUrl = ImageUrl;
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
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

    res.status(200).json(updatedSupplies);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE: Soft delete (isArchived: true)
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

// PUT: Ibalik mula sa archive (isArchived: false)
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
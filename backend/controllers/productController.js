import Product from "../models/Product.js";

// READ: Kunin lahat ng Products (Kasama active at archived, frontend na ang magsasala gamit ang filters)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// READ: Kunin ang isang partikular na Product gamit ang ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// CREATE: Magdagdag ng bagong Product (Pure Details)
export const createProduct = async (req, res) => {
  try {
    const {
      Code,
      Category,
      Segment,
      ItemDescription,
      Dimension,
      UOM,
      AccountTo,
    } = req.body;

    // 1. Structural backend validation
    if (!Code || !Category || !ItemDescription || !UOM) {
      return res.status(400).json({ 
        message: "Please fill in all required fields (Code, Category, ItemDescription, UOM)" 
      });
    }

    const cleanCode = Code.trim();

    // 2. Case-insensitive duplicate checking para iwasan ang duplicate key errors
    const codeExists = await Product.findOne({ 
      Code: { $regex: `^${cleanCode}$`, $options: "i" } 
    });
    
    if (codeExists) {
      return res.status(400).json({ message: "Product Code already exists (Case-Insensitive Match)" });
    }

    // 3. Mongoose Creation (Automatic 0 ang ActualCount at "Good" ang Condition)
    const newProduct = await Product.create({
      Code: cleanCode,
      Category: Category.trim(),
      Segment: Segment ? Segment.trim() : "",
      ItemDescription: ItemDescription.trim(),
      Dimension: Dimension ? Dimension.trim() : "",
      UOM: UOM.trim(),
      AccountTo: AccountTo ? AccountTo.trim() : "",
      isArchived: false
    });

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: "Server Error during creation", error: error.message });
  }
};

// UPDATE: Baguhin ang detalye ng isang Product gamit ang ID (Pure Details Only)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Code,
      Category,
      Segment,
      ItemDescription,
      Dimension,
      UOM,
      AccountTo,
    } = req.body;

    const updateFields = {};

    // Suriin at i-validate ang Code kung kasamang babaguhin sa body payload
    if (Code) {
      const cleanCode = Code.trim();
      const duplicateCheck = await Product.findOne({
        _id: { $ne: id },
        Code: { $regex: `^${cleanCode}$`, $options: "i" },
      });
      if (duplicateCheck) {
        return res.status(400).json({ message: "Product Code is already taken by another item" });
      }
      updateFields.Code = cleanCode;
    }

    // I-map lamang ang mga pinasang Pure Details para walang tsansa na magalaw ang ActualCount at Condition
    if (Category !== undefined) updateFields.Category = Category.trim();
    if (Segment !== undefined) updateFields.Segment = Segment.trim();
    if (ItemDescription !== undefined) updateFields.ItemDescription = ItemDescription.trim();
    if (Dimension !== undefined) updateFields.Dimension = Dimension.trim();
    if (UOM !== undefined) updateFields.UOM = UOM.trim();
    if (AccountTo !== undefined) updateFields.AccountTo = AccountTo.trim();

    // $set framework operation
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: "Server Error during modification", error: error.message });
  }
};

// DELETE / ARCHIVE TRIGGER: Ginawang Soft-Delete para pumasok sa Archive Vault
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Imbes na findByIdAndDelete, binabago lang natin ang state flag nito
    const archivedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: { isArchived: true } },
      { new: true }
    );

    if (!archivedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product archived successfully", data: archivedProduct });
  } catch (error) {
    res.status(500).json({ message: "Server Error during archiving", error: error.message });
  }
};

// UNARCHIVE / RESTORE TRIGGER: Ibalik ang item mula sa Archive Vault patungong Active view
export const unarchiveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const restoredProduct = await Product.findByIdAndUpdate(
      id,
      { $set: { isArchived: false } },
      { new: true }
    );

    if (!restoredProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product restored from archive vault", data: restoredProduct });
  } catch (error) {
    res.status(500).json({ message: "Server Error during restoration", error: error.message });
  }
};
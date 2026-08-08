import Product from "../../models/Product.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

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

    if (!Code || !Category || !ItemDescription || !UOM) {
      return res.status(400).json({ 
        message: "Please fill in all required fields (Code, Category, ItemDescription, UOM)" 
      });
    }

    const cleanCode = Code.trim();

    const codeExists = await Product.findOne({ 
      Code: { $regex: `^${cleanCode}$`, $options: "i" } 
    });
    
    if (codeExists) {
      return res.status(400).json({ message: "Product Code already exists (Case-Insensitive Match)" });
    }

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

    if (Category !== undefined) updateFields.Category = Category.trim();
    if (Segment !== undefined) updateFields.Segment = Segment.trim();
    if (ItemDescription !== undefined) updateFields.ItemDescription = ItemDescription.trim();
    if (Dimension !== undefined) updateFields.Dimension = Dimension.trim();
    if (UOM !== undefined) updateFields.UOM = UOM.trim();
    if (AccountTo !== undefined) updateFields.AccountTo = AccountTo.trim();

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

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
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

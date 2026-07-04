import Setting from "../models/Setting.js";
import { logActivity } from "../utils/logger.js";
// READ: Kunin ang threshold depende sa categoryType
export const getThresholdByCategory = async (req, res) => {
  try {
    const { categoryType } = req.params;

    const validCategories = ["raw_materials", "products", "supplies"];
    if (!validCategories.includes(categoryType)) {
      return res.status(400).json({ message: `Invalid category type: ${categoryType}` });
    }
    
    let settings = await Setting.findOne({ categoryType });
    
    if (!settings) {
      let defaultCritical = 5, defaultReorder = 15, defaultOverstock = 50;
      
      if (categoryType === 'products') {
        defaultCritical = 10; defaultReorder = 30; defaultOverstock = 100;
      } else if (categoryType === 'supplies') {
        defaultCritical = 3; defaultReorder = 10; defaultOverstock = 30;
      }

      // Ligtas na atomic fallback creation para iwas sa Duplicate Key unique constraint crash
      settings = await Setting.findOneAndUpdate(
        { categoryType },
        { 
          $setOnInsert: { 
            categoryType,
            critical: defaultCritical, 
            reorder: defaultReorder, 
            overstock: defaultOverstock 
          } 
        },
        { new: true, upsert: true }
      );
    }
    
    return res.status(200).json(settings);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch threshold config", error: error.message });
  }
};

// UPDATE: I-save o i-update ang thresholds ng partikular na kategorya
export const updateThresholdByCategory = async (req, res) => {
  try {
    const { categoryType } = req.params;
    const { critical, reorder, overstock } = req.body;

    const validCategories = ["raw_materials", "products", "supplies"];
    if (!validCategories.includes(categoryType)) {
      return res.status(400).json({ message: "Invalid category type" });
    }

    // Pinwersang maging Number parsers para hindi maging String ang tipo sa database collection
    const criticalNum = parseInt(critical) || 0;
    const reorderNum = parseInt(reorder) || 0;
    const overstockNum = parseInt(overstock) || 0;

    const updatedSettings = await Setting.findOneAndUpdate(
      { categoryType },
      { $set: { critical: criticalNum, reorder: reorderNum, overstock: overstockNum } },
      { new: true, upsert: true, runValidators: true }
    );
    
    // Opsyonal: Pwede mong kabitan ng activity logger kung may session user ka sa req.user
    if (req.user) {
      await logActivity(req.user, "Inventory Settings", "UPDATE", `In-update ang threshold rules para sa ${categoryType}`);
    }
    
    return res.status(200).json(updatedSettings);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update thresholds", error: error.message });
  }
};
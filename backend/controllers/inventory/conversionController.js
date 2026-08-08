import mongoose from 'mongoose';
import Conversion from '../../models/Conversion.js';
import RawMaterial from '../../models/RawMaterial.js';
import Product from '../../models/Product.js';

export const getAllConversions = async (req, res) => {
  try {
    const logs = await Conversion.find()
      .populate('inputs.materialId', 'Code ItemDescription UOM ActualCount')
      .populate('outputs.itemId', 'Code ItemDescription UOM ActualCount')
      .sort({ createdAt: -1 });
      
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to fetch production conversion control history.", 
      error: err.message 
    });
  }
};

export const createConversion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { productionType, dateProcessed, preparedBy, remarks, inputs, outputs } = req.body;

    if (!inputs || inputs.length === 0 || !outputs || outputs.length === 0) {
      throw new Error("Kailangan may laman ang Inputs (Raw Materials) at Outputs (Finished Goods / Returns).");
    }

    const currentYear = new Date().getFullYear();
    const lastLog = await Conversion.findOne({
      conversionNo: { $regex: `^CONV-${currentYear}-` }
    }).sort({ createdAt: -1 }).session(session);

    let nextSequence = 1;
    if (lastLog) {
      const lastSerial = lastLog.conversionNo.split('-')[2];
      nextSequence = parseInt(lastSerial, 10) + 1;
    }
    const conversionNo = `CONV-${currentYear}-${String(nextSequence).padStart(4, '0')}`;

    for (const input of inputs) {
      const material = await RawMaterial.findById(input.materialId).session(session);
      
      if (!material) {
        throw new Error(`Raw Material Registry ID [${input.materialId}] hindi matagpuan sa imbentaryo.`);
      }
      
      if (material.ActualCount < input.qtyUsed) {
        throw new Error(`Kulang ang stock para sa ${material.Code}. Kasalukuyan: ${material.ActualCount}, Kailangan: ${input.qtyUsed}`);
      }

      material.ActualCount -= Number(input.qtyUsed);
      await material.save({ session });
    }

    for (const output of outputs) {
      let targetItem;

      if (output.itemType === 'RawMaterial') {
        targetItem = await RawMaterial.findById(output.itemId).session(session);
      } else {
        targetItem = await Product.findById(output.itemId).session(session);
      }
      
      if (!targetItem) {
        throw new Error(`Target ${output.itemType} ID [${output.itemId}] hindi rehistrado sa system records.`);
      }

      targetItem.ActualCount = (targetItem.ActualCount || 0) + Number(output.qtyProduced);
      await targetItem.save({ session });
    }

    const newConversionLog = new Conversion({
      conversionNo,
      productionType,
      dateProcessed: dateProcessed || new Date(),
      remarks: remarks?.trim(),
      preparedBy: preparedBy?.trim(),
      inputs,
      outputs
    });

    await newConversionLog.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ 
      success: true, 
      message: `Production Transaksyon (${conversionNo}) ay matagumpay na naitala!`, 
      data: newConversionLog 
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    res.status(400).json({ 
      success: false, 
      message: error.message || "Failed to execute material matrix conversion control." 
    });
  }
};

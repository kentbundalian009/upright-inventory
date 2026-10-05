import RawMaterial from "../../models/RawMaterial.js";
import PackingList from "../../models/PackingList.js";
import { uploadImageBuffer } from "../../lib/cloudinary.js";
import crypto from "crypto";

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
          CriticalAlert: { $ifNull: ["$CriticalAlert", 0] },
          RestockWarning: { $ifNull: ["$RestockWarning", 10] },
          MaxStorage: { $ifNull: ["$MaxStorage", 1000] },
          createdAt: 1,
          updatedAt: 1,
          ImageUrl: {
            $cond: {
              if: { $and: [{ $ne: ["$ImageUrl", ""] }, { $ne: ["$ImageUrl", null] }] },
              then: {
                $cond: {
                  if: { $regexMatch: { input: "$ImageUrl", regex: "^https?://" } },
                  then: "$ImageUrl",
                  else: {
                    $concat: [
                      "/api/raw-materials/",
                      { $toString: "$_id" },
                      "/image?v=",
                      { $toString: { $ifNull: [{ $toLong: "$updatedAt" }, { $toLong: "$createdAt" }] } }
                    ]
                  }
                }
              },
              else: ""
            }
          }
        }
      }
    ]);
    // 📦 Calculate active reserve quantities held from Outbound Materials (PackingList Reserves)
    const activeReserves = await PackingList.find({
      transactionType: "Reserve",
      isVoided: { $ne: true }
    }).select("plNo customer shipmentDate items.materialId items.qtyRequested items.actualCountShipped").lean();

    const reserveMap = new Map();
    for (const slip of activeReserves) {
      for (const item of (slip.items || [])) {
        if (!item.materialId) continue;
        const matIdStr = item.materialId.toString();
        const qty = Number(item.qtyRequested || item.actualCountShipped || 0);
        if (qty <= 0) continue;

        if (!reserveMap.has(matIdStr)) {
          reserveMap.set(matIdStr, {
            totalReserved: 0,
            slips: []
          });
        }
        const entry = reserveMap.get(matIdStr);
        entry.totalReserved += qty;
        entry.slips.push({
          plNo: slip.plNo,
          customer: slip.customer || "N/A",
          qty,
          shipmentDate: slip.shipmentDate
        });
      }
    }

    for (const material of materials) {
      const matIdStr = material._id ? material._id.toString() : "";
      const reserveData = reserveMap.get(matIdStr);
      material.ReserveCount = reserveData ? reserveData.totalReserved : 0;
      material.ReserveDetails = reserveData ? reserveData.slips : [];
    }

    materials.sort((a, b) => {
      const descA = (a.ItemDescription || "").trim();
      const descB = (b.ItemDescription || "").trim();
      const cmp = descA.localeCompare(descB, undefined, { sensitivity: "base", numeric: true });
      if (cmp !== 0) return cmp;
      const dimA = (a.Dimension || "").trim();
      const dimB = (b.Dimension || "").trim();
      const dimCmp = dimA.localeCompare(dimB, undefined, { sensitivity: "base", numeric: true });
      if (dimCmp !== 0) return dimCmp;
      return (a.Code || "").localeCompare(b.Code || "", undefined, { sensitivity: "base", numeric: true });
    });

    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getRawMaterialImage = async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id).select("ImageUrl updatedAt");
    if (!material || !material.ImageUrl) {
      return res.status(404).send("Image not found");
    }

    if (material.ImageUrl.startsWith("data:")) {
      const parts = material.ImageUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const imgBuffer = Buffer.from(parts[1], "base64");

      const etag = `"${crypto.createHash("md5").update(material.ImageUrl).digest("hex")}"`;
      res.set("ETag", etag);
      res.set("Content-Type", mime);
      res.set("Cache-Control", "public, max-age=86400, must-revalidate");

      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }

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
      obj.ImageUrl = `/api/raw-materials/${obj._id}/image?v=${material.updatedAt ? new Date(material.updatedAt).getTime() : Date.now()}`;
    }

    // 📦 Calculate active reserve quantities for this single material
    const activeReserves = await PackingList.find({
      transactionType: "Reserve",
      isVoided: { $ne: true },
      "items.materialId": material._id
    }).select("plNo customer shipmentDate items.materialId items.qtyRequested items.actualCountShipped").lean();

    let totalReserved = 0;
    const slips = [];
    for (const slip of activeReserves) {
      for (const item of (slip.items || [])) {
        if (item.materialId && item.materialId.toString() === material._id.toString()) {
          const qty = Number(item.qtyRequested || item.actualCountShipped || 0);
          if (qty > 0) {
            totalReserved += qty;
            slips.push({
              plNo: slip.plNo,
              customer: slip.customer || "N/A",
              qty,
              shipmentDate: slip.shipmentDate
            });
          }
        }
      }
    }
    obj.ReserveCount = totalReserved;
    obj.ReserveDetails = slips;

    res.status(200).json(obj);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getUniqueImageLibrary = async (req, res) => {
  try {
    const materials = await RawMaterial.find(
      { ImageUrl: { $exists: true, $ne: "" }, isArchived: { $ne: true } },
      "_id Code ItemDescription Segment Dimension ImageUrl createdAt updatedAt"
    ).sort({ createdAt: -1 }).lean();

    const groups = [];
    const hashToGroup = new Map();
    const nameToGroup = new Map();

    for (const item of materials) {
      if (!item.ImageUrl || !item.ImageUrl.trim()) continue;
      const rawUrl = item.ImageUrl.trim();

      // Fingerprint key using MD5 for base64 or lowercase URL for Cloudinary/hosted images
      const contentHash = rawUrl.startsWith("data:")
        ? crypto.createHash("md5").update(rawUrl).digest("hex")
        : rawUrl.split("?")[0].toLowerCase();

      // Cleaned/normalized item description to merge multiple entries of the same item name
      const cleanDesc = (item.ItemDescription || '')
        .replace(/\s*\((new|old)\s*stocks?\)/gi, '')
        .replace(/\s*-(new|old)\s*stocks?/gi, '')
        .replace(/\s*\(october stock\)/gi, '')
        .trim();

      const nameKey = `${cleanDesc.toLowerCase()}___${(item.Segment || '').trim().toLowerCase()}`;

      // Check if this image already exists by exact image hash OR by clean item name within the segment
      const target = hashToGroup.get(contentHash) || nameToGroup.get(nameKey);

      if (target) {
        target.usedCount += 1;
        target.usedBy.push({
          materialId: item._id,
          code: item.Code,
          itemDescription: item.ItemDescription,
          segment: item.Segment,
          dimension: item.Dimension
        });
      } else {
        const streamUrl = rawUrl.startsWith("http")
          ? rawUrl
          : `/api/raw-materials/${item._id}/image?v=${item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now()}`;

        const newGroup = {
          key: nameKey,
          contentHash,
          materialId: item._id,
          code: item.Code,
          itemDescription: cleanDesc || item.ItemDescription,
          rawItemDescription: item.ItemDescription,
          dimension: item.Dimension,
          segment: item.Segment,
          imageUrl: streamUrl,
          usedCount: 1,
          usedBy: [{
            materialId: item._id,
            code: item.Code,
            itemDescription: item.ItemDescription,
            segment: item.Segment,
            dimension: item.Dimension
          }]
        };

        groups.push(newGroup);
        hashToGroup.set(contentHash, newGroup);
        nameToGroup.set(nameKey, newGroup);
      }
    }

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createRawMaterial = async (req, res) => {
  try {
    const { 
      Code, 
      Category, 
      Segment, 
      ItemDescription, 
      Dimension, 
      UOM, 
      AccountTo, 
      AcquisitionCost,
      CriticalAlert,
      criticalAlert,
      RestockWarning,
      restockWarning,
      MaxStorage,
      maxStorage
    } = req.body;

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
    } else if (req.body.selectedImageId) {
      const sourceMat = await RawMaterial.findById(req.body.selectedImageId).select("ImageUrl");
      if (sourceMat && sourceMat.ImageUrl) {
        finalImagePath = sourceMat.ImageUrl;
      }
    } else if (req.body.ImageUrl) {
      const trimmedUrl = req.body.ImageUrl.trim();
      const match = trimmedUrl.match(/\/api\/raw-materials\/([a-f0-9]{24})\/image/i);
      if (match) {
        const sourceMat = await RawMaterial.findById(match[1]).select("ImageUrl");
        finalImagePath = sourceMat?.ImageUrl || trimmedUrl;
      } else {
        finalImagePath = trimmedUrl;
      }
    }

    const parsedCritical = CriticalAlert !== undefined ? Number(CriticalAlert) : (criticalAlert !== undefined ? Number(criticalAlert) : 0);
    const parsedRestock = RestockWarning !== undefined ? Number(RestockWarning) : (restockWarning !== undefined ? Number(restockWarning) : 10);
    const parsedMaxStorage = MaxStorage !== undefined ? Number(MaxStorage) : (maxStorage !== undefined ? Number(maxStorage) : 1000);

    const newMaterial = await RawMaterial.create({
      Code: finalCode,
      ImageUrl: finalImagePath,
      Category: Category?.trim() || "",
      Segment: Segment?.trim() || "N/A",
      ItemDescription: ItemDescription.trim(),
      Dimension: Dimension?.trim() || "N/A",
      ActualCount: 0,
      UOM: UOM.trim(),
      Condition: req.body.Condition !== undefined ? req.body.Condition.trim() : "Good",
      AccountTo: AccountTo?.trim() || "N/A",
      AcquisitionCost: Number(AcquisitionCost) >= 0 ? Number(AcquisitionCost) : 0,
      CriticalAlert: !isNaN(parsedCritical) && parsedCritical >= 0 ? parsedCritical : 0,
      RestockWarning: !isNaN(parsedRestock) && parsedRestock >= 0 ? parsedRestock : 10,
      MaxStorage: !isNaN(parsedMaxStorage) && parsedMaxStorage >= 0 ? parsedMaxStorage : 1000,
      isArchived: false
    });

    const resObj = newMaterial.toObject ? newMaterial.toObject() : { ...newMaterial };
    if (resObj.ImageUrl && resObj.ImageUrl.startsWith("data:")) {
      resObj.ImageUrl = `/api/raw-materials/${resObj._id}/image?v=${Date.now()}`;
    }

    res.status(201).json(resObj);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      Code, 
      Category, 
      Segment, 
      ItemDescription, 
      Dimension, 
      ActualCount, 
      UOM, 
      Condition, 
      AccountTo, 
      AcquisitionCost,
      CriticalAlert,
      criticalAlert,
      RestockWarning,
      restockWarning,
      MaxStorage,
      maxStorage
    } = req.body;

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
    } else if (req.body.selectedImageId) {
      const sourceMat = await RawMaterial.findById(req.body.selectedImageId).select("ImageUrl");
      if (sourceMat && sourceMat.ImageUrl) {
        finalImagePath = sourceMat.ImageUrl;
      }
    } else if (req.body.ImageUrl !== undefined) {
      const trimmedUrl = req.body.ImageUrl.trim();
      const match = trimmedUrl.match(/\/api\/raw-materials\/([a-f0-9]{24})\/image/i);
      if (match) {
        const sourceMat = await RawMaterial.findById(match[1]).select("ImageUrl");
        finalImagePath = sourceMat?.ImageUrl || trimmedUrl;
      } else {
        finalImagePath = trimmedUrl;
      }
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
        ...(AcquisitionCost !== undefined && { AcquisitionCost: Number(AcquisitionCost) >= 0 ? Number(AcquisitionCost) : 0 }),
        ...(CriticalAlert !== undefined || criticalAlert !== undefined ? {
          CriticalAlert: Math.max(0, Number(CriticalAlert !== undefined ? CriticalAlert : criticalAlert) || 0)
        } : {}),
        ...(RestockWarning !== undefined || restockWarning !== undefined ? {
          RestockWarning: Math.max(0, Number(RestockWarning !== undefined ? RestockWarning : restockWarning) || 0)
        } : {}),
        ...(MaxStorage !== undefined || maxStorage !== undefined ? {
          MaxStorage: Math.max(0, Number(MaxStorage !== undefined ? MaxStorage : maxStorage) || 0)
        } : {})
      },
      { new: true, runValidators: true }
    );

    const resObj = updatedMaterial.toObject ? updatedMaterial.toObject() : { ...updatedMaterial };
    if (resObj.ImageUrl && resObj.ImageUrl.startsWith("data:")) {
      resObj.ImageUrl = `/api/raw-materials/${resObj._id}/image?v=${Date.now()}`;
    }

    res.status(200).json(resObj);
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

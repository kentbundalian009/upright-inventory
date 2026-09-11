import SharedLink from "../../models/SharedLink.js";
import LinkClickLog from "../../models/LinkClickLog.js";

// Create a new Shared Viewer Link (Inventory & Admin)
export const createSharedLink = async (req, res) => {
  try {
    const { viewerName, sharedBy, page } = req.body;

    if (!viewerName || !viewerName.trim()) {
      return res.status(400).json({ message: "Fullname of viewer is required" });
    }

    const currentSharedBy = sharedBy || (req.user ? (req.user.Username || req.user.Fullname) : "Inventory");

    const newLink = new SharedLink({
      viewerName: viewerName.trim(),
      sharedBy: currentSharedBy,
      page: page || "Rackings (Records)",
      status: "Active",
      viewCount: 0,
    });

    const saved = await newLink.save();

    // Construct relative link URL
    const relativeUrl = `/shared/rackings?linkId=${saved._id}&viewer=${encodeURIComponent(saved.viewerName)}&sharedBy=${encodeURIComponent(saved.sharedBy)}`;
    saved.linkUrl = relativeUrl;
    await saved.save();

    res.status(201).json({
      message: "Viewer link generated successfully",
      data: saved,
      linkUrl: relativeUrl,
    });
  } catch (error) {
    console.error("Error creating shared link:", error);
    res.status(500).json({ message: "Server error creating link", error: error.message });
  }
};

// Get all Shared Viewer Links (Admin)
export const getAllSharedLinks = async (req, res) => {
  try {
    const { search = "" } = req.query;

    let query = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query = {
        $or: [
          { viewerName: regex },
          { sharedBy: regex },
          { page: regex },
          { linkUrl: regex },
          { status: regex },
        ],
      };
    }

    const links = await SharedLink.find(query).sort({ createdAt: -1 });

    const formatted = links.map((item) => {
      const created = new Date(item.createdAt);
      const lastOpened = item.lastOpenedAt ? new Date(item.lastOpenedAt) : null;
      return {
        id: item._id,
        viewerName: item.viewerName,
        sharedBy: item.sharedBy,
        page: item.page,
        linkUrl: item.linkUrl,
        status: item.status,
        viewCount: item.viewCount,
        createdAtFormatted: `${created.toISOString().split("T")[0]} ${created.toLocaleTimeString()}`,
        lastOpenedFormatted: lastOpened ? `${lastOpened.toISOString().split("T")[0]} ${lastOpened.toLocaleTimeString()}` : "Never",
        rawCreatedAt: item.createdAt,
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching shared links:", error);
    res.status(500).json({ message: "Server error fetching links", error: error.message });
  }
};

// Update Viewer Link (Admin: edit viewer name or status)
export const updateSharedLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { viewerName, status } = req.body;

    const link = await SharedLink.findById(id);
    if (!link) {
      return res.status(404).json({ message: "Viewer link not found" });
    }

    if (viewerName && viewerName.trim()) {
      link.viewerName = viewerName.trim();
      link.linkUrl = `/shared/rackings?linkId=${link._id}&viewer=${encodeURIComponent(link.viewerName)}&sharedBy=${encodeURIComponent(link.sharedBy)}`;
    }

    if (status && ["Active", "Terminated", "Revoked"].includes(status)) {
      link.status = status;
    }

    const updated = await link.save();

    res.status(200).json({
      message: "Viewer link updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating shared link:", error);
    res.status(500).json({ message: "Server error updating link", error: error.message });
  }
};

// Terminate Viewer Link (Admin: sets status to Terminated which triggers 404 maintenance screen)
export const terminateSharedLink = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await SharedLink.findById(id);

    if (!link) {
      return res.status(404).json({ message: "Viewer link not found" });
    }

    link.status = "Terminated";
    const updated = await link.save();

    res.status(200).json({
      message: `Viewer link for ${link.viewerName} has been terminated. Access will now display the 404 maintenance screen.`,
      data: updated,
    });
  } catch (error) {
    console.error("Error terminating shared link:", error);
    res.status(500).json({ message: "Server error terminating link", error: error.message });
  }
};

// Reactivate / Unterminate Viewer Link (Admin: restores status to Active)
export const unterminateSharedLink = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await SharedLink.findById(id);

    if (!link) {
      return res.status(404).json({ message: "Viewer link not found" });
    }

    link.status = "Active";
    const updated = await link.save();

    res.status(200).json({
      message: `Viewer link for ${link.viewerName} has been reactivated successfully. Live access is restored.`,
      data: updated,
    });
  } catch (error) {
    console.error("Error reactivating shared link:", error);
    res.status(500).json({ message: "Server error reactivating link", error: error.message });
  }
};

// Delete Viewer Link (Admin: permanent removal)
export const deleteSharedLink = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SharedLink.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Viewer link not found" });
    }

    res.status(200).json({ message: "Viewer link deleted permanently from database", id });
  } catch (error) {
    console.error("Error deleting shared link:", error);
    res.status(500).json({ message: "Server error deleting link", error: error.message });
  }
};

// Public Validation Endpoint: called when viewer opens the link
export const validateSharedLink = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await SharedLink.findById(id);

    // If deleted or not found: return 404
    if (!link) {
      return res.status(404).json({
        valid: false,
        status: "Deleted",
        message: "This shared viewer link does not exist or has been permanently deleted from the system.",
      });
    }

    // If terminated or revoked: return 404 (renders 404 maintenance screen)
    if (link.status === "Terminated" || link.status === "Revoked") {
      return res.status(404).json({
        valid: false,
        status: "Terminated",
        viewerName: link.viewerName,
        message: "This viewer link has been terminated by the administrator. Access is disabled under 404 maintenance mode.",
      });
    }

    // Increment view count & update lastOpenedAt
    link.viewCount = (link.viewCount || 0) + 1;
    link.lastOpenedAt = new Date();
    await link.save();

    // Log the click in LinkClickLog as well
    try {
      const clickLog = new LinkClickLog({
        openedBy: link.viewerName,
        sharedBy: link.sharedBy,
        page: link.page || "Rackings (Records)",
        url: link.linkUrl || "",
        ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
        timestamp: new Date(),
      });
      await clickLog.save();
    } catch (logErr) {
      console.warn("Could not write link click log:", logErr.message);
    }

    res.status(200).json({
      valid: true,
      viewerName: link.viewerName,
      sharedBy: link.sharedBy,
      status: link.status,
      viewCount: link.viewCount,
    });
  } catch (error) {
    console.error("Error validating shared link:", error);
    res.status(500).json({ valid: false, message: "Validation error", error: error.message });
  }
};

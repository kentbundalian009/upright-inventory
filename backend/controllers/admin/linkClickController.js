import LinkClickLog from "../../models/LinkClickLog.js";

// Public POST endpoint: Record a shared link click
export const recordClick = async (req, res) => {
  try {
    const { openedBy, sharedBy, page, url, link, timestamp } = req.body;

    if (!sharedBy) {
      return res.status(400).json({ message: "sharedBy field is required" });
    }

    const clickLog = new LinkClickLog({
      openedBy: (openedBy && openedBy.trim()) ? openedBy.trim() : "Anonymous Viewer",
      sharedBy: sharedBy.trim(),
      page: (page && page.trim()) ? page.trim() : "Rackings (Records)",
      url: url || link || "",
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
      userAgent: req.headers["user-agent"] || "",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    const savedLog = await clickLog.save();

    res.status(201).json({
      message: "Link click recorded successfully",
      log: savedLog,
    });
  } catch (error) {
    console.error("Error recording link click:", error);
    res.status(500).json({ message: "Server error recording click", error: error.message });
  }
};

// Protected GET endpoint (Admin only): Retrieve recent link click logs
export const getClickLogs = async (req, res) => {
  try {
    const { limit = 50, search = "" } = req.query;

    let query = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query = {
        $or: [
          { openedBy: regex },
          { sharedBy: regex },
          { page: regex },
          { url: regex }
        ]
      };
    }

    const logs = await LinkClickLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 50);

    const formattedLogs = logs.map((log) => {
      const clickDate = new Date(log.timestamp || log.createdAt);
      return {
        id: log._id,
        openedBy: log.openedBy,
        sharedBy: log.sharedBy,
        page: log.page,
        url: log.url,
        timestamp: clickDate.toLocaleTimeString(),
        date: clickDate.toISOString().split("T")[0],
        rawDate: log.createdAt,
      };
    });

    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error("Error fetching link click logs:", error);
    res.status(500).json({ message: "Failed to fetch click logs", error: error.message });
  }
};

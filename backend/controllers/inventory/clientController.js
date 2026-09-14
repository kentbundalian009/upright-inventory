import Client from "../../models/Client.js";

// 1. GET ALL CLIENTS (Filterable by type=Supplier, Customer, o Logistics, isArchived)
export const getAllClients = async (req, res) => {
  try {
    const { type, includeArchived } = req.query;
    const filter = {};

    if (type && ["Supplier", "Customer", "Logistics", "Employee"].includes(type)) {
      filter.type = type;
    }

    if (includeArchived !== "true") {
      filter.isArchived = false;
    }

    const clients = await Client.find(filter).sort({ name: 1, createdAt: -1 });
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 2. GET CLIENT BY ID
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 3. CREATE CLIENT (Supplier, Customer, Logistics, or Employee)
export const createClient = async (req, res) => {
  try {
    const { name, type, address, contactPerson, contactNumber, email, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Pangalan ay kailangan." });
    }

    if (!type || !["Supplier", "Customer", "Logistics", "Employee"].includes(type)) {
      return res.status(400).json({ message: "Pumili ng tamang Type (Supplier, Customer, Logistics, o Employee)." });
    }

    // Check duplicate name for the same type (only active items)
    const existing = await Client.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      type,
      isArchived: false,
    });

    if (existing) {
      return res.status(400).json({ message: `Mayroon nang nakarehistrong ${type} na may pangalang "${name.trim()}".` });
    }

    const newClient = await Client.create({
      name: name.trim(),
      type,
      address: address?.trim() || "",
      contactPerson: contactPerson?.trim() || "",
      contactNumber: contactNumber?.trim() || "",
      email: email?.trim() || "",
      notes: notes?.trim() || "",
      isArchived: false,
    });

    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 4. UPDATE CLIENT
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, address, contactPerson, contactNumber, email, notes } = req.body;

    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (name && name.trim()) {
      const duplicate = await Client.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        type: type || existingClient.type,
        isArchived: false,
      });

      if (duplicate) {
        return res.status(400).json({ message: `Mayroon nang nakarehistrong ${type || existingClient.type} na may pangalang "${name.trim()}".` });
      }
    }

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      {
        name: name?.trim() || existingClient.name,
        type: type || existingClient.type,
        address: address !== undefined ? address.trim() : existingClient.address,
        contactPerson: contactPerson !== undefined ? contactPerson.trim() : existingClient.contactPerson,
        contactNumber: contactNumber !== undefined ? contactNumber.trim() : existingClient.contactNumber,
        email: email !== undefined ? email.trim() : existingClient.email,
        notes: notes !== undefined ? notes.trim() : existingClient.notes,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedClient);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 5. ARCHIVE (SOFT DELETE)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const archived = await Client.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true }
    );

    if (!archived) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({ message: `${archived.type} archived successfully`, client: archived });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 6. UNARCHIVE (RESTORE)
export const unarchiveClient = async (req, res) => {
  try {
    const { id } = req.params;
    const restored = await Client.findByIdAndUpdate(
      id,
      { isArchived: false },
      { new: true }
    );

    if (!restored) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({ message: `${restored.type} restored successfully`, client: restored });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 7. PERMANENT DELETE
export const permanentDeleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Client.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({ message: "Permanently deleted from database." });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

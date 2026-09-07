import User from "../../models/User.js";
import bcrypt from "bcryptjs";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-Password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { EmpNo, Username, Fullname, Email, Password, SystemRole } = req.body;

    if (!EmpNo || !Username || !Fullname || !Email || !Password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedUsername = Username.trim().toLowerCase();
    const normalizedEmail = Email.toLowerCase().trim();
    const normalizedEmpNo = EmpNo.trim();

    const userExists = await User.findOne({ 
      $or: [{ EmpNo: normalizedEmpNo }, { Username: normalizedUsername }, { Email: normalizedEmail }] 
    });
    
    if (userExists) {
      if (userExists.EmpNo === normalizedEmpNo) return res.status(400).json({ message: "Employee No already exists" });
      if (userExists.Username === normalizedUsername) return res.status(400).json({ message: "Username is already taken" });
      if (userExists.Email === normalizedEmail) return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    let finalImagePath = "";
    if (req.file) {
      finalImagePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const newUser = await User.create({
      EmpNo: normalizedEmpNo,
      Username: normalizedUsername,
      Fullname: Fullname.trim(), 
      Email: normalizedEmail,
      Password: hashedPassword,
      SystemRole: SystemRole || 'Inventory',
      ProfileImage: finalImagePath,
      isArchived: false
    });

    const userResponse = newUser.toObject();
    delete userResponse.Password;

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { EmpNo, Username, Fullname, Email, SystemRole } = req.body;

    const normalizedEmpNo = EmpNo?.trim();
    const normalizedUsername = Username?.trim().toLowerCase();
    const normalizedEmail = Email?.toLowerCase().trim();

    if (normalizedEmail || normalizedUsername || normalizedEmpNo) {
      const duplicateCheck = await User.findOne({
        _id: { $ne: id },
        $or: [
          ...(normalizedEmpNo ? [{ EmpNo: normalizedEmpNo }] : []),
          ...(normalizedUsername ? [{ Username: normalizedUsername }] : []),
          ...(normalizedEmail ? [{ Email: normalizedEmail }] : [])
        ]
      });

      if (duplicateCheck) {
        if (duplicateCheck.EmpNo === normalizedEmpNo) return res.status(400).json({ message: "Employee No is already taken" });
        if (duplicateCheck.Username === normalizedUsername) return res.status(400).json({ message: "Username is already taken" });
        if (duplicateCheck.Email === normalizedEmail) return res.status(400).json({ message: "Email is already taken" });
      }
    }

    let finalImagePath = undefined;
    if (req.file) {
      finalImagePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const updateFields = { 
      EmpNo: normalizedEmpNo, 
      Username: normalizedUsername, 
      Fullname: Fullname?.trim(), 
      Email: normalizedEmail, 
      SystemRole 
    };
    if (finalImagePath !== undefined) {
      updateFields.ProfileImage = finalImagePath;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).select("-Password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const archivedUser = await User.findByIdAndUpdate(
      id, 
      { isArchived: true }, 
      { new: true }
    );

    if (!archivedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User archived successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const restoredUser = await User.findByIdAndUpdate(
      id, 
      { isArchived: false }, 
      { new: true }
    );

    if (!restoredUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User restored successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.Password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.Password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-Password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

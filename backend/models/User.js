import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    EmpNo: {
      type: String,
      required: [true, "Employee Number is required"],
      unique: true, 
      trim: true,
    },
    SystemRole: {
      type: String,
      required: [true, "System Role is required"],
      enum: ["Admin", "Inventory", "Purchasing", "Viewer"], 
      default: "Inventory", 
    },
    Username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    Fullname: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    Email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    Password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    ProfileImage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, 
  }
);

const User = mongoose.model("User", userSchema);
export default User;
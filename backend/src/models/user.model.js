// backend/src/models/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["customer", "company", "admin"],
      default: "customer",
    },
    // Company crew access level (Added "field_crew" here):
    companyRole: {
      type: String,
      enum: ["owner", "manager", "auditor", "tester", "field_crew", null],
      default: null,
    },
    // Platform super admin access level:
   // In backend/src/models/user.model.js

    adminRole: {
      type: String,
      enum: ["super_admin", "manager", "auditor", "support", "tester", null], // <-- Added super_admin
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
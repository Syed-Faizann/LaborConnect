import mongoose from "mongoose";

const adminTeamSchema = new mongoose.Schema(
  {
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    roleType: {
      type: String,
      enum: ["manager", "auditor", "support", "tester"],
      default: "manager",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "invited"],
      default: "invited",
    },
  },
  { timestamps: true }
);

adminTeamSchema.index({ email: 1 });

const AdminTeam = mongoose.model("AdminTeam", adminTeamSchema);
export default AdminTeam;
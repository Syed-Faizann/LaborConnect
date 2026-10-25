import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true }, // Display title e.g. "Senior Plumber"
    
    // System Access Control
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    roleType: {
      type: String,
      enum: ["manager", "auditor", "tester", "field_crew"],
      default: "field_crew",
    },
    note: { type: String, trim: true },
    photoUrl: String,
    status: {
      type: String,
      enum: ["active", "invited"],
      default: "invited",
    },
  },
  { timestamps: true }
);

teamMemberSchema.index({ owner: 1, email: 1 });

const TeamMember = mongoose.model("TeamMember", teamMemberSchema);
export default TeamMember;
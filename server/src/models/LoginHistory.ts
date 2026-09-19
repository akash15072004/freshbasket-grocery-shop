import mongoose from "mongoose";
const schema = new mongoose.Schema({
  loginHistoryId: { type: String, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  userType: String, role: String, employeeId: String, customerId: String,
  loginAt: { type: Date, required: true, default: Date.now }, logoutAt: { type: Date, default: null },
  sessionDuration: { type: Number, default: null }, status: { type: String, default: "ACTIVE", index: true },
  deviceType: String, browser: String, operatingSystem: String, ipAddress: String,
}, { timestamps: true });
export default mongoose.models.LoginHistory || mongoose.model("LoginHistory", schema);

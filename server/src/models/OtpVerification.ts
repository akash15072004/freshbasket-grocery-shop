import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["email", "mobile"], required: true },
    target: { type: String, required: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    purpose: { type: String, enum: ["register", "forgot", "change-email", "change-mobile"], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpVerificationSchema.index({ channel: 1, target: 1, purpose: 1, createdAt: -1 });

export default mongoose.model("OtpVerification", otpVerificationSchema);

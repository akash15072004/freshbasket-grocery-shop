import mongoose from "mongoose";

const loyaltySettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    enabled: { type: Boolean, default: true },
    pointsPer100: { type: Number, default: 10, min: 0, max: 1000 },
    rupeesPerPoint: { type: Number, default: 0.1, min: 0.01, max: 100 },
    minRedeemPoints: { type: Number, default: 100, min: 1, max: 100000 },
    maxRedeemPercent: { type: Number, default: 50, min: 1, max: 100 },
  },
  { timestamps: true }
);

export default mongoose.model("LoyaltySetting", loyaltySettingSchema);

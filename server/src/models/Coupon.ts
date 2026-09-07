import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 3, maxlength: 30 },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 }, { unique: true });

couponSchema.pre("validate", function (next) {
  if (this.discountType === "percentage" && this.value > 100) {
    return next(new Error("Percentage discount cannot exceed 100%"));
  }
  if (this.expiryDate <= this.startDate) {
    return next(new Error("Expiry date must be after start date"));
  }
  next();
});

export default mongoose.model("Coupon", couponSchema);

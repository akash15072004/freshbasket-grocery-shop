import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    subtitle: { type: String, default: "", trim: true, maxlength: 220 },
    offerLabel: { type: String, default: "", trim: true, maxlength: 60 },
    image: { type: String, required: true, trim: true },
    buttonText: { type: String, default: "Shop now", trim: true, maxlength: 40 },
    link: { type: String, default: "/shop", trim: true, maxlength: 300 },
    startDate: { type: Date },
    endDate: { type: Date },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bannerSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    return next(new Error("End date must be after start date"));
  }
  next();
});

export default mongoose.model("Banner", bannerSchema);

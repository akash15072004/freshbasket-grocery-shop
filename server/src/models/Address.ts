import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true, minlength: 5, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80, default: "" },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

addressSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Address", addressSchema);

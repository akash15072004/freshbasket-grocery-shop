import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
  deliveryPartner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: "", trim: true, maxlength: 1000 },
}, { timestamps: true });

export default mongoose.models.DeliveryRating || mongoose.model("DeliveryRating", schema);

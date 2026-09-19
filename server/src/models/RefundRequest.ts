import mongoose, { Schema } from "mongoose";

const refundRequestSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "FAILED"],
      default: "REQUESTED",
      index: true,
    },
  },
  { timestamps: true }
);

refundRequestSchema.index({ customer: 1, createdAt: -1 });
refundRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.RefundRequest || mongoose.model("RefundRequest", refundRequestSchema);

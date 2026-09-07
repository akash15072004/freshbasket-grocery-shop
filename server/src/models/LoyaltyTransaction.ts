import mongoose from "mongoose";

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    points: { type: Number, required: true },
    type: { type: String, enum: ["earn", "redeem", "reverse", "refund"], required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    description: { type: String, required: true, trim: true, maxlength: 250 },
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ order: 1, type: 1 }, { unique: true, partialFilterExpression: { order: { $exists: true } } });

export default mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);

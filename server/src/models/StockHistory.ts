import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    change: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("StockHistory", stockHistorySchema);

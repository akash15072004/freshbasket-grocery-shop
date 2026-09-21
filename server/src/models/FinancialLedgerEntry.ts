import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  ledgerId: { type: String, required: true, unique: true, index: true },
  order: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  paymentId: { type: String, default: "", index: true },
  entryType: {
    type: String,
    enum: [
      "CUSTOMER_PAYMENT", "STORE_PAYABLE", "DELIVERY_PAYABLE", "PLATFORM_COMMISSION",
      "OWNER_SHARE", "DELIVERY_FEE", "PLATFORM_FEE", "PAYMENT_GATEWAY_FEE", "TAX",
      "DISCOUNT", "REFUND", "PARTIAL_REFUND", "CHARGEBACK", "ADJUSTMENT", "PAYOUT",
      "SETTLEMENT", "REVERSAL", "COD_COLLECTED", "COD_REMITTED"
    ],
    required: true,
    index: true,
  },
  amount: { type: Number, required: true, min: 0 },
  fromPartyType: { type: String, default: "", maxlength: 40 },
  fromPartyId: { type: String, default: "", maxlength: 120 },
  toPartyType: { type: String, default: "", maxlength: 40 },
  toPartyId: { type: String, default: "", maxlength: 120 },
  status: { type: String, default: "POSTED", index: true },
  referenceId: { type: String, default: "", index: true },
  providerEventId: { type: String, default: "", index: true, sparse: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

schema.index({ order: 1, entryType: 1, createdAt: -1 });
schema.index({ providerEventId: 1 }, { unique: true, sparse: true });

export default mongoose.models.FinancialLedgerEntry || mongoose.model("FinancialLedgerEntry", schema);

import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  configuration: { type: String, required: true, index: true },
  before: { type: Schema.Types.Mixed, default: {} },
  after: { type: Schema.Types.Mixed, default: {} },
  effectiveFrom: { type: Date, required: true, index: true },
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, default: "", maxlength: 1000 },
}, { timestamps: true });

export default mongoose.models.FinanceConfigurationHistory || mongoose.model("FinanceConfigurationHistory", schema);

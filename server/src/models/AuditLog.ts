import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorRole: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, default: "", trim: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    ticket: { type: Schema.Types.ObjectId, ref: "SupportTicket", default: null, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ customer: 1, createdAt: -1 });
auditLogSchema.index({ ticket: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

import mongoose, { Schema } from "mongoose";

const supportTicketSchema = new Schema(
  {
    ticketId: { type: String, required: true, unique: true, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    store: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    deliveryPartner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedCustomerCare: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, minlength: 3, maxlength: 3000 },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM", index: true },
    status: {
      type: String,
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_CUSTOMER",
        "WAITING_FOR_STORE",
        "WAITING_FOR_DELIVERY_PARTNER",
        "ESCALATED",
        "RESOLVED",
        "CLOSED",
      ],
      default: "OPEN",
      index: true,
    },
    internalNotes: { type: String, default: "", trim: true, maxlength: 5000 },
    escalation: {
      targetType: { type: String, enum: ["MAIN_ADMIN", "SUB_ADMIN", "STORE_MANAGER"], default: null },
      assignedUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
      reason: { type: String, default: "", trim: true, maxlength: 1000 },
      priority: { type: String, default: "", trim: true },
      timestamp: { type: Date, default: null },
    },
    resolvedAt: { type: Date, default: null },
    orderItemId: { type: String, default: "" },
    requestType: { type: String, enum: ["ISSUE", "REFUND", "REPLACEMENT", "CANCELLATION", "OTHER"], default: "ISSUE" },
    evidence: { type: [String], default: [] },
    messages: { type: [{ sender: { type: Schema.Types.ObjectId, ref: "User" }, senderRole: String, message: String, attachment: String, createdAt: { type: Date, default: Date.now } }], default: [] },
    slaDueAt: { type: Date, default: null },
  },
  { timestamps: true }
);

supportTicketSchema.index({ customer: 1, createdAt: -1 });
supportTicketSchema.index({ assignedCustomerCare: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

export default mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);

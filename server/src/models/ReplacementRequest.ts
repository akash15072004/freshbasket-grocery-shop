import mongoose, { Schema } from "mongoose";

const replacementRequestSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 2000,
    },

    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          default: null,
        },
        name: {
          type: String,
          default: "",
        },
        quantity: {
          type: Number,
          min: 1,
          default: 1,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "REQUESTED",
        "UNDER_REVIEW",
        "VERIFIED",
        "PENDING_STORE_ADMIN",
        "PENDING_MAIN_ADMIN",
        "APPROVED",
        "REPLACEMENT_APPROVED",
        "STORE_PREPARATION",
        "REPLACEMENT_PROCESSING",
        "DELIVERY",
        "DELIVERY_ASSIGNED",
        "OUT_FOR_DELIVERY",
        "REPLACED",
        "COMPLETED",
        "REJECTED",
        "FAILED",
        "ESCALATED",
        "CLOSED",
        "EXPIRED",
      ],
      default: "REQUESTED",
      index: true,
    },

    // FIX: Delivery partner assigned to this replacement request
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

replacementRequestSchema.index({ customer: 1, createdAt: -1 });
replacementRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.ReplacementRequest ||
  mongoose.model("ReplacementRequest", replacementRequestSchema);
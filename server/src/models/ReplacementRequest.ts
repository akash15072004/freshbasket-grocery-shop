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

    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /*
     * Customer Care verification
     */
    customerCareAgent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    customerCareVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    customerCareVerifiedAt: {
      type: Date,
      default: null,
    },

    verification: {
      type: Schema.Types.Mixed,
      default: null,
    },

    /*
     * Fulfillment ownership
     */
    storeAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    mainAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    fulfillmentOwnerType: {
      type: String,
      enum: ["STORE_ADMIN", "MAIN_ADMIN", ""],
      default: "",
    },

    fulfillmentOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
     * Replacement identifiers
     */
    replacementId: {
      type: String,
      default: "",
      index: true,
    },

    requestId: {
      type: String,
      default: "",
      index: true,
    },

    orderItemId: {
      type: String,
      default: "",
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    description: {
      type: String,
      default: "",
      maxlength: 3000,
    },

    /*
     * Source
     */
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    sourceType: {
      type: String,
      enum: ["STORE", "FRESHBASKET_DIRECT"],
      default: "FRESHBASKET_DIRECT",
      index: true,
    },

    /*
     * Priority / evidence
     */
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },

    evidence: {
      type: [String],
      default: [],
    },

    /*
     * Delivery / eligibility
     */
    deliveredAtSnapshot: {
      type: Date,
      default: null,
    },

    expiryAt: {
      type: Date,
      default: null,
    },

    eligibleAtRequestTime: {
      type: Boolean,
      default: false,
    },

    inventoryReserved: {
      type: Boolean,
      default: false,
    },

    inventoryReservedAt: {
      type: Date,
      default: null,
    },

    deliveryStartedAt: {
      type: Date,
      default: null,
    },

    replacementDeliveredAt: {
      type: Date,
      default: null,
    },

    deliveryProof: {
      type: Schema.Types.Mixed,
      default: null,
    },

    /*
     * Rejection / escalation
     */
    rejectionReason: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    escalationReason: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    escalatedAt: {
      type: Date,
      default: null,
    },

    /*
     * Closure
     */
    closedAt: {
      type: Date,
      default: null,
    },

    /*
     * Complete workflow history
     */
    statusHistory: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

replacementRequestSchema.index({
  customer: 1,
  createdAt: -1,
});

replacementRequestSchema.index({
  status: 1,
  createdAt: -1,
});

export default mongoose.models.ReplacementRequest ||
  mongoose.model("ReplacementRequest", replacementRequestSchema);
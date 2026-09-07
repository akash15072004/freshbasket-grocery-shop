import mongoose, { Schema } from "mongoose";

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    name: String,
    image: String,
    price: Number,
    quantity: Number,
    unit: String,
  },
  { _id: false }
);

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    items: [itemSchema],
    subtotal: Number,
    discount: Number,
    deliveryCharge: Number,
    total: Number,
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Processing",
        "Packed",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },
    address: Schema.Types.Mixed,
    deliverySlot: String,
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

schema.index({ deliveryPartner: 1, status: 1, createdAt: -1 });
schema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Order", schema);

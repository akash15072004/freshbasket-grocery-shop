import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import Review from "./models/Review";
import SupportTicket from "./models/SupportTicket";
import RefundRequest from "./models/RefundRequest";
import ReplacementRequest from "./models/ReplacementRequest";
import AuditLog from "./models/AuditLog";
import FinancialTransaction from "./models/FinancialTransaction";
import FinanceSettings from "./models/FinanceSettings";
import Incentive from "./models/Incentive";
import PayoutBatch from "./models/PayoutBatch";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import crypto from "crypto";
import axios from "axios";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import User from "./models/User";
import Product from "./models/Product";
import Order from "./models/Order";
import StockHistory from "./models/StockHistory";
import Coupon from "./models/Coupon";
import Notification from "./models/Notification";
import Category from "./models/Category";
import Banner from "./models/Banner";
import LoyaltyTransaction from "./models/LoyaltyTransaction";
import LoyaltySetting from "./models/LoyaltySetting";
import Address from "./models/Address";
import LoginHistory from "./models/LoginHistory";
import Application from "./models/Application";

const storeLocationSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "main" },
  name: { type: String, default: "FreshBasket Store", trim: true, maxlength: 120 },
  address: { type: String, default: "", trim: true, maxlength: 300 },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  accuracy: { type: Number, default: null, min: 0 },
  image: { type: String, default: "", maxlength: 1500000 },
  category: { type: String, default: "Local Store", trim: true, maxlength: 100 },
  description: { type: String, default: "", trim: true, maxlength: 1000 },
  phone: { type: String, default: "", trim: true, maxlength: 20 },
  email: { type: String, default: "", trim: true, maxlength: 160 },
  operatingHours: {
    openingTime: { type: String, default: "", trim: true },
    closingTime: { type: String, default: "", trim: true },
    breakStart: { type: String, default: "", trim: true },
    breakEnd: { type: String, default: "", trim: true },
    weeklyOff: { type: [Number], default: [] },
    holidays: { type: [String], default: [] },
    temporarilyClosed: { type: Boolean, default: false },
    temporaryClosureReason: { type: String, default: "", trim: true, maxlength: 240 },
  },
  newOrdersPaused: { type: Boolean, default: false, index: true },
  newOrdersPauseReason: { type: String, default: "", trim: true, maxlength: 240 },
}, { timestamps: true });

const StoreLocation = mongoose.models.StoreLocation || mongoose.model("StoreLocation", storeLocationSchema);
const paymentSettingSchema = new mongoose.Schema({
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true, index: true },
  upiId: { type: String, default: "", trim: true, maxlength: 120 },
  merchantName: { type: String, default: "FreshBasket", trim: true, maxlength: 120 },
  qrImage: { type: String, default: "", trim: true, maxlength: 100000 },
  isEnabled: { type: Boolean, default: true },
}, { timestamps: true });
const PaymentSetting = mongoose.models.PaymentSetting || mongoose.model("PaymentSetting", paymentSettingSchema);

const loginNoticeSchema = new mongoose.Schema({
  type: { type: String, default: "GENERAL_NOTICE", trim: true, maxlength: 40 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  shortDescription: { type: String, default: "", trim: true, maxlength: 240 },
  description: { type: String, default: "", trim: true, maxlength: 2000 },
  image: { type: String, default: "", maxlength: 1500000 },
  imageUrl: { type: String, default: "", trim: true, maxlength: 500 },
  ctaText: { type: String, default: "", trim: true, maxlength: 60 },
  ctaLink: { type: String, default: "", trim: true, maxlength: 500 },
  startAt: { type: Date, default: Date.now },
  endAt: { type: Date, default: null },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
const LoginNotice = mongoose.models.LoginNotice || mongoose.model("LoginNotice", loginNoticeSchema);

const publicContactSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  businessName: { type: String, default: "FreshBasket", trim: true, maxlength: 120 },
  contactName: { type: String, default: "", trim: true, maxlength: 120 },
  phone: { type: String, default: "", trim: true, maxlength: 20 },
  whatsapp: { type: String, default: "", trim: true, maxlength: 30 },
  email: { type: String, default: "", trim: true, maxlength: 160 },
  address: { type: String, default: "", trim: true, maxlength: 300 },
  workingHours: { type: String, default: "", trim: true, maxlength: 200 },
  storeOnboardingContact: { type: String, default: "", trim: true, maxlength: 160 },
  deliveryHiringContact: { type: String, default: "", trim: true, maxlength: 160 },
  customerSupportContact: { type: String, default: "", trim: true, maxlength: 160 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
const PublicContactSetting = mongoose.models.PublicContactSetting || mongoose.model("PublicContactSetting", publicContactSchema);

const deliveryRatingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: "", trim: true, maxlength: 1000 },
}, { timestamps: true });
const DeliveryRating = mongoose.models.DeliveryRating || mongoose.model("DeliveryRating", deliveryRatingSchema);

const deliveryPayoutConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  defaultPayout: { type: Number, default: 35, min: 0 },
  // Existing incentiveThresholds is retained and extended instead of creating
  // a second incentive configuration system. Legacy rules containing only
  // minRating/minDeliveries/amount remain valid.
  incentiveThresholds: { type: [{
    ruleId: { type: String, default: "" },
    minRating: { type: Number, default: 0, min: 0, max: 5 },
    minDeliveries: { type: Number, default: 1, min: 1 },
    amount: { type: Number, default: 0, min: 0 },
    activeFrom: { type: Date, default: null },
    activeTo: { type: Date, default: null },
    eligibility: { type: String, enum: ["ALL", "ON_TIME"], default: "ALL" },
    maxBonus: { type: Number, default: null, min: 0 },
  }], default: [] },
  slaMinutes: { urgent: { type: Number, default: 30 }, high: { type: Number, default: 60 }, medium: { type: Number, default: 240 }, low: { type: Number, default: 1440 } },
  deliverySlaMinutes: { orderReceived: { type: Number, default: null }, packing: { type: Number, default: null }, pickup: { type: Number, default: null }, delivery: { type: Number, default: null } },
}, { timestamps: true });
const DeliveryPayoutConfig = mongoose.models.DeliveryPayoutConfig || mongoose.model("DeliveryPayoutConfig", deliveryPayoutConfigSchema);

// Extend the existing Incentive model only; do not introduce a second model.
(Incentive as any).schema.add({
  ruleId: { type: String, default: "", index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  awardedAt: { type: Date, default: null, index: true },
  periodStart: { type: Date, default: null },
  periodEnd: { type: Date, default: null },
  eligibility: { type: String, default: "ALL" },
  bonusReason: { type: String, default: "", maxlength: 300 },
});

const deliveryAssignmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ["PENDING_ACCEPTANCE","ACCEPTED","REJECTED","EXPIRED","CANCELLED"], default: "PENDING_ACCEPTANCE", index: true },
  acceptedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rejectionReason: { type: String, default: "", maxlength: 500 },
  rejectionDetails: { type: String, default: "", maxlength: 2000 },
  expiresAt: { type: Date, default: null, index: true },
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
}, { timestamps: true });
deliveryAssignmentSchema.index({ deliveryPartner: 1, status: 1, createdAt: -1 });
deliveryAssignmentSchema.index({ order: 1, createdAt: -1 });
const DeliveryAssignment = mongoose.models.DeliveryAssignment || mongoose.model("DeliveryAssignment", deliveryAssignmentSchema);
const deliveryReassignmentConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  autoReassignmentEnabled: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
const DeliveryReassignmentConfig = mongoose.models.DeliveryReassignmentConfig || mongoose.model("DeliveryReassignmentConfig", deliveryReassignmentConfigSchema);


/* =========================================================
   COD RISK CONTROL — ADDITIVE CONFIGURATION
   Uses real order/refund history. No arbitrary customer scoring.
========================================================= */
const codRiskConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, index: true },
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  enabled: { type: Boolean, default: true },
  cancelledOrdersThreshold: { type: Number, default: 3, min: 1, max: 100 },
  failedDeliveriesThreshold: { type: Number, default: 2, min: 1, max: 100 },
  returnRateThreshold: { type: Number, default: 60, min: 1, max: 100 },
  prepaidCancelThreshold: { type: Number, default: 1, min: 1, max: 100 },
  prepaidReturnRateThreshold: { type: Number, default: 30, min: 1, max: 100 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
const CodRiskConfig = mongoose.models.CodRiskConfig || mongoose.model("CodRiskConfig", codRiskConfigSchema);


// Additive delivery batching metadata. Existing assignments/orders remain valid.
(DeliveryAssignment as any).schema.add({
  assignmentType: { type: String, enum: ["MANUAL", "AUTO", "BATCH"], default: "MANUAL", index: true },
  deliveryBatchId: { type: String, default: null, index: true },
});



// Order-scoped delivery chat. This is intentionally separate from SupportTicket:
// delivery chat is private coordination between the customer and the currently
// assigned delivery partner. Existing support/customer-care messaging remains unchanged.
const deliveryChatMessageSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderRole: { type: String, enum: ["customer", "delivery"], required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, default: "", trim: true, maxlength: 2000 },
  // Optional delivery-related photo. Kept on the existing order-scoped chat message
  // so Point 31 does not create a second chat or a separate messaging system.
  attachment: { type: String, default: "", maxlength: 1000000 },
  messageType: { type: String, enum: ["TEXT", "QUICK_REPLY", "PHOTO"], default: "TEXT" },
  clientMessageId: { type: String, default: "", maxlength: 120 },
  readAt: { type: Date, default: null },
}, { timestamps: true });
deliveryChatMessageSchema.index({ orderId: 1, createdAt: 1 });
deliveryChatMessageSchema.index({ orderId: 1, senderId: 1, clientMessageId: 1 }, { unique: true, sparse: true });
const DeliveryChatMessage = mongoose.models.DeliveryChatMessage || mongoose.model("DeliveryChatMessage", deliveryChatMessageSchema);

// Order-scoped, temporary location sharing for delivery coordination. A share
// belongs to exactly one order and one participant; it never grants access to
// unrelated orders or users.
const deliveryLocationShareSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sharedBy: { type: String, enum: ["customer", "delivery"], required: true },
  enabled: { type: Boolean, default: true, index: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  accuracy: { type: Number, default: null },
  expiresAt: { type: Date, default: null, index: true },
}, { timestamps: true });
deliveryLocationShareSchema.index({ orderId: 1, sharedBy: 1 }, { unique: true });
const DeliveryLocationShare = mongoose.models.DeliveryLocationShare || mongoose.model("DeliveryLocationShare", deliveryLocationShareSchema);

// Point 33: customer-not-available attempts are persisted separately from the
// Order status so an attempted delivery never silently cancels/refunds an order.
// This keeps the existing delivery status workflow unchanged while providing an
// auditable attempt history with optional evidence and the partner's real GPS.
const deliveryNotAvailableAttemptSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  attemptNumber: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, trim: true, maxlength: 200 },
  note: { type: String, default: "", trim: true, maxlength: 2000 },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  locationAccuracy: { type: Number, default: null, min: 0 },
  locationCapturedAt: { type: Date, default: null },
  evidence: { type: [String], default: [] },
}, { timestamps: true });
deliveryNotAvailableAttemptSchema.index({ order: 1, attemptNumber: 1 }, { unique: true });
deliveryNotAvailableAttemptSchema.index({ deliveryPartner: 1, createdAt: -1 });
const DeliveryNotAvailableAttempt = mongoose.models.DeliveryNotAvailableAttempt || mongoose.model("DeliveryNotAvailableAttempt", deliveryNotAvailableAttemptSchema);


const identityCardSchema = new mongoose.Schema({
  cardNumber: { type: String, required: true, unique: true, index: true },
  verificationToken: { type: String, unique: true, sparse: true, index: true, default: () => crypto.randomBytes(24).toString("hex") },
  holderType: { type: String, enum: ["delivery", "store-admin", "customer-care", "finance-manager", "finance-executive", "main-admin", "sub-admin", "operations-executive", "ecommerce-marketplace-executive", "inventory-warehouse-executive", "sales-business-development-executive", "marketing-executive", "technology-it-employee", "hr-administration", "employee"], required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, default: "", trim: true, maxlength: 160 },
  phone: { type: String, default: "", trim: true, maxlength: 20 },
  employeeId: { type: String, default: "", trim: true, maxlength: 60 },
  designation: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, default: "", trim: true, maxlength: 100 },
  address: { type: String, default: "", trim: true, maxlength: 300 },
  emergencyContact: { type: String, default: "", trim: true, maxlength: 120 },
  photo: { type: String, default: "", maxlength: 1000000 },
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  linkedRole: { type: String, default: "", trim: true, maxlength: 40 },
  issueDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ["active", "revoked"], default: "active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
const IdentityCard = mongoose.models.IdentityCard || mongoose.model("IdentityCard", identityCardSchema);


// Multi-store isolation fields are added at runtime so the existing model files
// do not need to be replaced. Existing documents remain compatible.
const tenantObjectIdPath = { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true };
(Product as any).schema.add({ storeAdmin: tenantObjectIdPath });
(Order as any).schema.add({ storeAdmin: tenantObjectIdPath });
(User as any).schema.add({ storeAdmin: tenantObjectIdPath });
(Category as any).schema.add({ storeAdmin: tenantObjectIdPath });
(Banner as any).schema.add({ storeAdmin: tenantObjectIdPath });
(StoreLocation as any).schema.add({ storeAdmin: tenantObjectIdPath });
(Coupon as any).schema.add({ storeAdmin: tenantObjectIdPath });
(User as any).schema.add({
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  locationUpdatedAt: { type: Date, default: null },
  locationAccuracy: { type: Number, default: null, min: 0 },
  locationPermissionStatus: { type: String, enum: ["granted", "denied", "prompt", "unavailable", "unknown"], default: "unknown" },
  lastLocationHeartbeatAt: { type: Date, default: null, index: true },
  onlineStatus: { type: String, enum: ["ONLINE", "OFFLINE"], default: "OFFLINE", index: true },
  availabilityStatus: { type: String, enum: ["AVAILABLE", "BUSY", "ON_DELIVERY", "PAUSED"], default: "AVAILABLE", index: true },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  serviceArea: { type: String, default: "", trim: true, maxlength: 500 },
});

// =========================================================
// PRODUCTION BUSINESS OPERATIONS — additive schema fields
// Existing collections/models are preserved; only optional fields are added.
// =========================================================
const productVariantDefinition = {
  name: { type: String, required: true, trim: true, maxlength: 120 },
  unit: { type: String, default: "", trim: true, maxlength: 80 },
  mrp: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  sku: { type: String, default: "", trim: true, maxlength: 100 },
  barcode: { type: String, default: "", trim: true, maxlength: 120 },
  image: { type: String, default: "", maxlength: 1000000 },
};
(Product as any).schema.add({
  variants: { type: [productVariantDefinition], default: [] },
  // Additive product-level payment availability. Missing/legacy values preserve
  // the existing checkout behavior (both payment methods).
  paymentAvailability: { type: String, enum: ["COD_ONLY", "COD_AND_ONLINE", "ONLINE_ONLY"], default: undefined },
  // New authoritative product-level after-sales policy. Undefined/legacy products
  // are treated as not eligible until an authorized admin explicitly configures them.
  refundAllowed: { type: Boolean, default: false },
  replacementAllowed: { type: Boolean, default: false },
  refundWindowHours: { type: Number, default: 24, min: 0 },
  replacementWindowHours: { type: Number, default: 24, min: 0 },
  // Legacy fields are retained for backward compatibility with existing data/UI.
  refundEligible: { type: Boolean, default: false },
  replacementEligible: { type: Boolean, default: false },
  refundWindowDays: { type: Number, default: 1, min: 0 },
  replacementWindowDays: { type: Number, default: 1, min: 0 },
  refundTerms: { type: String, default: "" },
  replacementTerms: { type: String, default: "" },
});
const orderItemsSchemaPath: any = (Order as any).schema.path("items");
if (orderItemsSchemaPath?.schema?.add) {
  orderItemsSchemaPath.schema.add({
    variantId: { type: String, default: "" },
    variantName: { type: String, default: "" },
    variantSku: { type: String, default: "" },
    variantBarcode: { type: String, default: "" },
  });
}
(Category as any).schema.add({
  defaultRefundAvailable: { type: Boolean, default: true },
  defaultReplacementAvailable: { type: Boolean, default: true },
});
(Order as any).schema.add({
  // Delivery batching never replaces the original order ID.
  deliveryBatchId: { type: String, default: null, index: true },
  deliveryAssignmentType: { type: String, enum: ["MANUAL", "AUTO", "BATCH"], default: "MANUAL", index: true },
  sourceType: { type: String, enum: ["FRESHBASKET_DIRECT", "STORE"], default: "FRESHBASKET_DIRECT" },
  // Immutable financial snapshot captured when a delivered order is finalized.
  // Legacy orders remain untouched and simply have no snapshot.
  commissionRate: { type: Number, default: 0, min: 0, max: 100 },
  commissionAmount: { type: Number, default: 0, min: 0 },
  storeGrossSales: { type: Number, default: 0, min: 0 },
  storeEarnings: { type: Number, default: 0, min: 0 },
  financialFinalizedAt: { type: Date, default: null },
  paymentStatus: { type: String, default: "" },
  paymentMode: { type: String, default: "" },
  paymentPaidAt: { type: Date, default: null },
  deliveryAssignedAt: { type: Date, default: null },
  deliveryStartedAt: { type: Date, default: null },
  deliveryPayout: { type: Number, default: 0, min: 0 },
  deliveryPayoutStatus: { type: String, enum: ["PENDING", "ELIGIBLE", "FINALIZED", "PROCESSING", "PAID", "ON_HOLD", "CANCELLED"], default: "PENDING" },
  performanceIncentive: { type: Number, default: 0, min: 0 },
  deliveryProof: {
    image: { type: String, default: "" },
    uploadedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    // GPS is captured from the authenticated delivery partner's existing live
    // location when available. Legacy proofs remain valid without coordinates.
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationAccuracy: { type: Number, default: null },
    locationCapturedAt: { type: Date, default: null },
  },
  deliveredAt: { type: Date, default: null },
  slaPhase: { type: String, default: null, index: true },
  slaStartedAt: { type: Date, default: null },
  slaDueAt: { type: Date, default: null, index: true },
  slaBreached: { type: Boolean, default: false, index: true },
  slaBreachedAt: { type: Date, default: null },
  slaAlertedAt: { type: Date, default: null },
  paymentSession: {
    reference: { type: String, default: "", index: true },
    uri: { type: String, default: "" },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },
    createdAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, default: "" },
    provider: { type: String, default: "UPI" },
    razorpayOrderId: { type: String, default: "", index: true },
    razorpayPaymentId: { type: String, default: "", index: true },
    razorpaySignature: { type: String, default: "" },
    lastWebhookEventId: { type: String, default: "", index: true },
    providerStatus: { type: String, default: "" },
    qrCodeId: { type: String, default: "", index: true },
    qrImageUrl: { type: String, default: "" },
    qrImageContent: { type: String, default: "" },
  },
  deliveryLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: mongoose.Schema.Types.Mixed, default: null },
    capturedAt: { type: Date, default: null },
  },
  deliveryAssignmentStatus: { type: String, enum: ["UNASSIGNED","PENDING_ACCEPTANCE","ACCEPTED","REJECTED"], default: "UNASSIGNED", index: true },
  deliveryAcceptedAt: { type: Date, default: null },
  deliveryRejectedAt: { type: Date, default: null },
  deliveryRejectionReason: { type: String, default: "", maxlength: 500 },
  deliveryRejectionDetails: { type: String, default: "", maxlength: 2000 },
  deliveryAssignmentExpiresAt: { type: Date, default: null },
  deliveryAssignmentHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
});
(User as any).schema.add({
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
});
(User as any).schema.add({ language: { type: String, enum: ["en", "hi", "hinglish"], default: "en" }, storeImage: { type: String, default: "", maxlength: 1500000 }, storeCategory: { type: String, default: "Local Store", trim: true, maxlength: 100 }, storeDescription: { type: String, default: "", trim: true, maxlength: 1000 } });
(User as any).schema.add({ username: { type: String, default: "", trim: true, lowercase: true }, department: { type: String, default: "", trim: true }, forcePasswordChange: { type: Boolean, default: false } });
(User as any).schema.add({
  favoriteStores: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
  // Point 23: reuse the customer account as the authoritative saved-product
  // index for price-drop eligibility. The existing local wishlist remains the
  // customer-facing cache; this field enables server-side notifications.
  savedProducts: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], default: [], index: true },
});

// Point 42 — Android FCM device registrations. This is additive and optional;
// existing users/documents remain valid when the field is absent.
// Rolling authenticated-session activity. This is backend-authoritative and
// is used together with the existing 7-day JWT to enforce inactivity expiry.
(User as any).schema.add({
  lastActivityAt: { type: Date, default: null, index: true },
});

(User as any).schema.add({
  pushTokens: {
    type: [{
      token: { type: String, required: true },
      platform: { type: String, default: "android" },
      appId: { type: String, default: "com.freshbasket.grocery" },
      lastSeenAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
});
(FinanceSettings as any).schema.add({ commissionRate: { type: Number, default: 0, min: 0, max: 100 } });
(FinancialTransaction as any).schema.add({
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  orderItemId: { type: String, default: "" },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  processedByRole: { type: String, default: "" },
  paymentReference: { type: String, default: "" },
  processedAt: { type: Date, default: null }
});
(FinancialTransaction as any).schema.path("type").enumValues.push("ORDER_PAYMENT", "COMMISSION", "STORE_PAYOUT", "DELIVERY_REVENUE");
(StockHistory as any).schema.add({ variantId: { type: String, default: "", index: true } });
(RefundRequest as any).schema.add({ financeEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true }, assignedFinance: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true }, assignedAt: { type: Date, default: null }, customerCareVerifiedAt: { type: Date, default: null }, customerCareVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, financeReviewedAt: { type: Date, default: null }, financeReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, approvedAt: { type: Date, default: null }, rejectedAt: { type: Date, default: null }, rejectionReason: { type: String, default: "", maxlength: 1000 }, transactionReference: { type: String, default: "", maxlength: 200 }, processingNotes: { type: String, default: "", maxlength: 2000 }, requestedAmount: { type: Number, default: null, min: 0 }, approvedAmount: { type: Number, default: null, min: 0 }, override: { allowed: { type: Boolean, default: false }, reason: { type: String, default: "", maxlength: 1000 }, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, changedAt: { type: Date, default: null } } });
(SupportTicket as any).schema.add({
  orderItemId: { type: String, default: "" },
  requestType: { type: String, enum: ["ISSUE", "REFUND", "REPLACEMENT", "CANCELLATION", "OTHER"], default: "ISSUE" },
  evidence: { type: [String], default: [] },
  messages: { type: [{ sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, senderRole: String, message: String, attachment: String, createdAt: { type: Date, default: Date.now } }], default: [] },
  slaDueAt: { type: Date, default: null },
});
(RefundRequest as any).schema.add({
  orderItemId: { type: String, default: "" },
  refundMethod: { type: String, enum: ["ORIGINAL", "BANK", "UPI"], default: "ORIGINAL" },
  bankName: { type: String, default: "" },
  bankAccountEncrypted: { type: String, default: "" },
  bankAccountMasked: { type: String, default: "" },
  ifsc: { type: String, default: "" },
  accountHolderName: { type: String, default: "" },
  upiEncrypted: { type: String, default: "" },
  upiMasked: { type: String, default: "" },
  evidence: { type: [String], default: [] },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  financeManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  processedAt: { type: Date, default: null },
});
(ReplacementRequest as any).schema.add({
  orderItemId: { type: String, default: "" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  replacementId: { type: String, default: "", index: true },
  requestId: { type: String, default: "", index: true },
  description: { type: String, default: "", maxlength: 3000 },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  mainAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  customerCareAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  sourceType: { type: String, enum: ["STORE", "FRESHBASKET_DIRECT"], default: "FRESHBASKET_DIRECT", index: true },
  fulfillmentOwnerType: { type: String, enum: ["STORE_ADMIN", "MAIN_ADMIN", ""], default: "" },
  fulfillmentOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
  evidence: { type: [String], default: [] },
  verification: { type: mongoose.Schema.Types.Mixed, default: null },
  deliveredAtSnapshot: { type: Date, default: null },
  expiryAt: { type: Date, default: null },
  eligibleAtRequestTime: { type: Boolean, default: false },
  inventoryReserved: { type: Boolean, default: false },
  inventoryReservedAt: { type: Date, default: null },
  deliveryStartedAt: { type: Date, default: null },
  replacementDeliveredAt: { type: Date, default: null },
  deliveryProof: { type: mongoose.Schema.Types.Mixed, default: null },
  rejectionReason: { type: String, default: "", maxlength: 2000 },
  escalationReason: { type: String, default: "", maxlength: 2000 },
  escalatedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  statusHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
});

// The original model predates the production replacement workflow. Keep its
// existing schema/model intact, but extend the status validator to cover the
// additive replacement lifecycle already used by the APIs.
const replacementStatusPath:any=(ReplacementRequest as any).schema.path("status");
if(replacementStatusPath){
  replacementStatusPath.enumValues=["REQUESTED","UNDER_REVIEW","VERIFIED","PENDING_STORE_ADMIN","PENDING_MAIN_ADMIN","APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING","DELIVERY","DELIVERY_ASSIGNED","OUT_FOR_DELIVERY","REPLACED","COMPLETED","REJECTED","FAILED","ESCALATED","CLOSED","EXPIRED"];
}
// RefundRequest is an older model, while the current Customer Care -> Finance
// workflow uses the extended statuses below. Extend the runtime validator so
// request.save()/create() accepts the same lifecycle used by the APIs.
const refundStatusPath:any=(RefundRequest as any).schema.path("status");
if(refundStatusPath){
  const refundStatuses=["REQUESTED","UNDER_REVIEW","VERIFIED_BY_CUSTOMER_CARE","FINANCE_REVIEW","APPROVAL_PENDING","APPROVED","PROCESSING","COMPLETED","REJECTED","FAILED"];
  refundStatusPath.enumValues=refundStatuses;
  // Changing enumValues alone does not replace the enum validator that was
  // created when the legacy RefundRequest schema was initialized. Replace only
  // that validator so the existing status validation remains authoritative while
  // allowing the additive Customer Care -> Finance lifecycle.
  refundStatusPath.validators=(refundStatusPath.validators||[]).filter((v:any)=>v.type!=="enum");
  refundStatusPath.validate({
    validator:(value:any)=>refundStatuses.includes(String(value)),
    message:(props:any)=>`\`${props.value}\` is not a valid enum value for path status.`
  });
}
(PayoutBatch as any).schema.add({
  payoutType: { type: String, enum: ["DELIVERY", "STORE"], default: "DELIVERY", index: true },
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  payoutPeriodStart: { type: Date, default: null },
  payoutPeriodEnd: { type: Date, default: null },
  grossSales: { type: Number, default: 0, min: 0 },
  refunds: { type: Number, default: 0, min: 0 },
  commission: { type: Number, default: 0, min: 0 },
  adjustments: { type: Number, default: 0 },
  netPayable: { type: Number, default: 0, min: 0 }
});


import { auth, role, AuthRequest } from "./middleware/auth";

const app = express();
const MAIN_ADMIN_EMAIL = String(process.env.MAIN_ADMIN_EMAIL || "admin@grocery.com").trim().toLowerCase();
const normalizePhone = (value: any) => String(value || "").replace(/\D/g, "");

const normalizePaymentAvailability = (value: any) => {
  const v = String(value || "").trim().toUpperCase();
  return ["COD_ONLY", "COD_AND_ONLINE", "ONLINE_ONLY"].includes(v) ? v : "LEGACY";
};

const getCartPaymentAvailability = (products: any[]) => {
  const modes = products.map((p:any) => normalizePaymentAvailability(p?.paymentAvailability));
  // Legacy products retain the project's previous behavior.
  const codAllowed = !modes.includes("ONLINE_ONLY");
  // ONLINE_ONLY takes precedence in mixed carts, matching the requested rules.
  const onlineAllowed = modes.some((m:string) => m === "ONLINE_ONLY" || m === "COD_AND_ONLINE" || m === "LEGACY");
  return { codAllowed, onlineAllowed, modes };
};

const nextUserIdentifier = async (kind: "customer" | "employee") => {
  const field = kind === "customer" ? "customerId" : "employeeId";
  const prefix = kind === "customer" ? "FB-CUS-" : "FB-EMP-";
  const docs: any[] = await User.find({ [field]: { $regex: `^${prefix}\\d{6}$` } }).select(field).lean();
  let max = 0;
  for (const doc of docs) {
    const n = Number(String(doc?.[field] || "").slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  let candidate = "";
  do {
    max += 1;
    candidate = prefix + String(max).padStart(6, "0");
  } while (await User.exists({ [field]: candidate }));
  return candidate;
};

const backfillUserIdentifiers = async () => {
  const customers: any[] = await User.find({ role: "customer", $or: [{ customerId: { $exists: false } }, { customerId: "" }, { customerId: null }] }).sort({ createdAt: 1, _id: 1 }).select("_id customerId").lean();
  for (const customer of customers) {
    const customerId = await nextUserIdentifier("customer");
    await User.collection.updateOne({ _id: customer._id, $or: [{ customerId: { $exists: false } }, { customerId: "" }, { customerId: null }] }, { $set: { customerId } });
  }
  const employees: any[] = await User.find({ role: { $ne: "customer" }, $or: [{ employeeId: { $exists: false } }, { employeeId: "" }, { employeeId: null }] }).sort({ createdAt: 1, _id: 1 }).select("_id employeeId").lean();
  for (const employee of employees) {
    const employeeId = await nextUserIdentifier("employee");
    await User.collection.updateOne({ _id: employee._id, $or: [{ employeeId: { $exists: false } }, { employeeId: "" }, { employeeId: null }] }, { $set: { employeeId } });
  }
  const mainAdminId = await getMainAdminId();
  if (mainAdminId) {
    const legacyOrders:any[] = await Order.find({ $or: [{ sourceType: { $exists: false } }, { sourceType: null }, { sourceType: "" }] }).select("_id storeAdmin").lean();
    for (const order of legacyOrders) {
      const sourceType = order.storeAdmin && String(order.storeAdmin) !== String(mainAdminId) ? "STORE" : "FRESHBASKET_DIRECT";
      await Order.collection.updateOne({ _id: order._id, $or: [{ sourceType: { $exists: false } }, { sourceType: null }, { sourceType: "" }] }, { $set: { sourceType } });
    }
  }
};


const CUSTOMER_CARE_PERMISSIONS = [
  "customer.search",
  "customer.view",
  "order.search",
  "order.view",
  "ticket.create",
  "ticket.update",
  "ticket.resolve",
  "refund.request",
  "replacement.request",
  "cancellation.request",
  "notes.add",
  "ticket.escalate",
  "support.history",
];

const SUPPORT_TICKET_CATEGORIES = [
  "Order Issue",
  "Missing Item",
  "Wrong Item",
  "Damaged Item",
  "Damaged Product",
  "Quality Issue",
  "Delivery Issue",
  "Payment Issue",
  "Refund",
  "Replacement",
  "Account",
  "Technical",
  "Expired Product",
  "Late Delivery",
  "Delivery Partner Issue",
  "Wrong Delivery Location",
  "Order Not Received",
  "Payment Failed",
  "Payment Deducted but Order Failed",
  "Refund Issue",
  "Cancellation Request",
  "Replacement Request",
  "Coupon Issue",
  "Product Quality Issue",
  "Account/Login Issue",
  "Other",
];

const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_STORE",
  "WAITING_FOR_DELIVERY_PARTNER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const REFUND_STATUSES = ["REQUESTED", "UNDER_REVIEW", "VERIFIED_BY_CUSTOMER_CARE", "FINANCE_REVIEW", "APPROVAL_PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "FAILED"];
const FINANCE_PERMISSIONS = ["FINANCE_VIEW_REFUNDS","FINANCE_REVIEW_REFUNDS","FINANCE_APPROVE_REFUNDS","FINANCE_PROCESS_REFUNDS","FINANCE_VIEW_PAYOUTS","FINANCE_PROCESS_PAYOUTS","FINANCE_VIEW_INCENTIVES","FINANCE_MANAGE_INCENTIVES","FINANCE_VIEW_REPORTS","FINANCE_EXPORT_REPORTS"];
const FINANCE_ROLES = ["finance_manager","finance_executive"];
const REPLACEMENT_STATUSES = [
  "REQUESTED", "UNDER_REVIEW", "VERIFIED", "PENDING_STORE_ADMIN", "PENDING_MAIN_ADMIN",
  "APPROVED", "REPLACEMENT_APPROVED", "STORE_PREPARATION", "REPLACEMENT_PROCESSING",
  "DELIVERY", "DELIVERY_ASSIGNED", "OUT_FOR_DELIVERY", "REPLACED", "COMPLETED",
  "REJECTED", "FAILED", "ESCALATED", "CLOSED", "EXPIRED"
];

const hasCustomerCarePermission = async (req: AuthRequest, permission: string) => {
  if (req.user?.role !== "customer_care") return false;
  const user: any = await User.findById(req.user.id).select("role blocked permissions").lean();
  if (!user || user.blocked || user.role !== "customer_care") return false;
  const permissions = Array.isArray(user.permissions) ? user.permissions.map((p: any) => String(p)) : [];
  return permissions.length === 0 || permissions.includes(permission);
};

const customerCarePermission = (permission: string) => async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!(await hasCustomerCarePermission(req, permission))) {
      return res.status(403).json({ success: false, message: "Customer Care permission required" });
    }
    next();
  } catch (error) {
    console.error("CUSTOMER CARE PERMISSION ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to verify Customer Care permissions" });
  }
};

const customerCareOrMainAdmin = (permission?: string) => async (req: AuthRequest, res: any, next: any) => {
  try {
    if (req.user?.role === "admin") return mainAdminOnly(req, res, next);
    if (req.user?.role === "customer_care" && permission && await hasCustomerCarePermission(req, permission)) return next();
    return res.status(403).json({ success: false, message: "Forbidden" });
  } catch (error) {
    console.error("CUSTOMER CARE AUTH ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to verify permissions" });
  }
};

(AuditLog as any).schema.add({ actorEmployeeId: { type: String, default: "" } });

const recordCustomerCareAudit = async ({
  req,
  action,
  targetType,
  targetId = "",
  customer = null,
  order = null,
  ticket = null,
  metadata = {},
}: {
  req: AuthRequest;
  action: string;
  targetType: string;
  targetId?: any;
  customer?: any;
  order?: any;
  ticket?: any;
  metadata?: any;
}) => {
  try {
    if (!req.user?.id) return;
    const actor:any = await User.findById(req.user.id).select("employeeId").lean();
    await AuditLog.create({
      actor: req.user.id,
      actorRole: req.user.role,
      actorEmployeeId: String(actor?.employeeId || ""),
      action,
      targetType,
      targetId: String(targetId || ""),
      customer: customer || null,
      order: order || null,
      ticket: ticket || null,
      metadata,
    });
    const actionText = String(action || "");
    if (/PASSWORD|PROFILE|ACCOUNT|USER/i.test(actionText)) await inspectSecurityThresholds({ req, event: "ACCOUNT_CHANGE", actorId: req.user.id, targetId, metadata: { action: actionText } });
    if (/PERMISSION/i.test(actionText)) await inspectSecurityThresholds({ req, event: "PERMISSION_CHANGE", actorId: req.user.id, targetId, metadata: { action: actionText } });
  } catch (error) {
    console.error("CUSTOMER CARE AUDIT ERROR:", error);
  }
};

const sanitizeChangeHistoryValue = (value: any): any => {
  if (value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.map((x: any) => sanitizeChangeHistoryValue(x));
  if (typeof value !== "object") return value;
  const out: any = {};
  for (const [key, val] of Object.entries(value)) {
    if (["_id", "__v", "createdAt", "updatedAt", "image"].includes(key)) continue;
    if (key.toLowerCase().includes("password") || key.toLowerCase().includes("token") || key.toLowerCase().includes("secret")) continue;
    out[key] = sanitizeChangeHistoryValue(val);
  }
  return out;
};

const productChangeSnapshot = (product: any): any => {
  if (!product) return null;
  return sanitizeChangeHistoryValue({
    name: product.name, brand: product.brand, category: product.category,
    description: product.description, sellingPrice: product.sellingPrice, mrp: product.mrp,
    unit: product.unit, stock: product.stock, lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive, refundAllowed: product.refundAllowed ?? product.refundEligible,
    replacementAllowed: product.replacementAllowed ?? product.replacementEligible,
    refundTerms: product.refundTerms, replacementTerms: product.replacementTerms,
    paymentAvailability: product.paymentAvailability,
    variants: Array.isArray(product.variants) ? product.variants.map((v: any) => ({
      _id: v._id, name: v.name, unit: v.unit, mrp: v.mrp, sellingPrice: v.sellingPrice,
      stock: v.stock, sku: v.sku, barcode: v.barcode,
    })) : [],
  });
};

const recordEntityChange = async ({ req, action, targetType, targetId, before = null, after = null, reason = "" }: any) => {
  try {
    if (!req.user?.id) return;
    const actor: any = await User.findById(req.user.id).select("employeeId").lean();
    await AuditLog.create({
      actor: req.user.id, actorRole: req.user.role, actorEmployeeId: String(actor?.employeeId || ""),
      action, targetType, targetId: String(targetId || ""),
      metadata: { before: sanitizeChangeHistoryValue(before), after: sanitizeChangeHistoryValue(after), reason: String(reason || "").slice(0, 500) },
    });
    if (String(action || "").match(/PASSWORD|PROFILE|ACCOUNT|USER/i)) await inspectSecurityThresholds({ req, event: "ACCOUNT_CHANGE", actorId: req.user.id, targetId, metadata: { action: String(action || "") } });
    if (String(action || "").match(/PERMISSION/i)) await inspectSecurityThresholds({ req, event: "PERMISSION_CHANGE", actorId: req.user.id, targetId, metadata: { action: String(action || "") } });
  } catch (error) {
    console.error("ENTITY CHANGE AUDIT ERROR:", error);
  }
};

const makeTicketId = () => `FB-CC-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;


const DEFAULT_COD_RISK_CONFIG = {
  enabled: true,
  cancelledOrdersThreshold: 3,
  failedDeliveriesThreshold: 2,
  returnRateThreshold: 60,
  prepaidCancelThreshold: 1,
  prepaidReturnRateThreshold: 30,
};

const codRiskKey = (storeAdminId: any) => `cod-risk:${String(storeAdminId || "main")}`;

const normalizeCodRiskConfig = (raw: any) => ({
  enabled: raw?.enabled !== false,
  cancelledOrdersThreshold: Math.max(1, Math.min(100, Number(raw?.cancelledOrdersThreshold || DEFAULT_COD_RISK_CONFIG.cancelledOrdersThreshold))),
  failedDeliveriesThreshold: Math.max(1, Math.min(100, Number(raw?.failedDeliveriesThreshold || DEFAULT_COD_RISK_CONFIG.failedDeliveriesThreshold))),
  returnRateThreshold: Math.max(1, Math.min(100, Number(raw?.returnRateThreshold || DEFAULT_COD_RISK_CONFIG.returnRateThreshold))),
  prepaidCancelThreshold: Math.max(1, Math.min(100, Number(raw?.prepaidCancelThreshold || DEFAULT_COD_RISK_CONFIG.prepaidCancelThreshold))),
  prepaidReturnRateThreshold: Math.max(1, Math.min(100, Number(raw?.prepaidReturnRateThreshold || DEFAULT_COD_RISK_CONFIG.prepaidReturnRateThreshold))),
});

const codRiskStoreFilter = (storeAdminId: any) => {
  if (!storeAdminId) return {};
  return { $or: [{ storeAdmin: storeAdminId }, { storeAdmin: String(storeAdminId) }] };
};

const getCodRiskConfig = async (storeAdminId: any) => {
  const key = codRiskKey(storeAdminId);
  const existing: any = await CodRiskConfig.findOne({ key }).lean();
  if (existing) return { ...existing, ...normalizeCodRiskConfig(existing), storeAdmin: existing.storeAdmin || storeAdminId || null, key };
  return { key, storeAdmin: storeAdminId || null, ...DEFAULT_COD_RISK_CONFIG };
};

const getCodRiskMetrics = async (customerId: any, storeAdminId: any) => {
  const tenant = codRiskStoreFilter(storeAdminId);
  const base = { user: customerId, paymentMethod: "COD", ...tenant };
  const [cancelledOrders, deliveredOrders, failedDeliveryOrders, completedRefunds] = await Promise.all([
    Order.countDocuments({ ...base, status: "Cancelled", deliveryPartner: null }),
    Order.countDocuments({ ...base, status: "Delivered" }),
    Order.countDocuments({ ...base, status: "Cancelled", deliveryPartner: { $ne: null } }),
    RefundRequest.find({ customer: customerId, status: "COMPLETED" }).select("order").lean(),
  ]);

  const refundOrderIds = [...new Set((completedRefunds || []).map((r: any) => String(r.order || "")).filter(Boolean))];
  let returnedOrders = 0;
  if (refundOrderIds.length) {
    returnedOrders = await Order.countDocuments({
      ...tenant,
      _id: { $in: refundOrderIds },
      user: customerId,
      paymentMethod: "COD",
      status: "Delivered",
    });
  }
  const returnRate = deliveredOrders > 0 ? Number(((returnedOrders / deliveredOrders) * 100).toFixed(2)) : 0;
  return {
    cancelledOrders: Number(cancelledOrders || 0),
    failedDeliveries: Number(failedDeliveryOrders || 0),
    deliveredOrders: Number(deliveredOrders || 0),
    returnedOrders: Number(returnedOrders || 0),
    returnRate,
    suspiciousSignals: [],
  };
};

const evaluateCodRisk = async (customerId: any, storeAdminId: any) => {
  const config = await getCodRiskConfig(storeAdminId);
  const metrics = await getCodRiskMetrics(customerId, storeAdminId);
  const normalized = normalizeCodRiskConfig(config);
  if (!normalized.enabled) {
    return { state: "COD_ELIGIBLE", label: "COD Eligible", reason: "COD risk control is disabled for this store.", config: normalized, metrics };
  }

  const restrictedReasons: string[] = [];
  if (metrics.cancelledOrders >= normalized.cancelledOrdersThreshold) restrictedReasons.push(`${metrics.cancelledOrders} COD cancellations reached the configured limit of ${normalized.cancelledOrdersThreshold}.`);
  if (metrics.failedDeliveries >= normalized.failedDeliveriesThreshold) restrictedReasons.push(`${metrics.failedDeliveries} failed COD deliveries reached the configured limit of ${normalized.failedDeliveriesThreshold}.`);
  if (metrics.returnRate >= normalized.returnRateThreshold && metrics.deliveredOrders > 0) restrictedReasons.push(`COD return/refund rate is ${metrics.returnRate}% and reached the configured limit of ${normalized.returnRateThreshold}%.`);
  if (restrictedReasons.length) {
    return { state: "COD_RESTRICTED", label: "COD Restricted", reason: restrictedReasons.join(" "), config: normalized, metrics };
  }

  const prepaidReasons: string[] = [];
  if (metrics.cancelledOrders >= normalized.prepaidCancelThreshold) prepaidReasons.push(`You have ${metrics.cancelledOrders} previous COD cancellation${metrics.cancelledOrders === 1 ? "" : "s"}.`);
  if (metrics.returnRate >= normalized.prepaidReturnRateThreshold && metrics.deliveredOrders > 0) prepaidReasons.push(`Your COD return/refund rate is ${metrics.returnRate}%.`);
  if (prepaidReasons.length) {
    return { state: "PREPAID_RECOMMENDED", label: "Prepaid Recommended", reason: "Online payment may help avoid COD-related issues. " + prepaidReasons.join(" "), config: normalized, metrics };
  }
  return { state: "COD_ELIGIBLE", label: "COD Eligible", reason: "Your available COD history is within the configured limits.", config: normalized, metrics };
};

// Compatibility wrapper used by the AI support assistant and other existing callers.
// Keep evaluateCodRisk as the single source of truth for COD risk evaluation.
const getCodRiskStatus = async (customerId: any, storeAdminId: any) => {
  return evaluateCodRisk(customerId, storeAdminId);
};

const customerCareOrderFilter = async (req: AuthRequest) => {
  // Customer Care is support-wide by design. It may inspect customer/order data,
  // while write operations remain protected by dedicated permissions.
  return {};
};

// Delivery map pickup/store configuration.
// Set these on Render as STORE_LAT, STORE_LNG and optionally STORE_ADDRESS.
const STORE_LAT_RAW = String(process.env.STORE_LAT || "").trim();
const STORE_LNG_RAW = String(process.env.STORE_LNG || "").trim();
const STORE_LAT = STORE_LAT_RAW === "" ? null : Number(STORE_LAT_RAW);
const STORE_LNG = STORE_LNG_RAW === "" ? null : Number(STORE_LNG_RAW);
const STORE_ADDRESS = String(process.env.STORE_ADDRESS || "FreshBasket Store").trim();

const hasValidStoreCoordinates =
  STORE_LAT !== null &&
  STORE_LNG !== null &&
  Number.isFinite(STORE_LAT) &&
  Number.isFinite(STORE_LNG) &&
  STORE_LAT >= -90 &&
  STORE_LAT <= 90 &&
  STORE_LNG >= -180 &&
  STORE_LNG <= 180;

const mainAdminOnly = async (req: AuthRequest, res: any, next: any) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const user: any = await User.findById(req.user.id).select("email role blocked").lean();
    if (!user || user.role !== "admin" || user.blocked) {
      return res.status(403).json({ success: false, message: "Admin account not available" });
    }
    if (String(user.email || "").toLowerCase() !== MAIN_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: "Only the main admin can perform this action" });
    }
    next();
  } catch (error) {
    console.error("MAIN ADMIN CHECK ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to verify admin permissions" });
  }
};


const getMainAdminId = async () => {
  const main: any = await User.findOne({ role: "admin", email: MAIN_ADMIN_EMAIL }).select("_id").lean();
  return main?._id || null;
};

const getTenantAdminId = async (req: AuthRequest) => {
  if (!req.user?.id) return null;
  if (req.user.role === "admin") return new mongoose.Types.ObjectId(req.user.id);
  if (req.user.role === "delivery") {
    const partner: any = await User.findById(req.user.id).select("storeAdmin").lean();
    if (partner?.storeAdmin) return partner.storeAdmin;
    return await getMainAdminId();
  }
  return null;
};

const tenantFilter = async (req: AuthRequest, field = "storeAdmin") => {
  const tenant = await getTenantAdminId(req);
  if (!tenant) return { [field]: null };
  // A Store Admin is also role="admin", so comparing req.user.id to the
  // tenant ID would incorrectly classify every Store Admin as Main Admin.
  // Main-store privileges must be based on the actual configured Main Admin.
  const mainAdminId = await getMainAdminId();
  const isMain =
    req.user?.role === "admin" &&
    Boolean(mainAdminId) &&
    String(req.user.id) === String(mainAdminId);
  if (isMain) {
    // Legacy records without a tenant remain part of the original/main store.
    // Also accept the temporary string representation used by older orders so
    // those orders remain visible after the tenant field was introduced.
    return { $or: [{ [field]: tenant }, { [field]: String(tenant) }, { [field]: null }, { [field]: { $exists: false } }] };
  }
  // Tenant IDs are stored as ObjectIds. The string fallback keeps previously
  // created orders visible if an older build wrote storeAdmin as a string.
  return { $or: [{ [field]: tenant }, { [field]: String(tenant) }] };
};

const belongsToTenant = async (req: AuthRequest, doc: any, field = "storeAdmin") => {
  const tenant = await getTenantAdminId(req);
  if (!tenant) return false;
  const owner = doc?.[field];
  if (!owner) return String(tenant) === String(await getMainAdminId());
  return String(owner) === String(tenant);
};


const allowedOrigins = [
  "https://freshbasket-grocery-shop.vercel.app",
  "http://localhost:5173",
  // Capacitor Android WebView origin
  "http://localhost",
  "https://localhost",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json", limit: "2mb" }),
  async (req: any, res: any) => {
    try {
      const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || "").trim();
      if (!secret) return res.status(503).json({ success: false, message: "Payment webhook secret is not configured" });
      const signature = String(req.headers["x-razorpay-signature"] || "").trim();
      if (!signature || !Buffer.isBuffer(req.body)) return res.status(400).json({ success: false, message: "Invalid webhook payload" });
      const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(signature, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ success: false, message: "Invalid webhook signature" });
      const payload = JSON.parse(req.body.toString("utf8"));
      const event = String(payload?.event || "").trim();
      const paymentEntity = payload?.payload?.payment?.entity || null;
      const razorpayPaymentId = String(paymentEntity?.id || "").trim();
      const razorpayOrderId = String(paymentEntity?.order_id || "").trim();
      const eventId = String(req.headers["x-razorpay-event-id"] || payload?.id || "").trim();
      if (!event || !razorpayPaymentId) return res.json({ success: true, ignored: true });

      const order: any = razorpayOrderId
        ? await Order.findOne({ "paymentSession.razorpayOrderId": razorpayOrderId })
        : await Order.findOne({ "paymentSession.razorpayPaymentId": razorpayPaymentId });
      if (!order) return res.json({ success: true, ignored: true });

      if (eventId && String(order.paymentSession?.lastWebhookEventId || "") === eventId) {
        return res.json({ success: true, duplicate: true });
      }

      const status = event === "payment.captured" ? "Paid" : event === "payment.failed" ? "Failed" : String(paymentEntity?.status || "").toLowerCase() === "captured" ? "Paid" : order.paymentStatus || "";
      const providerStatus = String(paymentEntity?.status || "");
      const update: any = {
        "paymentSession.razorpayPaymentId": razorpayPaymentId,
        "paymentSession.provider": "RAZORPAY",
        "paymentSession.providerStatus": providerStatus,
        ...(eventId ? { "paymentSession.lastWebhookEventId": eventId } : {}),
      };
      if (status === "Paid") {
        update.paymentStatus = "Paid";
        update.paymentMode = String(paymentEntity?.method || "RAZORPAY").toUpperCase();
        update.paymentPaidAt = new Date();
        update["paymentSession.verifiedAt"] = new Date();
        update["paymentSession.verifiedBy"] = "RAZORPAY_WEBHOOK";
      } else if (status === "Failed") {
        update.paymentStatus = "Failed";
        update.paymentMode = String(paymentEntity?.method || "RAZORPAY").toUpperCase();
      }
      await Order.collection.updateOne({ _id: order._id }, { $set: update });

      if (status === "Paid") {
        await createFinancialTransaction({
          type: "ORDER_PAYMENT",
          referenceId: `RAZORPAY_PAYMENT:${razorpayPaymentId}`,
          order: order._id,
          customer: order.user || null,
          storeAdmin: order.storeAdmin || null,
          amount: Number(paymentEntity?.amount || Math.round(Number(order.total || 0) * 100)) / 100,
          direction: "INFLOW",
          paymentMethod: String(paymentEntity?.method || "RAZORPAY").toUpperCase(),
          status: "COMPLETED",
          completedAt: new Date(),
          paymentReference: razorpayPaymentId,
          metadata: { provider: "RAZORPAY", razorpayOrderId, event, eventId },
        });
        await notifyUser({ user: order.user, title: "Payment successful", message: `Payment for order #${String(order._id).slice(-8).toUpperCase()} was received successfully.`, type: "payment", order: order._id });
      } else if (status === "Failed") {
        await notifyUser({ user: order.user, title: "Payment failed", message: `Payment for order #${String(order._id).slice(-8).toUpperCase()} failed. Please try again.`, type: "payment", order: order._id });
      }
      return res.json({ success: true });
    } catch (e) {
      console.error("RAZORPAY WEBHOOK ERROR:", e);
      return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
  }
);

app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

const sign = (u: any) =>
  jwt.sign(
    {
      id: u._id.toString(),
      role: u.role,
    },
    process.env.JWT_SECRET || "dev-secret",
    {
      expiresIn: "7d",
    }
  );

const recordStockHistory = async ({
  product,
  change,
  previousStock,
  newStock,
  reason,
  order,
  adjustedBy,
  variantId,
}: {
  product: any;
  change: number;
  previousStock: number;
  newStock: number;
  reason: string;
  order?: any;
  adjustedBy?: any;
  variantId?: any;
}) => {
  try {
    await StockHistory.create({
      product,
      change,
      previousStock,
      newStock,
      reason,
      ...(order ? { order } : {}),
      ...(adjustedBy ? { adjustedBy } : {}),
      ...(variantId ? { variantId } : {}),
    });
    await notifyRestockSubscribers({ productId: product, variantId: String(variantId || ""), previousStock: Number(previousStock || 0), newStock: Number(newStock || 0) });
  } catch (error) {
    console.error("STOCK HISTORY ERROR:", error);
  }
};

(Notification as any).schema.add({
  relatedEntity: { type: String, default: "" },
  relatedEntityId: { type: String, default: "" },
  recipientRole: { type: String, default: "" },
  deepLink: { type: String, default: "" },
});

// Point 23 — authoritative price history. A record is created only when an
// existing product/variant price changes, so new products do not create a fake
// price-drop event.
const priceHistorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  variantId: { type: String, default: "", index: true },
  previousPrice: { type: Number, required: true, min: 0 },
  newPrice: { type: Number, required: true, min: 0 },
  changedAt: { type: Date, default: Date.now, index: true },
});
priceHistorySchema.index({ product: 1, variantId: 1, changedAt: -1 });
const PriceHistory = mongoose.models.PriceHistory || mongoose.model("PriceHistory", priceHistorySchema);

const PRICE_DROP_MIN_PERCENT = 5;
const notifyPriceDropEligibleCustomers = async ({ historyId, productId, variantId = "", previousPrice, newPrice }: { historyId: any; productId: any; variantId?: string; previousPrice: number; newPrice: number }) => {
  try {
    const previous = Number(previousPrice);
    const next = Number(newPrice);
    if (!(previous > 0) || !(next >= 0) || next >= previous) return;
    const percentDrop = ((previous - next) / previous) * 100;
    if (!Number.isFinite(percentDrop) || percentDrop < PRICE_DROP_MIN_PERCENT) return;
    const product: any = await Product.findById(productId).select("name storeAdmin").lean();
    if (!product) return;
    const customers: any[] = await User.find({ role: "customer", blocked: { $ne: true }, savedProducts: productId }).select("_id").lean();
    const relatedEntityId = String(historyId);
    for (const customer of customers) {
      const duplicate = await Notification.findOne({ user: customer._id, relatedEntity: "PRODUCT_PRICE_DROP", relatedEntityId }).select("_id").lean();
      if (duplicate) continue;
      await notifyUser({
        user: customer._id,
        title: "Price drop on a saved product",
        message: `${String(product.name || "A saved product")} is now ₹${next.toFixed(2)} (was ₹${previous.toFixed(2)}).`,
        type: "info",
        relatedEntity: "PRODUCT_PRICE_DROP",
        relatedEntityId,
      });
    }
  } catch (error) {
    console.error("PRICE DROP NOTIFICATION ERROR:", error);
  }
};

// Additive back-in-stock subscriptions. One active subscription per customer/product/store/variant.
const restockAlertSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  storeAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  variantId: { type: String, default: "", index: true },
  active: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
  notifiedAt: { type: Date, default: null },
  restockEventKey: { type: String, default: "" },
});
restockAlertSchema.index(
  { customer: 1, product: 1, storeAdmin: 1, variantId: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);
const RestockAlert = mongoose.models.RestockAlert || mongoose.model("RestockAlert", restockAlertSchema);

const notifyRestockSubscribers = async ({ productId, variantId = "", previousStock, newStock }: { productId: any; variantId?: string; previousStock: number; newStock: number }) => {
  try {
    if (Number(previousStock || 0) > 0 || Number(newStock || 0) <= 0) return;
    const product: any = await Product.findById(productId).select("name storeAdmin").lean();
    if (!product) return;
    const variantKey = String(variantId || "").trim();
    const eventKey = `${String(productId)}:${variantKey || "product"}:${String(newStock)}:${Date.now()}`;
    const alerts: any[] = await RestockAlert.find({ product: productId, variantId: variantKey, active: true }).select("_id customer").lean();
    for (const alert of alerts) {
      // Claim the subscription atomically so concurrent stock writers cannot notify the same customer twice.
      const claimed: any = await RestockAlert.findOneAndUpdate(
        { _id: alert._id, active: true },
        { $set: { active: false, notifiedAt: new Date(), restockEventKey: eventKey } },
        { new: true }
      ).lean();
      if (!claimed) continue;
      const notificationKey = eventKey;
      const duplicate = await Notification.findOne({ user: claimed.customer, relatedEntity: "PRODUCT_RESTOCK", relatedEntityId: notificationKey }).select("_id").lean();
      if (duplicate) continue;
      await notifyUser({
        user: claimed.customer,
        title: "Product back in stock",
        message: `${String(product.name || "This product")} is back in stock${variantKey ? " for your selected variant" : ""}.`,
        type: "info",
        relatedEntity: "PRODUCT_RESTOCK",
        relatedEntityId: notificationKey,
      });
    }
  } catch (error) {
    console.error("RESTOCK NOTIFICATION ERROR:", error);
  }
};

const firebaseMessaging = (() => {
  try {
    const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
    const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
    const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
    if (!projectId || !clientEmail || !privateKey) return null;
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return getMessaging(app);
  } catch (error) {
    console.error("FCM INITIALIZATION ERROR:", error);
    return null;
  }
})();

const buildNotificationDeepLink = ({ relatedEntity, relatedEntityId, order, deepLink }: any) => {
  const explicit = String(deepLink || "").trim();
  if (explicit) return explicit;
  const entity = String(relatedEntity || "").trim().toUpperCase();
  const id = String(relatedEntityId || order || "").trim();
  if (!id) return "/notifications";
  if (["ORDER", "DELIVERY_ASSIGNMENT", "DELIVERY", "ORDER_STATUS"].includes(entity)) {
    return `/orders/${encodeURIComponent(id)}`;
  }
  return "/notifications";
};

const getPushChannelId = (relatedEntity: any, type: any) => {
  const entity = String(relatedEntity || "").toUpperCase();
  const text = `${entity} ${String(type || "")}`.toLowerCase();
  if (entity.includes("DELIVERY") || entity.includes("ASSIGNMENT") || text.includes("delivery")) return "delivery";
  if (entity.includes("REFUND") || text.includes("refund")) return "refunds";
  if (entity.includes("SUPPORT") || text.includes("support")) return "support";
  if (entity.includes("CHAT") || text.includes("chat")) return "chat";
  if (entity.includes("FINANCE") || entity.includes("PAYOUT") || text.includes("finance") || text.includes("payout")) return "finance";
  if (text.includes("payment")) return "payments";
  if (text.includes("security")) return "security";
  if (entity.includes("ORDER") || text.includes("order")) return "orders";
  return "system";
};

const sendPushToUsers = async ({ users, title, message, type = "info", relatedEntity = "ORDER", relatedEntityId = "", order, deepLink }: any) => {
  try {
    if (!firebaseMessaging) return;
    const userIds = Array.from(new Set((Array.isArray(users) ? users : [users]).map((x:any) => String(x || "")).filter(Boolean)));
    if (!userIds.length) return;
    const rows:any[] = await User.find({ _id: { $in: userIds }, blocked: { $ne: true } }).select("pushTokens").lean();
    const tokenOwners = rows.flatMap((u:any) => (Array.isArray(u.pushTokens) ? u.pushTokens : []).map((p:any) => ({ owner: String(u._id), token: String(p?.token || "") }))).filter((x:any) => x.token);
    const tokens = Array.from(new Set(tokenOwners.map((x:any) => x.token)));
    if (!tokens.length) return;
    const target = buildNotificationDeepLink({ relatedEntity, relatedEntityId, order, deepLink });
    const response = await firebaseMessaging.sendEachForMulticast({
      tokens,
      notification: { title: String(title || "FreshBasket"), body: String(message || "") },
      data: {
        type: String(type || "info"),
        relatedEntity: String(relatedEntity || ""),
        relatedEntityId: String(relatedEntityId || order || ""),
        deepLink: target,
      },
      android: {
        priority: "high",
        notification: { sound: "default", channelId: getPushChannelId(relatedEntity, type) },
      },
    });
    const invalidTokens = response.responses.map((r:any, i:number) => (!r.success ? tokens[i] : "")).filter(Boolean);
    if (invalidTokens.length) {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $pull: { pushTokens: { token: { $in: invalidTokens } } } }
      );
    }
  } catch (error) {
    console.error("FCM PUSH ERROR:", error);
  }
};

const recentNotificationEventKeys = new Map<string, number>();
const claimNotificationEvent = (key: string, ttlMs = 60_000) => {
  const now = Date.now();
  for (const [storedKey, expiresAt] of recentNotificationEventKeys) {
    if (expiresAt <= now) recentNotificationEventKeys.delete(storedKey);
  }
  const existing = recentNotificationEventKeys.get(key);
  if (existing && existing > now) return false;
  recentNotificationEventKeys.set(key, now + ttlMs);
  return true;
};

const notifyUser = async ({ user, title, message, type = "info", order, relatedEntity = "ORDER", relatedEntityId, deepLink }: { user: any; title: string; message: string; type?: string; order?: any; relatedEntity?: string; relatedEntityId?: any; deepLink?: string }) => {
  try {
    if (!user) return;
    const eventKey = [String(user), String(relatedEntity || ""), String(relatedEntityId || order || ""), String(title || ""), String(message || "")].join("|");
    if (!claimNotificationEvent(eventKey)) return;
    const recipient = await User.findById(user).select("role").lean();
    const resolvedDeepLink = buildNotificationDeepLink({ relatedEntity, relatedEntityId, order, deepLink });
    await Notification.create({ user, title, message, type, ...(order ? { order } : {}), relatedEntity, relatedEntityId: String(relatedEntityId || order || ""), recipientRole: String((recipient as any)?.role || ""), deepLink: resolvedDeepLink });
    await sendPushToUsers({ users: [user], title, message, type, relatedEntity, relatedEntityId, order, deepLink: resolvedDeepLink });
  } catch (error) {
    console.error("NOTIFICATION CREATE ERROR:", error);
  }
};

const notifyAdmins = async ({ title, message, type = "info", order, storeAdmin, relatedEntity = "ORDER", relatedEntityId, deepLink }: { title: string; message: string; type?: string; order?: any; storeAdmin?: any; relatedEntity?: string; relatedEntityId?: any; deepLink?: string }) => {
  try {
    const admins = await User.find({
      role: "admin",
      blocked: { $ne: true },
      ...(storeAdmin ? { $or: [{ _id: storeAdmin }, { storeAdmin: storeAdmin }] } : {}),
    }).select("_id").lean();
    if (!admins.length) return;
    const resolvedDeepLink = buildNotificationDeepLink({ relatedEntity, relatedEntityId, order, deepLink });
    const eligibleAdmins = admins.filter((admin: any) => claimNotificationEvent([String(admin._id), String(relatedEntity || ""), String(relatedEntityId || order || ""), String(title || ""), String(message || "")].join("|")));
    if (!eligibleAdmins.length) return;
    await Notification.insertMany(eligibleAdmins.map((admin: any) => ({ user: admin._id, title, message, type, ...(order ? { order } : {}), relatedEntity, relatedEntityId: String(relatedEntityId || order || ""), recipientRole: "admin", deepLink: resolvedDeepLink })));
    await sendPushToUsers({ users: eligibleAdmins.map((x:any) => x._id), title, message, type, relatedEntity, relatedEntityId, order, deepLink: resolvedDeepLink });
  } catch (error) {
    console.error("ADMIN NOTIFICATION ERROR:", error);
  }
};

const notifyFinanceUsers = async ({ title, message, type = "finance", order, relatedEntity = "ORDER", relatedEntityId, deepLink }: { title:string; message:string; type?:string; order?:any; relatedEntity?:string; relatedEntityId?:any; deepLink?:string }) => {
  try {
    const users:any[]=await User.find({role:{ $in:["finance_manager","finance_executive"] },blocked:{$ne:true}}).select("_id").lean();
    if(users.length) {
      const resolvedDeepLink = buildNotificationDeepLink({ relatedEntity, relatedEntityId, order, deepLink });
      await Notification.insertMany(users.map(u=>({user:u._id,title,message,type,...(order?{order}:{}),relatedEntity,relatedEntityId:String(relatedEntityId||order||""),recipientRole:String(u.role||""),deepLink:resolvedDeepLink})));
      await sendPushToUsers({ users: users.map((x:any) => x._id), title, message, type, relatedEntity, relatedEntityId, order, deepLink: resolvedDeepLink });
    }
  } catch(error){ console.error("FINANCE NOTIFICATION ERROR:",error); }
};

const notifyCustomerCareUsers = async ({ title, message, type = "support_ticket", order, relatedEntity = "ORDER", relatedEntityId, deepLink }: { title:string; message:string; type?:string; order?:any; relatedEntity?:string; relatedEntityId?:any; deepLink?:string }) => {
  try {
    const users:any[] = await User.find({ role:"customer_care", blocked:{$ne:true} }).select("_id role").lean();
    if(users.length) {
      const resolvedDeepLink = buildNotificationDeepLink({ relatedEntity, relatedEntityId, order, deepLink });
      await Notification.insertMany(users.map(u=>({ user:u._id, title, message, type, ...(order?{order}:{}), relatedEntity, relatedEntityId:String(relatedEntityId||order||""), recipientRole:"customer_care", deepLink:resolvedDeepLink })));
      await sendPushToUsers({ users: users.map((x:any) => x._id), title, message, type, relatedEntity, relatedEntityId, order, deepLink: resolvedDeepLink });
    }
  } catch(error) { console.error("CUSTOMER CARE NOTIFICATION ERROR:", error); }
};

/* =========================================================
   SECURITY ALERTS — POINT 41
========================================================= */
(AuditLog as any).schema.add({
  securityAlert: { type: Boolean, default: false, index: true },
  securityEvent: { type: String, default: "", index: true },
  securitySeverity: { type: String, default: "MEDIUM", index: true },
  securityFingerprint: { type: String, default: "", index: true },
});

const recordSecurityAlert = async ({
  req,
  event,
  severity = "MEDIUM",
  title,
  message,
  targetType = "SECURITY",
  targetId = "",
  actor = null,
  metadata = {},
  fingerprint = "",
}: any) => {
  try {
    const cleanEvent = String(event || "UNKNOWN").slice(0, 80);
    const cleanSeverity = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(severity).toUpperCase()) ? String(severity).toUpperCase() : "MEDIUM";
    const fp = String(fingerprint || `${cleanEvent}:${String(actor || req?.user?.id || "system")}:${String(targetId || "")}`).slice(0, 180);
    const duplicateWindow = new Date(Date.now() - 15 * 60 * 1000);
    const duplicate = await AuditLog.findOne({ securityAlert: true, securityFingerprint: fp, createdAt: { $gte: duplicateWindow } }).select("_id").lean();
    if (duplicate) return null;
    const alert:any = await AuditLog.create({
      actor: actor || req?.user?.id || null,
      actorRole: String(req?.user?.role || "system"),
      action: `SECURITY_${cleanEvent}`,
      targetType,
      targetId: String(targetId || ""),
      metadata: { ...metadata, title: String(title || "Security alert").slice(0, 160), message: String(message || "").slice(0, 1000) },
      securityAlert: true,
      securityEvent: cleanEvent,
      securitySeverity: cleanSeverity,
      securityFingerprint: fp,
    });
    await notifyAdmins({ title: String(title || "Security alert").slice(0, 120), message: String(message || "Security event detected.").slice(0, 500), type: "security_alert", relatedEntity: "SECURITY_ALERT", relatedEntityId: alert._id });
    return alert;
  } catch (e) {
    console.error("SECURITY ALERT ERROR:", e);
    return null;
  }
};

const inspectSecurityThresholds = async ({ req, event, actorId, targetId = "", metadata = {} }: any) => {
  try {
    const actor = actorId ? String(actorId) : "";
    const since15 = new Date(Date.now() - 15 * 60 * 1000);
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (event === "FAILED_LOGIN" && actor) {
      const count = await AuditLog.countDocuments({ securityEvent: "FAILED_LOGIN", targetId: actor, createdAt: { $gte: since15 } });
      if (count >= 5) await recordSecurityAlert({ req, event, severity: "HIGH", title: "Repeated failed login attempts", message: `${count} failed login attempts were recorded for the account in the last 15 minutes.`, actor, targetId: actor, metadata: { ...metadata, count }, fingerprint: `FAILED_LOGIN:${actor}:${Math.floor(Date.now() / (15*60*1000))}` });
    }
    if (event === "PAYMENT_ATTEMPT" && actor) {
      const count = await AuditLog.countDocuments({ securityEvent: "PAYMENT_ATTEMPT", actor: actor, createdAt: { $gte: since15 } });
      if (count >= 5) await recordSecurityAlert({ req, event, severity: "HIGH", title: "Rapid payment attempts", message: `${count} payment session attempts were recorded for the account in the last 15 minutes.`, targetId, metadata: { ...metadata, count }, fingerprint: `PAYMENT_ATTEMPT:${actor}:${Math.floor(Date.now() / (15*60*1000))}` });
    }
    if (event === "REFUND_ACTIVITY" && actor) {
      const count = await RefundRequest.countDocuments({ customer: actor, createdAt: { $gte: since24 } });
      if (count >= 3) await recordSecurityAlert({ req, event, severity: "MEDIUM", title: "Unusual refund activity", message: `${count} refund requests were created by the account in the last 24 hours.`, targetId, metadata: { ...metadata, count }, fingerprint: `REFUND_ACTIVITY:${actor}:${new Date().toISOString().slice(0,10)}` });
    }
    if (event === "REPLACEMENT_ACTIVITY" && actor) {
      const count = await ReplacementRequest.countDocuments({ customer: actor, createdAt: { $gte: since24 } });
      if (count >= 3) await recordSecurityAlert({ req, event, severity: "MEDIUM", title: "Unusual replacement activity", message: `${count} replacement requests were created by the account in the last 24 hours.`, targetId, metadata: { ...metadata, count }, fingerprint: `REPLACEMENT_ACTIVITY:${actor}:${new Date().toISOString().slice(0,10)}` });
    }
    if (event === "ACCOUNT_CHANGE" && actor) {
      const count = await AuditLog.countDocuments({ actor, action: { $regex: "ACCOUNT|PASSWORD|PROFILE", $options: "i" }, createdAt: { $gte: since15 } });
      if (count >= 6) await recordSecurityAlert({ req, event, severity: "MEDIUM", title: "Repeated account changes", message: `${count} account/profile/security changes were recorded in the last 15 minutes.`, targetId, metadata: { ...metadata, count }, fingerprint: `ACCOUNT_CHANGE:${actor}:${Math.floor(Date.now() / (15*60*1000))}` });
    }
    if (event === "PERMISSION_CHANGE" && actor) {
      const count = await AuditLog.countDocuments({ actor, action: { $regex: "PERMISSION", $options: "i" }, createdAt: { $gte: since24 } });
      if (count >= 3) await recordSecurityAlert({ req, event, severity: "HIGH", title: "Repeated permission changes", message: `${count} permission changes were recorded for the actor in the last 24 hours.`, targetId, metadata: { ...metadata, count }, fingerprint: `PERMISSION_CHANGE:${actor}:${new Date().toISOString().slice(0,10)}` });
    }
  } catch (e) { console.error("SECURITY THRESHOLD ERROR:", e); }
};

app.get("/api/admin/security-alerts", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const severity = String(req.query.severity || "").toUpperCase();
    const filter:any = { securityAlert: true };
    if (["LOW","MEDIUM","HIGH","CRITICAL"].includes(severity)) filter.securitySeverity = severity;
    const rows = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).populate("actor", "name email role employeeId customerId").lean();
    return res.json({ success: true, data: rows });
  } catch (e) { return res.status(500).json({ success:false, message:"Unable to load security alerts" }); }
});




/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (_, res) => {
  res.json({
    success: true,
    message: "FreshBasket API is running",
  });
});

/* =========================================================
   AUTH
========================================================= */



const parseClient = (ua: string) => {
  const raw = String(ua || "");
  const deviceType = /mobile|android|iphone|ipad/i.test(raw) ? "Mobile" : /tablet|ipad/i.test(raw) ? "Tablet" : "Desktop";
  const browser = /edg\//i.test(raw) ? "Edge" : /chrome\//i.test(raw) ? "Chrome" : /firefox\//i.test(raw) ? "Firefox" : /safari\//i.test(raw) && !/chrome\//i.test(raw) ? "Safari" : /opr\//i.test(raw) ? "Opera" : "Other";
  const operatingSystem = /windows/i.test(raw) ? "Windows" : /android/i.test(raw) ? "Android" : /iphone|ipad|ios/i.test(raw) ? "iOS" : /mac os/i.test(raw) ? "macOS" : /linux/i.test(raw) ? "Linux" : "Other";
  return { deviceType, browser, operatingSystem };
};

const createLoginHistory = async (user: any, req: any) => {
  const loginHistoryId = `FB-LOGIN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const client = parseClient(req.headers?.["user-agent"] || "");
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const ipAddress = forwarded || String(req.ip || "").replace(/^::ffff:/, "");
  const loginAt = new Date();
  const doc: any = await LoginHistory.create({ loginHistoryId, userId: user._id, userType: user.role === "customer" ? "CUSTOMER" : "EMPLOYEE", role: user.role, employeeId: user.employeeId || "", customerId: user.customerId || "", loginAt, status: "ACTIVE", ...client, ipAddress });
  // Keep the existing LoginHistory schema intact while recording the last activity
  // timestamp for Point 40 session visibility. This is metadata already generated
  // by the authenticated session and does not contain passwords or tokens.
  await LoginHistory.collection.updateOne({ _id: doc._id }, { $set: { lastActivityAt: loginAt } });
  await User.collection.updateOne({ _id: user._id }, { $set: { lastActivityAt: loginAt } });
  return String(doc.loginHistoryId);
};

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: "A valid 10-digit mobile number is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customerId = await nextUserIdentifier("customer");
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      role: "customer",
      customerId,
      blocked: false,
    });
    await User.collection.updateOne({ _id: user._id }, { $set: { emailVerified: true, phoneVerified: true } });
    await recordCustomerCareAudit({ req: { user: { id: user._id, role: "customer" } } as AuthRequest, action: "CUSTOMER_CREATED", targetType: "CUSTOMER", targetId: user._id, customer: user._id, metadata: { customerId } });
    const loginHistoryId = await createLoginHistory(user, req);

    return res.status(201).json({
      success: true,
      data: {
        token: sign(user),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          emailVerified: true,
          phoneVerified: true,
          language: (user as any).language || "en",
        },
        loginHistoryId,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");
    const requestedRole = String(req.body.role || "").trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ $or: [{ email }, { username: email }] });

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      if (user?._id) {
        await AuditLog.create({ actor: user._id, actorRole: String(user.role || ""), action: "SECURITY_FAILED_LOGIN_EVENT", targetType: "SECURITY", targetId: String(user._id), metadata: { email: String(email).slice(0,160) }, securityAlert: false, securityEvent: "FAILED_LOGIN" });
        await inspectSecurityThresholds({ req, event: "FAILED_LOGIN", actorId: user._id, metadata: { email: String(email).slice(0,160) } });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (requestedRole && !["customer", "admin", "delivery", "customer_care", "finance_manager", "finance_executive"].includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid login role",
      });
    }

    if (requestedRole && user.role !== requestedRole) {
      return res.status(403).json({
        success: false,
        message: `These credentials are not registered as ${requestedRole}` ,
      });
    }

    if (user.blocked) {
      return res.status(403).json({
        success: false,
        message: "Account blocked",
      });
    }

    if (["customer_care", "finance_manager", "finance_executive"].includes(user.role)) {
      await User.collection.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
      (user as any).lastLogin = new Date();
    }
    const loginHistoryId = await createLoginHistory(user, req);

    return res.json({
      success: true,
      data: {
        token: sign(user),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          ...(user.role === "customer" ? { customerId: (user as any).customerId || "" } : {}),
          ...(!["customer"].includes(user.role) ? { employeeId: (user as any).employeeId || "" } : {}),
          emailVerified: Boolean((user as any).emailVerified),
          phoneVerified: Boolean((user as any).phoneVerified),
          language: (user as any).language || "en",
          isMainAdmin: String(user.email || "").toLowerCase() === MAIN_ADMIN_EMAIL,
          ...(user.role === "customer_care" || FINANCE_ROLES.includes(user.role as any) ? { employeeId: (user as any).employeeId || "", username: (user as any).username || "", department: (user as any).department || "", profilePhoto: (user as any).profilePhoto || "", permissions: Array.isArray((user as any).permissions) ? (user as any).permissions : [], forcePasswordChange: Boolean((user as any).forcePasswordChange) } : {}),
        },
        loginHistoryId,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

app.get(
  "/api/auth/me",
  auth,
  async (req: AuthRequest, res) => {
    try {
      const user = await User.findById(req.user!.id).select(
        "-password"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        data: { ...user.toObject(), emailVerified: Boolean((user as any).emailVerified), phoneVerified: Boolean((user as any).phoneVerified), isMainAdmin: String((user as any).email || "").toLowerCase() === MAIN_ADMIN_EMAIL },
      });
    } catch (error) {
      console.error("ME ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load profile",
      });
    }
  }
);

/* =========================================================
   LOGIN HISTORY + PUBLIC CONTENT
========================================================= */

app.post("/api/auth/logout", auth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.body.loginHistoryId || "").trim();
    if (id) {
      const session: any = await LoginHistory.findOne({ loginHistoryId: id, userId: req.user!.id });
      if (session && session.status === "ACTIVE") {
        const logoutAt = new Date();
        session.logoutAt = logoutAt;
        session.sessionDuration = Math.max(0, logoutAt.getTime() - new Date(session.loginAt).getTime());
        session.status = "COMPLETED";
        await session.save();
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("LOGOUT HISTORY ERROR:", error);
    return res.json({ success: true });
  }
});

app.get("/api/login-history", auth, async (req: AuthRequest, res) => {
  try {
    const mainUser: any = await User.findById(req.user!.id).select("email").lean();
    const main = req.user?.role === "admin" && String(mainUser?.email || "").toLowerCase() === MAIN_ADMIN_EMAIL;
    const all = String(req.query.all || "") === "1";
    const filter: any = main && all ? {} : { userId: req.user!.id };
    const rows = await LoginHistory.find(filter).sort({ loginAt: -1 }).limit(500).populate("userId", "name email role employeeId customerId").lean();
    return res.json({ success: true, data: rows, organizationWide: Boolean(main && all) });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to load login history" }); }
});

/* =========================================================
   SESSION / DEVICE MANAGEMENT — POINT 40
========================================================= */
app.get("/api/session-management", auth, async (req: AuthRequest, res) => {
  try {
    const currentId = String(req.headers["x-login-history-id"] || "").trim();
    const rows: any[] = await LoginHistory.find({ userId: req.user!.id, status: "ACTIVE" })
      .sort({ loginAt: -1 }).limit(20).lean();
    const maskedIp = (value: any) => {
      const raw = String(value || "").trim();
      if (!raw) return "Not recorded";
      if (raw.includes(".")) { const p = raw.split("."); return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.***` : "Recorded"; }
      if (raw.includes(":")) return raw.split(":").slice(0, 2).join(":") + ":…";
      return "Recorded";
    };
    return res.json({
      success: true,
      data: rows.map((x:any) => ({
        loginHistoryId: x.loginHistoryId,
        loginAt: x.loginAt || null,
        lastActivityAt: x.lastActivityAt || x.loginAt || null,
        status: x.status || "ACTIVE",
        deviceType: x.deviceType || "Unknown",
        browser: x.browser || "Unknown",
        operatingSystem: x.operatingSystem || "Unknown",
        network: maskedIp(x.ipAddress),
        isCurrent: Boolean(currentId && String(x.loginHistoryId) === currentId),
      })),
      remoteLogoutSupported: false,
      remoteLogoutReason: "The current authentication architecture uses stateless 7-day JWTs without a server-side session revocation check. Remote logout is therefore not enabled to avoid presenting a security control that cannot safely terminate the other token.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load active sessions" });
  }
});

app.post("/api/session-management/heartbeat", auth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.body.loginHistoryId || req.headers["x-login-history-id"] || "").trim();
    if (!id) return res.status(400).json({ success: false, message: "Login session ID is required" });
    const now = new Date();
    const updated = await LoginHistory.collection.updateOne({ loginHistoryId: id, userId: new mongoose.Types.ObjectId(req.user!.id), status: "ACTIVE" }, { $set: { lastActivityAt: now } });
    if (!updated.matchedCount) return res.status(404).json({ success: false, message: "Active login session not found" });
    await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(req.user!.id) }, { $set: { lastActivityAt: now } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to update session activity" });
  }
});

app.patch("/api/preferences/language", auth, async (req: AuthRequest, res) => {
  try {
    if (!["customer", "delivery"].includes(String(req.user?.role))) return res.status(403).json({ success: false, message: "Language preference is not available for this role" });
    const language = String(req.body.language || "en");
    if (!["en", "hi", "hinglish"].includes(language)) return res.status(400).json({ success: false, message: "Invalid language" });
    await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(req.user!.id) }, { $set: { language } });
    return res.json({ success: true, language });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to save language preference" }); }
});

app.get("/api/public/login-notices", async (_req, res) => {
  try {
    const now = new Date();
    const rows = await LoginNotice.find({ isActive: true, startAt: { $lte: now }, $or: [{ endAt: null }, { endAt: { $gte: now } }] }).sort({ priority: -1, startAt: -1 }).limit(10).lean();
    return res.json({ success: true, data: rows });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to load login notices" }); }
});

app.get("/api/admin/login-notices", auth, mainAdminOnly, async (_req, res) => {
  try { return res.json({ success: true, data: await LoginNotice.find().sort({ priority: -1, createdAt: -1 }).limit(500).lean() }); }
  catch { return res.status(500).json({ success: false, message: "Unable to load login notices" }); }
});

app.post("/api/admin/login-notices", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const title=String(req.body.title||"").trim(), shortDescription=String(req.body.shortDescription||"").trim(), description=String(req.body.description||"").trim();
    const image=String(req.body.image||"").trim(), imageUrl=String(req.body.imageUrl||"").trim();
    const startAt=new Date(req.body.startAt||Date.now()), endAt=req.body.endAt?new Date(req.body.endAt):null;
    if(title.length<2) return res.status(400).json({success:false,message:"Notice title is required"});
    if(!Number.isFinite(startAt.getTime()) || (endAt && !Number.isFinite(endAt.getTime())) || (endAt && endAt<=startAt)) return res.status(400).json({success:false,message:"Invalid notice dates"});
    if(image && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image) && !/^https?:\/\//i.test(image)) return res.status(400).json({success:false,message:"Notice image must be an image URL or data image"});
    const row=await LoginNotice.create({type:String(req.body.type||"GENERAL_NOTICE").trim(),title,shortDescription,description,image,imageUrl,ctaText:String(req.body.ctaText||"").trim(),ctaLink:String(req.body.ctaLink||"").trim(),startAt,endAt,priority:Number(req.body.priority||0),isActive:req.body.isActive!==false,createdBy:req.user!.id,updatedBy:req.user!.id});
    return res.status(201).json({success:true,data:row});
  } catch(e){return res.status(400).json({success:false,message:"Unable to create notice"});}
});

app.patch("/api/admin/login-notices/:id", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try { if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Notice not found"}); const row:any=await LoginNotice.findById(req.params.id); if(!row)return res.status(404).json({success:false,message:"Notice not found"}); const allowed=["type","title","shortDescription","description","image","imageUrl","ctaText","ctaLink","priority","isActive"]; for(const k of allowed) if(req.body[k]!==undefined) row[k]=req.body[k]; if(req.body.startAt!==undefined)row.startAt=new Date(req.body.startAt); if(req.body.endAt!==undefined)row.endAt=req.body.endAt?new Date(req.body.endAt):null; if(row.endAt&&row.endAt<=row.startAt)return res.status(400).json({success:false,message:"End date must be after start date"}); row.updatedBy=req.user!.id; await row.save(); return res.json({success:true,data:row}); } catch(e){return res.status(400).json({success:false,message:"Unable to update notice"});}
});

app.delete("/api/admin/login-notices/:id", auth, mainAdminOnly, async (req, res) => { try { await LoginNotice.findByIdAndDelete(req.params.id); return res.json({success:true}); } catch { return res.status(500).json({success:false,message:"Unable to archive notice"}); } });

app.get("/api/public/contact", async (_req,res)=>{try{const d:any=await PublicContactSetting.findOne({key:"default"}).lean();return res.json({success:true,data:d||{businessName:"FreshBasket",contactName:"",phone:"",whatsapp:"",email:"",address:"",workingHours:"",storeOnboardingContact:"",deliveryHiringContact:"",customerSupportContact:""}});}catch{return res.status(500).json({success:false,message:"Unable to load public contact"});}});
app.get("/api/admin/public-contact", auth, mainAdminOnly, async (_req,res)=>{try{const d:any=await PublicContactSetting.findOne({key:"default"}).lean();return res.json({success:true,data:d||{key:"default",businessName:"FreshBasket"}});}catch{return res.status(500).json({success:false,message:"Unable to load public contact"});}});
app.put("/api/admin/public-contact", auth, mainAdminOnly, async (req:AuthRequest,res)=>{try{const fields=["businessName","contactName","phone","whatsapp","email","address","workingHours","storeOnboardingContact","deliveryHiringContact","customerSupportContact"];const patch:any={key:"default",updatedBy:req.user!.id};for(const k of fields)if(req.body[k]!==undefined)patch[k]=String(req.body[k]||"").trim();if(patch.email&&!/^\S+@\S+\.\S+$/.test(patch.email))return res.status(400).json({success:false,message:"Invalid public email"});const previous:any=await PublicContactSetting.findOne({key:"default"}).lean();const d=await PublicContactSetting.findOneAndUpdate({key:"default"},{$set:patch},{upsert:true,new:true,setDefaultsOnInsert:true});await recordEntityChange({req,action:"PUBLIC_CONTACT_CONFIGURATION_CHANGED",targetType:"CONFIGURATION",targetId:"public-contact",before:{businessName:previous?.businessName||"",contactName:previous?.contactName||"",phone:previous?.phone||"",whatsapp:previous?.whatsapp||"",email:previous?.email||"",address:previous?.address||"",workingHours:previous?.workingHours||"",storeOnboardingContact:previous?.storeOnboardingContact||"",deliveryHiringContact:previous?.deliveryHiringContact||"",customerSupportContact:previous?.customerSupportContact||""},after:{businessName:d.businessName||"",contactName:d.contactName||"",phone:d.phone||"",whatsapp:d.whatsapp||"",email:d.email||"",address:d.address||"",workingHours:d.workingHours||"",storeOnboardingContact:d.storeOnboardingContact||"",deliveryHiringContact:d.deliveryHiringContact||"",customerSupportContact:d.customerSupportContact||""},reason:req.body?.reason||"Public contact configuration updated"});return res.json({success:true,data:d});}catch{return res.status(400).json({success:false,message:"Unable to save public contact"});}});

/* =========================================================
   ADMIN SETTINGS + SECURITY
========================================================= */

app.patch("/api/admin/settings/profile", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").replace(/\D/g, "");

    if (name.length < 2) {
      return res.status(400).json({ success: false, message: "Please enter your full name" });
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number" });
    }

    const user: any = await User.findById(req.user!.id);
    if (!user || user.role !== "admin") {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    const latitude = req.body.latitude === undefined || req.body.latitude === "" || req.body.latitude === null ? null : Number(req.body.latitude);
    const longitude = req.body.longitude === undefined || req.body.longitude === "" || req.body.longitude === null ? null : Number(req.body.longitude);
    const locationAccuracy = req.body.locationAccuracy === undefined || req.body.locationAccuracy === "" || req.body.locationAccuracy === null ? null : Number(req.body.locationAccuracy);
    const profilePhoto = req.body.profilePhoto === undefined && req.body.photo === undefined ? undefined : String(req.body.profilePhoto ?? req.body.photo ?? "").trim();
    if (latitude !== null || longitude !== null) {
      if (!isValidGeo(latitude, longitude)) return res.status(400).json({success:false,message:"Enter valid admin latitude and longitude"});
    }
    if (locationAccuracy !== null && (!Number.isFinite(locationAccuracy) || locationAccuracy < 0)) return res.status(400).json({success:false,message:"Invalid location accuracy"});
    if (profilePhoto !== undefined && profilePhoto && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(profilePhoto) && !/^https?:\/\//i.test(profilePhoto)) return res.status(400).json({success:false,message:"Profile photo must be an image URL or data image"});
    const update:any = { name, phone: phone || "" };
    if (latitude !== null) update.latitude = latitude;
    if (longitude !== null) update.longitude = longitude;
    if (locationAccuracy !== null) update.locationAccuracy = locationAccuracy;
    if (profilePhoto !== undefined) update.profilePhoto = profilePhoto;
    if (latitude !== null && longitude !== null) update.locationUpdatedAt = new Date();
    await User.collection.updateOne({ _id: user._id }, { $set: update });

    const updated: any = await User.findById(user._id).select("-password").lean();
    return res.json({ success: true, message: "Admin profile updated successfully", data: updated });
  } catch (error) {
    console.error("ADMIN PROFILE UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update admin profile" });
  }
});

app.patch("/api/admin/settings/password", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from current password" });
    }

    const user: any = await User.findById(req.user!.id);
    if (!user || user.role !== "admin") {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    return res.json({ success: true, message: "Password changed successfully. Please sign in again on other devices." });
  } catch (error) {
    console.error("ADMIN PASSWORD CHANGE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to change password" });
  }
});

/* =========================================================
   CUSTOMER PROFILE + ADDRESSES
========================================================= */

app.patch("/api/profile", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const requestedPhone = req.body.phone === undefined ? "" : String(req.body.phone || "").replace(/\D/g, "");

    if (name.length < 2) {
      return res.status(400).json({ success: false, message: "Please enter your full name" });
    }

    const existing: any = await User.findById(req.user!.id).select("-password");
    if (!existing) return res.status(404).json({ success: false, message: "User not found" });

    if (requestedPhone && requestedPhone !== String(existing.phone || "")) {
      return res.status(400).json({ success: false, message: "Mobile number changes can be updated after authenticated account access" });
    }

    await User.collection.updateOne(
      { _id: existing._id },
      { $set: { name } }
    );

    const updated: any = await User.findById(existing._id).select("-password").lean();
    return res.json({ success: true, message: "Profile updated successfully", data: updated });
  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update profile" });
  }
});

app.patch("/api/profile/photo", auth, async (req:AuthRequest,res)=>{
  try{
    const photo=String(req.body.profilePhoto ?? req.body.photo ?? "").trim();
    if(photo && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photo) && !/^https?:\/\//i.test(photo))return res.status(400).json({success:false,message:"Profile photo must be an image URL or data image"});
    if(photo.length>1000000)return res.status(400).json({success:false,message:"Profile photo is too large"});
    const updated:any=await User.findByIdAndUpdate(req.user!.id,{$set:{profilePhoto:photo}},{new:true}).select("-password").lean();
    if(!updated)return res.status(404).json({success:false,message:"User not found"});
    return res.json({success:true,message:photo?"Profile photo updated successfully":"Profile photo removed successfully",data:updated});
  }catch{return res.status(500).json({success:false,message:"Unable to update profile photo"});}
});

app.patch("/api/profile/account", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = normalizePhone(req.body.phone);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number" });
    }

    const user: any = await User.findById(req.user!.id);
    if (!user || user.role !== "customer") {
      return res.status(404).json({ success: false, message: "Customer account not found" });
    }

    const existingEmail: any = await User.findOne({ email, _id: { $ne: user._id } }).select("_id").lean();
    if (existingEmail) {
      return res.status(409).json({ success: false, message: "This email is already registered" });
    }

    const existingPhone: any = await User.findOne({ phone, role: "customer", _id: { $ne: user._id } }).select("_id").lean();
    if (existingPhone) {
      return res.status(409).json({ success: false, message: "This mobile number is already registered" });
    }

    await User.collection.updateOne(
      { _id: user._id },
      { $set: { email, phone, emailVerified: true, phoneVerified: true } }
    );
    const updated: any = await User.findById(user._id).select("-password").lean();
    return res.json({ success: true, message: "Email and mobile number updated successfully", data: updated });
  } catch (error) {
    console.error("CUSTOMER ACCOUNT UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update email and mobile number" });
  }
});

app.patch("/api/profile/password", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from current password" });
    }

    const user: any = await User.findById(req.user!.id);
    if (!user || user.role !== "customer") {
      return res.status(404).json({ success: false, message: "Customer account not found" });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.collection.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

    return res.json({ success: true, message: "Password changed successfully. Please use the new password next time you sign in." });
  } catch (error) {
    console.error("CUSTOMER PASSWORD CHANGE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to change password" });
  }
});


app.get("/api/addresses", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const addresses = await Address.find({ user: req.user!.id }).sort({ isDefault: -1, createdAt: -1 }).lean();
    return res.json({ success: true, data: addresses });
  } catch (error) {
    console.error("ADDRESS LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load addresses" });
  }
});

app.post("/api/addresses", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const label = String(req.body.label || "Home").trim();
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").replace(/\D/g, "");
    const address = String(req.body.address || "").trim();
    const city = String(req.body.city || "").trim();
    const state = String(req.body.state || "").trim();
    const pincode = String(req.body.pincode || "").replace(/\D/g, "");
    const isDefault = Boolean(req.body.isDefault);

    const latitude =
      req.body.latitude !== undefined &&
      req.body.latitude !== null &&
      req.body.latitude !== ""
        ? Number(req.body.latitude)
        : null;

    const longitude =
      req.body.longitude !== undefined &&
      req.body.longitude !== null &&
      req.body.longitude !== ""
        ? Number(req.body.longitude)
        : null;

    if (label.length < 2) return res.status(400).json({ success: false, message: "Please enter an address label" });
    if (name.length < 2) return res.status(400).json({ success: false, message: "Please enter your full name" });
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number" });
    if (address.length < 5) return res.status(400).json({ success: false, message: "Please enter a complete address" });
    if (city.length < 2) return res.status(400).json({ success: false, message: "Please enter your city" });
    if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ success: false, message: "Please enter a valid 6-digit pincode" });

    if (
      latitude !== null &&
      (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    ) {
      return res.status(400).json({ success: false, message: "Invalid latitude" });
    }

    if (
      longitude !== null &&
      (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    ) {
      return res.status(400).json({ success: false, message: "Invalid longitude" });
    }

    const count = await Address.countDocuments({ user: req.user!.id });
    const makeDefault = isDefault || count === 0;
    if (makeDefault) await Address.updateMany({ user: req.user!.id }, { $set: { isDefault: false } });

    const created = await Address.create({
      user: req.user!.id,
      label,
      name,
      phone,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault: makeDefault,
    });
    return res.status(201).json({ success: true, message: "Address added successfully", data: created });
  } catch (error) {
    console.error("ADDRESS CREATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to add address" });
  }
});

app.put("/api/addresses/:id", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Address not found" });
    const addressDoc: any = await Address.findOne({ _id: req.params.id, user: req.user!.id });
    if (!addressDoc) return res.status(404).json({ success: false, message: "Address not found" });

    const label = String(req.body.label || "Home").trim();
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").replace(/\D/g, "");
    const address = String(req.body.address || "").trim();
    const city = String(req.body.city || "").trim();
    const state = String(req.body.state || "").trim();
    const pincode = String(req.body.pincode || "").replace(/\D/g, "");
    const isDefault = Boolean(req.body.isDefault);

    const latitude =
      req.body.latitude !== undefined &&
      req.body.latitude !== null &&
      req.body.latitude !== ""
        ? Number(req.body.latitude)
        : null;

    const longitude =
      req.body.longitude !== undefined &&
      req.body.longitude !== null &&
      req.body.longitude !== ""
        ? Number(req.body.longitude)
        : null;

    if (label.length < 2 || name.length < 2 || address.length < 5 || city.length < 2) return res.status(400).json({ success: false, message: "Please complete all address details" });
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number" });
    if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ success: false, message: "Please enter a valid 6-digit pincode" });

    if (
      latitude !== null &&
      (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    ) {
      return res.status(400).json({ success: false, message: "Invalid latitude" });
    }

    if (
      longitude !== null &&
      (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    ) {
      return res.status(400).json({ success: false, message: "Invalid longitude" });
    }

    if (isDefault) await Address.updateMany({ user: req.user!.id, _id: { $ne: addressDoc._id } }, { $set: { isDefault: false } });
    addressDoc.label = label;
    addressDoc.name = name;
    addressDoc.phone = phone;
    addressDoc.address = address;
    addressDoc.city = city;
    addressDoc.state = state;
    addressDoc.pincode = pincode;
    addressDoc.latitude = latitude;
    addressDoc.longitude = longitude;
    addressDoc.isDefault = isDefault;
    await addressDoc.save();
    return res.json({ success: true, message: "Address updated successfully", data: addressDoc });
  } catch (error) {
    console.error("ADDRESS UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update address" });
  }
});

app.delete("/api/addresses/:id", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Address not found" });
    const addressDoc: any = await Address.findOne({ _id: req.params.id, user: req.user!.id });
    if (!addressDoc) return res.status(404).json({ success: false, message: "Address not found" });
    await Address.deleteOne({ _id: addressDoc._id });
    if (addressDoc.isDefault) {
      const next = await Address.findOne({ user: req.user!.id }).sort({ createdAt: -1 });
      if (next) { next.isDefault = true; await next.save(); }
    }
    return res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("ADDRESS DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to delete address" });
  }
});

app.patch("/api/addresses/:id/default", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Address not found" });
    const addressDoc = await Address.findOne({ _id: req.params.id, user: req.user!.id });
    if (!addressDoc) return res.status(404).json({ success: false, message: "Address not found" });
    await Address.updateMany({ user: req.user!.id }, { $set: { isDefault: false } });
    addressDoc.isDefault = true;
    await addressDoc.save();
    return res.json({ success: true, message: "Default address updated", data: addressDoc });
  } catch (error) {
    console.error("DEFAULT ADDRESS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update default address" });
  }
});

/* =========================================================
   PUBLIC STORE DIRECTORY
========================================================= */

const normalizeStoreTime = (value: any) => {
  const text = String(value || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : "";
};

const normalizeStoreHours = (input: any) => {
  const weeklyOffRaw = Array.isArray(input?.weeklyOff) ? input.weeklyOff : [];
  const weeklyOff = [...new Set(weeklyOffRaw.map((x: any) => Number(x)).filter((x: number) => Number.isInteger(x) && x >= 0 && x <= 6))];
  const holidays = [...new Set((Array.isArray(input?.holidays) ? input.holidays : [])
    .map((x: any) => String(x || "").trim())
    .filter((x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x)))];
  return {
    openingTime: normalizeStoreTime(input?.openingTime),
    closingTime: normalizeStoreTime(input?.closingTime),
    breakStart: normalizeStoreTime(input?.breakStart),
    breakEnd: normalizeStoreTime(input?.breakEnd),
    weeklyOff,
    holidays,
    temporarilyClosed: input?.temporarilyClosed === true,
    temporaryClosureReason: String(input?.temporaryClosureReason || "").trim().slice(0, 240),
  };
};

const minutesFromTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const getStoreOperatingStatus = (hoursInput: any, now = new Date()) => {
  const hours = normalizeStoreHours(hoursInput);
  const configured = Boolean(hours.openingTime && hours.closingTime);
  if (!configured) return { configured: false, status: "NOT_CONFIGURED", label: "Hours not configured", message: "Store operating hours are not configured.", hours };
  if (hours.temporarilyClosed) return { configured: true, status: "CLOSED", label: "Closed", message: hours.temporaryClosureReason || "Temporarily closed", hours };

  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (type: string) => parts.find((p: any) => p.type === type)?.value || "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[get("weekday")];
  const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
  const currentMinutes = Number(get("hour")) * 60 + Number(get("minute"));

  if (hours.holidays.includes(dateKey)) return { configured: true, status: "CLOSED", label: "Closed", message: "Store is closed for a holiday.", hours };
  if (hours.weeklyOff.includes(weekday)) return { configured: true, status: "CLOSED", label: "Closed", message: "Store is closed today.", hours };

  const open = minutesFromTime(hours.openingTime);
  const close = minutesFromTime(hours.closingTime);
  const crossesMidnight = close <= open;
  const inOperatingWindow = crossesMidnight ? (currentMinutes >= open || currentMinutes < close) : (currentMinutes >= open && currentMinutes < close);
  const inBreak = hours.breakStart && hours.breakEnd
    ? (() => { const bs = minutesFromTime(hours.breakStart); const be = minutesFromTime(hours.breakEnd); return bs === be ? false : (be > bs ? currentMinutes >= bs && currentMinutes < be : currentMinutes >= bs || currentMinutes < be); })()
    : false;
  if (inOperatingWindow && !inBreak) return { configured: true, status: "OPEN", label: "Open", message: `Closes at ${hours.closingTime}`, hours };
  if (inBreak) return { configured: true, status: "BREAK", label: "Closed", message: `Break: ${hours.breakStart} – ${hours.breakEnd}`, hours };
  return { configured: true, status: "CLOSED", label: "Closed", message: currentMinutes < open ? `Opens at ${hours.openingTime}` : `Opens tomorrow at ${hours.openingTime}`, hours };
};

const getStoreLocationForOwner = async (owner: any) => {
  if (!owner) return null;
  const mainId = await getMainAdminId();
  const isMain = mainId && String(owner) === String(mainId);
  return StoreLocation.findOne(isMain
    ? { $or: [{ key: "main", storeAdmin: owner }, { key: "main", storeAdmin: null }, { key: "main", storeAdmin: { $exists: false } }] }
    : { key: String(owner), storeAdmin: owner }).lean();
};

const buildStoreDirectory = async () => {
  const [admins, mainId] = await Promise.all([
    User.find({ role: "admin", blocked: { $ne: true } })
      .select("_id name blocked createdAt storeImage storeCategory storeDescription")
      .sort({ createdAt: 1, name: 1 })
      .lean(),
    getMainAdminId(),
  ]);

  return Promise.all(admins.map(async (admin: any) => {
    const isMain = Boolean(mainId && String(admin._id) === String(mainId));
    const location: any = await StoreLocation.findOne(
      isMain
        ? { $or: [{ key: "main", storeAdmin: admin._id }, { key: "main", storeAdmin: null }, { key: "main", storeAdmin: { $exists: false } }] }
        : { key: String(admin._id), storeAdmin: admin._id }
    ).lean();

    const productFilter: any = isMain
      ? { $and: [{ isActive: true }, { $or: [{ storeAdmin: admin._id }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] }] }
      : { storeAdmin: admin._id, isActive: true };

    const [productCount, categoryCount, bannerCount] = await Promise.all([
      Product.countDocuments(productFilter),
      Category.countDocuments(isMain
        ? { $or: [{ storeAdmin: admin._id }, { storeAdmin: null }, { storeAdmin: { $exists: false } }], isActive: { $ne: false } }
        : { storeAdmin: admin._id, isActive: { $ne: false } }),
      Banner.countDocuments(isMain
        ? { $or: [{ storeAdmin: admin._id }, { storeAdmin: null }, { storeAdmin: { $exists: false } }], isActive: { $ne: false } }
        : { storeAdmin: admin._id, isActive: { $ne: false } }),
    ]);

    return {
      id: String(admin._id),
      name: location?.name || admin.name || "Local Store",
      address: location?.address || "",
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      productCount,
      categoryCount,
      bannerCount,
      image: location?.image || admin.storeImage || "",
      category: location?.category || admin.storeCategory || "Local Store",
      description: location?.description || admin.storeDescription || "",
      phone: location?.phone || "",
      email: location?.email || "",
      isMainStore: isMain,
      configured: Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude)),
      operatingHours: normalizeStoreHours(location?.operatingHours),
      operatingStatus: getStoreOperatingStatus(location?.operatingHours),
      newOrdersPaused: location?.newOrdersPaused === true,
      newOrdersPauseReason: String(location?.newOrdersPauseReason || ""),
    };
  }));
};

// Public discovery endpoint. It intentionally exposes only store/catalogue metadata,
// never admin email, phone, password, customer records, orders or private analytics.
app.get("/api/stores", async (_req, res) => {
  try {
    return res.json({ success: true, data: await buildStoreDirectory() });
  } catch (error) {
    console.error("PUBLIC STORES ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load stores" });
  }
});

// Logged-in customer store directory. The customer does not need a separate
// copy of every store in their User document; the directory is derived from
// active store-admin accounts, while orders preserve the actual store owner.
app.get("/api/customer/stores", auth, role("customer"), async (_req: AuthRequest, res) => {
  try {
    return res.json({ success: true, data: await buildStoreDirectory() });
  } catch (error) {
    console.error("CUSTOMER STORES ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load stores" });
  }
});

app.get("/api/customer/restock-alerts/:productId", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const productId = String(req.params.productId || "").trim();
    const variantId = String(req.query.variantId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ success: false, message: "Invalid product" });
    const alert: any = await RestockAlert.findOne({ customer: req.user!.id, product: productId, variantId, active: true }).select("_id").lean();
    return res.json({ success: true, subscribed: !!alert });
  } catch (error) {
    console.error("GET RESTOCK ALERT ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load stock alert" });
  }
});

app.post("/api/customer/restock-alerts", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const productId = String(req.body?.productId || "").trim();
    const variantId = String(req.body?.variantId || "").trim();
    const storeAdminId = String(req.body?.storeAdminId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ success: false, message: "Invalid product" });
    const product: any = await Product.findById(productId).select("_id name stock isActive storeAdmin variants").lean();
    if (!product || product.isActive === false) return res.status(404).json({ success: false, message: "Product is unavailable" });
    if (storeAdminId && String(product.storeAdmin || "") !== storeAdminId) return res.status(403).json({ success: false, message: "Product is not available in the selected store" });
    let currentStock = Number(product.stock || 0);
    if (variantId) {
      const variant = (Array.isArray(product.variants) ? product.variants : []).find((v:any) => String(v?._id || "") === variantId);
      if (!variant) return res.status(404).json({ success: false, message: "Variant not found" });
      currentStock = Number(variant.stock || 0);
    }
    if (currentStock > 0) return res.status(409).json({ success: false, message: "Product is already available" });
    const storeAdmin = mongoose.Types.ObjectId.isValid(storeAdminId) ? storeAdminId : (product.storeAdmin || null);
    const existing: any = await RestockAlert.findOne({ customer: req.user!.id, product: productId, storeAdmin, variantId, active: true }).select("_id").lean();
    if (existing) return res.json({ success: true, subscribed: true, message: "Stock alert is already enabled" });
    await RestockAlert.create({ customer: req.user!.id, product: productId, storeAdmin, variantId, active: true });
    return res.status(201).json({ success: true, subscribed: true, message: "We will notify you when this product is back in stock" });
  } catch (error:any) {
    if (Number(error?.code) === 11000) return res.json({ success: true, subscribed: true, message: "Stock alert is already enabled" });
    console.error("CREATE RESTOCK ALERT ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to enable stock alert" });
  }
});

app.get("/api/customer/wishlist", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const customer: any = await User.findById(req.user!.id).select("savedProducts").lean();
    const savedProductIds = Array.isArray(customer?.savedProducts) ? customer.savedProducts.map((id:any) => String(id)) : [];
    return res.json({ success: true, savedProductIds });
  } catch (error) {
    console.error("CUSTOMER WISHLIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load wishlist" });
  }
});

app.post("/api/customer/wishlist/sync", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const ids = Array.from(new Set((Array.isArray(req.body?.productIds) ? req.body.productIds : []).map((id:any) => String(id || "").trim()).filter((id:string) => mongoose.Types.ObjectId.isValid(id))));
    const existing = await Product.find({ _id: { $in: ids }, isActive: { $ne: false } }).select("_id").lean();
    const allowed = existing.map((p:any) => p._id);
    const updated: any = await User.findByIdAndUpdate(req.user!.id, { $set: { savedProducts: allowed } }, { new: true }).select("savedProducts").lean();
    return res.json({ success: true, savedProductIds: Array.isArray(updated?.savedProducts) ? updated.savedProducts.map((id:any) => String(id)) : [] });
  } catch (error) {
    console.error("CUSTOMER WISHLIST SYNC ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to sync wishlist" });
  }
});

app.patch("/api/customer/wishlist/:productId", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const productId = String(req.params.productId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ success: false, message: "Invalid product" });
    const product: any = await Product.findOne({ _id: productId, isActive: { $ne: false } }).select("_id").lean();
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const customer: any = await User.findById(req.user!.id).select("savedProducts").lean();
    const current = Array.isArray(customer?.savedProducts) ? customer.savedProducts.map((id:any) => String(id)) : [];
    const saved = current.includes(productId);
    const updated: any = await User.findByIdAndUpdate(req.user!.id, saved ? { $pull: { savedProducts: new mongoose.Types.ObjectId(productId) } } : { $addToSet: { savedProducts: new mongoose.Types.ObjectId(productId) } }, { new: true }).select("savedProducts").lean();
    return res.json({ success: true, saved: !saved, savedProductIds: Array.isArray(updated?.savedProducts) ? updated.savedProducts.map((id:any) => String(id)) : [] });
  } catch (error) {
    console.error("CUSTOMER WISHLIST UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update wishlist" });
  }
});

app.get("/api/customer/favorite-stores", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const customer: any = await User.findById(req.user!.id).select("favoriteStores").lean();
    const favoriteIds = Array.isArray(customer?.favoriteStores) ? customer.favoriteStores.map((id:any) => String(id)) : [];
    const stores = await buildStoreDirectory();
    const favoriteStores = stores.filter((st:any) => favoriteIds.includes(String(st.id)));
    return res.json({ success: true, data: favoriteStores, favoriteStoreIds: favoriteIds });
  } catch (error) {
    console.error("CUSTOMER FAVORITE STORES ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load favorite stores" });
  }
});

app.patch("/api/customer/favorite-stores/:storeId", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const storeId = String(req.params.storeId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(storeId)) return res.status(400).json({ success: false, message: "Invalid store" });
    const store = await User.findOne({ _id: storeId, role: "admin", blocked: { $ne: true } }).select("_id").lean();
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });
    const customer: any = await User.findById(req.user!.id).select("favoriteStores").lean();
    const current = Array.isArray(customer?.favoriteStores) ? customer.favoriteStores.map((id:any) => String(id)) : [];
    const isFavorite = current.includes(storeId);
    const update = isFavorite ? { $pull: { favoriteStores: new mongoose.Types.ObjectId(storeId) } } : { $addToSet: { favoriteStores: new mongoose.Types.ObjectId(storeId) } };
    const updated: any = await User.findByIdAndUpdate(req.user!.id, update, { new: true }).select("favoriteStores").lean();
    const favoriteStoreIds = Array.isArray(updated?.favoriteStores) ? updated.favoriteStores.map((id:any) => String(id)) : [];
    return res.json({ success: true, favorite: !isFavorite, favoriteStoreIds });
  } catch (error) {
    console.error("CUSTOMER FAVORITE STORE UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update favorite store" });
  }
});

// Main admin can see every store and its catalogue summary without entering
// another admin's workspace.
app.get("/api/admin/stores", auth, mainAdminOnly, async (_req, res) => {
  try {
    return res.json({ success: true, data: await buildStoreDirectory() });
  } catch (error) {
    console.error("ADMIN STORES ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load stores" });
  }
});

app.patch("/api/admin/stores/:id", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Store not found"});
    const admin:any = await User.findOne({_id:req.params.id,role:"admin",blocked:{$ne:true}});
    if (!admin) return res.status(404).json({success:false,message:"Store not found"});
    const updates:any={};
    for(const k of ["image","category","description","name","address","phone","email"]) if(req.body[k]!==undefined) updates[k]=String(req.body[k]||"").trim();
    if(updates.image && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(updates.image) && !/^https?:\/\//i.test(updates.image)) return res.status(400).json({success:false,message:"Store image must be an image URL or data image"});
    if(updates.email && !/^\S+@\S+\.\S+$/.test(updates.email)) return res.status(400).json({success:false,message:"Invalid store email"});
    if(updates.name!==undefined) await User.collection.updateOne({_id:admin._id},{$set:{storeImage:updates.image!==undefined?updates.image:admin.storeImage||"",storeCategory:updates.category!==undefined?updates.category:admin.storeCategory||"Local Store",storeDescription:updates.description!==undefined?updates.description:admin.storeDescription||""}});
    const locPatch:any={storeAdmin:admin._id,key:String(admin._id)};
    for(const k of ["image","category","description","name","address","phone","email"]) if(updates[k]!==undefined) locPatch[k]=updates[k];
    const saved=await StoreLocation.findOneAndUpdate({key:String(admin._id)},{$set:locPatch},{upsert:true,new:true,setDefaultsOnInsert:true});
    return res.json({success:true,data:saved});
  } catch(e){return res.status(400).json({success:false,message:"Unable to update store"});}
});

/* =========================================================
   BANNERS / OFFERS
========================================================= */

app.get("/api/banners", async (req, res) => {
  try {
    const now = new Date();
    const requestedStore = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const isMainStoreRequest = Boolean(
      requestedStore &&
      mainId &&
      String(requestedStore) === String(mainId)
    );
    const storeFilter: any = requestedStore && mongoose.Types.ObjectId.isValid(requestedStore)
      ? (isMainStoreRequest
          ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] }
          : { storeAdmin: requestedStore })
      : (mainId ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] } : { storeAdmin: null });
    const banners = await Banner.find({
      $and: [
        storeFilter,
        { isActive: true },
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
      ],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ success: true, data: banners });
  } catch (error) {
    console.error("BANNER LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load offers" });
  }
});

app.get("/api/admin/banners", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const banners = await Banner.find(await tenantFilter(req)).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ success: true, data: banners });
  } catch (error) {
    console.error("ADMIN BANNER LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load banners" });
  }
});

app.post("/api/admin/banners", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const subtitle = String(req.body.subtitle || "").trim();
    const offerLabel = String(req.body.offerLabel || "").trim();
    const image = String(req.body.image || "").trim();
    const buttonText = String(req.body.buttonText || "Shop now").trim();
    const link = String(req.body.link || "/shop").trim();
    const startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;
    const sortOrder = Number(req.body.sortOrder || 0);

    if (title.length < 2) return res.status(400).json({ success: false, message: "Banner title is required" });
    if (!image) return res.status(400).json({ success: false, message: "Banner image is required" });
    if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
      return res.status(400).json({ success: false, message: "Invalid banner dates" });
    }
    if (startDate && endDate && endDate <= startDate) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    const banner = await Banner.create({
      title, subtitle, offerLabel, image, buttonText, link,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: req.body.isActive !== false,
      storeAdmin: await getTenantAdminId(req),
    });

    return res.status(201).json({ success: true, message: "Banner created successfully", data: banner });
  } catch (error) {
    console.error("BANNER CREATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to create banner" });
  }
});

app.put("/api/admin/banners/:id", auth, role("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    const before: any = await Banner.findOne({ _id: req.params.id, ...(await tenantFilter(req as AuthRequest)) });
    if (!before) return res.status(404).json({ success: false, message: "Banner not found" });

    const title = String(req.body.title ?? before.title).trim();
    const subtitle = String(req.body.subtitle ?? before.subtitle ?? "").trim();
    const offerLabel = String(req.body.offerLabel ?? before.offerLabel ?? "").trim();
    const image = String(req.body.image ?? before.image ?? "").trim();
    const buttonText = String(req.body.buttonText ?? before.buttonText ?? "Shop now").trim();
    const link = String(req.body.link ?? before.link ?? "/shop").trim();
    const startDate = req.body.startDate === "" || req.body.startDate === null ? undefined : (req.body.startDate !== undefined ? new Date(req.body.startDate) : before.startDate);
    const endDate = req.body.endDate === "" || req.body.endDate === null ? undefined : (req.body.endDate !== undefined ? new Date(req.body.endDate) : before.endDate);
    const sortOrder = req.body.sortOrder === undefined ? Number(before.sortOrder || 0) : Number(req.body.sortOrder || 0);
    const isActive = req.body.isActive === undefined ? before.isActive : Boolean(req.body.isActive);

    if (title.length < 2) return res.status(400).json({ success: false, message: "Banner title is required" });
    if (!image) return res.status(400).json({ success: false, message: "Banner image is required" });
    if ((startDate && Number.isNaN(new Date(startDate).getTime())) || (endDate && Number.isNaN(new Date(endDate).getTime()))) {
      return res.status(400).json({ success: false, message: "Invalid banner dates" });
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    const banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, ...(await tenantFilter(req as AuthRequest)) },
      { title, subtitle, offerLabel, image, buttonText, link, startDate, endDate, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0, isActive },
      { new: true, runValidators: true }
    );

    return res.json({ success: true, message: "Banner updated successfully", data: banner });
  } catch (error) {
    console.error("BANNER UPDATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to update banner" });
  }
});

app.delete("/api/admin/banners/:id", auth, role("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    const banner = await Banner.findOneAndDelete({ _id: req.params.id, ...(await tenantFilter(req as AuthRequest)) });
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });
    return res.json({ success: true, message: "Banner deleted successfully" });
  } catch (error) {
    console.error("BANNER DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to delete banner" });
  }
});

/* =========================================================
   CATEGORIES
========================================================= */

app.get("/api/categories", async (req, res) => {
  try {
    const requestedStore = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const isMainStoreRequest = Boolean(
      requestedStore &&
      mainId &&
      String(requestedStore) === String(mainId)
    );
    const storeFilter: any = requestedStore && mongoose.Types.ObjectId.isValid(requestedStore)
      ? (isMainStoreRequest
          ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] }
          : { storeAdmin: requestedStore })
      : (mainId ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] } : { storeAdmin: null });
    const categories = await Category.find({ $and: [storeFilter, { isActive: true }] }).sort({ name: 1 }).lean();
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error("CATEGORY LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load categories" });
  }
});

app.get("/api/admin/categories", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const storeFilter = await tenantFilter(req);
    const productCategories = await Product.distinct("category", { ...storeFilter, category: { $nin: [null, ""] } });
    for (const rawName of productCategories) {
      const name = String(rawName || "").trim();
      if (!name) continue;
      const owner = await getTenantAdminId(req);
      await Category.updateOne(
        { ...(await tenantFilter(req)), name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { $setOnInsert: { name, image: "", isActive: true, storeAdmin: owner } },
        { upsert: true }
      );
    }
    // IMPORTANT: admin catalog is tenant-scoped. Main Admin can see the
    // organization-wide catalog; a Store Admin must see only categories
    // belonging to that store. Never return another store's categories.
    const categories = await Category.find(await tenantFilter(req))
      .sort({ name: 1 })
      .lean();
    const mainAdminId = await getMainAdminId();
    const isMainAdmin = Boolean(mainAdminId && String(req.user?.id) === String(mainAdminId));
    // Main Admin owns the organization-wide/main-store catalog, including legacy
    // categories whose storeAdmin is null. Store Admins remain tenant-isolated.
    const data = categories.map((category:any) => ({
      ...category,
      canEdit: isMainAdmin || String(category.storeAdmin || "") === String(req.user?.id || ""),
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("ADMIN CATEGORY LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load categories" });
  }
});

app.post("/api/admin/categories", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const image = String(req.body.image || "").trim();
    if (name.length < 2) return res.status(400).json({ success: false, message: "Category name is required" });

    const existing = await Category.findOne({ ...(await tenantFilter(req)), name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (existing) return res.status(400).json({ success: false, message: "Category already exists" });

    const category = await Category.create({ name, image, isActive: true });
    const owner = await getTenantAdminId(req);
    if (owner) await Category.collection.updateOne({ _id: category._id }, { $set: { storeAdmin: owner } });
    return res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error) {
    console.error("CATEGORY CREATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to create category" });
  }
});

app.put("/api/admin/categories/:id", auth, role("admin"), async (req:AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Category not found" });
    // Use the same tenant rules as the category list. This is important for the
    // Main Admin because legacy/main-store categories can have storeAdmin=null.
    const before = await Category.findOne({ _id: req.params.id, ...(await tenantFilter(req as AuthRequest)) });
    if (!before) return res.status(404).json({ success: false, message: "Category not found" });

    const name = String(req.body.name ?? before.name).trim();
    const image = String(req.body.image ?? before.image ?? "").trim();
    const isActive = req.body.isActive === undefined ? before.isActive : Boolean(req.body.isActive);
    const defaultRefundAvailable = req.body.defaultRefundAvailable === undefined
      ? before.defaultRefundAvailable
      : Boolean(req.body.defaultRefundAvailable);
    const defaultReplacementAvailable = req.body.defaultReplacementAvailable === undefined
      ? before.defaultReplacementAvailable
      : Boolean(req.body.defaultReplacementAvailable);
    if (name.length < 2) return res.status(400).json({ success: false, message: "Category name is required" });

    const duplicate = await Category.findOne({ ...(await tenantFilter(req as AuthRequest)), _id: { $ne: before._id }, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (duplicate) return res.status(400).json({ success: false, message: "Category already exists" });

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, ...(await tenantFilter(req as AuthRequest)) },
      { name, image, isActive, defaultRefundAvailable, defaultReplacementAvailable },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.json({ success: true, message: "Category updated successfully", data: category });
  } catch (error) {
    console.error("CATEGORY UPDATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to update category" });
  }
});

app.delete("/api/admin/categories/:id", auth, role("admin"), async (req:AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Category not found" });
    // Main Admin may manage legacy/main-store categories with storeAdmin=null;
    // Store Admins can only manage categories belonging to their own tenant.
    const category = await Category.findOne({ _id: req.params.id, ...(await tenantFilter(req as AuthRequest)) });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const used = await Product.exists({ ...(await tenantFilter(req as AuthRequest)), category: category.name });
    if (used) return res.status(400).json({ success: false, message: "Category is assigned to products. Disable it instead." });

    await category.deleteOne();
    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("CATEGORY DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to delete category" });
  }
});

const normalizeProductVariants = (raw: any) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((v: any) => ({
    ...(v?._id ? { _id: v._id } : {}),
    name: String(v?.name || v?.unit || "").trim(),
    unit: String(v?.unit || v?.name || "").trim(),
    mrp: Math.max(0, Number(v?.mrp || 0)),
    sellingPrice: Math.max(0, Number(v?.sellingPrice || 0)),
    stock: Math.max(0, Math.floor(Number(v?.stock || 0))),
    sku: String(v?.sku || "").trim(),
    barcode: String(v?.barcode || "").trim(),
    image: String(v?.image || "").trim(),
  })).filter((v: any) => v.name);
};
const validateVariantIdentifiers = (variants: any[]) => {
  const skus = new Set<string>(); const barcodes = new Set<string>();
  for (const v of variants) {
    const sku = String(v.sku || "").toLowerCase(); const barcode = String(v.barcode || "").toLowerCase();
    if (sku && skus.has(sku)) throw new Error("Variant SKUs must be unique within a product");
    if (barcode && barcodes.has(barcode)) throw new Error("Variant barcodes must be unique within a product");
    if (sku) skus.add(sku); if (barcode) barcodes.add(barcode);
  }
};
const variantStockTotal = (variants: any[]) => variants.reduce((sum: number, v: any) => sum + Math.max(0, Number(v.stock || 0)), 0);

/* =========================================================
   PRODUCTS
========================================================= */

app.get("/api/products", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();

    const filter: any = {
      $and: [{ isActive: true }],
    };

    // Optional storeAdminId lets a customer storefront be tied to one store.
    const requestedStore = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();

    if (requestedStore && mongoose.Types.ObjectId.isValid(requestedStore)) {
      // The main store must also include legacy products created before
      // multi-store support, where storeAdmin is null/missing.
      const isMainStoreRequest = Boolean(
        mainId && String(requestedStore) === String(mainId)
      );

      if (isMainStoreRequest) {
        filter.$and.push({
          $or: [
            { storeAdmin: mainId },
            { storeAdmin: null },
            { storeAdmin: { $exists: false } },
          ],
        });
      } else {
        // Every non-main store sees only its own catalogue.
        filter.$and.push({ storeAdmin: requestedStore });
      }
    } else if (mainId) {
      // No store selected = main store for backwards compatibility.
      filter.$and.push({
        $or: [
          { storeAdmin: mainId },
          { storeAdmin: null },
          { storeAdmin: { $exists: false } },
        ],
      });
    }

    if (q) {
      filter.$and.push({ $or: [
        {
          name: {
            $regex: q,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: q,
            $options: "i",
          },
        },
        {
          category: {
            $regex: q,
            $options: "i",
          },
        },
      ] });
    }

    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("PRODUCT LIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load products",
    });
  }
});


/* =========================================================
   AI CUSTOMER SUPPORT ASSISTANT — ACCOUNT/ORDER GROUNDED
   First-level guidance only. Uses actual customer/order/config data.
   Does not approve refunds, replacements, cancellations, or financial changes.
========================================================= */
app.post("/api/customer/ai-support-assistant", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const query = String(req.body?.query || "").trim().slice(0, 300);
    if (!query) return res.status(400).json({ success: false, message: "Tell me what you need help with." });
    const lower = query.toLowerCase();
    const orders: any[] = await Order.find({ user: req.user!.id })
      .select("_id status total createdAt updatedAt deliveryPartner deliveryAssignmentStatus deliveredAt paymentMethod paymentStatus")
      .sort({ createdAt: -1 }).limit(20).lean();
    const orderRefs = orders.slice(0, 5).map((o:any) => ({
      _id: o._id, status: o.status, total: Number(o.total || 0), createdAt: o.createdAt,
      paymentMethod: o.paymentMethod || "", paymentStatus: o.paymentStatus || ""
    }));
    const has = (...terms:string[]) => terms.some(t => lower.includes(t));

    if (has("where is my order", "where's my order", "track my order", "order status", "order kaha", "order kahan", "mera order")) {
      const active = orders.filter((o:any) => !["Delivered","Cancelled"].includes(String(o.status)));
      if (!active.length) return res.json({ success:true, data:{answer:"I could not find an active order. Your recent orders are shown below.", handoffRequired:false, orders:orderRefs, intent:"ORDER_STATUS"} });
      return res.json({ success:true, data:{answer:`I found ${active.length} active order${active.length===1?"":"s"}. Their current status is shown below. For delivery-specific issues, Customer Care can help further.`, handoffRequired:false, orders:active.slice(0,5).map((o:any)=>({_id:o._id,status:o.status,total:Number(o.total||0),createdAt:o.createdAt,paymentMethod:o.paymentMethod||""})), intent:"ORDER_STATUS"} });
    }

    if (has("cancel", "cancellation", "cancel order")) {
      const active = orders.filter((o:any) => !["Delivered","Cancelled"].includes(String(o.status)));
      return res.json({success:true,data:{answer:active.length?"I found active order(s), but I cannot cancel an order from the AI assistant. Open the order/support flow to check the current cancellation rules or contact Customer Care.":"I could not find an active order to cancel.",handoffRequired:Boolean(active.length),orders:active.slice(0,5).map((o:any)=>({_id:o._id,status:o.status,total:Number(o.total||0),createdAt:o.createdAt})),intent:"CANCELLATION"}});
    }

    if (has("replacement", "replace", "replacement request", "exchange")) {
      const delivered = orders.filter((o:any)=>String(o.status)==="Delivered");
      return res.json({success:true,data:{answer:delivered.length?"Replacement requests are handled through the existing Customer Support flow and product-level eligibility rules. Select the delivered order there to see eligible items and submit a request.":"I could not find a delivered order for a replacement request.",handoffRequired:true,orders:delivered.slice(0,5).map((o:any)=>({_id:o._id,status:o.status,total:Number(o.total||0),createdAt:o.createdAt})),intent:"REPLACEMENT"}});
    }

    if (has("refund", "refund request", "money back", "refund status")) {
      return res.json({success:true,data:{answer:"Refund eligibility, amount, and approval are controlled by the existing Customer Care and Finance workflow. I cannot approve or change a refund. Open Customer Support for the order-specific eligibility and request flow.",handoffRequired:true,orders:orderRefs,intent:"REFUND"}});
    }

    if (has("cod", "cash on delivery", "cash delivery", "cash on-delivery")) {
      const status:any = await getCodRiskStatus(req.user!.id, String(req.body?.storeAdminId || "").trim() || null);
      return res.json({success:true,data:{answer:status?.reason ? `${status.label}: ${status.reason}` : `COD status: ${status?.label || "Not available"}.`,handoffRequired:false,cod:{state:status?.state||"UNKNOWN",label:status?.label||"Unknown",reason:status?.reason||""},intent:"COD"}});
    }

    if (has("contact support", "customer care", "support", "help", "talk to someone", "agent")) {
      return res.json({success:true,data:{answer:"You can contact Customer Care through the existing Support Ticket flow. For refunds, replacements, cancellations, or complex order issues, Customer Care remains the authorized support path.",handoffRequired:true,orders:orderRefs,intent:"SUPPORT"}});
    }

    return res.json({success:true,data:{answer:"I can help with order status, cancellation guidance, replacement/refund guidance, COD availability, or contacting Customer Care. For complex issues, I will hand you to Customer Care.",handoffRequired:false,orders:orderRefs,intent:"GENERAL"}});
  } catch (e) {
    console.error("AI CUSTOMER SUPPORT ASSISTANT ERROR:", e);
    return res.status(500).json({success:false,message:"Unable to process your support question"});
  }
});

/* =========================================================
   AI ORDER ASSISTANT — CATALOG GROUNDED
   Uses only active, in-stock FreshBasket catalogue records.
   No product, price, stock, or availability is invented.
========================================================= */
app.post("/api/customer/ai-order-assistant", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const query = String(req.body?.query || "").trim().slice(0, 300);
    if (!query) return res.status(400).json({ success: false, message: "Tell me what you need." });

    const requestedStore = String(req.body?.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const filter: any = { isActive: { $ne: false }, stock: { $gt: 0 } };
    if (requestedStore && mongoose.Types.ObjectId.isValid(requestedStore)) {
      if (mainId && String(requestedStore) === String(mainId)) {
        filter.$or = [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }];
      } else {
        filter.storeAdmin = requestedStore;
      }
    } else if (mainId) {
      filter.$or = [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }];
    }

    const products: any[] = await Product.find(filter)
      .select("_id name brand category unit price mrp sellingPrice stock image rating variants storeAdmin")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const lower = query.toLowerCase();
    const budgetMatch = lower.match(/(?:under|below|within|upto|up to|max(?:imum)?|less than)\s*(?:₹|rs\.?|inr\s*)?\s*(\d+(?:\.\d+)?)/i)
      || lower.match(/(?:₹|rs\.?|inr\s*)\s*(\d+(?:\.\d+)?)/i);
    const budget = budgetMatch ? Number(budgetMatch[1]) : null;

    const stop = new Set(["i","me","my","need","want","some","few","for","a","an","the","please","under","below","within","upto","up","to","less","than","maximum","max","items","item","products","product","give","show","suggest","recommend","and","with","of","for","rs","inr"]);
    const tokens = lower.replace(/[^a-z0-9₹.]+/g, " ").split(/\s+/).filter(Boolean).filter(t => !stop.has(t) && !/^\d+(?:\.\d+)?$/.test(t));

    const scored = products.map((p: any) => {
      const text = `${p.name || ""} ${p.brand || ""} ${p.category || ""} ${p.unit || ""}`.toLowerCase();
      let score = 0;
      const matched: string[] = [];
      for (const token of tokens) {
        if (text.includes(token)) {
          score += text.startsWith(token) ? 8 : 5;
          matched.push(token);
        }
      }
      const price = Number(p.sellingPrice ?? p.price ?? 0);
      if (budget != null) score += price <= budget ? 3 : -20;
      return { p, price, score, matched };
    }).filter(x => x.price > 0 && (budget == null || x.price <= budget))
      .sort((a,b) => b.score - a.score || a.price - b.price);

    const relevant = tokens.length ? scored.filter(x => x.matched.length > 0) : scored;
    if (!relevant.length) {
      return res.json({
        success: true,
        data: { query, budget, products: [], message: budget != null ? `I couldn't find in-stock catalogue items matching that request within ₹${budget}.` : "I couldn't confidently match that request to the current in-stock catalogue." }
      });
    }

    // If a budget is supplied, keep the recommended basket within that real budget.
    const selected: any[] = [];
    let total = 0;
    for (const item of relevant) {
      if (selected.length >= 6) break;
      if (budget != null && total + item.price > budget) continue;
      selected.push(item);
      total += item.price;
    }
    if (!selected.length) {
      return res.json({
        success: true,
        data: { query, budget, products: [], message: budget != null ? `No matching in-stock catalogue item fits within ₹${budget}.` : "I couldn't confidently match that request to the current in-stock catalogue." }
      });
    }

    const result = selected.map(({ p, price, matched }) => ({
      ...p,
      aiMatch: matched,
      aiReason: matched.length ? `Matched from your request: ${matched.slice(0, 3).join(", ")}.` : "Available in the current catalogue."
    }));
    return res.json({
      success: true,
      data: {
        query,
        budget,
        total: Number(total.toFixed(2)),
        remainingBudget: budget != null ? Number((budget - total).toFixed(2)) : null,
        products: result,
        message: budget != null ? `I found ${result.length} in-stock catalogue item${result.length === 1 ? "" : "s"} within your ₹${budget} budget.` : `I found ${result.length} in-stock catalogue item${result.length === 1 ? "" : "s"} matching your request.`
      }
    });
  } catch (error) {
    console.error("AI ORDER ASSISTANT ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to prepare catalogue recommendations right now." });
  }
});

app.get(
  "/api/admin/products",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      const products = await Product.find(await tenantFilter(req)).sort({ createdAt: -1 });

      return res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("ADMIN PRODUCTS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load products",
      });
    }
  }
);


app.get("/api/admin/configuration-history", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const rows = await AuditLog.find({ targetType: "CONFIGURATION" })
      .sort({ createdAt: -1 }).limit(300)
      .populate("actor", "name email role employeeId")
      .lean();
    const data = rows.map((row:any) => ({
      _id: row._id, action: row.action, targetId: row.targetId,
      actor: row.actor || null, actorRole: row.actorRole || "", actorEmployeeId: row.actorEmployeeId || "",
      timestamp: row.createdAt, before: row.metadata?.before ?? null, after: row.metadata?.after ?? null,
      reason: row.metadata?.reason || ""
    }));
    return res.json({ success:true, data });
  } catch (error) {
    console.error("CONFIGURATION HISTORY ERROR:", error);
    return res.status(500).json({ success:false, message:"Unable to load configuration history" });
  }
});


app.get("/api/admin/cod-risk-config", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const requested = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const owner = requested && mongoose.Types.ObjectId.isValid(requested) ? new mongoose.Types.ObjectId(requested) : (mainId || null);
    if (!owner) return res.status(400).json({ success:false, message:"Store account not found" });
    const store:any = await User.findOne({ _id: owner, role:"admin", blocked:{$ne:true} }).select("_id name email").lean();
    if (!store) return res.status(404).json({success:false,message:"Store not found"});
    const config = await getCodRiskConfig(owner);
    return res.json({success:true,data:{...config,store:{_id:store._id,name:store.name,email:store.email}}});
  } catch (e) {
    console.error("COD RISK CONFIG LOAD ERROR:", e);
    return res.status(500).json({success:false,message:"Unable to load COD risk configuration"});
  }
});

app.patch("/api/admin/cod-risk-config", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const requested = String(req.body.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const owner = requested && mongoose.Types.ObjectId.isValid(requested) ? new mongoose.Types.ObjectId(requested) : (mainId || null);
    if (!owner) return res.status(400).json({success:false,message:"Store account not found"});
    const store:any = await User.findOne({ _id: owner, role:"admin", blocked:{$ne:true} }).select("_id name email").lean();
    if (!store) return res.status(404).json({success:false,message:"Store not found"});

    const numberField = (name:string, min:number, max:number) => {
      const value = Number(req.body[name]);
      if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer between ${min} and ${max}`);
      return value;
    };
    const next = {
      enabled: req.body.enabled !== false,
      cancelledOrdersThreshold: numberField("cancelledOrdersThreshold", 1, 100),
      failedDeliveriesThreshold: numberField("failedDeliveriesThreshold", 1, 100),
      returnRateThreshold: numberField("returnRateThreshold", 1, 100),
      prepaidCancelThreshold: numberField("prepaidCancelThreshold", 1, 100),
      prepaidReturnRateThreshold: numberField("prepaidReturnRateThreshold", 1, 100),
    };
    const previous:any = await getCodRiskConfig(owner);
    const saved:any = await CodRiskConfig.findOneAndUpdate(
      { key: codRiskKey(owner) },
      { $set: { key:codRiskKey(owner), storeAdmin:owner, ...next, updatedBy:req.user!.id } },
      { upsert:true, new:true, setDefaultsOnInsert:true, runValidators:true }
    );
    await recordEntityChange({
      req,
      action:"COD_RISK_CONFIGURATION_UPDATED",
      targetType:"CONFIGURATION",
      targetId:`cod-risk:${String(owner)}`,
      before:{...normalizeCodRiskConfig(previous)},
      after:{...normalizeCodRiskConfig(saved)},
      reason:req.body?.reason || "COD risk configuration updated",
    });
    return res.json({success:true,message:"COD risk configuration updated",data:{...saved.toObject(),...normalizeCodRiskConfig(saved),store:{_id:store._id,name:store.name,email:store.email}}});
  } catch (e:any) {
    console.error("COD RISK CONFIG SAVE ERROR:", e);
    return res.status(400).json({success:false,message:e?.message || "Unable to save COD risk configuration"});
  }
});

app.get("/api/admin/cod-risk/customer/:id", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({success:false,message:"Invalid customer id"});
    const requested = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const owner = requested && mongoose.Types.ObjectId.isValid(requested) ? new mongoose.Types.ObjectId(requested) : (mainId || null);
    const customer:any = await User.findOne({_id:req.params.id,role:"customer"}).select("_id name email phone customerId").lean();
    if (!customer) return res.status(404).json({success:false,message:"Customer not found"});
    const result = await evaluateCodRisk(customer._id, owner);
    return res.json({success:true,data:{customer,result}});
  } catch (e) {
    console.error("COD RISK CUSTOMER ERROR:", e);
    return res.status(500).json({success:false,message:"Unable to load customer COD risk"});
  }
});

app.get("/api/cod-risk/status", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const requested = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const owner = requested && mongoose.Types.ObjectId.isValid(requested) ? new mongoose.Types.ObjectId(requested) : (mainId || null);
    const result = await evaluateCodRisk(req.user!.id, owner);
    return res.json({success:true,data:result});
  } catch (e) {
    console.error("COD RISK STATUS ERROR:", e);
    return res.status(500).json({success:false,message:"Unable to evaluate COD eligibility"});
  }
});

app.get("/api/admin/change-history", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const targetType = String(req.query.targetType || "").trim().toUpperCase();
    const targetId = String(req.query.targetId || "").trim();
    if (!targetType || !targetId) return res.status(400).json({ success: false, message: "targetType and targetId are required" });
    if (!mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({ success: false, message: "Invalid target id" });
    if (!["PRODUCT"].includes(targetType)) return res.status(400).json({ success: false, message: "Unsupported change-history target" });

    const product = await Product.findOne({ _id: targetId, ...(await tenantFilter(req)) }).select("_id name storeAdmin").lean();
    if (!product) return res.status(404).json({ success: false, message: "Target entity not found" });

    const rows = await AuditLog.find({ targetType, targetId })
      .sort({ createdAt: -1 }).limit(100)
      .populate("actor", "name email role employeeId")
      .lean();
    const data = rows.map((row: any) => ({
      _id: row._id, action: row.action, targetType: row.targetType, targetId: row.targetId,
      actor: row.actor || null, actorRole: row.actorRole || "", actorEmployeeId: row.actorEmployeeId || "",
      timestamp: row.createdAt, before: row.metadata?.before ?? null, after: row.metadata?.after ?? null,
      reason: row.metadata?.reason || "",
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("CHANGE HISTORY ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load change history" });
  }
});

app.get(
  "/api/admin/products/lookup",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      const identifier = String(req.query.identifier || "").trim();
      if (!identifier) {
        return res.status(400).json({ success: false, message: "SKU or barcode is required" });
      }
      if (identifier.length > 120) {
        return res.status(400).json({ success: false, message: "SKU or barcode is too long" });
      }

      const tenant = await tenantFilter(req);
      const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exact = new RegExp(`^${escaped}$`, "i");

      const product = await Product.findOne({
        ...tenant,
        $or: [
          { sku: exact },
          { barcode: exact },
          { "variants.sku": exact },
          { "variants.barcode": exact },
        ],
      }).lean();

      if (!product) {
        return res.status(404).json({ success: false, message: "No product found for this SKU/barcode" });
      }

      const matchedVariants = Array.isArray((product as any).variants)
        ? (product as any).variants.filter((v: any) => exact.test(String(v?.sku || "")) || exact.test(String(v?.barcode || "")))
        : [];

      return res.json({
        success: true,
        data: {
          product,
          matchedVariant: matchedVariants[0] || null,
          matchedBy: exact.test(String((product as any).barcode || "")) || matchedVariants.some((v: any) => exact.test(String(v?.barcode || ""))) ? "barcode" : "sku",
        },
      });
    } catch (error) {
      console.error("ADMIN PRODUCT LOOKUP ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to lookup product" });
    }
  }
);

app.get("/api/products/:id", async (req, res) => {
  try {
    // Public product detail must respect the currently selected storefront.
    // If storeAdminId is supplied, a product belonging to another store is
    // never returned. This prevents direct product URLs from bypassing
    // storefront isolation.
    const requestedStore = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const productFilter: any = { _id: req.params.id };
    if (requestedStore && mongoose.Types.ObjectId.isValid(requestedStore)) {
      productFilter.storeAdmin = requestedStore;
    } else if (mainId) {
      productFilter.$or = [
        { storeAdmin: mainId },
        { storeAdmin: null },
        { storeAdmin: { $exists: false } },
      ];
    }
    const product = await Product.findOne(productFilter);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }
});

/* =========================================================
   PRODUCT REVIEWS
========================================================= */

app.get("/api/products/:id/reviews", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid product" });
    }

    const reviews = await Review.find({ product: req.params.id })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();

    const total = reviews.length;
    const average = total
      ? reviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) / total
      : 0;

    return res.json({
      success: true,
      data: {
        reviews,
        total,
        average: Number(average.toFixed(1)),
      },
    });
  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load product reviews" });
  }
});

app.post("/api/products/:id/reviews", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product" });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    if (comment.length < 3) {
      return res.status(400).json({ success: false, message: "Review must contain at least 3 characters" });
    }

    if (comment.length > 1000) {
      return res.status(400).json({ success: false, message: "Review cannot exceed 1000 characters" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const deliveredOrder = await Order.findOne({
      user: userId,
      status: "Delivered",
      "items.product": productId,
    }).lean();

    if (!deliveredOrder) {
      return res.status(403).json({
        success: false,
        message: "You can review this product only after it has been delivered to you.",
      });
    }

    const existingReview = await Review.findOne({ user: userId, product: productId });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product.",
      });
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      comment,
    });

    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$product",
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const averageRating = stats.length ? Number(stats[0].average.toFixed(1)) : 0;
    const reviewCount = stats.length ? Number(stats[0].count) : 1;

    await Product.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(productId) },
      { $set: { rating: averageRating } }
    );

    const populatedReview = await Review.findById(review._id)
      .populate("user", "name")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: {
        review: populatedReview,
        rating: averageRating,
        reviewCount,
      },
    });
  } catch (error: any) {
    console.error("CREATE REVIEW ERROR:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product.",
      });
    }

    return res.status(500).json({ success: false, message: "Unable to submit review" });
  }
});

app.post(
  "/api/products",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      const body: any = { ...req.body };
      if (Array.isArray(body.variants) && body.variants.length) {
        body.variants = normalizeProductVariants(body.variants);
        validateVariantIdentifiers(body.variants);
        body.stock = variantStockTotal(body.variants);
        body.sellingPrice = Number(body.variants[0]?.sellingPrice || body.sellingPrice || 0);
        body.mrp = Number(body.variants[0]?.mrp || body.mrp || 0);
        body.unit = String(body.variants[0]?.unit || body.unit || "");
      }
      const product = await Product.create(body);
      await recordEntityChange({ req, action: "PRODUCT_CREATED", targetType: "PRODUCT", targetId: product._id, before: null, after: productChangeSnapshot(product), reason: req.body?.changeReason || "Product created" });
      const tenant = await getTenantAdminId(req);
      if (tenant) await Product.collection.updateOne({ _id: product._id }, { $set: { storeAdmin: tenant } });

      const initialStock = Number(product.stock || 0);
      if (initialStock > 0) {
        await recordStockHistory({
          product: product._id,
          change: initialStock,
          previousStock: 0,
          newStock: initialStock,
          reason: "Initial stock",
          adjustedBy: (req as any).user?.id,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      console.error("PRODUCT CREATE ERROR:", error);

      return res.status(400).json({
        success: false,
        message: "Unable to create product",
      });
    }
  }
);

app.put(
  "/api/products/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const before = await Product.findOne({ _id: req.params.id, ...(await tenantFilter(req)) });
      if (!before) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const body: any = { ...req.body };
      const hasVariants = Array.isArray(body.variants);
      if (hasVariants) {
        body.variants = normalizeProductVariants(body.variants);
        validateVariantIdentifiers(body.variants);
        body.stock = variantStockTotal(body.variants);
        if (body.variants.length) {
          body.sellingPrice = Number(body.variants[0]?.sellingPrice || body.sellingPrice || 0);
          body.mrp = Number(body.variants[0]?.mrp || body.mrp || 0);
          body.unit = String(body.variants[0]?.unit || body.unit || "");
        }
      }
      const requestedStock = hasVariants ? variantStockTotal(body.variants) : (req.body.stock === undefined ? Number(before.stock || 0) : Number(req.body.stock));

      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, ...(await tenantFilter(req)) },
        body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const previousStock = Number(before.stock || 0);
      if (requestedStock !== previousStock) {
        await recordStockHistory({ product: product._id, change: requestedStock - previousStock, previousStock, newStock: requestedStock, reason: hasVariants ? "Variant stock update" : "Manual stock update", adjustedBy: (req as any).user?.id });
      }
      if (!hasVariants) {
        const previousPrice = Number(before.sellingPrice || 0);
        const newPrice = Number(product.sellingPrice || 0);
        if (previousPrice !== newPrice && previousPrice > 0 && newPrice >= 0) {
          const history: any = await PriceHistory.create({ product: product._id, storeAdmin: (product as any).storeAdmin || null, previousPrice, newPrice });
          await notifyPriceDropEligibleCustomers({ historyId: history._id, productId: product._id, previousPrice, newPrice });
        }
      }
      await recordEntityChange({ req, action: "PRODUCT_UPDATED", targetType: "PRODUCT", targetId: product._id, before: productChangeSnapshot(before), after: productChangeSnapshot(product), reason: req.body?.changeReason || "Product updated" });
      if (hasVariants) {
        const beforeVariants = Array.isArray((before as any).variants) ? (before as any).variants : [];
        const afterVariants = Array.isArray((product as any).variants) ? (product as any).variants : [];
        const beforeById = new Map(beforeVariants.map((v: any) => [String(v._id), v]));
        for (const v of afterVariants) {
          const previous = Number((beforeById.get(String(v._id)) as any)?.stock || 0); const next = Number(v.stock || 0);
          const beforeVariant = beforeById.get(String(v._id)) as any;
          const previousPrice = Number(beforeVariant?.sellingPrice || 0);
          const newPrice = Number(v.sellingPrice || 0);
          if (previousPrice !== newPrice && previousPrice > 0 && newPrice >= 0) {
            const history: any = await PriceHistory.create({ product: product._id, storeAdmin: (product as any).storeAdmin || null, variantId: String(v._id), previousPrice, newPrice });
            await notifyPriceDropEligibleCustomers({ historyId: history._id, productId: product._id, variantId: String(v._id), previousPrice, newPrice });
          }
          if (previous !== next) await recordStockHistory({ product: product._id, variantId: String(v._id), change: next - previous, previousStock: previous, newStock: next, reason: "Variant stock update", adjustedBy: (req as any).user?.id });
        }
      }

      return res.json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      console.error("PRODUCT UPDATE ERROR:", error);

      return res.status(400).json({
        success: false,
        message: "Unable to update product",
      });
    }
  }
);

app.get(
  "/api/admin/inventory/history",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const productId = String(req.query.productId || "").trim();
      const filter: any = { ...(await tenantFilter(req)) };

      if (productId) {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res.status(400).json({ success: false, message: "Invalid product" });
        }
        filter.product = productId;
      }

      const history = await StockHistory.find(filter)
        .populate("product", "name image stock lowStockThreshold")
        .populate("adjustedBy", "name email role")
        .populate("order", "_id status")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      return res.json({ success: true, data: history });
    } catch (error) {
      console.error("INVENTORY HISTORY ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to load stock history" });
    }
  }
);

app.patch(
  "/api/admin/inventory/:id/adjust",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const adjustment = Number(req.body.adjustment);
      const reason = String(req.body.reason || "Manual stock adjustment").trim();

      if (!Number.isInteger(adjustment) || adjustment === 0) {
        return res.status(400).json({ success: false, message: "Enter a non-zero whole number" });
      }
      if (!reason) {
        return res.status(400).json({ success: false, message: "Reason is required" });
      }

      const product = await Product.findOne({ _id: req.params.id, ...(await tenantFilter(req)) });
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const previousStock = Number(product.stock || 0);
      const newStock = previousStock + adjustment;
      if (newStock < 0) {
        return res.status(400).json({ success: false, message: "Stock cannot be negative" });
      }

      product.stock = newStock;
      await product.save();

      await recordEntityChange({ req, action: "PRODUCT_STOCK_ADJUSTED", targetType: "PRODUCT", targetId: product._id, before: { stock: previousStock }, after: { stock: newStock }, reason });

      await recordStockHistory({
        product: product._id,
        change: adjustment,
        previousStock,
        newStock,
        reason,
        adjustedBy: (req as any).user?.id,
      });

      return res.json({
        success: true,
        message: "Stock adjusted successfully",
        data: product,
      });
    } catch (error) {
      console.error("STOCK ADJUSTMENT ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to adjust stock" });
    }
  }
);

app.delete(
  "/api/products/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const existingProduct = await Product.findOne({ _id: req.params.id, ...(await tenantFilter(req)) }).lean();
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await Product.deleteOne({ _id: req.params.id, ...(await tenantFilter(req)) });
      await recordEntityChange({ req, action: "PRODUCT_DELETED", targetType: "PRODUCT", targetId: existingProduct._id, before: productChangeSnapshot(existingProduct), after: null, reason: req.body?.changeReason || "Product deleted" });

      return res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("PRODUCT DELETE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete product",
      });
    }
  }
);


/* =========================================================
   COUPONS
========================================================= */

app.get("/api/coupons", async (req, res) => {
  try {
    const now = new Date();
    const requestedStore = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const isMainStoreRequest = Boolean(
      requestedStore &&
      mainId &&
      String(requestedStore) === String(mainId)
    );
    const storeFilter: any = requestedStore && mongoose.Types.ObjectId.isValid(requestedStore)
      ? (isMainStoreRequest
          ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] }
          : { storeAdmin: requestedStore })
      : (mainId ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] } : { storeAdmin: null });
    const coupons = await Coupon.find({ $and: [storeFilter, { isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now } }] })
      .select("code discountType value minOrderAmount maxDiscount expiryDate")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: coupons });
  } catch (error) {
    console.error("COUPON LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load coupons" });
  }
});

app.post("/api/coupons/validate", async (req: AuthRequest, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    const subtotal = Number(req.body.subtotal || 0);
    if (!code) return res.status(400).json({ success: false, message: "Coupon code is required" });
    if (!Number.isFinite(subtotal) || subtotal < 0) return res.status(400).json({ success: false, message: "Invalid subtotal" });

    const now = new Date();
    const requestedStore = String(req.body.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const isMainStoreRequest = Boolean(
      requestedStore &&
      mainId &&
      String(requestedStore) === String(mainId)
    );
    const storeFilter: any = requestedStore && mongoose.Types.ObjectId.isValid(requestedStore)
      ? (isMainStoreRequest
          ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] }
          : { storeAdmin: requestedStore })
      : (mainId ? { $or: [{ storeAdmin: mainId }, { storeAdmin: null }, { storeAdmin: { $exists: false } }] } : { storeAdmin: null });
    const coupon: any = await Coupon.findOne({ $and: [storeFilter, { code }] });
    if (!coupon || !coupon.isActive) return res.status(400).json({ success: false, message: "Invalid or inactive coupon" });
    if (now < coupon.startDate) return res.status(400).json({ success: false, message: "Coupon is not active yet" });
    if (now > coupon.expiryDate) return res.status(400).json({ success: false, message: "Coupon has expired" });
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    if (subtotal < coupon.minOrderAmount) return res.status(400).json({ success: false, message: `Minimum order value is ${money(Number(coupon.minOrderAmount))}` });

    let discount = coupon.discountType === "percentage" ? subtotal * Number(coupon.value) / 100 : Number(coupon.value);
    if (coupon.maxDiscount != null) discount = Math.min(discount, Number(coupon.maxDiscount));
    discount = Math.max(0, Math.min(discount, subtotal));

    return res.json({ success: true, data: { code: coupon.code, discountType: coupon.discountType, discount } });
  } catch (error) {
    console.error("COUPON VALIDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to validate coupon" });
  }
});

app.get("/api/admin/coupons", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const coupons = await Coupon.find(await tenantFilter(req)).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: coupons });
  } catch (error) {
    console.error("ADMIN COUPON LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load coupons" });
  }
});

app.post("/api/admin/coupons", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const payload = req.body || {};
    const code = String(payload.code || "").trim().toUpperCase();
    const discountType = String(payload.discountType || "");
    const value = Number(payload.value);
    const minOrderAmount = Number(payload.minOrderAmount || 0);
    const maxDiscount = payload.maxDiscount === undefined || payload.maxDiscount === "" ? undefined : Number(payload.maxDiscount);
    const usageLimit = payload.usageLimit === undefined || payload.usageLimit === "" ? undefined : Number(payload.usageLimit);
    const startDate = payload.startDate ? new Date(payload.startDate) : new Date();
    const expiryDate = new Date(payload.expiryDate);

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return res.status(400).json({ success: false, message: "Invalid coupon code" });
    if (!["percentage", "fixed"].includes(discountType)) return res.status(400).json({ success: false, message: "Invalid discount type" });
    if (!Number.isFinite(value) || value <= 0 || (discountType === "percentage" && value > 100)) return res.status(400).json({ success: false, message: "Invalid discount value" });
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) return res.status(400).json({ success: false, message: "Invalid minimum order amount" });
    if (maxDiscount !== undefined && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) return res.status(400).json({ success: false, message: "Invalid maximum discount" });
    if (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit <= 0)) return res.status(400).json({ success: false, message: "Invalid usage limit" });
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(expiryDate.getTime()) || expiryDate <= startDate) return res.status(400).json({ success: false, message: "Invalid coupon dates" });

    const owner = await getTenantAdminId(req);
    const existing = await Coupon.findOne({ code, ...(owner ? { storeAdmin: owner } : {}) });
    if (existing) return res.status(409).json({ success: false, message: "Coupon code already exists" });

    const coupon = await Coupon.create({ code, discountType, value, minOrderAmount, maxDiscount, startDate, expiryDate, usageLimit, isActive: payload.isActive !== false, usedCount: 0, storeAdmin: owner });
    return res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
  } catch (error) {
    console.error("COUPON CREATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to create coupon" });
  }
});

app.put("/api/admin/coupons/:id", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Coupon not found" });
    const update: any = { ...req.body };
    if (update.code !== undefined) update.code = String(update.code).trim().toUpperCase();
    if (update.value !== undefined) update.value = Number(update.value);
    if (update.minOrderAmount !== undefined) update.minOrderAmount = Number(update.minOrderAmount);
    if (update.maxDiscount === "" || update.maxDiscount === undefined) delete update.maxDiscount;
    else update.maxDiscount = Number(update.maxDiscount);
    if (update.usageLimit === "" || update.usageLimit === undefined) delete update.usageLimit;
    else update.usageLimit = Number(update.usageLimit);
    if (update.startDate) update.startDate = new Date(update.startDate);
    if (update.expiryDate) update.expiryDate = new Date(update.expiryDate);
    const coupon: any = await Coupon.findOneAndUpdate({ _id: req.params.id, ...(await tenantFilter(req)) }, update, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.json({ success: true, message: "Coupon updated successfully", data: coupon });
  } catch (error: any) {
    console.error("COUPON UPDATE ERROR:", error);
    return res.status(400).json({ success: false, message: error?.message || "Unable to update coupon" });
  }
});

app.delete("/api/admin/coupons/:id", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Coupon not found" });
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, ...(await tenantFilter(req)) });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("COUPON DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to delete coupon" });
  }
});

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

/* =========================================================
   ANDROID PUSH — POINT 42
========================================================= */

app.post("/api/push/register", auth, async (req: AuthRequest, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "android").trim().toLowerCase();
    const appId = String(req.body?.appId || "com.freshbasket.grocery").trim();
    if (!token || token.length < 20 || token.length > 4096) return res.status(400).json({ success:false, message:"Invalid push token" });
    // A physical device token belongs to one currently authenticated account.
    // Remove stale ownership from every account before assigning it to this user.
    await User.updateMany(
      { pushTokens: { $elemMatch: { token } } },
      { $pull: { pushTokens: { token } } }
    );
    await User.updateOne(
      { _id: req.user!.id },
      { $push: { pushTokens: { token, platform, appId, lastSeenAt: new Date() } } }
    );
    return res.json({ success:true, message:"Push token registered" });
  } catch (error) {
    console.error("PUSH REGISTER ERROR:", error);
    return res.status(500).json({ success:false, message:"Unable to register push token" });
  }
});

app.post("/api/push/unregister", auth, async (req: AuthRequest, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token) return res.json({ success:true, message:"Push token cleared" });
    await User.updateOne({ _id: req.user!.id }, { $pull: { pushTokens: { token } } });
    return res.json({ success:true, message:"Push token unregistered" });
  } catch (error) {
    console.error("PUSH UNREGISTER ERROR:", error);
    return res.status(500).json({ success:false, message:"Unable to unregister push token" });
  }
});

/* =========================================================
   NOTIFICATIONS
========================================================= */

app.get("/api/push/status", auth, role("admin"), async (_req: AuthRequest, res) => {
  try {
    const configured = Boolean(firebaseMessaging);
    return res.json({ success:true, configured, platform:"android", appId:"com.freshbasket.grocery" });
  } catch {
    return res.json({ success:true, configured:false, platform:"android", appId:"com.freshbasket.grocery" });
  }
});

app.get("/api/notifications", auth, async (req: AuthRequest, res) => {
  try {
    const notifications = await Notification.find({ user: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = await Notification.countDocuments({ user: req.user!.id, read: false });
    return res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error("NOTIFICATIONS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load notifications" });
  }
});

app.patch("/api/notifications/:id/read", auth, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Notification not found" });
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user!.id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("NOTIFICATION READ ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update notification" });
  }
});

app.patch("/api/notifications/read-all", auth, async (req: AuthRequest, res) => {
  try {
    await Notification.updateMany({ user: req.user!.id, read: false }, { $set: { read: true, readAt: new Date() } });
    return res.json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    console.error("NOTIFICATIONS READ ALL ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update notifications" });
  }
});


const getLoyaltySettings = async () => {
  let settings: any = await LoyaltySetting.findOne({ key: "default" });
  if (!settings) {
    settings = await LoyaltySetting.create({ key: "default" });
  }
  return settings;
};

const awardLoyaltyForDeliveredOrder = async (order: any) => {
  try {
    const settings: any = await getLoyaltySettings();
    if (!settings.enabled) return;

    const existing = await LoyaltyTransaction.findOne({ order: order._id, type: "earn" });
    if (existing) return;

    const base = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
    const points = Math.floor((base / 100) * Number(settings.pointsPer100 || 0));
    if (points <= 0) return;

    await LoyaltyTransaction.create({
      user: order.user,
      points,
      type: "earn",
      order: order._id,
      description: `Earned ${points} reward points for delivered order #${String(order._id).slice(-8).toUpperCase()}`,
    });

    await User.collection.updateOne(
      { _id: order.user },
      { $inc: { loyaltyPoints: points } }
    );
  } catch (error: any) {
    if (error?.code !== 11000) console.error("LOYALTY EARN ERROR:", error);
  }
};

const reverseLoyaltyForCancelledOrder = async (order: any) => {
  try {
    const earned = await LoyaltyTransaction.findOne({ order: order._id, type: "earn" });
    if (!earned) return;
    const alreadyReversed = await LoyaltyTransaction.findOne({ order: order._id, type: "reverse" });
    if (alreadyReversed) return;

    const points = Number(earned.points || 0);
    if (points <= 0) return;

    await LoyaltyTransaction.create({
      user: order.user,
      points: -points,
      type: "reverse",
      order: order._id,
      description: `Reversed ${points} reward points because order #${String(order._id).slice(-8).toUpperCase()} was cancelled`,
    });

    await User.collection.updateOne(
      { _id: order.user },
      { $inc: { loyaltyPoints: -points } }
    );
  } catch (error: any) {
    if (error?.code !== 11000) console.error("LOYALTY REVERSE ERROR:", error);
  }
};

/* =========================================================
   LOYALTY / REWARDS
========================================================= */

app.get("/api/rewards", auth, async (req: AuthRequest, res) => {
  try {
    const settings: any = await getLoyaltySettings();
    const user: any = await User.findById(req.user!.id).select("loyaltyPoints").lean();
    const transactions = await LoyaltyTransaction.find({ user: req.user!.id })
      .populate("order", "_id status")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      data: {
        points: Number(user?.loyaltyPoints || 0),
        settings: {
          enabled: settings.enabled,
          pointsPer100: settings.pointsPer100,
          rupeesPerPoint: settings.rupeesPerPoint,
          minRedeemPoints: settings.minRedeemPoints,
          maxRedeemPercent: settings.maxRedeemPercent,
        },
        transactions,
      },
    });
  } catch (error) {
    console.error("REWARDS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load rewards" });
  }
});

app.get("/api/admin/rewards/settings", auth, mainAdminOnly, async (_req, res) => {
  try {
    const settings = await getLoyaltySettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("ADMIN REWARDS SETTINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load reward settings" });
  }
});

app.patch("/api/admin/rewards/settings", auth, mainAdminOnly, async (req, res) => {
  try {
    const pointsPer100 = Number(req.body.pointsPer100);
    const rupeesPerPoint = Number(req.body.rupeesPerPoint);
    const minRedeemPoints = Number(req.body.minRedeemPoints);
    const maxRedeemPercent = Number(req.body.maxRedeemPercent);

    if (![pointsPer100, rupeesPerPoint, minRedeemPoints, maxRedeemPercent].every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: "Invalid reward settings" });
    }
    if (pointsPer100 < 0 || rupeesPerPoint <= 0 || minRedeemPoints < 1 || maxRedeemPercent < 1 || maxRedeemPercent > 100) {
      return res.status(400).json({ success: false, message: "Reward settings are out of range" });
    }

    const settings = await LoyaltySetting.findOneAndUpdate(
      { key: "default" },
      { $set: { enabled: req.body.enabled !== false, pointsPer100, rupeesPerPoint, minRedeemPoints, maxRedeemPercent } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: "Reward settings updated", data: settings });
  } catch (error) {
    console.error("ADMIN REWARDS SETTINGS UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update reward settings" });
  }
});

/* =========================================================
   CUSTOMER ORDERS
========================================================= */

app.get(
  "/api/orders",
  auth,
  async (req: AuthRequest, res) => {
    try {
      let filter: any = {};

      if (req.user!.role === "customer") {
        filter = { user: req.user!.id };
      } else if (req.user!.role === "delivery") {
        filter = {
          deliveryPartner: req.user!.id,
          // Keep delivered orders available so the delivery dashboard
          // can show delivery history without affecting active assignments.
          status: { $in: ["Packed", "Out for Delivery", "Delivered"] },
        };
      } else if (req.user!.role === "admin") {
        filter = await tenantFilter(req);
      } else {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      const orders = await Order.find(filter)
        .populate("user", "name email phone customerId")
        .populate("deliveryPartner", "name email phone")
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("ORDERS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load orders",
      });
    }
  }
);

/* =========================================================
   CREATE ORDER
========================================================= */

app.post(
  "/api/orders",
  auth,
  async (req: AuthRequest, res) => {
    const reservedStock: Array<{ productId: mongoose.Types.ObjectId; quantity: number; variantId?: string }> = [];
    try {
      const {
        items,
        address,
        paymentMethod,
        deliverySlot,
        couponCode,
        rewardPoints,
      } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      /* ---------------------------------------------
         Validate stock + product payment policy before creating order
      --------------------------------------------- */

      const authoritativeProducts: any[] = [];
      const authoritativeItems: any[] = [];
      for (const rawItem of items) {
        const item: any = { ...rawItem };
        const product = await Product.findById(item.product);

        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.name}`,
          });
        }

        if (!product.isActive) {
          return res.status(400).json({
            success: false,
            message: `${product.name} is currently unavailable`,
          });
        }

        const quantity = Math.floor(Number(item.quantity));
        if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ success: false, message: "Invalid product quantity in cart" });
        let selectedVariant: any = null;
        if (item.variantId) {
          selectedVariant = (product as any).variants?.find((v: any) => String(v._id) === String(item.variantId));
          if (!selectedVariant) return res.status(400).json({ success: false, message: `${product.name} variant is no longer available` });
          if (Number(selectedVariant.stock || 0) < quantity) return res.status(400).json({ success: false, message: `Only ${selectedVariant.stock} units of ${product.name} (${selectedVariant.name}) are available` });
          item.variantId = String(selectedVariant._id); item.variantName = String(selectedVariant.name || selectedVariant.unit || "");
          item.variantSku = String(selectedVariant.sku || ""); item.variantBarcode = String(selectedVariant.barcode || "");
          item.name = `${product.name} - ${selectedVariant.name || selectedVariant.unit || "Variant"}`;
          item.image = selectedVariant.image || product.image; item.price = Number(selectedVariant.sellingPrice || 0);
          item.unit = selectedVariant.unit || selectedVariant.name || product.unit;
        } else {
          if (product.stock < quantity) return res.status(400).json({ success: false, message: `Only ${product.stock} units of ${product.name} are available` });
          item.name = product.name; item.image = product.image; item.price = Number(product.sellingPrice || 0); item.unit = product.unit;
        }
        item.quantity = quantity; authoritativeItems.push(item); authoritativeProducts.push(product);
      }

      const paymentAvailability = getCartPaymentAvailability(authoritativeProducts);
      const requestedPaymentMethod = String(paymentMethod || "COD").trim().toUpperCase();
      if (!["COD", "ONLINE"].includes(requestedPaymentMethod)) {
        return res.status(400).json({ success: false, message: "Please select a valid payment method." });
      }
      if (requestedPaymentMethod === "COD" && !paymentAvailability.codAllowed) {
        return res.status(400).json({ success: false, message: "Cash on Delivery is not available for one or more items in this order. Please choose Online Payment." });
      }
      if (requestedPaymentMethod === "ONLINE" && !paymentAvailability.onlineAllowed) {
        return res.status(400).json({ success: false, message: "Online Payment is not available for all items in this order. Please choose Cash on Delivery." });
      }

      const mainAdminId = await getMainAdminId();
      const productOwners = new Set<string>();
      for (const item of items) {
        const product: any = await Product.findById(item.product).select("storeAdmin").lean();
        const owner = product?.storeAdmin ? String(product.storeAdmin) : (mainAdminId ? String(mainAdminId) : "");
        if (owner) productOwners.add(owner);
      }
      if (productOwners.size > 1) {
        return res.status(400).json({ success: false, message: "Products from different stores cannot be combined in one order." });
      }
      const orderStoreAdmin = productOwners.size
        ? new mongoose.Types.ObjectId(Array.from(productOwners)[0])
        : (mainAdminId || null);

      // Point 17: backend-authoritative COD risk enforcement. The customer can
      // choose a different payment method in the UI, but cannot bypass this
      // check by sending a crafted order request.
      if (requestedPaymentMethod === "COD") {
        const codRisk = await evaluateCodRisk(req.user!.id, orderStoreAdmin);
        if (codRisk.state === "COD_RESTRICTED") {
          return res.status(409).json({
            success:false,
            code:"COD_RISK_RESTRICTED",
            message:"Cash on Delivery is currently restricted for this account.",
            reason:codRisk.reason,
            data:codRisk,
          });
        }
      }

      const storeLocation: any = await getStoreLocationForOwner(orderStoreAdmin);
      const operatingStatus = getStoreOperatingStatus(storeLocation?.operatingHours);
      if (operatingStatus.configured && operatingStatus.status !== "OPEN") {
        return res.status(409).json({ success: false, code: "STORE_CLOSED", message: `This store is currently closed. ${operatingStatus.message}` });
      }
      if (storeLocation?.newOrdersPaused === true) {
        return res.status(409).json({ success: false, code: "NEW_ORDERS_PAUSED", message: storeLocation.newOrdersPauseReason || "This store is temporarily not accepting new orders." });
      }

      const subtotal = authoritativeItems.reduce(
        (sum: number, item: any) =>
          sum + Number(item.price) * Number(item.quantity),
        0
      );

      let safeDiscount = 0;
      let appliedCoupon: any = null;
      if (couponCode) {
        const coupon: any = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase(), ...(orderStoreAdmin ? { storeAdmin: orderStoreAdmin } : {}) });
        const now = new Date();
        if (!coupon || !coupon.isActive || now < coupon.startDate || now > coupon.expiryDate || (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) || subtotal < coupon.minOrderAmount) {
          return res.status(400).json({ success: false, message: "Coupon is no longer valid for this order" });
        }
        safeDiscount = coupon.discountType === "percentage" ? subtotal * Number(coupon.value) / 100 : Number(coupon.value);
        if (coupon.maxDiscount != null) safeDiscount = Math.min(safeDiscount, Number(coupon.maxDiscount));
        safeDiscount = Math.max(0, Math.min(safeDiscount, subtotal));
        appliedCoupon = coupon;
      }

      let safeRewardPoints = 0;
      let rewardDiscount = 0;
      const loyaltySettings: any = await getLoyaltySettings();
      if (rewardPoints != null && Number(rewardPoints) > 0) {
        if (!loyaltySettings.enabled) {
          return res.status(400).json({ success: false, message: "Rewards are currently disabled" });
        }
        const requestedPoints = Number(rewardPoints);
        if (!Number.isInteger(requestedPoints) || requestedPoints < loyaltySettings.minRedeemPoints) {
          return res.status(400).json({ success: false, message: `Minimum ${loyaltySettings.minRedeemPoints} points are required to redeem rewards` });
        }
        const currentUser: any = await User.findById(req.user!.id).select("loyaltyPoints").lean();
        const balance = Number(currentUser?.loyaltyPoints || 0);
        if (requestedPoints > balance) {
          return res.status(400).json({ success: false, message: "Not enough reward points" });
        }
        const maxByOrder = Math.floor((subtotal * (Number(loyaltySettings.maxRedeemPercent) / 100)) / Number(loyaltySettings.rupeesPerPoint));
        safeRewardPoints = Math.min(requestedPoints, maxByOrder);
        rewardDiscount = safeRewardPoints * Number(loyaltySettings.rupeesPerPoint);
        rewardDiscount = Math.max(0, Math.min(rewardDiscount, Math.max(0, subtotal - safeDiscount)));
        safeRewardPoints = Math.floor(rewardDiscount / Number(loyaltySettings.rupeesPerPoint));
        if (safeRewardPoints < loyaltySettings.minRedeemPoints) {
          return res.status(400).json({ success: false, message: `You can redeem a minimum of ${loyaltySettings.minRedeemPoints} points on this order` });
        }
        rewardDiscount = safeRewardPoints * Number(loyaltySettings.rupeesPerPoint);
      }

      const deliveryCharge =
        subtotal >= 499 ? 0 : 39;

      const total = Math.max(
        0,
        subtotal - safeDiscount - rewardDiscount + deliveryCharge
      );

      const deliveryLat = address?.latitude !== undefined && address?.latitude !== null && address?.latitude !== "" ? Number(address.latitude) : null;
      const deliveryLng = address?.longitude !== undefined && address?.longitude !== null && address?.longitude !== "" ? Number(address.longitude) : null;
      if (deliveryLat !== null && deliveryLng !== null && !isValidGeo(deliveryLat, deliveryLng)) return res.status(400).json({success:false,message:"Invalid delivery coordinates"});
      const deliveryLocation = {
        latitude: deliveryLat,
        longitude: deliveryLng,
        address: JSON.parse(JSON.stringify(address || {})),
        capturedAt: new Date(),
      };

      // Reserve stock atomically. The previous read/check above is only a UX
      // validation; this conditional decrement is the authoritative guard
      // against two customers buying the final units simultaneously.
      for (const item of authoritativeItems) {
        const productId = item.product;
        const quantity = Math.floor(Number(item.quantity));
        if (!mongoose.Types.ObjectId.isValid(String(productId)) || !Number.isInteger(quantity) || quantity <= 0) {
          return res.status(400).json({ success: false, message: "Invalid product quantity in cart" });
        }
        const hasVariant = Boolean(item.variantId);
        const reserveFilter: any = hasVariant
          ? { _id: productId, isActive: true, "variants._id": item.variantId, "variants.stock": { $gte: quantity } }
          : { _id: productId, isActive: true, stock: { $gte: quantity } };
        const reserveUpdate: any = hasVariant
          ? { $inc: { "variants.$.stock": -quantity, stock: -quantity } }
          : { $inc: { stock: -quantity } };
        const reserved = await Product.findOneAndUpdate(reserveFilter, reserveUpdate, { new: true });
        if (!reserved) {
          // Release only quantities reserved by this request.
          for (const r of reservedStock) {
            if (r.variantId) {
              await Product.updateOne({ _id: r.productId, "variants._id": r.variantId }, { $inc: { "variants.$.stock": r.quantity, stock: r.quantity } });
            } else {
              await Product.updateOne({ _id: r.productId }, { $inc: { stock: r.quantity } });
            }
          }
          reservedStock.length = 0;
          return res.status(409).json({
            success: false,
            message: "Some products are no longer available in the requested quantity.",
          });
        }
        reservedStock.push({ productId: reserved._id, quantity, ...(hasVariant ? { variantId: String(item.variantId) } : {}) });
      }

      const order = await Order.create({
        user: req.user!.id,
        items: authoritativeItems,
        subtotal,
        discount: safeDiscount,
        deliveryCharge,
        total,
        paymentMethod: requestedPaymentMethod,
        address,
        deliverySlot,
        deliveryLocation,
        deliveryAssignmentStatus: "UNASSIGNED",
        sourceType: (orderStoreAdmin && mainAdminId && String(orderStoreAdmin) !== String(mainAdminId)) ? "STORE" : "FRESHBASKET_DIRECT",
        status: "Pending",
      });
      await applyDeliverySlaForStatus(order, "Pending");
      await order.save();
      if (orderStoreAdmin) await Order.collection.updateOne({ _id: order._id }, { $set: { storeAdmin: orderStoreAdmin } });

      if (safeRewardPoints > 0) {
        await User.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(req.user!.id) },
          { $inc: { loyaltyPoints: -safeRewardPoints } }
        );
        await LoyaltyTransaction.create({
          user: req.user!.id,
          points: -safeRewardPoints,
          type: "redeem",
          order: order._id,
          description: `Redeemed ${safeRewardPoints} reward points on order #${String(order._id).slice(-8).toUpperCase()}`,
        });
        await Order.collection.updateOne({ _id: order._id }, { $set: { rewardPoints: safeRewardPoints, rewardDiscount } });
      }

      if (appliedCoupon) {
        await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: 1 } });
        await Order.collection.updateOne({ _id: order._id }, { $set: { couponCode: appliedCoupon.code } });
      }

      /* Stock was atomically reserved immediately before order creation. */
      for (const r of reservedStock) {
        const current:any = await Product.findById(r.productId).select("stock").lean();
        await recordStockHistory({
          product: r.productId,
          change: -r.quantity,
          previousStock: Number(current?.stock || 0) + r.quantity,
          newStock: Number(current?.stock || 0),
          reason: "Order placed",
          order: order._id,
        });
      }

      const orderCustomer: any = await User.findById(order.user).select("customerId name").lean();
      const orderSourceType = String((order as any).sourceType || "FRESHBASKET_DIRECT");
      await notifyUser({
        user: order.user,
        title: "Order placed",
        message: `Your order #${String(order._id).slice(-8).toUpperCase()} has been placed successfully. Customer ID: ${orderCustomer?.customerId || "—"}.`,
        type: "order",
        order: order._id,
      });
      await notifyAdmins({
        title: orderSourceType === "STORE" ? "New store order received" : "New FreshBasket order received",
        message: `${orderSourceType === "STORE" ? "Store order" : "FreshBasket direct order"} #${String(order._id).slice(-8).toUpperCase()} · Customer: ${orderCustomer?.name || "Customer"} · Customer ID: ${orderCustomer?.customerId || "—"} · Amount: ₹${Number(order.total || 0).toLocaleString("en-IN")} · Items: ${Array.isArray(order.items) ? order.items.length : 0}.`,
        type: "order",
        order: order._id,
        ...(orderStoreAdmin ? { storeAdmin: orderStoreAdmin } : {}),
      });
      await recordCustomerCareAudit({ req: req as AuthRequest, action: "ORDER_CREATED", targetType: "ORDER", targetId: order._id, customer: order.user, order: order._id, metadata: { sourceType: orderSourceType, customerId: orderCustomer?.customerId || "" } });
      reservedStock.length = 0;

      return res.status(201).json({
        success: true,
        message: "Order placed successfully",
        data: order,
      });
    } catch (error) {
      // If anything after reservation fails, return only this request's
      // reserved quantities. $inc is safe even if another order changed stock.
      for (const r of reservedStock) {
        try { await Product.updateOne({ _id: r.productId }, { $inc: { stock: r.quantity } }); } catch (rollbackError) { console.error("STOCK ROLLBACK ERROR:", rollbackError); }
      }
      reservedStock.length = 0;
      console.error("CREATE ORDER ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to place order",
      });
    }
  }
);

/* =========================================================
   ADMIN ORDERS
========================================================= */

app.get(
  "/api/admin/orders",
  auth,
  role("admin"),
  async (req:AuthRequest, res) => {
    try {
      const page = Math.max(
        1,
        Number(req.query.page || 1)
      );

      const limit = Math.min(
        50,
        Math.max(
          1,
          Number(req.query.limit || 10)
        )
      );

      const search = String(
        req.query.search || ""
      ).trim();

      const status = String(
        req.query.status || ""
      ).trim();

      // Orders management shows only active orders. Delivered/cancelled
      // orders are moved to the separate Order History section.
      const mainAdminId = await getMainAdminId();
      const isMainAdmin = String(req.user?.id || "") === String(mainAdminId || "");
      const requestedStoreAdmin = String(req.query.storeAdminId || "").trim();
      let orderTenantFilter: any = await tenantFilter(req as AuthRequest);
      if (isMainAdmin && requestedStoreAdmin && mongoose.Types.ObjectId.isValid(requestedStoreAdmin)) orderTenantFilter = { storeAdmin: requestedStoreAdmin };
      const filter: any = {
        $and: [
          orderTenantFilter,
          { status: { $nin: ["Delivered", "Cancelled"] } },
        ],
      };
      const sourceType = String(req.query.sourceType || "").trim().toUpperCase();
      if (isMainAdmin && ["STORE", "FRESHBASKET_DIRECT"].includes(sourceType)) filter.$and.push({ sourceType });

      if (status && !["Delivered", "Cancelled"].includes(status)) {
        filter.status = status;
      }

      let userIds: mongoose.Types.ObjectId[] = [];

      if (search) {
        const regex = new RegExp(search, "i");

        const matchingUsers = await User.find({
          role: "customer",
          $or: [
            { customerId: regex },
            { name: regex },
            { email: regex },
            { phone: regex },
          ],
        }).select("_id");

        userIds = matchingUsers.map(
          (u) => u._id
        );

        const isObjectId = mongoose.Types.ObjectId.isValid(
          search
        );

        const orderConditions: any[] = [];

        if (userIds.length) {
          orderConditions.push({
            user: {
              $in: userIds,
            },
          });
        }

        if (isObjectId) {
          orderConditions.push({
            _id: search,
          });
        }

        if (orderConditions.length) {
          filter.$and.push({ $or: orderConditions });
        } else {
          return res.json({
            success: true,
            data: [],
            meta: {
              page,
              limit,
              total: 0,
              pages: 0,
            },
          });
        }
      }

      const total = await Order.countDocuments(filter);

      const orders = await Order.find(filter)
        .populate(
          "user",
          "name email phone blocked"
        )
        .populate(
          "deliveryPartner",
          "name email phone role blocked"
        )
        .sort({
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        data: orders,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("ADMIN ORDERS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load admin orders",
      });
    }
  }
);

/* =========================================================
   ADMIN ORDER HISTORY
========================================================= */

app.get(
  "/api/admin/orders/history",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
      const filter: any = {
        $and: [
          await tenantFilter(req as AuthRequest),
          { status: { $in: ["Delivered", "Cancelled"] } },
        ],
      };

      const total = await Order.countDocuments(filter);
      const orders = await Order.find(filter)
        .populate("user", "name email phone blocked")
        .populate("deliveryPartner", "name email phone role blocked")
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        data: orders,
        meta: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("ADMIN ORDER HISTORY ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load order history",
      });
    }
  }
);

/* =========================================================
   MAIN ADMIN IDENTITY CARD GENERATOR
========================================================= */

app.get("/api/admin/identity-card-accounts", auth, mainAdminOnly, async (_req, res) => {
  try {
    const accounts = await User.find({
      role: { $in: ["delivery", "admin", "customer_care", "finance_manager", "finance_executive"] },
    })
      .select("name email phone role employeeId department storeAdmin profilePhoto blocked")
      .sort({ name: 1 })
      .lean();

    const data = accounts.map((account: any) => ({
      ...account,
      isMainAdmin: String(account.email || "").trim().toLowerCase() === MAIN_ADMIN_EMAIL,
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("IDENTITY CARD ACCOUNT LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load ID card accounts" });
  }
});

app.get("/api/admin/identity-cards", auth, mainAdminOnly, async (_req, res) => {
  try {
    const cards: any[] = await IdentityCard.find()
      .sort({ createdAt: -1 })
      .populate("storeAdmin", "name email")
      .lean();
    const data = await Promise.all(cards.map(async (card: any) => {
      let verificationToken = String(card.verificationToken || "").trim();
      if (!verificationToken) {
        const candidate = crypto.randomBytes(24).toString("hex");
        const updated: any = await IdentityCard.findOneAndUpdate(
          { _id: card._id, $or: [{ verificationToken: { $exists: false } }, { verificationToken: "" }] },
          { $set: { verificationToken: candidate } },
          { new: true }
        ).select("verificationToken").lean();
        verificationToken = String(updated?.verificationToken || "").trim();
        if (!verificationToken) {
          const existing: any = await IdentityCard.findById(card._id).select("verificationToken").lean();
          verificationToken = String(existing?.verificationToken || "").trim();
        }
      }
      let currentStatus = String(card.status || "active").toLowerCase() === "revoked" ? "REVOKED" : "ACTIVE";
      if (currentStatus === "ACTIVE" && card.expiryDate && new Date(card.expiryDate).getTime() <= Date.now()) currentStatus = "EXPIRED";
      if (currentStatus === "ACTIVE" && card.linkedUser) {
        const linked: any = await User.findById(card.linkedUser).select("blocked").lean();
        if (!linked || linked.blocked) currentStatus = "INACTIVE";
      }
      return { ...card, verificationToken, currentStatus };
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("IDENTITY CARD LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load identity cards" });
  }
});

app.post("/api/admin/identity-cards", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const holderType = String(req.body.holderType || "").trim();
    let name = String(req.body.name || "").trim();
    let email = String(req.body.email || "").trim().toLowerCase();
    let phone = String(req.body.phone || "").trim();
    let employeeId = String(req.body.employeeId || "").trim() || await nextUserIdentifier("employee");
    let department = String(req.body.department || "").trim();
    const designation = String(req.body.designation || "").trim();
    const address = String(req.body.address || "").trim();
    const emergencyContact = String(req.body.emergencyContact || "").trim();
    let photo = String(req.body.photo || "").trim();
    const sourceId = String(req.body.sourceId || req.body.storeAdminId || "").trim();
    const expiryDate = new Date(req.body.expiryDate);

    const validHolderTypes = ["delivery", "store-admin", "customer-care", "finance-manager", "finance-executive", "main-admin", "sub-admin", "operations-executive", "ecommerce-marketplace-executive", "inventory-warehouse-executive", "sales-business-development-executive", "marketing-executive", "technology-it-employee", "hr-administration", "employee"];
    if (!validHolderTypes.includes(holderType)) {
      return res.status(400).json({ success: false, message: "Select a valid ID card type" });
    }
    if (name.length < 2) return res.status(400).json({ success: false, message: "Full name is required" });
    if (designation.length < 2) return res.status(400).json({ success: false, message: "Designation is required" });
    if (!Number.isFinite(expiryDate.getTime()) || expiryDate <= new Date()) {
      return res.status(400).json({ success: false, message: "Expiry date must be a valid future date" });
    }
    if (photo && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photo) && !/^https?:\/\//i.test(photo)) {
      return res.status(400).json({ success: false, message: "Photo must be an image" });
    }

    let resolvedStoreAdmin: any = null;
    let linkedUser: any = null;
    let linkedRole = "";
    const roleMap: Record<string, string[]> = {
      delivery: ["delivery"],
      "store-admin": ["admin"],
      "main-admin": ["admin"],
      "sub-admin": ["admin"],
      "customer-care": ["customer_care"],
      "finance-manager": ["finance_manager"],
      "finance-executive": ["finance_executive"],
    };

    if (roleMap[holderType]) {
      if (!mongoose.Types.ObjectId.isValid(sourceId)) {
        return res.status(400).json({ success: false, message: "Select an existing account" });
      }
      const account: any = await User.findOne({ _id: sourceId, role: { $in: roleMap[holderType] || [] } })
        .select("_id name email phone role storeAdmin employeeId department profilePhoto blocked")
        .lean();
      if (!account) return res.status(404).json({ success: false, message: "Selected account not found" });
      if (account.blocked) return res.status(400).json({ success: false, message: "Selected account is inactive" });
      if (holderType === "main-admin" || holderType === "sub-admin") {
        const mainAdminId = await getMainAdminId();
        const isMainAdmin = Boolean(mainAdminId && String(account._id) === String(mainAdminId));
        if (holderType === "main-admin" && !isMainAdmin) {
          return res.status(400).json({ success: false, message: "Select the configured Main Admin account" });
        }
        if (holderType === "sub-admin" && isMainAdmin) {
          return res.status(400).json({ success: false, message: "Main Admin cannot be issued as Sub Admin" });
        }
      }
      linkedUser = account._id;
      linkedRole = account.role;
      resolvedStoreAdmin = account.role === "admin" ? account._id : (account.storeAdmin || null);
      // For linked employees, identity data must come from the authenticated
      // account record. Designation/address/emergency contact remain card-specific
      // fields, but core identity fields cannot be spoofed from the form.
      name = String(account.name || name).trim();
      email = String(account.email || email).trim().toLowerCase();
      phone = String(account.phone || phone).trim();
      employeeId = String(account.employeeId || employeeId).trim();
      department = String(account.department || department).trim();
      if (account.profilePhoto) photo = String(account.profilePhoto).trim();
    }

    const prefixMap: Record<string, string> = {
      delivery: "DEL",
      "store-admin": "ADM",
      "customer-care": "CARE",
      "finance-manager": "FIN",
      "finance-executive": "FINX",
      "main-admin": "MAIN",
      "sub-admin": "SUB",
      "operations-executive": "OPS",
      "ecommerce-marketplace-executive": "ECOM",
      "inventory-warehouse-executive": "INV",
      "sales-business-development-executive": "SALES",
      "marketing-executive": "MKT",
      "technology-it-employee": "IT",
      "hr-administration": "HR",
      employee: "EMP",
    };
    const prefix = prefixMap[holderType] || "EMP";
    let cardNumber = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      cardNumber = `FB-${prefix}-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      if (!(await IdentityCard.exists({ cardNumber }))) break;
    }

    const verificationToken = crypto.randomBytes(24).toString("hex");
    const card = await IdentityCard.create({
      cardNumber, verificationToken, holderType, name, email, phone, employeeId, designation, department,
      address, emergencyContact, photo, storeAdmin: resolvedStoreAdmin, linkedUser, linkedRole,
      expiryDate, createdBy: req.user!.id,
    });
    await recordCustomerCareAudit({ req, action: "IDENTITY_CARD_GENERATED", targetType: "IDENTITY_CARD", targetId: card._id, metadata: { cardNumber: card.cardNumber, holderType: card.holderType, linkedUser: card.linkedUser || null } });

    return res.status(201).json({ success: true, message: "Professional identity card generated", data: card });
  } catch (error) {
    console.error("IDENTITY CARD CREATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to generate identity card" });
  }
});

app.patch("/api/admin/identity-cards/:id/revoke", auth, mainAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Identity card not found" });
    const card = await IdentityCard.findByIdAndUpdate(req.params.id, { status: "revoked" }, { new: true });
    if (!card) return res.status(404).json({ success: false, message: "Identity card not found" });
    await recordCustomerCareAudit({ req, action: "IDENTITY_CARD_REVOKED", targetType: "IDENTITY_CARD", targetId: card._id, metadata: { cardNumber: card.cardNumber } });
    return res.json({ success: true, message: "Identity card revoked", data: card });
  } catch (error) {
    console.error("IDENTITY CARD REVOKE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to revoke identity card" });
  }
});

app.get("/api/my/identity-card", auth, async (req: AuthRequest, res) => {
  try {
    const card: any = await IdentityCard.findOne({ linkedUser: req.user!.id })
      .sort({ createdAt: -1 })
      .lean();
    if (!card) return res.json({ success: true, data: null });

    let currentStatus = String(card.status || "active").toLowerCase() === "revoked" ? "REVOKED" : "ACTIVE";
    if (currentStatus === "ACTIVE" && card.expiryDate && new Date(card.expiryDate).getTime() <= Date.now()) currentStatus = "EXPIRED";
    if (currentStatus === "ACTIVE") {
      const linked: any = await User.findById(req.user!.id).select("blocked").lean();
      if (!linked || linked.blocked) currentStatus = "INACTIVE";
    }

    return res.json({ success: true, data: { ...card, currentStatus } });
  } catch (error) {
    console.error("MY IDENTITY CARD ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load your identity card" });
  }
});

app.delete("/api/admin/identity-cards/:id", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Identity card not found" });
    }
    const card: any = await IdentityCard.findByIdAndDelete(req.params.id).lean();
    if (!card) return res.status(404).json({ success: false, message: "Identity card not found" });

    await recordCustomerCareAudit({
      req,
      action: "IDENTITY_CARD_DELETED",
      targetType: "IDENTITY_CARD",
      targetId: card._id,
      metadata: { cardNumber: card.cardNumber, holderType: card.holderType, linkedUser: card.linkedUser || null },
    });

    return res.json({ success: true, message: "Identity card deleted", data: card });
  } catch (error) {
    console.error("IDENTITY CARD DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to delete identity card" });
  }
});

app.get("/api/public/employee-verification/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!/^[a-f0-9]{48}$/i.test(token)) return res.status(400).json({ success: false, message: "Invalid employee verification token" });
    const card: any = await IdentityCard.findOne({ verificationToken: token }).lean();
    if (!card) return res.status(404).json({ success: false, message: "Invalid employee ID" });

    const linked: any = card.linkedUser ? await User.findById(card.linkedUser).select("name email phone role employeeId department blocked storeAdmin").lean() : null;
    const store: any = linked?.storeAdmin ? await StoreLocation.findOne({ storeAdmin: linked.storeAdmin }).select("name address").lean() : null;
    let status = String(card.status || "active").toLowerCase() === "revoked" ? "REVOKED" : "ACTIVE";
    if (status === "ACTIVE" && card.expiryDate && new Date(card.expiryDate).getTime() <= Date.now()) status = "EXPIRED";
    if (status === "ACTIVE" && card.linkedUser && (!linked || linked.blocked)) status = "INACTIVE";

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({
      success: true,
      data: {
        verified: status === "ACTIVE",
        status,
        verificationTimestamp: new Date().toISOString(),
        employee: {
          name: linked?.name || card.name || "N/A",
          designation: card.designation || "N/A",
          employeeId: linked?.employeeId || card.employeeId || "N/A",
          department: linked?.department || card.department || "N/A",
          storeBranch: store?.name || "N/A",
          email: linked?.email || card.email || "N/A",
          phone: linked?.phone || card.phone || "N/A",
          photo: linked?.profilePhoto || card.photo || "",
          address: card.address || "N/A",
          emergencyContact: card.emergencyContact || "N/A",
          issuedDate: card.issueDate || null,
          validUntil: card.expiryDate || null,
        }
      }
    });
  } catch (error) {
    console.error("PUBLIC EMPLOYEE VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to verify this employee ID" });
  }
});



/* =========================================================
   PUBLIC STORE + DELIVERY APPLICATIONS
   Additive onboarding flow. Existing auth/store/delivery APIs remain unchanged.
========================================================= */

const APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED", "ON_HOLD"];
(Application as any).schema.add({ personalPhoto: { type: String, default: "", maxlength: 1000000 } });
const STORE_TYPES = ["Grocery", "Medical", "Restaurant/Food", "Electronics", "Clothing", "General Store", "Local Retail", "Other"];
const BUSINESS_TYPES = ["Proprietorship", "Partnership", "Company", "Other"];
const DELIVERY_AVAILABILITY = ["Full Time", "Part Time", "Flexible"];
const VEHICLE_TYPES = ["Bike", "Scooter", "Cycle", "EV", "Other"];
const DOCUMENT_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const makeApplicationId = (type: "STORE" | "DELIVERY") => {
  const prefix = type === "STORE" ? "FB-STORE-APP" : "FB-DEL-APP";
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

const normalizeApplicationPhone = (value: any) => String(value || "").replace(/\D/g, "");
const validApplicationEmail = (value: any) => !String(value || "").trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
const validApplicationPincode = (value: any) => /^\d{5,6}$/.test(String(value || "").trim());
const validApplicationCoordinates = (lat: any, lng: any) => {
  if (lat === "" || lat == null || lng === "" || lng == null) return true;
  const a = Number(lat), b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
};

const cleanApplicationDocuments = (input: any) => {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 10).map((d: any) => ({
    documentType: String(d?.documentType || "OTHER").trim().slice(0, 80),
    label: String(d?.label || "").trim().slice(0, 120),
    required: Boolean(d?.required),
    fileName: String(d?.fileName || "").trim().slice(0, 240),
    mimeType: String(d?.mimeType || "").trim().toLowerCase().slice(0, 120),
    data: String(d?.data || ""),
    uploadedAt: d?.uploadedAt ? new Date(d.uploadedAt) : new Date(),
  }));
};

const validateApplicationDocuments = (documents: any[]) => {
  for (const d of documents) {
    if (!d.data) return "Uploaded document data is missing";
    if (!DOCUMENT_MIME_TYPES.includes(d.mimeType)) return `Unsupported document type: ${d.fileName || d.documentType}`;
    if (!/^data:(image\/(jpeg|jpg|png|webp)|application\/pdf);base64,/i.test(d.data)) return `Invalid document format: ${d.fileName || d.documentType}`;
    if (d.data.length > 1_300_000) return `Document is too large: ${d.fileName || d.documentType}`;
  }
  return "";
};

const applicationRequiredError = (type: "STORE" | "DELIVERY", body: any) => {
  const required = type === "STORE"
    ? [
        ["applicantName", "Full name"], ["phone", "Mobile number"], ["email", "Email address"],
        ["city", "City"], ["state", "State"], ["pincode", "Pincode"], ["storeName", "Store / Shop name"],
        ["storeCategory", "Store category"], ["storeDescription", "Store description"], ["storeAddress", "Store address"],
        ["contactPersonName", "Contact person name"], ["contactNumber", "Contact number"], ["contactEmail", "Contact email"],
      ]
    : [
        ["applicantName", "Full name"], ["phone", "Mobile number"], ["dateOfBirth", "Date of birth"],
        ["city", "City"], ["state", "State"], ["pincode", "Pincode"], ["currentAddress", "Current address"],
        ["preferredDeliveryCity", "Preferred delivery city"],
      ];
  for (const [key, label] of required) if (!String(body?.[key] ?? "").trim()) return `${label} is required`;
  if (!body.declarationAccurate || !body.declarationContact) return "Please accept both declarations before submitting";
  const phone = normalizeApplicationPhone(body.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) return "Enter a valid 10-digit mobile number";
  if (!validApplicationEmail(body.email) || !validApplicationEmail(body.contactEmail)) return "Enter valid email addresses";
  if (!validApplicationPincode(body.pincode)) return "Enter a valid pincode";
  if (type === "STORE") {
    const contact = normalizeApplicationPhone(body.contactNumber);
    if (!/^[6-9]\d{9}$/.test(contact)) return "Enter a valid contact person mobile number";
    if (body.storeType && !STORE_TYPES.includes(String(body.storeType))) return "Invalid store type";
    if (body.businessType && !BUSINESS_TYPES.includes(String(body.businessType))) return "Invalid business type";
  } else if (body.availability && !DELIVERY_AVAILABILITY.includes(String(body.availability))) {
    return "Invalid availability option";
  }
  if (!validApplicationCoordinates(body.latitude, body.longitude)) return "Invalid store coordinates";
  return "";
};

const applicationListProjection = (r: any) => ({
  _id: r._id,
  applicationId: r.applicationId,
  applicationType: r.applicationType,
  applicantName: r.applicantName,
  personalPhoto: r.personalPhoto || "",
  phone: r.phone,
  email: r.email,
  city: r.city,
  state: r.state,
  pincode: r.pincode,
  storeName: r.storeName,
  storeCategory: r.storeCategory,
  vehicleType: r.vehicleType,
  status: r.status,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  assignedAdminId: r.assignedAdminId,
  assignedAdmin: r.assignedAdminId && typeof r.assignedAdminId === "object" ? r.assignedAdminId : null,
  reviewedBy: r.reviewedBy,
  reviewedAt: r.reviewedAt,
  createdStoreId: r.createdStoreId,
  createdDeliveryPartnerId: r.createdDeliveryPartnerId,
});

const notifyMainAdminsAboutApplication = async (application: any) => {
  const main: any = await User.findOne({ role: "admin", email: MAIN_ADMIN_EMAIL, blocked: { $ne: true } }).select("_id").lean();
  if (!main) return;
  const isStore = application.applicationType === "STORE";
  await notifyUser({
    user: main._id,
    title: isStore ? "New Store Application" : "New Delivery Partner Application",
    message: `${application.applicationId} · ${application.applicantName}${isStore && application.storeName ? ` · ${application.storeName}` : ""}${application.city ? ` · ${application.city}` : ""}`.slice(0, 500),
    type: isStore ? "store_application" : "delivery_application",
    relatedEntity: "APPLICATION",
    relatedEntityId: application.applicationId,
  });
};

const notifyLinkedCustomerAboutApplication = async (application: any) => {
  try {
    const email = String(application.email || "").trim().toLowerCase();
    const phone = normalizeApplicationPhone(application.phone);
    if (!email && !phone) return;
    const customer: any = await User.findOne({ role: "customer", blocked: { $ne: true }, $or: [{ email }, { phone }] }).select("_id").lean();
    if (!customer) return;
    await notifyUser({
      user: customer._id,
      title: "Application status updated",
      message: `${application.applicationId} is now ${application.status}.`,
      type: "application_status",
      relatedEntity: "APPLICATION",
      relatedEntityId: application.applicationId,
    });
  } catch (error) { console.error("APPLICATION CUSTOMER NOTIFICATION ERROR:", error); }
};


app.post("/api/public/applications", async (req, res) => {
  try {
    const type = String(req.body?.applicationType || "").toUpperCase() as "STORE" | "DELIVERY";
    if (type !== "STORE" && type !== "DELIVERY") return res.status(400).json({ success: false, message: "Invalid application type" });
    const error = applicationRequiredError(type, req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });

    const storeImage = String(req.body?.storeImage || "");
    const storeImageUrl = String(req.body?.storeImageUrl || "").trim();
    if (type === "STORE" && storeImage && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(storeImage)) return res.status(400).json({ success: false, message: "Store image must be a JPG, JPEG, PNG or WEBP image" });
    if (type === "STORE" && storeImageUrl && !/^https?:\/\//i.test(storeImageUrl)) return res.status(400).json({ success: false, message: "Store image URL must start with http:// or https://" });
    if (type === "STORE" && storeImage.length > 1_500_000) return res.status(400).json({ success: false, message: "Store image is too large" });
    const personalPhoto = String(req.body?.personalPhoto || "").trim();
    if (personalPhoto && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(personalPhoto) && !/^https?:\/\//i.test(personalPhoto)) return res.status(400).json({success:false,message:"Personal photo must be a JPG, JPEG, PNG or WEBP image"});
    if (personalPhoto.length > 1000000) return res.status(400).json({success:false,message:"Personal photo is too large"});
    const documents = cleanApplicationDocuments(req.body?.documents);
    const documentError = validateApplicationDocuments(documents);
    if (documentError) return res.status(400).json({ success: false, message: documentError });

    const phone = normalizeApplicationPhone(req.body.phone);
    const contactNumber = normalizeApplicationPhone(req.body.contactNumber);
    const application: any = await Application.create({
      applicationId: makeApplicationId(type),
      applicationType: type,
      status: "SUBMITTED",
      applicantName: String(req.body.applicantName).trim(),
      phone,
      email: String(req.body.email || "").trim().toLowerCase(),
      alternatePhone: normalizeApplicationPhone(req.body.alternatePhone),
      dateOfBirth: String(req.body.dateOfBirth || "").trim(),
      gender: String(req.body.gender || "").trim(),
      city: String(req.body.city).trim(),
      state: String(req.body.state).trim(),
      pincode: String(req.body.pincode).trim(),
      currentAddress: String(req.body.currentAddress || "").trim(),
      ...(type === "STORE" ? {
        storeName: String(req.body.storeName || "").trim(),
        storeCategory: String(req.body.storeCategory || "").trim(),
        otherStoreCategory: String(req.body.otherStoreCategory || "").trim(),
        storeDescription: String(req.body.storeDescription || "").trim(),
        storeAddress: String(req.body.storeAddress || "").trim(),
        landmark: String(req.body.landmark || "").trim(),
        latitude: req.body.latitude === "" || req.body.latitude == null ? null : Number(req.body.latitude),
        longitude: req.body.longitude === "" || req.body.longitude == null ? null : Number(req.body.longitude),
        storeType: String(req.body.storeType || "").trim(),
        storeImage: String(req.body.storeImage || ""),
        storeImageUrl: String(req.body.storeImageUrl || "").trim(),
        businessName: String(req.body.businessName || "").trim(),
        gstin: String(req.body.gstin || "").trim().toUpperCase(),
        pan: String(req.body.pan || "").trim().toUpperCase(),
        businessType: String(req.body.businessType || "").trim(),
        yearsInBusiness: String(req.body.yearsInBusiness || "").trim(),
        employeeCount: String(req.body.employeeCount || "").trim(),
        contactPersonName: String(req.body.contactPersonName || "").trim(),
        contactNumber,
        contactEmail: String(req.body.contactEmail || "").trim().toLowerCase(),
        preferredContactMethod: String(req.body.preferredContactMethod || "Phone").trim(),
      } : {
        preferredDeliveryCity: String(req.body.preferredDeliveryCity || "").trim(),
        preferredAreas: String(req.body.preferredAreas || "").trim(),
        servicePincodes: String(req.body.servicePincodes || "").trim(),
        availability: String(req.body.availability || "Flexible").trim(),
        preferredWorkingHours: String(req.body.preferredWorkingHours || "").trim(),
        vehicleType: String(req.body.vehicleType || "").trim(),
        vehicleRegistrationNumber: String(req.body.vehicleRegistrationNumber || "").trim().toUpperCase(),
        drivingLicenceNumber: String(req.body.drivingLicenceNumber || "").trim().toUpperCase(),
        vehicleOwnership: String(req.body.vehicleOwnership || "").trim(),
        emergencyContactName: String(req.body.emergencyContactName || "").trim(),
        emergencyContactRelationship: String(req.body.emergencyContactRelationship || "").trim(),
        emergencyContactNumber: normalizeApplicationPhone(req.body.emergencyContactNumber),
        previousDeliveryExperience: String(req.body.previousDeliveryExperience || "No").trim(),
        previousDeliveryCompany: String(req.body.previousDeliveryCompany || "").trim(),
        previousDeliveryDuration: String(req.body.previousDeliveryDuration || "").trim(),
      }),
      personalPhoto,
      documents,
      declarationAccurate: Boolean(req.body.declarationAccurate),
      declarationContact: Boolean(req.body.declarationContact),
      statusHistory: [{ status: "SUBMITTED", by: null, actorRole: "public", note: "Application submitted", at: new Date() }],
    });
    await notifyMainAdminsAboutApplication(application);
    return res.status(201).json({ success: true, message: "Application submitted successfully.", data: { applicationId: application.applicationId, applicationType: type, submittedAt: application.createdAt, status: application.status } });
  } catch (error: any) {
    console.error("PUBLIC APPLICATION CREATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to submit application. Please try again." });
  }
});

app.get("/api/public/applications/:applicationId/status", async (req, res) => {
  try {
    const application: any = await Application.findOne({ applicationId: String(req.params.applicationId || "").trim().toUpperCase() }).select("applicationId applicationType applicantName city storeName vehicleType status publicMessage createdAt updatedAt statusHistory").lean();
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    const history = Array.isArray(application.statusHistory) ? application.statusHistory.map((h: any) => ({ status: h.status, at: h.at })) : [];
    return res.json({ success: true, data: { applicationId: application.applicationId, applicationType: application.applicationType, applicantName: application.applicantName, city: application.city, storeName: application.storeName || "", vehicleType: application.vehicleType || "", status: application.status, publicMessage: application.publicMessage || "", submittedAt: application.createdAt, updatedAt: application.updatedAt, statusHistory: history } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load application status" });
  }
});

app.get("/api/admin/applications", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const type = String(req.query.type || "").toUpperCase();
    const status = String(req.query.status || "").toUpperCase();
    const search = String(req.query.search || "").trim();
    const filter: any = {};
    if (type === "STORE" || type === "DELIVERY") filter.applicationType = type;
    if (APPLICATION_STATUSES.includes(status)) filter.status = status;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ applicationId: re }, { applicantName: re }, { storeName: re }, { phone: re }, { email: re }, { city: re }];
    }
    const rows: any[] = await Application.find(filter).sort({ createdAt: -1 }).limit(500).populate("assignedAdminId", "name email phone employeeId role").populate("reviewedBy", "name email employeeId role").lean();
    return res.json({ success: true, data: rows.map(applicationListProjection) });
  } catch (error) {
    console.error("ADMIN APPLICATION LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load applications" });
  }
});

app.get("/api/admin/applications/:id", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const query: any = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { applicationId: id }] } : { applicationId: id };
    const application: any = await Application.findOne(query).populate("assignedAdminId", "name email phone employeeId role").populate("reviewedBy", "name email employeeId role").populate("approvedBy", "name email employeeId role").populate("createdStoreId", "name email phone role storeImage storeCategory storeDescription").populate("createdDeliveryPartnerId", "name email phone role employeeId").populate("statusHistory.by", "name email employeeId role").lean();
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    await recordCustomerCareAudit({ req, action: "APPLICATION_VIEWED", targetType: "APPLICATION", targetId: application._id, metadata: { applicationId: application.applicationId, applicationType: application.applicationType } });
    const auditHistory: any[] = await AuditLog.find({ targetType: "APPLICATION", $or: [{ targetId: String(application._id) }, { targetId: String(application.applicationId) }] }).sort({ createdAt: -1 }).limit(100).populate("actor", "name email employeeId role").lean();
    return res.json({ success: true, data: { ...application, auditHistory: auditHistory.map((a: any) => ({ _id: a._id, action: a.action, actorRole: a.actorRole, actor: a.actor || null, actorEmployeeId: a.actorEmployeeId || "", timestamp: a.createdAt, metadata: a.metadata || {} })) } });
  } catch (error) {
    console.error("ADMIN APPLICATION DETAIL ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load application" });
  }
});

app.get("/api/admin/applications-admins", auth, mainAdminOnly, async (_req, res) => {
  try {
    const rows = await User.find({ role: "admin", blocked: { $ne: true } }).select("name email phone employeeId role storeAdmin").sort({ name: 1 }).lean();
    return res.json({ success: true, data: rows });
  } catch { return res.status(500).json({ success: false, message: "Unable to load admin accounts" }); }
});

app.get("/api/admin/applications-delivery-partners", auth, mainAdminOnly, async (_req, res) => {
  try {
    const rows = await User.find({ role: "delivery", blocked: { $ne: true } }).select("name email phone employeeId role storeAdmin").sort({ name: 1 }).lean();
    return res.json({ success: true, data: rows });
  } catch { return res.status(500).json({ success: false, message: "Unable to load delivery partners" }); }
});

app.patch("/api/admin/applications/:id/assign", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const application: any = await Application.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null }, { applicationId: req.params.id }] });
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    const assignedId = String(req.body.assignedAdminId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(assignedId)) return res.status(400).json({ success: false, message: "Select a valid admin" });
    const admin: any = await User.findOne({ _id: assignedId, role: "admin", blocked: { $ne: true } }).select("_id").lean();
    if (!admin) return res.status(400).json({ success: false, message: "Admin account not available" });
    application.assignedAdminId = admin._id;
    application.statusHistory.push({ status: application.status, by: req.user!.id, actorRole: req.user!.role, note: "Application assigned", at: new Date() });
    await application.save();
    await recordCustomerCareAudit({ req, action: "APPLICATION_ASSIGNED", targetType: "APPLICATION", targetId: application._id, metadata: { applicationId: application.applicationId, assignedAdminId: admin._id } });
    return res.json({ success: true, message: "Application assigned", data: { applicationId: application.applicationId, assignedAdminId: admin._id } });
  } catch (error: any) { return res.status(400).json({ success: false, message: error?.message || "Unable to assign application" }); }
});

app.patch("/api/admin/applications/:id/review", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const application: any = await Application.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null }, { applicationId: req.params.id }] });
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    const nextStatus = String(req.body.status || "").toUpperCase();
    if (!APPLICATION_STATUSES.includes(nextStatus)) return res.status(400).json({ success: false, message: "Invalid application status" });
    if (["REJECTED", "ON_HOLD", "NEED_MORE_INFORMATION"].includes(nextStatus) && String(req.body.reason || "").trim().length < 3) return res.status(400).json({ success: false, message: "A reason/message is required" });
    if (nextStatus === "APPROVED") {
      const storeAdminId = String(req.body.storeAdminId || "").trim();
      const deliveryPartnerId = String(req.body.deliveryPartnerId || "").trim();
      if (application.applicationType === "STORE" && !storeAdminId) return res.status(400).json({ success: false, message: "Select an existing Store Admin before approving this Store Application" });
      if (application.applicationType === "DELIVERY" && !deliveryPartnerId) return res.status(400).json({ success: false, message: "Select an existing Delivery Partner account before approving this application" });
      if (application.applicationType === "STORE" && storeAdminId) {
        if (!mongoose.Types.ObjectId.isValid(storeAdminId)) return res.status(400).json({ success: false, message: "Invalid Store Admin" });
        const admin: any = await User.findOne({ _id: storeAdminId, role: "admin", blocked: { $ne: true } });
        if (!admin) return res.status(400).json({ success: false, message: "Store Admin account not available" });
        const storeImage = String(application.storeImageUrl || application.storeImage || "");
        await User.collection.updateOne({ _id: admin._id }, { $set: { storeAdmin: admin._id, storeImage, storeCategory: application.storeCategory || application.otherStoreCategory || "Local Store", storeDescription: application.storeDescription || "" } });
        await StoreLocation.findOneAndUpdate({ key: String(admin._id) }, { $set: { key: String(admin._id), storeAdmin: admin._id, name: application.storeName, image: storeImage, address: application.storeAddress, category: application.storeCategory || application.otherStoreCategory || "Local Store", description: application.storeDescription || "", latitude: application.latitude ?? null, longitude: application.longitude ?? null, phone: application.contactNumber || application.phone, email: application.contactEmail || application.email } }, { upsert: true, new: true, setDefaultsOnInsert: true });
        application.createdStoreId = admin._id;
      }
      if (application.applicationType === "DELIVERY" && deliveryPartnerId) {
        if (!mongoose.Types.ObjectId.isValid(deliveryPartnerId)) return res.status(400).json({ success: false, message: "Invalid Delivery Partner" });
        const partner: any = await User.findOne({ _id: deliveryPartnerId, role: "delivery", blocked: { $ne: true } }).select("_id employeeId").lean();
        if (!partner) return res.status(400).json({ success: false, message: "Delivery Partner account not available" });
        application.createdDeliveryPartnerId = partner._id;
        application.createdEmployeeId = String(partner.employeeId || "");
      }
    }
    application.status = nextStatus;
    application.reviewedBy = req.user!.id as any;
    application.reviewedAt = new Date();
    if (nextStatus === "REJECTED") application.rejectionReason = String(req.body.reason || "").trim();
    if (nextStatus === "NEED_MORE_INFORMATION") application.publicMessage = String(req.body.reason || "").trim();
    if (nextStatus === "ON_HOLD") application.publicMessage = String(req.body.reason || "").trim();
    if (nextStatus !== "NEED_MORE_INFORMATION" && nextStatus !== "ON_HOLD") application.publicMessage = nextStatus === "REJECTED" ? "" : application.publicMessage;
    if (String(req.body.adminNotes || "").trim()) application.adminNotes = String(req.body.adminNotes).trim().slice(0, 5000);
    if (nextStatus === "APPROVED") { application.approvedBy = req.user!.id as any; application.approvedAt = new Date(); }
    application.statusHistory.push({ status: nextStatus, by: req.user!.id, actorRole: req.user!.role, note: nextStatus === "REJECTED" ? application.rejectionReason : (nextStatus === "NEED_MORE_INFORMATION" || nextStatus === "ON_HOLD" ? application.publicMessage : String(req.body.adminNotes || "").trim()), at: new Date() });
    await application.save();
    await notifyLinkedCustomerAboutApplication(application);
    const applicationAuditAction = nextStatus === "UNDER_REVIEW" ? "APPLICATION_REVIEW_STARTED" : `APPLICATION_${nextStatus}`;
    await recordCustomerCareAudit({ req, action: applicationAuditAction, targetType: "APPLICATION", targetId: application._id, metadata: { applicationId: application.applicationId, applicationType: application.applicationType, status: nextStatus } });
    if (nextStatus === "APPROVED" && application.applicationType === "STORE" && application.createdStoreId) {
      await recordCustomerCareAudit({ req, action: "STORE_CREATED_FROM_APPLICATION", targetType: "STORE", targetId: application.createdStoreId, metadata: { applicationId: application.applicationId } });
    }
    return res.json({ success: true, message: nextStatus === "APPROVED" ? "Application approved" : "Application status updated", data: { applicationId: application.applicationId, status: application.status, createdStoreId: application.createdStoreId, createdDeliveryPartnerId: application.createdDeliveryPartnerId } });
  } catch (error: any) {
    console.error("APPLICATION REVIEW ERROR:", error);
    return res.status(400).json({ success: false, message: error?.message || "Unable to update application" });
  }
});

app.patch("/api/admin/applications/:id/notes", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const application: any = await Application.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null }, { applicationId: req.params.id }] });
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    application.adminNotes = String(req.body.adminNotes || "").trim().slice(0, 5000);
    await application.save();
    await recordCustomerCareAudit({ req, action: "APPLICATION_NOTE_UPDATED", targetType: "APPLICATION", targetId: application._id, metadata: { applicationId: application.applicationId } });
    return res.json({ success: true, message: "Internal notes saved" });
  } catch { return res.status(500).json({ success: false, message: "Unable to save notes" }); }
});

/* =========================================================
   ADMIN MANAGEMENT
========================================================= */

app.get(
  "/api/admin/admins",
  auth,
  mainAdminOnly,
  async (_req, res) => {
    try {
      const admins = await User.find({ role: "admin" })
        .select("name email phone role blocked storeImage storeCategory storeDescription")
        .sort({ name: 1 })
        .lean();

      return res.json({ success: true, data: admins });
    } catch (error) {
      console.error("ADMIN LIST ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load admin accounts",
      });
    }
  }
);

app.post(
  "/api/admin/admins",
  auth,
  mainAdminOnly,
  async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const phone = String(req.body.phone || "").replace(/\D/g, "");
      const password = String(req.body.password || "");
      const profilePhoto = String(req.body.profilePhoto || req.body.photo || "").trim();
      const storeName = String(req.body.storeName || name || "Local Store").trim();
      const storeImage = String(req.body.storeImage || "").trim();
      const storeAddress = String(req.body.storeAddress || "").trim();
      const storeCategory = String(req.body.storeCategory || "Local Store").trim();
      const storeDescription = String(req.body.storeDescription || "").trim();
      const latitude = req.body.latitude === "" || req.body.latitude == null ? null : Number(req.body.latitude);
      const longitude = req.body.longitude === "" || req.body.longitude == null ? null : Number(req.body.longitude);

      if (name.length < 2 || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email and password are required",
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email" });
      }
      if (phone && !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number" });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }
      if (profilePhoto && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(profilePhoto) && !/^https?:\/\//i.test(profilePhoto)) return res.status(400).json({success:false,message:"Profile photo must be an image URL or data image"});
      if (profilePhoto.length > 1000000) return res.status(400).json({success:false,message:"Profile photo is too large"});
      if (storeImage && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(storeImage) && !/^https?:\/\//i.test(storeImage)) return res.status(400).json({success:false,message:"Store image must be an image URL or data image"});
      if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) return res.status(400).json({success:false,message:"Invalid store latitude"});
      if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return res.status(400).json({success:false,message:"Invalid store longitude"});

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const employeeId = await nextUserIdentifier("employee");
      const admin = await User.create({
        name,
        email,
        phone: phone || undefined,
        password: hashedPassword,
        role: "admin",
        employeeId,
        blocked: false,
        profilePhoto,
      });
      await User.collection.updateOne({ _id: admin._id }, { $set: { storeAdmin: admin._id, storeImage, storeCategory, storeDescription } });
      await StoreLocation.findOneAndUpdate({ key: String(admin._id) }, { $set: { key: String(admin._id), storeAdmin: admin._id, name: storeName, image: storeImage, address: storeAddress, category: storeCategory, description: storeDescription, latitude, longitude, phone, email } }, { upsert: true, new: true, setDefaultsOnInsert: true });
      await recordCustomerCareAudit({ req: req as AuthRequest, action: "EMPLOYEE_CREATED", targetType: "EMPLOYEE", targetId: admin._id, metadata: { employeeId, role: "admin" } });

      return res.status(201).json({
        success: true,
        message: "Admin account created successfully",
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          blocked: admin.blocked,
          profilePhoto: admin.profilePhoto || "",
        },
      });
    } catch (error) {
      console.error("CREATE ADMIN ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to create admin account",
      });
    }
  }
);

app.patch(
  "/api/admin/admins/:id/status",
  auth,
  mainAdminOnly,
  async (req: AuthRequest, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ success: false, message: "Admin not found" });
      }

      const blocked = Boolean(req.body.blocked);
      if (String(req.params.id) === String(req.user!.id) && blocked) {
        return res.status(400).json({
          success: false,
          message: "You cannot block your own admin account",
        });
      }

      const admin: any = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          role: "admin",
        },
        {
          $set: { blocked },
        },
        {
          new: true,
          runValidators: false,
        }
      );

      if (!admin) {
        return res.status(404).json({ success: false, message: "Admin not found" });
      }

      res.setHeader("Cache-Control", "no-store");
      return res.json({
        success: true,
        message: blocked ? "Admin blocked successfully" : "Admin activated successfully",
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          blocked: Boolean(admin.blocked),
        },
      });
    } catch (error) {
      console.error("ADMIN STATUS ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to update admin status" });
    }
  }
);


/* =========================================================
   CUSTOMER CARE MANAGEMENT + SUPPORT
   Additive module. Existing order/admin/customer flows remain untouched.
========================================================= */

app.get("/api/admin/customer-care", auth, mainAdminOnly, async (_req, res) => {
  try {
    const executives: any[] = await User.find({ role: "customer_care" })
      .select("name email phone employeeId profilePhoto permissions blocked createdAt lastLogin")
      .sort({ createdAt: -1 })
      .lean();

    const ids = executives.map((x) => x._id);
    const ticketStats = ids.length ? await SupportTicket.aggregate([
      { $match: { assignedCustomerCare: { $in: ids } } },
      { $group: { _id: "$assignedCustomerCare", assigned: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } } } },
    ]) : [];
    const statMap = new Map(ticketStats.map((x: any) => [String(x._id), x]));

    return res.json({
      success: true,
      data: executives.map((x: any) => ({
        ...x,
        status: x.blocked ? "INACTIVE" : "ACTIVE",
        assignedTickets: Number(statMap.get(String(x._id))?.assigned || 0),
        resolvedTickets: Number(statMap.get(String(x._id))?.resolved || 0),
      })),
      permissions: CUSTOMER_CARE_PERMISSIONS,
    });
  } catch (error) {
    console.error("CUSTOMER CARE LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load Customer Care executives" });
  }
});

app.post("/api/admin/customer-care", auth, mainAdminOnly, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").replace(/\D/g, "");
    const employeeId = String(req.body.employeeId || "").trim();
    const profilePhoto = String(req.body.profilePhoto || req.body.photo || "").trim();
    const password = String(req.body.password || "");
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions.map((x: any) => String(x)).filter((x: string) => CUSTOMER_CARE_PERMISSIONS.includes(x)) : CUSTOMER_CARE_PERMISSIONS;

    if (name.length < 2) return res.status(400).json({ success: false, message: "Enter a valid name" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Enter a valid email" });
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number" });
    if (employeeId.length > 60) return res.status(400).json({ success: false, message: "Employee ID is invalid" });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    if (profilePhoto && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(profilePhoto) && !/^https?:\/\//i.test(profilePhoto)) return res.status(400).json({ success: false, message: "Profile photo must be an image URL or data image" });

    const existing: any = await User.findOne({ $or: [{ email }, { employeeId }] }).select("_id email employeeId").lean();
    if (existing) return res.status(409).json({ success: false, message: String(existing.email).toLowerCase() === email ? "Email already registered" : "Employee ID already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const executive: any = await User.create({ name, email, phone: phone || undefined, employeeId, profilePhoto, password: hashedPassword, role: "customer_care", blocked: false, permissions });

    await recordCustomerCareAudit({ req: req as AuthRequest, action: "EMPLOYEE_CREATED", targetType: "EMPLOYEE", targetId: executive._id, metadata: { employeeId, role: "customer_care" } });
    await recordCustomerCareAudit({ req: req as AuthRequest, action: "CUSTOMER_CARE_CREATED", targetType: "CUSTOMER_CARE", targetId: executive._id, metadata: { employeeId } });

    return res.status(201).json({
      success: true,
      message: "Customer Care Executive created successfully",
      data: { id: executive._id, name: executive.name, email: executive.email, phone: executive.phone, employeeId: executive.employeeId, profilePhoto: executive.profilePhoto, role: executive.role, status: "ACTIVE", permissions: executive.permissions, createdAt: executive.createdAt, lastLogin: null },
    });
  } catch (error) {
    console.error("CREATE CUSTOMER CARE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to create Customer Care Executive" });
  }
});

app.patch("/api/admin/customer-care/:id", auth, mainAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });
    const executive: any = await User.findOne({ _id: req.params.id, role: "customer_care" });
    if (!executive) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });

    const updates: any = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2) return res.status(400).json({ success: false, message: "Enter a valid name" });
      updates.name = name;
    }
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Enter a valid email" });
      const duplicate = await User.findOne({ email, _id: { $ne: executive._id } }).select("_id").lean();
      if (duplicate) return res.status(409).json({ success: false, message: "Email already registered" });
      updates.email = email;
    }
    if (req.body.phone !== undefined) {
      const phone = String(req.body.phone || "").replace(/\D/g, "");
      if (phone && !/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number" });
      updates.phone = phone;
    }
    if (req.body.employeeId !== undefined) {
      const employeeId = String(req.body.employeeId || "").trim();
      if (!employeeId) return res.status(400).json({ success: false, message: "Employee ID is required" });
      const duplicate = await User.findOne({ employeeId, _id: { $ne: executive._id } }).select("_id").lean();
      if (duplicate) return res.status(409).json({ success: false, message: "Employee ID already registered" });
      updates.employeeId = employeeId;
    }
    if (req.body.profilePhoto !== undefined || req.body.photo !== undefined) {
      const photo = String(req.body.profilePhoto ?? req.body.photo ?? "").trim();
      if (photo && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photo) && !/^https?:\/\//i.test(photo)) return res.status(400).json({ success: false, message: "Profile photo must be an image URL or data image" });
      updates.profilePhoto = photo;
    }
    if (req.body.password !== undefined && String(req.body.password)) {
      const password = String(req.body.password);
      if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      updates.password = await bcrypt.hash(password, 10);
    }
    if (Array.isArray(req.body.permissions)) {
      updates.permissions = req.body.permissions.map((x: any) => String(x)).filter((x: string) => CUSTOMER_CARE_PERMISSIONS.includes(x));
    }
    if (req.body.blocked !== undefined) updates.blocked = Boolean(req.body.blocked);

    const updated: any = await User.findOneAndUpdate(
      { _id: executive._id, role: "customer_care" },
      { $set: updates },
      { new: true, runValidators: false }
    ).select("-password").lean();
    if (!updated) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });

    await recordCustomerCareAudit({ req: req as AuthRequest, action: "CUSTOMER_CARE_UPDATED", targetType: "CUSTOMER_CARE", targetId: updated._id, metadata: { fields: Object.keys(updates).filter((x) => x !== "password") } });

    return res.json({ success: true, message: "Customer Care Executive updated successfully", data: { id: updated._id, name: updated.name, email: updated.email, phone: updated.phone, employeeId: updated.employeeId, profilePhoto: updated.profilePhoto, role: updated.role, status: updated.blocked ? "INACTIVE" : "ACTIVE", permissions: updated.permissions || [], createdAt: updated.createdAt, lastLogin: updated.lastLogin || null } });
  } catch (error) {
    console.error("UPDATE CUSTOMER CARE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update Customer Care Executive" });
  }
});

app.patch("/api/admin/customer-care/:id/status", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });

    const rawBlocked = req.body?.blocked;
    const rawStatus = String(req.body?.status || "").trim().toUpperCase();
    const hasBlocked = rawBlocked !== undefined && rawBlocked !== null;
    const blocked = hasBlocked
      ? (rawBlocked === true || String(rawBlocked).toLowerCase() === "true")
      : rawStatus === "INACTIVE";

    const executive: any = await User.findOneAndUpdate(
      { _id: id, role: "customer_care" },
      { $set: { blocked: Boolean(blocked) } },
      { new: true, runValidators: false }
    ).select("_id name email phone employeeId role blocked").lean();

    if (!executive) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });

    await recordCustomerCareAudit({
      req,
      action: executive.blocked ? "CUSTOMER_CARE_DEACTIVATED" : "CUSTOMER_CARE_ACTIVATED",
      targetType: "CUSTOMER_CARE",
      targetId: executive._id,
      metadata: { status: executive.blocked ? "INACTIVE" : "ACTIVE" },
    });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({
      success: true,
      message: executive.blocked ? "Customer Care Executive deactivated" : "Customer Care Executive activated",
      data: { id: executive._id, name: executive.name, status: executive.blocked ? "INACTIVE" : "ACTIVE", blocked: Boolean(executive.blocked) },
    });
  } catch (error) {
    console.error("CUSTOMER CARE STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update Customer Care status" });
  }
});

app.get("/api/admin/customer-care/:id/overview", auth, mainAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });
    const executive: any = await User.findOne({ _id: req.params.id, role: "customer_care" }).select("-password").lean();
    if (!executive) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });
    const [assigned, resolved, activity] = await Promise.all([
      SupportTicket.find({ assignedCustomerCare: executive._id }).sort({ updatedAt: -1 }).limit(50).populate("customer", "name email phone customerId").populate("order", "_id total status").lean(),
      SupportTicket.find({ assignedCustomerCare: executive._id, status: { $in: ["RESOLVED", "CLOSED"] } }).sort({ resolvedAt: -1 }).limit(50).populate("customer", "name email phone customerId").lean(),
      AuditLog.find({ actor: executive._id }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    const resolvedTimes = resolved.filter((x: any) => x.resolvedAt && x.createdAt).map((x: any) => new Date(x.resolvedAt).getTime() - new Date(x.createdAt).getTime()).filter((x: number) => Number.isFinite(x) && x >= 0);
    return res.json({ success: true, data: { executive, assignedTickets: assigned, resolvedTickets: resolved, activity, performance: { assigned: assigned.length, resolved: resolved.length, averageResolutionMinutes: resolvedTimes.length ? Math.round(resolvedTimes.reduce((a: number, b: number) => a + b, 0) / resolvedTimes.length / 60000) : 0 } } });
  } catch (error) {
    console.error("CUSTOMER CARE OVERVIEW ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load Customer Care profile" });
  }
});

app.get("/api/customer-care/dashboard", auth, role("customer_care"), async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [openTickets, pendingTickets, highPriority, resolvedToday, refundRequests, replacementRequests, deliveryComplaints, paymentComplaints] = await Promise.all([
      SupportTicket.countDocuments({ status: { $in: ["OPEN", "IN_PROGRESS", "ESCALATED"] } }),
      SupportTicket.countDocuments({ status: { $in: ["WAITING_FOR_CUSTOMER", "WAITING_FOR_STORE", "WAITING_FOR_DELIVERY_PARTNER"] } }),
      SupportTicket.countDocuments({ priority: { $in: ["HIGH", "URGENT"] }, status: { $nin: ["RESOLVED", "CLOSED"] } }),
      SupportTicket.countDocuments({ status: "RESOLVED", resolvedAt: { $gte: today } }),
      RefundRequest.countDocuments({ status: { $in: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } }),
      ReplacementRequest.countDocuments({ status: { $in: ["REQUESTED","UNDER_REVIEW","VERIFIED","PENDING_STORE_ADMIN","PENDING_MAIN_ADMIN","APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING","DELIVERY","DELIVERY_ASSIGNED","OUT_FOR_DELIVERY","ESCALATED"] } }),
      SupportTicket.countDocuments({ category: { $in: ["Late Delivery", "Delivery Partner Issue", "Wrong Delivery Location", "Order Not Received"] }, status: { $nin: ["RESOLVED", "CLOSED"] } }),
      SupportTicket.countDocuments({ category: { $in: ["Payment Failed", "Payment Deducted but Order Failed", "Refund Issue"] }, status: { $nin: ["RESOLVED", "CLOSED"] } }),
    ]);
    return res.json({ success: true, data: { openTickets, pendingTickets, highPriority, resolvedToday, refundRequests, replacementRequests, deliveryComplaints, paymentComplaints } });
  } catch (error) {
    console.error("CUSTOMER CARE DASHBOARD ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load Customer Care dashboard" });
  }
});

app.get("/api/customer-care/customers", auth, role("customer_care"), customerCarePermission("customer.search"), async (req: AuthRequest, res) => {
  try {
    const search = String(req.query.search || "").trim();
    if (!search) return res.json({ success: true, data: [] });
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matchingOrders = mongoose.Types.ObjectId.isValid(search) ? await Order.find({ _id: search }).select("user").lean() : [];
    const orderCustomerIds = matchingOrders.map((x: any) => x.user).filter(Boolean);
    const customers = await User.find({ role: "customer", $or: [{ _id: { $in: orderCustomerIds } }, { customerId: regex }, { name: regex }, { email: regex }, { phone: regex }] })
      .select("-password")
      .sort({ createdAt: -1 }).limit(20).lean();
    const data = await Promise.all(customers.map(async (customer: any) => {
      const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 }).limit(1).select("_id createdAt total status paymentStatus storeAdmin").lean();
      const totalOrders = await Order.countDocuments({ user: customer._id });
      return { ...customer, status: customer.blocked ? "BLOCKED" : "ACTIVE", totalOrders, lastOrder: orders[0] || null };
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("CUSTOMER CARE CUSTOMER SEARCH ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to search customers" });
  }
});

app.get("/api/customer-care/customers/:id", auth, role("customer_care"), customerCarePermission("customer.view"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Customer not found" });
    const customer: any = await User.findOne({ _id: req.params.id, role: "customer" }).select("-password").lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    const [orders, tickets] = await Promise.all([
      Order.find({ user: customer._id }).sort({ createdAt: -1 }).limit(100).populate("deliveryPartner", "name email phone").lean(),
      SupportTicket.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(100).populate("assignedCustomerCare", "name employeeId").lean(),
    ]);
    await recordCustomerCareAudit({ req, action: "CUSTOMER_PROFILE_VIEWED", targetType: "CUSTOMER", targetId: customer._id, customer: customer._id });
    return res.json({ success: true, data: { customer: { ...customer, status: customer.blocked ? "BLOCKED" : "ACTIVE", totalOrders: orders.length, lastOrder: orders[0] || null }, orders, tickets } });
  } catch (error) {
    console.error("CUSTOMER CARE CUSTOMER PROFILE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load customer profile" });
  }
});

app.get("/api/customer-care/orders", auth, role("customer_care"), customerCarePermission("order.search"), async (req: AuthRequest, res) => {
  try {
    const search = String(req.query.search || "").trim();
    if (!search) return res.json({ success: true, data: [] });
    const filter: any = {};
    if (mongoose.Types.ObjectId.isValid(search)) filter._id = search;
    else {
      const customerRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const customers = await User.find({ role: "customer", $or: [{ customerId: customerRegex }, { name: customerRegex }, { email: customerRegex }, { phone: customerRegex }] }).select("_id").limit(50).lean();
      filter.user = { $in: customers.map((x: any) => x._id) };
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(30).populate("user", "name email phone customerId").populate("deliveryPartner", "name email phone role").lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("CUSTOMER CARE ORDER SEARCH ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to search orders" });
  }
});

app.get("/api/customer-care/orders/:id", auth, role("customer_care"), customerCarePermission("order.view"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Order not found" });
    const order: any = await Order.findById(req.params.id).populate("user", "name email phone customerId").populate("deliveryPartner", "name email phone role ratingAverage ratingCount").lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    let store: any = null;
    if (order.storeAdmin) store = await User.findOne({ _id: order.storeAdmin, role: "admin" }).select("name email phone").lean();
    await recordCustomerCareAudit({ req, action: "ORDER_VIEWED", targetType: "ORDER", targetId: order._id, customer: order.user?._id || order.user, order: order._id });
    return res.json({ success: true, data: { order, store, deliveryProof: order.deliveryProof ? { uploadedAt: order.deliveryProof.uploadedAt, completedAt: order.deliveryProof.completedAt, available: Boolean(order.deliveryProof.image) } : null, deliveryPayout: Number(order.deliveryPayout || 0), deliveryPayoutStatus: order.deliveryPayoutStatus || "PENDING" } });
  } catch (error) {
    console.error("CUSTOMER CARE ORDER VIEW ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load order details" });
  }
});

app.get("/api/customer-care/escalation-users", auth, role("customer_care"), customerCarePermission("ticket.escalate"), async (_req, res) => {
  try {
    const admins = await User.find({ role: "admin", blocked: { $ne: true } }).select("name email phone role storeAdmin").sort({ name: 1 }).lean();
    return res.json({ success: true, data: admins });
  } catch (error) {
    console.error("CUSTOMER CARE ESCALATION USERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load escalation users" });
  }
});

app.get("/api/customer-care/tickets", auth, role("customer_care"), customerCarePermission("support.history"), async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || "").trim();
    const priority = String(req.query.priority || "").trim();
    const search = String(req.query.search || "").trim();
    const filter: any = {};
    if (status && SUPPORT_TICKET_STATUSES.includes(status)) filter.status = status;
    if (priority && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) filter.priority = priority;
    if (req.query.assigned === "me") filter.assignedCustomerCare = req.user!.id;
    if (search) filter.$or = [{ ticketId: new RegExp(search, "i") }, { category: new RegExp(search, "i") }, { description: new RegExp(search, "i") }];
    const total = await SupportTicket.countDocuments(filter);
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("customer", "name email phone customerId").populate("order", "_id total status").populate("assignedCustomerCare", "name employeeId").lean();
    return res.json({ success: true, data: tickets, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("CUSTOMER CARE TICKET LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load support tickets" });
  }
});

app.post("/api/customer-care/tickets", auth, role("customer_care"), customerCarePermission("ticket.create"), async (req: AuthRequest, res) => {
  try {
    const customerId = String(req.body.customerId || "").trim();
    const orderId = String(req.body.orderId || "").trim();
    const category = String(req.body.category || "").trim();
    const description = String(req.body.description || "").trim();
    const priority = String(req.body.priority || "MEDIUM").trim().toUpperCase();
    if (!customerId) return res.status(400).json({ success: false, message: "Customer ID is required" });
    if (!SUPPORT_TICKET_CATEGORIES.includes(category)) return res.status(400).json({ success: false, message: "Invalid ticket category" });
    if (description.length < 3 || description.length > 3000) return res.status(400).json({ success: false, message: "Description must be between 3 and 3000 characters" });
    if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });
    const customerQuery: any = mongoose.Types.ObjectId.isValid(customerId) ? { _id: customerId } : { customerId };
    const customer: any = await User.findOne({ ...customerQuery, role: "customer" }).select("_id customerId").lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    let order: any = null;
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ success: false, message: "Invalid order ID" });
      order = await Order.findOne({ _id: orderId, user: customer._id }).lean();
      if (!order) return res.status(400).json({ success: false, message: "Order does not belong to this customer" });
    }
    const assigned = req.user!.id;
    const ticket: any = await SupportTicket.create({ ticketId: makeTicketId(), customer: customer._id, order: order?._id || null, store: order?.storeAdmin || null, deliveryPartner: order?.deliveryPartner || null, assignedCustomerCare: assigned, category, description, priority, status: "OPEN", internalNotes: "" });
    await recordCustomerCareAudit({ req, action: "TICKET_CREATED", targetType: "SUPPORT_TICKET", targetId: ticket.ticketId, customer: customer._id, order: order?._id, ticket: ticket._id, metadata: { category, priority } });
    return res.status(201).json({ success: true, message: "Support ticket created", data: await SupportTicket.findById(ticket._id).populate("customer", "name email phone customerId").populate("order", "_id total status").populate("assignedCustomerCare", "name employeeId").lean() });
  } catch (error) {
    console.error("CUSTOMER CARE TICKET CREATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to create support ticket" });
  }
});

app.get("/api/customer-care/tickets/:id", auth, role("customer_care"), customerCarePermission("support.history"), async (req: AuthRequest, res) => {
  try {
    const ticket: any = await SupportTicket.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null }, { ticketId: req.params.id }] }).populate("customer", "name email phone blocked createdAt").populate("order", "_id user items subtotal discount deliveryCharge total paymentMethod paymentStatus status address deliveryPartner statusHistory createdAt updatedAt").populate("store", "name email phone").populate("deliveryPartner", "name email phone role").populate("assignedCustomerCare", "name email phone employeeId profilePhoto").lean();
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const [activity, refunds, replacements] = await Promise.all([
      AuditLog.find({ ticket: ticket._id }).sort({ createdAt: -1 }).limit(100).populate("actor", "name email role employeeId").lean(),
      ticket.order?._id ? RefundRequest.find({ order: ticket.order._id }).sort({ createdAt: -1 }).populate("requestedBy", "name employeeId").lean() : [],
      ticket.order?._id ? ReplacementRequest.find({ order: ticket.order._id }).sort({ createdAt: -1 }).populate("requestedBy", "name employeeId").lean() : [],
    ]);
    return res.json({ success: true, data: { ticket, activity, refunds, replacements } });
  } catch (error) {
    console.error("CUSTOMER CARE TICKET VIEW ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load ticket" });
  }
});

app.patch("/api/customer-care/tickets/:id", auth, role("customer_care"), customerCarePermission("ticket.update"), async (req: AuthRequest, res) => {
  try {
    const ticket: any = await SupportTicket.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null }, { ticketId: req.params.id }] });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (req.body.status !== undefined) {
      const status = String(req.body.status).trim();
      if (!SUPPORT_TICKET_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid ticket status" });
      if (["RESOLVED", "CLOSED"].includes(status) && !(await hasCustomerCarePermission(req, "ticket.resolve"))) return res.status(403).json({ success: false, message: "Resolve permission required" });
      ticket.status = status;
      if (["RESOLVED", "CLOSED"].includes(status) && !ticket.resolvedAt) ticket.resolvedAt = new Date();
      if (!["RESOLVED", "CLOSED"].includes(status)) ticket.resolvedAt = null;
    }
    if (req.body.priority !== undefined) {
      const priority = String(req.body.priority).trim().toUpperCase();
      if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });
      ticket.priority = priority;
    }
    if (req.body.internalNotes !== undefined) {
      if (!(await hasCustomerCarePermission(req, "notes.add"))) return res.status(403).json({ success: false, message: "Notes permission required" });
      ticket.internalNotes = String(req.body.internalNotes || "").trim().slice(0, 5000);
    }
    if (req.body.assignedCustomerCareId !== undefined) {
      const id = String(req.body.assignedCustomerCareId || "").trim();
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid Customer Care assignment" });
      const assignee: any = await User.findOne({ _id: id, role: "customer_care", blocked: { $ne: true } }).select("_id").lean();
      if (!assignee) return res.status(404).json({ success: false, message: "Customer Care Executive not found" });
      ticket.assignedCustomerCare = assignee._id;
    }
    await ticket.save();
    await recordCustomerCareAudit({ req, action: "TICKET_UPDATED", targetType: "SUPPORT_TICKET", targetId: ticket.ticketId, customer: ticket.customer, order: ticket.order, ticket: ticket._id, metadata: { status: ticket.status, priority: ticket.priority } });
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) await recordCustomerCareAudit({ req, action: "TICKET_RESOLVED", targetType: "SUPPORT_TICKET", targetId: ticket.ticketId, customer: ticket.customer, order: ticket.order, ticket: ticket._id });
    return res.json({ success: true, message: "Support ticket updated", data: ticket });
  } catch (error) {
    console.error("CUSTOMER CARE TICKET UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update support ticket" });
  }
});

app.post("/api/customer-care/tickets/:id/messages", auth, role("customer_care"), customerCarePermission("ticket.update"), async (req:AuthRequest,res)=>{try{const ticket:any=await SupportTicket.findOne({$or:[{_id:mongoose.Types.ObjectId.isValid(req.params.id)?req.params.id:null},{ticketId:req.params.id}]});if(!ticket)return res.status(404).json({success:false,message:"Ticket not found"});const message=String(req.body.message||"").trim();if(!message)return res.status(400).json({success:false,message:"Message is required"});const attachment=String(req.body.attachment||"");if(attachment&&!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(attachment))return res.status(400).json({success:false,message:"Attachment must be an image"});ticket.messages.push({sender:req.user!.id,senderRole:"customer_care",message,attachment:attachment.slice(0,1200000),createdAt:new Date()});if(ticket.status==="OPEN"||ticket.status==="WAITING_FOR_CUSTOMER")ticket.status="IN_PROGRESS";await ticket.save();await notifyUser({user:ticket.customer,title:"Customer Care replied",message:`Customer Care replied on ${ticket.ticketId}.`,type:"support_ticket",order:ticket.order});await recordCustomerCareAudit({req,action:"TICKET_REPLY",targetType:"SUPPORT_TICKET",targetId:ticket.ticketId,ticket:ticket._id,customer:ticket.customer,order:ticket.order});return res.json({success:true,data:ticket});}catch(e){return res.status(500).json({success:false,message:"Unable to send reply"});}});

app.post("/api/customer-care/tickets/:id/escalate", auth, role("customer_care"), customerCarePermission("ticket.escalate"), async (req: AuthRequest, res) => {
  try {
    const ticket: any = await SupportTicket.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null }, { ticketId: req.params.id }] });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const targetType = String(req.body.targetType || "").trim().toUpperCase();
    const reason = String(req.body.reason || "").trim();
    const assignedUserId = String(req.body.assignedUserId || "").trim();
    if (!["MAIN_ADMIN", "SUB_ADMIN", "STORE_MANAGER"].includes(targetType)) return res.status(400).json({ success: false, message: "Invalid escalation target" });
    if (reason.length < 3) return res.status(400).json({ success: false, message: "Escalation reason is required" });
    if (!mongoose.Types.ObjectId.isValid(assignedUserId)) return res.status(400).json({ success: false, message: "Select an escalation user" });
    const assignedUser: any = await User.findOne({ _id: assignedUserId, role: "admin", blocked: { $ne: true } }).select("_id email").lean();
    if (!assignedUser) return res.status(404).json({ success: false, message: "Escalation user not found" });
    ticket.status = "ESCALATED";
    ticket.priority = ["URGENT", "HIGH"].includes(String(req.body.priority || "").toUpperCase()) ? String(req.body.priority).toUpperCase() : ticket.priority;
    ticket.escalation = { targetType, assignedUser: assignedUser._id, reason, priority: ticket.priority, timestamp: new Date() };
    await ticket.save();
    await notifyUser({ user: assignedUser._id, title: "Support ticket escalated", message: `Ticket ${ticket.ticketId} has been escalated to you.`, type: "support_ticket" });
    await recordCustomerCareAudit({ req, action: "TICKET_ESCALATED", targetType: "SUPPORT_TICKET", targetId: ticket.ticketId, customer: ticket.customer, order: ticket.order, ticket: ticket._id, metadata: { targetType, assignedUser: assignedUser._id, reason, priority: ticket.priority } });
    return res.json({ success: true, message: "Ticket escalated successfully", data: ticket });
  } catch (error) {
    console.error("CUSTOMER CARE ESCALATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to escalate ticket" });
  }
});

app.post("/api/customer-care/orders/:id/refund-requests", auth, role("customer_care"), customerCarePermission("refund.request"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success:false, message:"Order not found" });
    const order:any=await Order.findById(req.params.id).select("user total status items deliveredAt statusHistory").lean();
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    const orderItemId=String(req.body.orderItemId||"").trim();
    const item=orderItemId?itemFromOrder(order,orderItemId):null;
    if(!item)return res.status(400).json({success:false,message:"Select a specific order item for refund"});
    if(order.status!=="Delivered")return res.status(400).json({success:false,message:"Refund is available after delivery"});
    const policy:any=await policyForItem(item);
    if(!policy.refundEligible)return res.status(400).json({success:false,message:"Refund is not available for this product"});
    const deliveredAt=order.deliveredAt || (order.statusHistory||[]).find((x:any)=>x.status==="Delivered")?.timestamp;
    const windowDays=Number(policy.refundWindowDays||7);
    if(deliveredAt && Date.now()-new Date(deliveredAt).getTime()>windowDays*86400000)return res.status(400).json({success:false,message:"Refund window has expired"});
    const quantity=Math.max(1,Math.min(Number(item.quantity||1),Number(req.body.quantity||1)));
    const itemTotal=Number(item.price||0)*quantity;
    const amount=Number(req.body.amount ?? req.body.requestedAmount ?? itemTotal);
    if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({success:false,message:"Enter a valid refund amount"});
    if(amount>itemTotal+0.01)return res.status(400).json({success:false,message:`Refund amount cannot exceed the selected item amount of ₹${itemTotal.toFixed(2)}`});
    const refundSummary=await getRefundItemSummary(order._id,orderItemId);
    const remainingAmount=Math.max(0,itemTotal-refundSummary.completedAmount-refundSummary.activeAmount);
    if(remainingAmount<=0)return res.status(400).json({success:false,message:"No refundable amount remains for this order item"});
    if(amount>remainingAmount+0.01)return res.status(400).json({success:false,message:`Refund amount cannot exceed the remaining refundable amount of ₹${remainingAmount.toFixed(2)}`});
    const reason=String(req.body.reason||"").trim();
    if(reason.length<3)return res.status(400).json({success:false,message:"Refund reason is required"});
    const dup=await RefundRequest.findOne({order:order._id,orderItemId,status:{$in:REFUND_ACTIVE_STATUSES}});
    if(dup)return res.status(409).json({success:false,message:"Refund request already exists for this item"});
    const request:any=await RefundRequest.create({requestId:makeRequestId("REFUND"),order:order._id,customer:order.user,productId:item.product||null,amount,requestedAmount:amount,reason,requestedBy:req.user!.id,status:"REQUESTED",orderItemId,storeId:(order as any).storeAdmin||null,storeAdmin:(order as any).storeAdmin||null,sourceType:String((order as any).sourceType||"FRESHBASKET_DIRECT"),customerCareAgent:null,refundMethod:"ORIGINAL",evidence:imageList(req.body.evidence),statusHistory:[{status:"REQUESTED",by:order.user,role:"customer",at:new Date()}]});
    await recordCustomerCareAudit({req,action:"REFUND_REQUESTED",targetType:"REFUND_REQUEST",targetId:request._id,customer:order.user,order:order._id,metadata:{amount,reason,orderItemId}});
    await inspectSecurityThresholds({ req, event: "REFUND_ACTIVITY", actorId: order.user, targetId: request._id, metadata: { amount: Number(amount || 0), orderId: String(order._id), orderItemId } });
    return res.status(201).json({success:true,message:"Refund request created",data:request});
  } catch(error){console.error("CUSTOMER CARE REFUND ERROR",error);return res.status(500).json({success:false,message:"Unable to create refund request"});}
});

app.post("/api/customer-care/orders/:id/replacement-requests", auth, role("customer_care"), customerCarePermission("replacement.request"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Order not found" });
    const order: any = await Order.findById(req.params.id).select("user items storeAdmin sourceType deliveryPartner status deliveredAt statusHistory").lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 3) return res.status(400).json({ success: false, message: "Replacement reason is required" });
    const orderItemId = String(req.body.orderItemId || "").trim();
    if (!orderItemId) return res.status(400).json({ success: false, message: "Select a specific order item for replacement" });
    const selectedItem = itemFromOrder(order, orderItemId);
    if (!selectedItem) return res.status(400).json({ success: false, message: "Selected product is not part of this order" });
    const policy = await policyForItem(selectedItem);
    if (!policy.replacementAllowed) return res.status(400).json({ success: false, message: "Replacement is not available for this product" });
    if (order.status !== "Delivered" || !order.deliveredAt) return res.status(400).json({ success: false, message: "Replacement is available only after successful delivery" });
    const expiryAt = replacementExpiry(order);
    if (!expiryAt || new Date() > expiryAt) return res.status(400).json({ success: false, message: "Replacement window has expired" });
    const duplicate = await ReplacementRequest.findOne({ order: order._id, customer: order.user, orderItemId, status: { $in: replacementActiveStatuses } }).select("_id requestId status").lean();
    if (duplicate) return res.status(409).json({ success: false, message: `Replacement request ${(duplicate as any).requestId || ""} is already in progress for this item` });
    const completedReplacement = await ReplacementRequest.findOne({ order: order._id, customer: order.user, orderItemId, status: { $in: ["REPLACED","COMPLETED","CLOSED"] } }).select("_id requestId status").lean();
    if (completedReplacement) return res.status(409).json({ success: false, message: "This order item has already been replaced" });
    const refunded = await RefundRequest.findOne({ order: order._id, customer: order.user, orderItemId, status: "COMPLETED" }).select("_id requestId").lean();
    if (refunded) return res.status(409).json({ success: false, message: "This order item has already been refunded" });
    const quantity = Math.max(1, Math.min(Number(selectedItem.quantity || 1), Number(req.body.quantity || 1)));
    const sourceType = String((order as any).sourceType || ((order as any).storeAdmin ? "STORE" : "FRESHBASKET_DIRECT"));
    const storeId = sourceType === "STORE" ? ((order as any).storeAdmin || null) : null;
    const request: any = await ReplacementRequest.create({
      requestId: makeRequestId("REPLACEMENT"), replacementId: makeReplacementId(), order: order._id,
      customer: order.user, requestedBy: order.user, productId: selectedItem.product || null,
      reason, description: String(req.body.description || "").trim().slice(0, 3000),
      items: [{ product: selectedItem.product || null, name: String(selectedItem.name || ""), quantity }],
      orderItemId, storeId, storeAdmin: storeId,
      mainAdmin: sourceType === "FRESHBASKET_DIRECT" ? await getMainAdminId() : null,
      sourceType, deliveryPartner: null,
      priority: ["LOW","MEDIUM","HIGH","URGENT"].includes(String(req.body.priority || "").toUpperCase()) ? String(req.body.priority).toUpperCase() : "MEDIUM",
      evidence: imageList(req.body.evidence), deliveredAtSnapshot: order.deliveredAt, expiryAt,
      eligibleAtRequestTime: true, status: "REQUESTED",
      statusHistory: [{ status:"REQUESTED", by:order.user, role:"customer_care", at:new Date(), note:"Replacement request created on behalf of the authenticated customer." }]
    });
    await recordCustomerCareAudit({ req, action: "REPLACEMENT_REQUESTED", targetType: "REPLACEMENT_REQUEST", targetId: request._id, customer: order.user, order: order._id, metadata: { requestId: request.requestId, replacementId: request.replacementId, orderItemId, productId: selectedItem.product, storeId, sourceType, expiryAt } });
    await inspectSecurityThresholds({ req, event: "REPLACEMENT_ACTIVITY", actorId: order.user, targetId: request._id, metadata: { requestId: String(request.requestId || ""), orderId: String(order._id), orderItemId, productId: String(selectedItem.product || "") } });
    await notifyCustomerCareUsers({ title:"New replacement request", message:`Replacement ${request.requestId} requires verification.`, type:"replacement_request", order:request.order, relatedEntity:"REPLACEMENT_REQUEST", relatedEntityId:request._id });
    await notifyUser({ user:order.user, title:"Replacement request created", message:`Your replacement request ${request.requestId} has been created and is pending Customer Care verification.`, type:"replacement_status", order:request.order, relatedEntity:"REPLACEMENT_REQUEST", relatedEntityId:request._id });
    return res.status(201).json({ success: true, message: "Replacement request created", data: request });
  } catch (error:any) {
    console.error("REPLACEMENT REQUEST ERROR:", error);
    return res.status(400).json({ success: false, message: error?.message || "Unable to create replacement request" });
  }
});

app.patch("/api/customer-care/refund-requests/:id", auth, role("customer_care"), customerCarePermission("refund.request"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Refund request not found" });
    const request: any = await RefundRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Refund request not found" });
    const status = String(req.body.status || "").trim().toUpperCase();
    if (!["REQUESTED","UNDER_REVIEW"].includes(status)) return res.status(400).json({ success: false, message: "Use the Customer Care verification action for downstream refund routing" });
    request.status = status;
    request.customerCareAgent = req.user!.id;
    pushRequestHistory(request,status,req.user!.id,"customer_care");
    await request.save();
    await notifyRequestStatus(request,"REFUND",status);
    await recordCustomerCareAudit({ req, action: "REFUND_REQUEST_UPDATED", targetType: "REFUND_REQUEST", targetId: request._id, customer: request.customer, order: request.order, metadata: { status } });
    return res.json({ success: true, message: "Refund request updated", data: request });
  } catch (error) {
    console.error("REFUND REQUEST UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update refund request" });
  }
});

app.patch("/api/customer-care/replacement-requests/:id/action", auth, role("customer_care"), customerCarePermission("replacement.request"), async (req:AuthRequest,res) => {
  try {
    const id=String(req.params.id||"");
    const query:any=mongoose.Types.ObjectId.isValid(id)?{$or:[{_id:id},{requestId:id},{replacementId:id}]}:{$or:[{requestId:id},{replacementId:id}]};
    const request:any=await ReplacementRequest.findOne(query);
    if(!request)return res.status(404).json({success:false,message:"Replacement request not found"});
    const action=String(req.body.action||"").trim().toUpperCase();
    if(action==="REJECT"){
      if(replacementTerminalStatuses.includes(request.status))return res.status(400).json({success:false,message:`Request is already ${request.status}`});
      const reason=String(req.body.reason||"").trim(); if(reason.length<3)return res.status(400).json({success:false,message:"Rejection reason is required"});
      const oldStatus=request.status; request.rejectionReason=reason; request.status="REJECTED"; request.customerCareAgent=req.user!.id; pushRequestHistory(request,"REJECTED",req.user!.id,"customer_care",reason); await request.save();
      await notifyRequestStatus(request,"REPLACEMENT","REJECTED",`Reason: ${reason}`); await recordCustomerCareAudit({req,action:"REPLACEMENT_REJECTED",targetType:"REPLACEMENT_REQUEST",targetId:request._id,customer:request.customer,order:request.order,metadata:{requestId:request.requestId,oldStatus,newStatus:"REJECTED",reason}});
      return res.json({success:true,message:"Replacement request rejected",data:request});
    }
    if(action==="ESCALATE"){
      if(replacementTerminalStatuses.includes(request.status))return res.status(400).json({success:false,message:`Request is already ${request.status}`});
      const reason=String(req.body.reason||"").trim(); if(reason.length<3)return res.status(400).json({success:false,message:"Escalation reason is required"});
      const mainId=await getMainAdminId(); if(!mainId)return res.status(409).json({success:false,message:"Main Admin is not configured"});
      const oldStatus=request.status; request.escalationReason=reason; request.escalatedAt=new Date(); request.mainAdmin=mainId; request.status="ESCALATED"; pushRequestHistory(request,"ESCALATED",req.user!.id,"customer_care",reason); await request.save();
      await notifyUser({user:mainId,title:"Replacement Escalated",message:`Replacement ${request.requestId} has been escalated.`,type:"replacement_escalated",order:request.order,relatedEntity:"REPLACEMENT_REQUEST",relatedEntityId:request._id}); await notifyRequestStatus(request,"REPLACEMENT","ESCALATED",reason); await recordCustomerCareAudit({req,action:"REPLACEMENT_ESCALATED",targetType:"REPLACEMENT_REQUEST",targetId:request._id,customer:request.customer,order:request.order,metadata:{requestId:request.requestId,oldStatus,newStatus:"ESCALATED",reason,mainAdminId:mainId}});
      return res.json({success:true,message:"Replacement request escalated",data:request});
    }
    return res.status(400).json({success:false,message:"Unsupported replacement action"});
  } catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to update replacement request"});}
});

app.get("/api/customer-care/requests", auth, role("customer_care"), customerCarePermission("support.history"), async (req:AuthRequest,res) => {
  try {
    const status = String(req.query.status||"").trim().toUpperCase();
    const q:any = status ? {status} : {};

    // IMPORTANT: do not use populate() for this queue. The refund/replacement
    // models are legacy models that are extended at runtime in server.ts.
    // populate() validates every referenced schema path and can therefore make
    // the whole queue return 500 when an older compiled model/document does not
    // expose one of the optional workflow references. The queue only needs the
    // core customer/order context, so hydrate those references explicitly.
    const [refundRows,replacementRows] = await Promise.all([
      RefundRequest.find(q).sort({createdAt:-1}).limit(500).lean(),
      ReplacementRequest.find(q).sort({createdAt:-1}).limit(500).lean()
    ]);

    const allRows:any[]=[...(refundRows as any[]),...(replacementRows as any[])];
    const customerIds=[...new Set(allRows.map((x:any)=>String(x?.customer||"")).filter((id)=>mongoose.Types.ObjectId.isValid(id)))];
    const orderIds=[...new Set(allRows.map((x:any)=>String(x?.order||"")).filter((id)=>mongoose.Types.ObjectId.isValid(id)))];

    const [customers,orders]=await Promise.all([
      customerIds.length
        ? User.find({_id:{$in:customerIds}}).select("name email phone customerId").lean()
        : [],
      orderIds.length
        ? Order.find({_id:{$in:orderIds}}).select("_id status total storeAdmin sourceType").lean()
        : []
    ]);

    const customerMap=new Map((customers as any[]).map((x:any)=>[String(x._id),x]));
    const orderMap=new Map((orders as any[]).map((x:any)=>[String(x._id),x]));
    const hydrate=(row:any)=>({
      ...row,
      customer: customerMap.get(String(row?.customer||"")) || row?.customer || null,
      order: orderMap.get(String(row?.order||"")) || row?.order || null
    });

    const refunds=(refundRows as any[]).map(hydrate);
    const replacements=(replacementRows as any[]).map(hydrate);

    return res.json({success:true,data:{refunds,replacements}});
  } catch(e:any) {
    console.error("CUSTOMER CARE REQUEST QUEUE ERROR:", e?.message || e);
    return res.status(500).json({success:false,message:"Unable to load refund/replacement requests"});
  }
});

app.get("/api/customer-care/requests/:type/:id", auth, role("customer_care"), customerCarePermission("support.history"), async (req:AuthRequest,res) => {
  try {
    const type=String(req.params.type||"").toLowerCase();
    const Model:any=type==="refund"?RefundRequest:type==="replacement"?ReplacementRequest:null;
    if(!Model||!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Request not found"});
    // Read the request without Mongoose populate so one missing/legacy ref
    // cannot turn the entire Customer Care detail endpoint into a 500.
    const request:any=await Model.findById(req.params.id).lean();
    if(!request)return res.status(404).json({success:false,message:"Request not found"});

    // Hydrate only the references that are actually present. Legacy requests
    // may contain null/string/ObjectId values, so each lookup is defensive.
    const userRefIds=[
      request.customer,
      request.customerCareAgent,
      request.storeAdmin,
      request.mainAdmin,
      request.financeEmployee,
      request.assignedFinance,
      request.deliveryPartner,
      request.customerCareVerifiedBy,
      request.financeReviewedBy,
      request.financeManager,
      request.approvedBy
    ].map((v:any)=>String(v||"")).filter((v:string)=>mongoose.Types.ObjectId.isValid(v));
    const uniqueUserRefIds=[...new Set(userRefIds)];
    const [customerUser,orderDoc,userDocs]=await Promise.all([
      request.customer && mongoose.Types.ObjectId.isValid(String(request.customer))
        ? User.findById(request.customer).select("name email phone customerId employeeId role").lean()
        : null,
      request.order && mongoose.Types.ObjectId.isValid(String(request.order))
        ? Order.findById(request.order).lean()
        : null,
      uniqueUserRefIds.length
        ? User.find({_id:{$in:uniqueUserRefIds}}).select("name email phone customerId employeeId role").lean()
        : []
    ]);
    const userMap=new Map((userDocs as any[]).map((u:any)=>[String(u._id),u]));
    if(customerUser) userMap.set(String((customerUser as any)._id),customerUser);
    const hydrateUser=(v:any)=>{
      const found=userMap.get(String(v||""));
      return found || v || null;
    };
    request.customer=hydrateUser(request.customer);
    request.order=orderDoc || request.order || null;
    request.customerCareAgent=hydrateUser(request.customerCareAgent);
    request.storeAdmin=hydrateUser(request.storeAdmin);
    request.mainAdmin=hydrateUser(request.mainAdmin);
    request.financeEmployee=hydrateUser(request.financeEmployee);
    request.assignedFinance=hydrateUser(request.assignedFinance);
    request.deliveryPartner=hydrateUser(request.deliveryPartner);
    request.customerCareVerifiedBy=hydrateUser(request.customerCareVerifiedBy);
    request.financeReviewedBy=hydrateUser(request.financeReviewedBy);
    request.financeManager=hydrateUser(request.financeManager);
    request.approvedBy=hydrateUser(request.approvedBy);

    let eligibility:any=null;
    if(type==="refund") {
      try {
        const ctx=await getRequestContext(String(request.order?._id||request.order||""),String(request.orderItemId||""),String(request.productId||""));
        const deliveredAt=ctx.order.deliveredAt || (ctx.order.statusHistory||[]).find((x:any)=>x.status==="Delivered")?.timestamp || null;
        const withinWindow=Boolean(deliveredAt && Date.now()-new Date(deliveredAt).getTime()<=24*60*60*1000);
        const orderDelivered=String(ctx.order.status||"")==="Delivered";
        const productPolicy=Boolean(ctx.policy?.refundEligible);
        const itemFound=Boolean(ctx.item);
        const reasonProvided=String(request.reason||"").trim().length>=3;
        const evidenceProvided=Array.isArray(request.evidence)&&request.evidence.filter(Boolean).length>0;
        eligibility={orderDelivered,withinWindow,productPolicy,itemFound,reasonProvided,evidenceProvided,eligible:Boolean(orderDelivered&&withinWindow&&productPolicy&&itemFound&&reasonProvided),deliveredAt,expiryAt:deliveredAt?new Date(new Date(deliveredAt).getTime()+24*60*60*1000):null,policy:ctx.policy||null,item:ctx.item||null,product:ctx.product||null,sourceType:ctx.sourceType,storeId:ctx.storeId||null};
      } catch(e:any) { eligibility={orderDelivered:false,withinWindow:false,productPolicy:false,itemFound:false,reasonProvided:String(request.reason||"").trim().length>=3,evidenceProvided:Array.isArray(request.evidence)&&request.evidence.length>0,eligible:false,error:e?.message||"Unable to calculate refund eligibility"}; }
    }
    return res.json({success:true,data:{...request,eligibility}});
  } catch(e) { return res.status(500).json({success:false,message:"Unable to load request"}); }
});

app.patch("/api/customer-care/requests/refund/:id/reject", auth, role("customer_care"), customerCarePermission("refund.request"), async (req:AuthRequest,res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Refund request not found"});
    const request:any=await RefundRequest.findById(req.params.id);
    if(!request)return res.status(404).json({success:false,message:"Refund request not found"});
    if(!["REQUESTED","UNDER_REVIEW"].includes(String(request.status))) return res.status(400).json({success:false,message:`Refund request is already ${request.status}`});
    const reason=String(req.body.reason||"").trim();
    if(reason.length<3)return res.status(400).json({success:false,message:"Rejection reason is required"});
    request.status="REJECTED";
    request.customerCareAgent=req.user!.id;
    request.rejectedAt=new Date();
    request.rejectionReason=reason;
    pushRequestHistory(request,"REJECTED",req.user!.id,"customer_care",reason);
    await request.save();
    await notifyRequestStatus(request,"REFUND","REJECTED",`Reason: ${reason}`);
    await recordCustomerCareAudit({req,action:"REFUND_REJECTED_BY_CUSTOMER_CARE",targetType:"REFUND_REQUEST",targetId:request._id,customer:request.customer,order:request.order,metadata:{reason}});
    return res.json({success:true,message:"Refund request rejected by Customer Care",data:request});
  } catch(e:any) { console.error("CUSTOMER CARE REFUND REJECT ERROR",e); return res.status(500).json({success:false,message:"Unable to reject refund request"}); }
});

app.patch("/api/customer-care/requests/:type/:id/verify", auth, role("customer_care"), async (req:AuthRequest,res,next) => {
  const permission = String(req.params.type||"").toLowerCase()==="refund" ? "refund.request" : "replacement.request";
  if (!(await hasCustomerCarePermission(req,permission))) return res.status(403).json({success:false,message:`Missing Customer Care permission: ${permission}`});
  return (async () => {
  try {
    const type=String(req.params.type||"").toLowerCase();
    const Model:any=type==="refund"?RefundRequest:type==="replacement"?ReplacementRequest:null;
    if(!Model||!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Request not found"});
    const request:any=await Model.findById(req.params.id);
    if(!request)return res.status(404).json({success:false,message:"Request not found"});
    if(request.status!=="REQUESTED"&&request.status!=="UNDER_REVIEW") return res.status(400).json({success:false,message:`Request is already ${request.status}`});
    const requestProductId=String(request.productId||request.items?.[0]?.product||"");
    const ctx=await getRequestContext(String(request.order),String(request.orderItemId),requestProductId);
    if(String(ctx.order.user)!==String(request.customer)) return res.status(409).json({success:false,message:"Customer mapping does not match the order"});

    // Keep the request linked to the canonical identifier used by the current
    // embedded Order.items schema. This repairs legacy/stale orderItemId values
    // without changing the order itself or inventing an item id.
    const canonicalItemId=String(ctx.item?._id||ctx.item?.product||request.orderItemId||"");
    if(canonicalItemId && String(request.orderItemId||"")!==canonicalItemId) request.orderItemId=canonicalItemId;
    if(!request.productId && ctx.item?.product) request.productId=ctx.item.product;
    if(String(ctx.item.product||"")!==String(request.items?.[0]?.product||request.product||ctx.item.product||"")) {
      // Refunds do not carry a product field; orderItemId remains authoritative.
    }
    if(ctx.sourceType==="STORE" && !ctx.storeId) return res.status(409).json({success:false,message:"Store mapping is missing"});
    const reason=String(request.reason||"").trim();
    if(reason.length<3)return res.status(400).json({success:false,message:"Reason verification failed"});
    // Evidence is mandatory, but it has already been uploaded by the customer
    // before this request reaches Customer Care. Read both the hydrated document
    // and the raw MongoDB record so older/legacy evidence shapes are not lost
    // during Mongoose hydration. Only a genuinely non-empty persisted proof is
    // accepted; this does not bypass the mandatory-evidence rule.
    const rawRequest:any = await Model.collection.findOne({ _id: request._id });
    const evidenceBuckets:any[] = [
      request.evidence, request.evidenceImages, request.customerEvidence,
      request.proof, request.proofImages, request.attachments,
      rawRequest?.evidence, rawRequest?.evidenceImages, rawRequest?.customerEvidence,
      rawRequest?.proof, rawRequest?.proofImages, rawRequest?.attachments,
    ];
    const evidence:string[] = imageList(evidenceBuckets);
    if(!evidence.length) return res.status(400).json({success:false,message:"Evidence is required before Customer Care can verify this request"});
    request.evidence=evidence;
    const verified={customer:true,order:true,orderItem:true,product:Boolean(ctx.product),store:Boolean(ctx.storeId||ctx.sourceType==="FRESHBASKET_DIRECT"),policy:Boolean(ctx.policy),eligibility:type==="refund"?Boolean(ctx.policy.refundEligible):Boolean(ctx.policy.replacementEligible),reason:true,evidence:true};
    if(!verified.product||!verified.policy||!verified.eligibility) return res.status(400).json({success:false,message:"Policy or eligibility verification failed",verification:verified});
    request.verification=verified;
    request.customerCareAgent=req.user!.id;
    request.customerCareVerifiedBy=req.user!.id;
    request.customerCareVerifiedAt=new Date();
    request.storeId=ctx.storeId||null;
    request.storeAdmin=ctx.storeId||null;
    request.mainAdmin=ctx.mainAdminId||null;
    request.sourceType=ctx.sourceType;
    request.deliveryPartner=null;
    if(type==="refund"){
      request.status="FINANCE_REVIEW";
      const finance:any=await assignFinanceExecutive(request);
      pushRequestHistory(request,"FINANCE_REVIEW",req.user!.id,"customer_care","Customer Care verified customer, order, item, product, store, policy, eligibility, reason and evidence.");
      await request.save();
      if(finance) await notifyUser({user:finance._id,title:"Refund assigned for review",message:`Refund ${request.requestId} has been assigned to you for Finance review.`,type:"refund_assignment",order:request.order,relatedEntity:"REFUND_REQUEST",relatedEntityId:request._id});
      else await notifyFinanceUsers({title:"Refund ready for Finance",message:`Refund ${request.requestId} is ready for Finance review.`,type:"refund_review",order:request.order});
      await notifyRequestStatus(request,"REFUND","FINANCE_REVIEW");
    } else {
      ensureReplacementIdentity(request);
      request.fulfillmentOwnerType=ctx.sourceType==="STORE" ? "STORE_ADMIN" : "MAIN_ADMIN";
      request.fulfillmentOwnerId=ctx.sourceType==="STORE" ? ctx.storeId : ctx.mainAdminId;
      request.storeAdmin=ctx.sourceType==="STORE" ? ctx.storeId : null;
      request.mainAdmin=ctx.sourceType==="FRESHBASKET_DIRECT" ? ctx.mainAdminId : null;
      request.deliveredAtSnapshot=request.deliveredAtSnapshot || ctx.order.deliveredAt || null;
      request.expiryAt=request.expiryAt || replacementExpiry(ctx.order);
      request.eligibleAtRequestTime=true;
      const nextStatus=ctx.sourceType==="STORE" ? "PENDING_STORE_ADMIN" : "PENDING_MAIN_ADMIN";
      request.status=nextStatus;
      pushRequestHistory(request,nextStatus,req.user!.id,"customer_care","Customer Care verified the request and routed it to the correct fulfillment owner.");
      await request.save();
      if(ctx.sourceType==="STORE") await notifyUser({user:ctx.storeId,title:"Replacement Request Ready",message:`Replacement ${request.requestId} is ready for your store fulfillment.`,type:"replacement_assignment",order:request.order,relatedEntity:"REPLACEMENT_REQUEST",relatedEntityId:request._id});
      else await notifyUser({user:ctx.mainAdminId,title:"FreshBasket Direct Replacement Request",message:`Replacement ${request.requestId} requires FreshBasket Direct fulfillment.`,type:"replacement_assignment",order:request.order,relatedEntity:"REPLACEMENT_REQUEST",relatedEntityId:request._id});
      await notifyRequestStatus(request,"REPLACEMENT",nextStatus);
    }
    await recordCustomerCareAudit({req,action:type==="refund"?"REFUND_VERIFIED_BY_CUSTOMER_CARE":"REPLACEMENT_VERIFIED_BY_CUSTOMER_CARE",targetType:type==="refund"?"REFUND_REQUEST":"REPLACEMENT_REQUEST",targetId:request._id,customer:request.customer,order:request.order,metadata:{requestId:request.requestId,storeId:request.storeId,sourceType:request.sourceType,verification:verified}});
    return res.json({success:true,message:`${type} request verified and routed`,data:request});
  } catch(e:any) { console.error("CUSTOMER CARE REQUEST VERIFY ERROR",e); return res.status(400).json({success:false,message:e?.message||"Unable to verify request"}); }
  })();
});

app.patch("/api/customer-care/replacement-requests/:id", auth, role("customer_care"), customerCarePermission("replacement.request"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Replacement request not found" });
    const request: any = await ReplacementRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Replacement request not found" });
    const status = String(req.body.status || "").trim().toUpperCase();
    if (!["REQUESTED","UNDER_REVIEW"].includes(status)) return res.status(400).json({ success: false, message: "Use the Customer Care verification action for downstream replacement routing" });
    request.status = status; request.customerCareAgent = req.user!.id; pushRequestHistory(request,status,req.user!.id,"customer_care");
    await request.save(); await notifyRequestStatus(request,"REPLACEMENT",status);
    await recordCustomerCareAudit({ req, action: "REPLACEMENT_REQUEST_UPDATED", targetType: "REPLACEMENT_REQUEST", targetId: request._id, customer: request.customer, order: request.order, metadata: { status } });
    return res.json({ success: true, message: "Replacement request updated", data: request });
  } catch (error) {
    console.error("REPLACEMENT REQUEST UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update replacement request" });
  }
});

app.post("/api/customer-care/orders/:id/cancellation-request", auth, role("customer_care"), customerCarePermission("cancellation.request"), async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Order not found" });
    const order: any = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!["Pending", "Confirmed"].includes(order.status)) return res.status(400).json({ success: false, message: "This order can no longer be cancelled" });

    for (const item of order.items) {
      const product: any = await Product.findById(item.product);
      if (!product) continue;
      const previousStock = Number(product.stock || 0);
      const quantity = Number(item.quantity);
      product.stock = previousStock + quantity;
      await product.save();
      await recordStockHistory({ product: product._id, change: quantity, previousStock, newStock: previousStock + quantity, reason: "Order cancelled by Customer Care", order: order._id, adjustedBy: req.user!.id });
    }
    order.status = "Cancelled";
    if (!Array.isArray((order as any).statusHistory)) (order as any).statusHistory = [];
    (order as any).statusHistory.push({ status: "Cancelled", timestamp: new Date() });
    await order.save();
    await notifyUser({ user: order.user, title: "Order cancelled", message: `Your order #${String(order._id).slice(-8).toUpperCase()} was cancelled by Customer Care.`, type: "order_cancelled", order: order._id });
    await notifyAdmins({ title: "Order cancelled by Customer Care", message: `Order #${String(order._id).slice(-8).toUpperCase()} was cancelled by Customer Care.`, type: "order_cancelled", order: order._id, storeAdmin: order.storeAdmin });
    await recordCustomerCareAudit({ req, action: "ORDER_CANCELLATION_PROCESSED", targetType: "ORDER", targetId: order._id, customer: order.user, order: order._id });
    return res.json({ success: true, message: "Order cancelled successfully", data: order });
  } catch (error) {
    console.error("CUSTOMER CARE CANCELLATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to process cancellation request" });
  }
});

app.get("/api/admin/customer-care-analytics", auth, mainAdminOnly, async (_req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalTickets, openTickets, resolvedTickets, pendingTickets, escalatedTickets, refundRequests, replacementRequests, resolved] = await Promise.all([
      SupportTicket.countDocuments({}),
      SupportTicket.countDocuments({ status: { $in: ["OPEN", "IN_PROGRESS", "ESCALATED"] } }),
      SupportTicket.countDocuments({ status: { $in: ["RESOLVED", "CLOSED"] } }),
      SupportTicket.countDocuments({ status: { $in: ["WAITING_FOR_CUSTOMER", "WAITING_FOR_STORE", "WAITING_FOR_DELIVERY_PARTNER"] } }),
      SupportTicket.countDocuments({ status: "ESCALATED" }),
      RefundRequest.countDocuments({}),
      ReplacementRequest.countDocuments({}),
      SupportTicket.find({ status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $ne: null } }).select("createdAt resolvedAt").lean(),
    ]);
    const durations = resolved.map((x: any) => new Date(x.resolvedAt).getTime() - new Date(x.createdAt).getTime()).filter((x: number) => Number.isFinite(x) && x >= 0);
    const avg = durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length / 60000) : 0;
    return res.json({ success: true, data: { totalTickets, openTickets, resolvedTickets, pendingTickets, averageResolutionTimeMinutes: avg, refundRequests, replacementRequests, escalatedTickets } });
  } catch (error) {
    console.error("CUSTOMER CARE ANALYTICS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load Customer Care analytics" });
  }
});


/* =========================================================
   DELIVERY SLA ENGINE — additive, existing statuses preserved
========================================================= */
const DELIVERY_SLA_STATUS_PHASE: Record<string,string> = {
  Pending: "ORDER_RECEIVED",
  Confirmed: "ORDER_RECEIVED",
  Processing: "PACKING",
  Packed: "PICKUP",
  "Out for Delivery": "DELIVERY",
};
const DELIVERY_SLA_CONFIG_KEYS: Record<string,string> = {
  ORDER_RECEIVED: "orderReceived",
  PACKING: "packing",
  PICKUP: "pickup",
  DELIVERY: "delivery",
};
const normalizeDeliverySlaConfig = (raw:any) => {
  const source=raw?.deliverySlaMinutes||{};
  const out:any={};
  for(const key of ["orderReceived","packing","pickup","delivery"]){
    const n=Number(source[key]);
    out[key]=Number.isFinite(n)&&n>0&&n<=10080?n:null;
  }
  return out;
};
const deliverySlaSnapshot = (order:any, now=Date.now()) => {
  const due=order?.slaDueAt ? new Date(order.slaDueAt).getTime() : null;
  const started=order?.slaStartedAt ? new Date(order.slaStartedAt).getTime() : null;
  const active=Boolean(order?.slaPhase && due);
  const breached=Boolean(order?.slaBreached || (active && due! < now && !["Delivered","Cancelled"].includes(String(order?.status||""))));
  return {phase:order?.slaPhase||null, startedAt:started?new Date(started):null, dueAt:due?new Date(due):null, remainingMs:active?Math.max(0,due!-now):null, elapsedMs:started?Math.max(0,now-started):null, active, breached};
};
const applyDeliverySlaForStatus = async (order:any, status:string) => {
  const phase=DELIVERY_SLA_STATUS_PHASE[status];
  if(!phase || ["Delivered","Cancelled"].includes(status)) return;
  const cfgDoc:any=await DeliveryPayoutConfig.findOne({key:"default"}).lean();
  const cfg=normalizeDeliverySlaConfig(cfgDoc);
  const key=DELIVERY_SLA_CONFIG_KEYS[phase];
  const minutes=key?cfg[key]:null;
  if(minutes==null){
    (order as any).slaPhase=phase;
    (order as any).slaStartedAt=null;
    (order as any).slaDueAt=null;
    (order as any).slaBreached=false;
    (order as any).slaBreachedAt=null;
    (order as any).slaAlertedAt=null;
    return;
  }
  const started=new Date();
  (order as any).slaPhase=phase;
  (order as any).slaStartedAt=started;
  (order as any).slaDueAt=new Date(started.getTime()+minutes*60000);
  (order as any).slaBreached=false;
  (order as any).slaBreachedAt=null;
  (order as any).slaAlertedAt=null;
};
const clearDeliverySla = (order:any) => {
  (order as any).slaPhase=null;
  (order as any).slaStartedAt=null;
  (order as any).slaDueAt=null;
  (order as any).slaBreached=false;
  (order as any).slaBreachedAt=null;
  (order as any).slaAlertedAt=null;
};
const checkDeliverySlaBreaches = async () => {
  try {
    const now=new Date();
    const orders:any[]=await Order.find({slaDueAt:{$lte:now},slaBreached:{$ne:true},status:{$nin:["Delivered","Cancelled"]}}).select("_id user storeAdmin deliveryPartner status slaPhase slaDueAt slaBreached slaAlertedAt").limit(200).lean();
    for(const o of orders){
      const updated:any=await Order.findOneAndUpdate({_id:o._id,slaBreached:{$ne:true},status:{$nin:["Delivered","Cancelled"]}},{$set:{slaBreached:true,slaBreachedAt:now}},{new:true}).lean();
      if(!updated) continue;
      await notifyAdmins({title:"Delivery SLA breached",message:`Order #${String(o._id).slice(-8).toUpperCase()} breached its ${String(o.slaPhase||"delivery").replace(/_/g," ").toLowerCase()} SLA.`,type:"delivery_sla_breach",order:o._id,storeAdmin:o.storeAdmin});
      if(o.storeAdmin) await notifyUser({user:o.storeAdmin,title:"Order SLA breached",message:`Order #${String(o._id).slice(-8).toUpperCase()} has breached its delivery SLA.`,type:"delivery_sla_breach",order:o._id});
      if(o.deliveryPartner) await notifyUser({user:o.deliveryPartner,title:"Delivery SLA breached",message:`Order #${String(o._id).slice(-8).toUpperCase()} has breached its SLA.`,type:"delivery_sla_breach",order:o._id});
      await notifyUser({user:o.user,title:"Delivery delay",message:`Your order #${String(o._id).slice(-8).toUpperCase()} is taking longer than the configured delivery SLA.`,type:"delivery_sla_breach",order:o._id});
    }
  } catch(e){ console.error("DELIVERY SLA CHECK ERROR:",e); }
};

/* =========================================================
   DELIVERY GEO / SMART ASSIGNMENT HELPERS
========================================================= */
const roleAny = (...allowedRoles:string[]) => (req:AuthRequest,res:any,next:any) => {
  if (allowedRoles.includes(String(req.user?.role || ""))) return next();
  return res.status(403).json({success:false,message:"Forbidden"});
};
const DELIVERY_LOCATION_STALE_MS = 2 * 60 * 1000;
const DELIVERY_ASSIGNMENT_TTL_MS = 15 * 60 * 1000;
const deliveryRealtimeClients = new Set<express.Response>();
const deliveryRealtimeMeta = new Map<express.Response, { userId: string; role: string; orderId: string }>();
const broadcastDeliveryChatEvent = (payload:any) => { const orderId=String(payload?.orderId||""); if(!orderId)return; const body=`event: delivery-chat\ndata: ${JSON.stringify(payload)}\n\n`; for(const client of deliveryRealtimeClients){const meta=deliveryRealtimeMeta.get(client); if(!meta || String(meta.orderId)!==orderId) continue; try{client.write(body);}catch{deliveryRealtimeClients.delete(client);deliveryRealtimeMeta.delete(client);}} };
const isValidGeo = (lat:any, lng:any) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat)>=-90 && Number(lat)<=90 && Number(lng)>=-180 && Number(lng)<=180;
const haversineKm = (lat1:number,lon1:number,lat2:number,lon2:number) => { const R=6371,toRad=(v:number)=>v*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1); const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a)); };
const locationFreshness = (updatedAt:any) => { if(!updatedAt)return {fresh:false,stale:true,ageSeconds:null}; const ageSeconds=Math.max(0,Math.round((Date.now()-new Date(updatedAt).getTime())/1000)); return {fresh:ageSeconds<=DELIVERY_LOCATION_STALE_MS/1000,stale:ageSeconds>DELIVERY_LOCATION_STALE_MS/1000,ageSeconds}; };
const ROUTING_FALLBACK_URL = "https://routing.openstreetmap.de/routed-car";
const ROUTING_BASES = () => [
  String(process.env.ROUTING_API_URL||"https://router.project-osrm.org").replace(/\/+$/,""),
  ROUTING_FALLBACK_URL,
].filter((value,index,array)=>value && array.indexOf(value)===index);
const routeGeometry = async (points:{latitude:number;longitude:number}[]) => {
  const valid = points.length >= 2 && points.length <= 3 && points.every(p=>isValidGeo(p.latitude,p.longitude));
  if(!valid) return null;
  const encoded = points.map(p=>`${Number(p.longitude)},${Number(p.latitude)}`).join(";");
  for(const base of ROUTING_BASES()){
    try{
      const r=await axios.get(`${base}/route/v1/driving/${encoded}`,{params:{overview:"full",geometries:"geojson",steps:"false"},timeout:10000});
      const route=r.data?.routes?.[0];
      const coordinates=route?.geometry?.coordinates;
      if(Array.isArray(coordinates) && coordinates.length>=2){
        const normalized=coordinates.filter((point:any)=>Array.isArray(point)&&point.length>=2&&isValidGeo(point[1],point[0])).map((point:any)=>[Number(point[1]),Number(point[0])] as [number,number]);
        if(normalized.length>=2) return {coordinates:normalized,distanceKm:Number(route.distance)/1000,etaMinutes:Math.max(1,Math.round(Number(route.duration)/60)),source:"road-routing"};
      }
    }catch{}
  }
  return null;
};
const roadMetrics = async (fromLat:number,fromLng:number,toLat:number,toLng:number) => {
  const result=await routeGeometry([{latitude:fromLat,longitude:fromLng},{latitude:toLat,longitude:toLng}]);
  return result ? {roadDistanceKm:result.distanceKm,etaMinutes:result.etaMinutes,source:result.source} : null;
};

const INDIA_GEO_BOUNDS = { minLat: 6, maxLat: 37.5, minLng: 68, maxLng: 97.7 };
const deliveryDestinationCache = new Map<string,{expiresAt:number; destination:any|null}>();
const isLikelyIndiaCoordinate = (lat:any,lng:any) => isValidGeo(lat,lng) && Number(lat)>=INDIA_GEO_BOUNDS.minLat && Number(lat)<=INDIA_GEO_BOUNDS.maxLat && Number(lng)>=INDIA_GEO_BOUNDS.minLng && Number(lng)<=INDIA_GEO_BOUNDS.maxLng;
const resolveDeliveryDestination = async (order:any) => {
  const orderId=String(order?._id||"");
  const cached=orderId ? deliveryDestinationCache.get(orderId) : null;
  if(cached && cached.expiresAt>Date.now()) return cached.destination;
  const raw=order?.deliveryLocation?.address || order?.address || {};
  const storedLat=Number(order?.deliveryLocation?.latitude ?? order?.address?.latitude);
  const storedLng=Number(order?.deliveryLocation?.longitude ?? order?.address?.longitude);
  if(isValidGeo(storedLat,storedLng) && isLikelyIndiaCoordinate(storedLat,storedLng)) {
    const destination={latitude:storedLat,longitude:storedLng,address:raw};
    if(orderId) deliveryDestinationCache.set(orderId,{expiresAt:Date.now()+300000,destination});
    return destination;
  }
  const address=String(raw?.address||"").trim();
  const city=String(raw?.city||"").trim();
  const state=String(raw?.state||"").trim();
  const pincode=String(raw?.pincode||"").trim();
  if(!address || !city || !pincode) return null;
  const rankGeocodeHits=(hits:any[], approximate=false)=>{
    const normalizedPin=pincode.replace(/\D/g,"");
    const normalizedCity=city.toLowerCase();
    const ranked=(Array.isArray(hits)?hits:[]).filter((h:any)=>isLikelyIndiaCoordinate(h?.lat,h?.lon)).sort((a:any,b:any)=>{
      const score=(h:any)=>{
        const pin=String(h?.address?.postcode||"").replace(/\D/g,"");
        const c=String(h?.address?.city||h?.address?.town||h?.address?.village||h?.address?.municipality||"").trim().toLowerCase();
        return (pin===normalizedPin?4:0)+(c===normalizedCity?2:0)+(String(h?.type||"").toLowerCase()==="house"?1:0);
      };
      return score(b)-score(a);
    });
    const hit=ranked[0];
    return hit ? {latitude:Number(hit.lat),longitude:Number(hit.lon),address:raw,geocoded:true,approximate} : null;
  };

  try {
    const headers={"User-Agent":"FreshBasket/1.0 delivery-tracking"};
    const exactQuery=[address,city,state,pincode,"India"].filter(Boolean).join(", ");
    let r:any=null;
    try {
      r=await axios.get("https://nominatim.openstreetmap.org/search",{params:{q:exactQuery,format:"jsonv2",addressdetails:1,limit:5,countrycodes:"in"},headers,timeout:5000});
    } catch {}
    let destination=rankGeocodeHits(r?.data,false);

    // Address-level geocoding can legitimately fail for village/landmark-style
    // Indian addresses. Fall back to the postal area only as an explicitly
    // approximate destination; never pretend it is the exact house location.
    if(!destination){
      try {
        const fallbackQuery=[pincode,city,state,"India"].filter(Boolean).join(", ");
        const fallback=await axios.get("https://nominatim.openstreetmap.org/search",{params:{q:fallbackQuery,format:"jsonv2",addressdetails:1,limit:3,countrycodes:"in"},headers,timeout:5000});
        destination=rankGeocodeHits(fallback?.data,true);
      } catch {}
    }
    if(orderId) deliveryDestinationCache.set(orderId,{expiresAt:Date.now()+(destination?300000:60000),destination});
    return destination;
  } catch { if(orderId) deliveryDestinationCache.set(orderId,{expiresAt:Date.now()+60000,destination:null}); return null; }
};
const etaConfidenceSnapshot = (args:{status:any,location:any,routing:any,sla:any}) => {
  const status=String(args.status||"");
  const fresh=Boolean(args.location?.fresh);
  const routing=Boolean(args.routing?.etaMinutes!=null && args.routing?.source);
  const knownRoute=Boolean(args.routing?.roadDistanceKm!=null);
  const slaBreached=Boolean(args.sla?.breached);
  if (slaBreached) return {level:"DELAYED",label:"Delayed",reason:"Configured delivery SLA has been breached.",reliable:false};
  if (status!=="Out for Delivery") return {level:"MEDIUM",label:"Medium confidence",reason:"The order is not yet in the active delivery stage.",reliable:routing};
  if (!fresh) return {level:"DELAYED",label:"Delayed",reason:"Delivery Partner location is stale or unavailable.",reliable:false};
  if (routing && knownRoute) return {level:"HIGH",label:"High confidence",reason:"Fresh location and live road-routing data are available.",reliable:true};
  if (fresh) return {level:"MEDIUM",label:"Medium confidence",reason:"Fresh location is available, but live routing data is incomplete.",reliable:false};
  return {level:"DELAYED",label:"Delayed",reason:"Current movement data is unavailable.",reliable:false};
};
const etaWindowSnapshot = (etaMinutes:any, confidence:any, now=Date.now()) => {
  const eta=Number(etaMinutes); if(!Number.isFinite(eta)||eta<1||!confidence?.reliable)return null;
  const buffer=confidence.level==="HIGH" ? Math.max(2,Math.ceil(eta*0.15)) : Math.max(5,Math.ceil(eta*0.30));
  const start=new Date(now+Math.max(0,eta-buffer)*60000);
  const end=new Date(now+(eta+buffer)*60000);
  return {startAt:start.toISOString(),endAt:end.toISOString(),bufferMinutes:buffer};
};
const broadcastDeliveryEvent = async (payload:any) => {
  const partnerId = String(payload?.partnerId || "");
  let sharedOrderIds = new Set<string>();
  if (partnerId) {
    try {
      const shares:any[] = await DeliveryLocationShare.find({deliveryPartnerId:partnerId,sharedBy:"delivery",enabled:true,expiresAt:{$gt:new Date()}}).select("orderId").lean();
      sharedOrderIds = new Set(shares.map((x:any)=>String(x.orderId)));
    } catch {}
  }
  for (const client of deliveryRealtimeClients) {
    const meta:any = deliveryRealtimeMeta.get(client);
    if (!meta) continue;
    if (meta.role === "customer") {
      if (!meta.orderId || !sharedOrderIds.has(String(meta.orderId))) continue;
      try { client.write(`event: delivery-location\ndata: ${JSON.stringify({...payload,orderId:String(meta.orderId)})}\n\n`); } catch { deliveryRealtimeClients.delete(client); deliveryRealtimeMeta.delete(client); }
    } else {
      try { client.write(`event: delivery-location\ndata: ${JSON.stringify(payload)}\n\n`); } catch { deliveryRealtimeClients.delete(client); deliveryRealtimeMeta.delete(client); }
    }
  }
};
const activeDeliveryForPartner = async (partnerId:any): Promise<any> =>
  Order.findOne({
    deliveryPartner: partnerId,
    status: { $nin: ["Delivered","Cancelled"] },
    $or: [
      { deliveryAssignmentStatus: "ACCEPTED" },
      { deliveryAssignmentStatus: { $exists: false }, status: { $in: ["Packed","Out for Delivery"] } },
    ],
  }).select("_id status storeAdmin deliveryLocation address").sort({updatedAt:-1}).lean();
const getAdminOperatingLocation = async (req:AuthRequest) => { const admin:any=await User.findById(req.user!.id).select("latitude longitude locationAccuracy locationUpdatedAt").lean(); return admin&&isValidGeo(admin.latitude,admin.longitude)?admin:null; };
const ensureAdminStoreCoverage = async (req:AuthRequest,order:any) => { const adminLoc=await getAdminOperatingLocation(req); if(!adminLoc)return {ok:false,message:"Admin operating location is not configured. Set your real latitude/longitude before assigning orders."}; const owner=order?.storeAdmin||await getMainAdminId(); const store:any=await StoreLocation.findOne(owner?{$or:[{storeAdmin:owner},{key:String(owner)},{key:"main"}]}:{key:"main"}).lean(); if(!store||!isValidGeo(store.latitude,store.longitude))return {ok:false,message:"Store location is not configured with valid coordinates."}; const distanceKm=haversineKm(Number(adminLoc.latitude),Number(adminLoc.longitude),Number(store.latitude),Number(store.longitude)); return {ok:distanceKm<=30,distanceKm,adminLoc,store,message:distanceKm<=30?"":`Store is outside your 30 KM operating coverage (${distanceKm.toFixed(1)} KM).`}; };
const ensureDeliveryPartnerStoreCoverage = async (order:any,partner:any) => { const owner=order?.storeAdmin||await getMainAdminId(); const store:any=await StoreLocation.findOne(owner?{$or:[{storeAdmin:owner},{key:String(owner)},{key:"main"}]}:{key:"main"}).lean(); if(!store||!isValidGeo(store.latitude,store.longitude))return {ok:false,message:"Store location is not configured with valid coordinates."}; if(!partner||!isValidGeo(partner.latitude,partner.longitude))return {ok:false,message:"Delivery Partner location is not configured with valid coordinates."}; const distanceKm=haversineKm(Number(partner.latitude),Number(partner.longitude),Number(store.latitude),Number(store.longitude)); return {ok:distanceKm<=30,distanceKm,store,partner,message:distanceKm<=30?"":`Delivery Partner is outside the store's 30 KM delivery coverage (${distanceKm.toFixed(1)} KM).`}; };
const getRankedDeliveryPartners = async (orderId:string,req?:AuthRequest) => {
  if(!mongoose.Types.ObjectId.isValid(orderId))throw new Error("Invalid order ID");
  const order:any=await Order.findById(orderId).select("_id user items storeAdmin address total status deliveryPartner deliveryAssignmentStatus").lean();
  if(!order)throw new Error("Order not found");
  const owner=order.storeAdmin||await getMainAdminId();
  const store:any=await StoreLocation.findOne(owner?{$or:[{storeAdmin:owner},{key:String(owner)},{key:"main"}]}:{key:"main"}).lean();
  if(!store||!isValidGeo(store.latitude,store.longitude))throw new Error("Store location is not configured with valid coordinates.");
  const customerLat=Number(order?.address?.latitude??order?.deliveryLocation?.latitude),customerLng=Number(order?.address?.longitude??order?.deliveryLocation?.longitude),hasCustomer=isValidGeo(customerLat,customerLng);
  const partners:any[]=await User.find({role:"delivery"}).select("name email phone employeeId blocked latitude longitude locationUpdatedAt locationAccuracy onlineStatus availabilityStatus currentOrderId serviceArea profilePhoto ratingAverage ratingCount").lean();
  const activeOrders:any[]=await Order.find({deliveryPartner:{$in:partners.map(p=>p._id)},status:{$nin:["Delivered","Cancelled"]},$or:[{deliveryAssignmentStatus:{$in:["PENDING_ACCEPTANCE","ACCEPTED"]}},{deliveryAssignmentStatus:{$exists:false},status:{$in:["Packed","Out for Delivery"]}}]}).select("_id deliveryPartner status storeAdmin address").lean();
  const activeMap=new Map<string,any>(); const activeCountMap=new Map<string,number>(); for(const x of activeOrders){if(x.deliveryPartner){const key=String(x.deliveryPartner);if(!activeMap.has(key))activeMap.set(key,x);activeCountMap.set(key,(activeCountMap.get(key)||0)+1);}}
  const maxActiveOrders=Math.max(1,Number(process.env.DELIVERY_MAX_ACTIVE_ORDERS||3));
  const rows=await Promise.all(partners.map(async(p:any)=>{const hasLocation=isValidGeo(p.latitude,p.longitude),freshness=locationFreshness(p.locationUpdatedAt),activeOrder=activeMap.get(String(p._id))||null,activeOrderCount=activeCountMap.get(String(p._id))||0,distanceToStore=hasLocation?haversineKm(Number(p.latitude),Number(p.longitude),Number(store.latitude),Number(store.longitude)):null,storeRoad=hasLocation?await roadMetrics(Number(p.latitude),Number(p.longitude),Number(store.latitude),Number(store.longitude)):null,distanceToCustomer=hasLocation&&hasCustomer?haversineKm(Number(p.latitude),Number(p.longitude),customerLat,customerLng):null,customerRoad=hasLocation&&hasCustomer?await roadMetrics(Number(p.latitude),Number(p.longitude),customerLat,customerLng):null,capacityAvailable=activeOrderCount<maxActiveOrders,available=!p.blocked&&p.onlineStatus==="ONLINE"&&!['PAUSED','OFFLINE'].includes(String(p.availabilityStatus||""))&&capacityAvailable,busy=Boolean(activeOrder)||p.availabilityStatus==="BUSY"||p.availabilityStatus==="ON_DELIVERY"; const serviceText=String(p.serviceArea||"").trim().toLowerCase(),customerText=`${order.address?.city||""} ${order.address?.state||""} ${order.address?.pincode||""}`.toLowerCase(),serviceMatch=!serviceText||serviceText.split(/[,|]/).some((x:string)=>x.trim()&&customerText.includes(x.trim())); const score=(available?100000:0)+(p.onlineStatus==="ONLINE"?10000:0)+(serviceMatch?1000:0)+(distanceToStore!=null?Math.max(0,1000-distanceToStore*100):-5000)+(freshness.fresh?500:0)+(busy?-20000:0); return {partner:p,availability:available?"AVAILABLE":busy?"BUSY":p.onlineStatus==="ONLINE"?"PAUSED":"OFFLINE",distanceToStore,activeOrderCount,capacity:maxActiveOrders,capacityAvailable,roadDistanceToStore:storeRoad?.roadDistanceKm??null,etaToStore:storeRoad?.etaMinutes??null,distanceToCustomer,roadDistanceToCustomer:customerRoad?.roadDistanceKm??null,etaToCustomer:customerRoad?.etaMinutes??null,locationUpdatedAt:p.locationUpdatedAt||null,locationAccuracy:p.locationAccuracy??null,locationFreshness:freshness,currentOrder:activeOrder,assignmentEligibility:!p.blocked&&capacityAvailable&&p.onlineStatus==="ONLINE"&&!['PAUSED','OFFLINE'].includes(String(p.availabilityStatus||"")),recommendationScore:score,routingFallback:!storeRoad,serviceAreaMatch:serviceMatch};}));
  return rows.sort((a,b)=>{if(a.assignmentEligibility!==b.assignmentEligibility)return a.assignmentEligibility?-1:1;if(a.availability!==b.availability)return a.availability==="AVAILABLE"?-1:1;if(a.serviceAreaMatch!==b.serviceAreaMatch)return a.serviceAreaMatch?-1:1;if((a.distanceToStore??Infinity)!==(b.distanceToStore??Infinity))return(a.distanceToStore??Infinity)-(b.distanceToStore??Infinity);if((a.etaToStore??Infinity)!==(b.etaToStore??Infinity))return(a.etaToStore??Infinity)-(b.etaToStore??Infinity);if((a.activeOrderCount||0)!==(b.activeOrderCount||0))return(a.activeOrderCount||0)-(b.activeOrderCount||0);if(Boolean(a.locationFreshness?.fresh)!==Boolean(b.locationFreshness?.fresh))return a.locationFreshness?.fresh?-1:1;return String(a.partner?.name||"").localeCompare(String(b.partner?.name||""));});
};
app.get("/api/realtime/delivery",auth,roleAny("admin","customer","delivery"),async(req:AuthRequest,res)=>{try{const clientRole=String(req.user?.role||""),orderId=String(req.query.orderId||""),targetOrder:any=orderId&&mongoose.Types.ObjectId.isValid(orderId)?await Order.findById(orderId).select("user deliveryPartner storeAdmin").lean():null;if(orderId&&!targetOrder)return res.status(404).end();if(clientRole==="customer"&&(!targetOrder||String(targetOrder.user)!==String(req.user!.id)))return res.status(403).end();if(clientRole==="delivery"&&targetOrder&&String(targetOrder.deliveryPartner)!==String(req.user!.id))return res.status(403).end();if(clientRole==="admin"&&targetOrder&&!(await belongsToTenant(req,targetOrder)))return res.status(403).end();res.status(200);res.setHeader("Content-Type","text/event-stream");res.setHeader("Cache-Control","no-cache, no-transform");res.setHeader("Connection","keep-alive");res.flushHeaders?.();deliveryRealtimeClients.add(res);deliveryRealtimeMeta.set(res,{userId:String(req.user!.id),role:clientRole,orderId});res.write(`event: connected\ndata: ${JSON.stringify({ok:true})}\n\n`);const heartbeat=setInterval(()=>{try{res.write(": heartbeat\n\n");}catch{}},25000);req.on("close",()=>{clearInterval(heartbeat);deliveryRealtimeClients.delete(res);deliveryRealtimeMeta.delete(res);});}catch{return res.status(500).end();}});
/* =========================================================
   DELIVERY PARTNERS / ASSIGNMENT
========================================================= */

app.get(
  "/api/admin/delivery-partners",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      // Every authorized Admin can see every existing delivery partner.
      // Delivery-partner visibility here is intentionally global for all admin
      // roles; this does not change Store Admin isolation for other resources.
      const filter: any = { role: "delivery" };
      const partners = await User.find(filter)
        .select("name email phone role employeeId blocked latitude longitude locationUpdatedAt locationAccuracy locationPermissionStatus lastLocationHeartbeatAt onlineStatus availabilityStatus currentOrderId serviceArea profilePhoto storeAdmin ratingAverage ratingCount")
        .sort({ name: 1 })
        .lean();

      return res.json({
        success: true,
        data: partners,
      });
    } catch (error) {
      console.error("DELIVERY PARTNERS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load delivery partners",
      });
    }
  }
);

app.post(
  "/api/admin/delivery-partners",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const phone = String(req.body.phone || "").trim();
      const password = String(req.body.password || "");
      const serviceArea = String(req.body.serviceArea || "").trim().slice(0, 500);
      const profilePhoto = String(req.body.profilePhoto || req.body.photo || "").trim();

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Name, email and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email" });
      }
      if (profilePhoto && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(profilePhoto) && !/^https?:\/\//i.test(profilePhoto)) return res.status(400).json({success:false,message:"Profile photo must be an image URL or data image"});
      if (profilePhoto.length > 1000000) return res.status(400).json({success:false,message:"Profile photo is too large"});

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const employeeId = await nextUserIdentifier("employee");
      const partner = await User.create({
        name,
        email,
        phone: phone || undefined,
        password: hashedPassword,
        role: "delivery",
        employeeId,
        blocked: false,
        profilePhoto,
        serviceArea,
        onlineStatus: "OFFLINE",
        availabilityStatus: "AVAILABLE",
        locationPermissionStatus: "unknown",
      });
      const owner = await getTenantAdminId(req as AuthRequest);
      if (owner) await User.collection.updateOne({ _id: partner._id }, { $set: { storeAdmin: owner } });
      await recordCustomerCareAudit({ req: req as AuthRequest, action: "EMPLOYEE_CREATED", targetType: "EMPLOYEE", targetId: partner._id, metadata: { employeeId, role: "delivery" } });

      return res.status(201).json({
        success: true,
        message: "Delivery partner created successfully",
        data: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          role: partner.role,
        },
      });
    } catch (error) {
      console.error("CREATE DELIVERY PARTNER ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to create delivery partner" });
    }
  }
);

app.patch(
  "/api/admin/delivery-partners/:id/status",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ success: false, message: "Delivery partner not found" });
      }

      const rawBlocked = req.body?.blocked;
      const rawStatus = String(req.body?.status || "").trim().toUpperCase();
      const blocked = rawBlocked !== undefined && rawBlocked !== null
        ? (rawBlocked === true || String(rawBlocked).toLowerCase() === "true")
        : rawStatus === "INACTIVE" || rawStatus === "BLOCKED";

      // Status changes must not run the complete User document validation.
      // Only the fields that this endpoint owns are changed atomically.
      const setFields: any = { blocked: Boolean(blocked) };
      if (blocked) {
        setFields.onlineStatus = "OFFLINE";
        setFields.availabilityStatus = "PAUSED";
        setFields.currentOrderId = null;
      }

      const partner: any = await User.findOneAndUpdate(
        { _id: id, role: "delivery" },
        { $set: setFields },
        { new: true, runValidators: false }
      ).select("_id name email phone role blocked").lean();

      if (!partner) {
        return res.status(404).json({ success: false, message: "Delivery partner not found" });
      }

      await recordCustomerCareAudit({
        req: req as AuthRequest,
        action: partner.blocked ? "DELIVERY_PARTNER_BLOCKED" : "DELIVERY_PARTNER_ACTIVATED",
        targetType: "DELIVERY_PARTNER",
        targetId: partner._id,
        metadata: { status: partner.blocked ? "BLOCKED" : "ACTIVE" },
      });

      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res.json({
        success: true,
        message: partner.blocked ? "Delivery partner blocked successfully" : "Delivery partner activated successfully",
        data: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          role: partner.role,
          blocked: Boolean(partner.blocked),
          status: partner.blocked ? "BLOCKED" : "ACTIVE",
        },
      });
    } catch (error) {
      console.error("DELIVERY PARTNER STATUS ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to update delivery partner" });
    }
  }
);

app.delete(
  "/api/admin/delivery-partners/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ success: false, message: "Delivery partner not found" });
      }

      const partner: any = await User.findOne({
        _id: req.params.id,
        role: "delivery",
      });

      if (!partner) {
        return res.status(404).json({ success: false, message: "Delivery partner not found" });
      }

      const assignedOrders = await Order.countDocuments({
        deliveryPartner: partner._id,
        status: { $nin: ["Delivered", "Cancelled"] },
      });

      if (assignedOrders > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete this delivery partner while active orders are assigned. Reassign the orders first.",
        });
      }

      await User.deleteOne({ _id: partner._id });

      return res.json({
        success: true,
        message: "Delivery partner deleted successfully",
      });
    } catch (error) {
      console.error("DELETE DELIVERY PARTNER ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to delete delivery partner" });
    }
  }
);

const makeDeliveryBatchId = () => `BATCH-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

const autoAssignPackedOrder = async (orderId:any) => {
  let claimed:any = null;
  try {
    const current:any = await Order.findOne({ _id: orderId, status: "Packed", deliveryPartner: null, $or: [{ deliveryAssignmentStatus: "UNASSIGNED" }, { deliveryAssignmentStatus: { $exists: false } }] }).lean();
    if (!current) return { assigned:false, reason:"Order is already assigned or no longer Packed" };
    const ranked = await getRankedDeliveryPartners(String(orderId));
    const first = ranked.find((x:any) => x.assignmentEligibility && Number(x.activeOrderCount || 0) === 0);
    if (!first) {
      await notifyAdmins({ title:"Automatic delivery assignment could not be completed", message:`No nearby available delivery partner found for order #${String(orderId).slice(-8).toUpperCase()}.`, type:"delivery_assignment_auto_failed", order:orderId, ...(current.storeAdmin ? {storeAdmin:current.storeAdmin} : {}) });
      return {assigned:false, reason:"No nearby available delivery partner found."};
    }
    const partnerId = first.partner._id;
    const systemAdminId = await getMainAdminId();
    if (!systemAdminId) return {assigned:false,reason:"Automatic delivery assignment could not be completed."};
    const payout = Number((await DeliveryPayoutConfig.findOne({key:"default"}).lean() as any)?.defaultPayout || 35);
    const batchId = null;
    claimed = await Order.findOneAndUpdate(
      { _id: orderId, status:"Packed", deliveryPartner:null, $or:[{deliveryAssignmentStatus:"UNASSIGNED"},{deliveryAssignmentStatus:{$exists:false}}] },
      { $set:{ deliveryPartner:partnerId, deliveryAssignmentStatus:"PENDING_ACCEPTANCE", deliveryAssignmentExpiresAt:new Date(Date.now()+DELIVERY_ASSIGNMENT_TTL_MS), deliveryAssignedAt:new Date(), deliveryPayout:payout, deliveryPayoutStatus:"PENDING", deliveryAssignmentType:"AUTO", deliveryBatchId:batchId } },
      {new:true}
    );
    if(!claimed) return {assigned:false,reason:"Order was assigned by another action first"};
    const expiresAt=claimed.deliveryAssignmentExpiresAt;
    const assignment:any=await DeliveryAssignment.create({order:claimed._id,deliveryPartner:partnerId,assignedBy:systemAdminId,assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt,storeAdmin:claimed.storeAdmin||null,assignmentType:"AUTO",deliveryBatchId:null});
    if(!Array.isArray((claimed as any).deliveryAssignmentHistory))(claimed as any).deliveryAssignmentHistory=[];
    (claimed as any).deliveryAssignmentHistory.push({assignmentId:assignment._id,deliveryPartner:partnerId,assignedBy:null,assignedByLabel:"SYSTEM",assignmentType:"AUTO",assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt});
    await claimed.save();
    await notifyUser({user:partnerId,title:"New Delivery Assignment",message:`Order #${String(claimed._id).slice(-8).toUpperCase()} is waiting for your acceptance.`,type:"assignment",order:claimed._id,relatedEntity:"DELIVERY_ASSIGNMENT",relatedEntityId:assignment._id});
    await notifyAdmins({title:"Order auto-assigned",message:`Order #${String(claimed._id).slice(-8).toUpperCase()} was automatically assigned to a nearby Delivery Partner.`,type:"delivery_assignment_auto",order:claimed._id, ...(claimed.storeAdmin ? {storeAdmin:claimed.storeAdmin} : {})});
    await recordCustomerCareAudit({req:{user:{id:systemAdminId,role:"admin"}} as any,action:"DELIVERY_PARTNER_ASSIGNED_AUTO",targetType:"ORDER",targetId:claimed._id,customer:claimed.user,order:claimed._id,metadata:{deliveryPartnerId:partnerId,assignmentId:assignment._id,assignmentType:"AUTO",assignedBy:"SYSTEM"}});
    return {assigned:true,order:claimed,assignment};
  } catch (e:any) {
    if (claimed?._id) {
      try {
        await DeliveryAssignment.deleteMany({order:claimed._id,assignmentType:"AUTO",status:"PENDING_ACCEPTANCE"});
        await Order.collection.updateOne({_id:claimed._id,deliveryAssignmentType:"AUTO"},{$set:{deliveryPartner:null,deliveryAssignmentStatus:"UNASSIGNED",deliveryAssignmentExpiresAt:null,deliveryAssignedAt:null,deliveryPayout:0,deliveryPayoutStatus:"CANCELLED",deliveryAssignmentType:null,deliveryBatchId:null}});
      } catch {}
    }
    try { await notifyAdmins({title:"Automatic delivery assignment could not be completed",message:"Automatic delivery assignment could not be completed. Manual assignment remains available.",type:"delivery_assignment_auto_failed",order:orderId}); } catch {}
    console.error("AUTO ASSIGN PACKED ORDER ERROR:",e);
    return {assigned:false,reason:"Automatic delivery assignment could not be completed."};
  }
};

const recommendOrReassignDeliveryPartner = async (orderId:any, excludedPartnerId:any, actorReq?:AuthRequest) => {
  try {
    const order:any = await Order.findById(orderId);
    if(!order || ["Delivered","Cancelled"].includes(String(order.status))) return { attempted:false, assigned:false, reason:"Order is no longer active." };
    const ranked = await getRankedDeliveryPartners(String(order._id), actorReq);
    const candidate = ranked.find((x:any)=>x.assignmentEligibility && String(x.partner?._id)!==String(excludedPartnerId));
    if(!candidate) {
      await notifyAdmins({title:"Delivery reassignment required",message:`No eligible Delivery Partner is currently available for order #${String(order._id).slice(-8).toUpperCase()}. Manual reassignment is required.`,type:"delivery_reassignment_required",order:order._id,storeAdmin:order.storeAdmin});
      return {attempted:true,assigned:false,reason:"No eligible Delivery Partner is currently available.",recommendation:null};
    }
    const config:any = await DeliveryReassignmentConfig.findOne({key:"default"}).lean();
    const autoEnabled = config?.autoReassignmentEnabled === true;
    const recommendation = {
      partner:candidate.partner,
      distanceToStore:candidate.distanceToStore,
      etaToStore:candidate.etaToStore,
      activeOrderCount:candidate.activeOrderCount,
      capacity:candidate.capacity,
      locationFreshness:candidate.locationFreshness,
      recommendationScore:candidate.recommendationScore,
    };
    if(!autoEnabled) {
      await notifyAdmins({title:"Delivery Partner reassignment recommended",message:`Order #${String(order._id).slice(-8).toUpperCase()} needs reassignment. Recommended partner: ${candidate.partner?.name||"Delivery Partner"}.`,type:"delivery_reassignment_recommended",order:order._id,storeAdmin:order.storeAdmin});
      return {attempted:true,assigned:false,reason:"Automatic reassignment is disabled.",recommendation};
    }
    const systemAdminId = await getMainAdminId();
    if(!systemAdminId) return {attempted:true,assigned:false,reason:"No Main Admin account is available for system assignment.",recommendation};
    const payout = Number((await DeliveryPayoutConfig.findOne({key:"default"}).lean() as any)?.defaultPayout || 35);
    const expiresAt = new Date(Date.now()+DELIVERY_ASSIGNMENT_TTL_MS);
    const claimed:any = await Order.findOneAndUpdate(
      { _id:order._id, status:{ $nin:["Delivered","Cancelled"] }, deliveryPartner:null, deliveryAssignmentStatus:{ $in:["REJECTED","UNASSIGNED"] } },
      { $set:{ deliveryPartner:candidate.partner._id, deliveryAssignmentStatus:"PENDING_ACCEPTANCE", deliveryAssignmentExpiresAt:expiresAt, deliveryAssignedAt:new Date(), deliveryAcceptedAt:null, deliveryRejectedAt:null, deliveryRejectionReason:"", deliveryRejectionDetails:"", deliveryPayout:payout, deliveryPayoutStatus:"PENDING", deliveryAssignmentType:"AUTO", deliveryBatchId:null } },
      {new:true}
    );
    if(!claimed) return {attempted:true,assigned:false,reason:"Order was reassigned by another action first.",recommendation};
    const assignment:any = await DeliveryAssignment.create({order:claimed._id,deliveryPartner:candidate.partner._id,assignedBy:systemAdminId,assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt,storeAdmin:claimed.storeAdmin||null,assignmentType:"AUTO",deliveryBatchId:null});
    if(!Array.isArray((claimed as any).deliveryAssignmentHistory))(claimed as any).deliveryAssignmentHistory=[];
    (claimed as any).deliveryAssignmentHistory.push({assignmentId:assignment._id,deliveryPartner:candidate.partner._id,assignedBy:null,assignedByLabel:"SYSTEM_REASSIGNMENT",assignmentType:"AUTO",assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt,previousPartnerId:excludedPartnerId||null});
    await claimed.save();
    await notifyUser({user:candidate.partner._id,title:"New Delivery Assignment",message:`Order #${String(claimed._id).slice(-8).toUpperCase()} has been reassigned to you and is waiting for acceptance.`,type:"assignment",order:claimed._id,relatedEntity:"DELIVERY_ASSIGNMENT",relatedEntityId:assignment._id});
    await notifyUser({user:claimed.user,title:"Delivery partner reassigned",message:`A new Delivery Partner has been assigned to your order #${String(claimed._id).slice(-8).toUpperCase()}.`,type:"delivery_reassignment",order:claimed._id});
    await notifyAdmins({title:"Delivery Partner automatically reassigned",message:`Order #${String(claimed._id).slice(-8).toUpperCase()} was reassigned to ${candidate.partner?.name||"a Delivery Partner"}.`,type:"delivery_reassignment_auto",order:claimed._id,storeAdmin:claimed.storeAdmin});
    await recordCustomerCareAudit({req:actorReq||({user:{id:systemAdminId,role:"admin"}} as any),action:"DELIVERY_PARTNER_REASSIGNED_AUTO",targetType:"ORDER",targetId:claimed._id,customer:claimed.user,order:claimed._id,metadata:{previousPartnerId:excludedPartnerId||null,newPartnerId:candidate.partner._id,assignmentId:assignment._id,assignmentType:"AUTO",reason:"Previous Delivery Partner unavailable/rejected"}});
    return {attempted:true,assigned:true,recommendation,assignment,order:claimed};
  } catch(error:any) {
    console.error("DELIVERY REASSIGNMENT ERROR:",error);
    return {attempted:true,assigned:false,reason:"Unable to complete delivery reassignment safely.",recommendation:null};
  }
};

app.get("/api/admin/delivery-reassignment/settings",auth,mainAdminOnly,async(_req,res)=>{try{const d:any=await DeliveryReassignmentConfig.findOneAndUpdate({key:"default"},{},{upsert:true,new:true,setDefaultsOnInsert:true});return res.json({success:true,data:{autoReassignmentEnabled:Boolean(d.autoReassignmentEnabled)}});}catch{return res.status(500).json({success:false,message:"Unable to load delivery reassignment settings"});}});
app.patch("/api/admin/delivery-reassignment/settings",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const enabled=Boolean(req.body.autoReassignmentEnabled);const previous:any=await DeliveryReassignmentConfig.findOne({key:"default"}).lean();const d:any=await DeliveryReassignmentConfig.findOneAndUpdate({key:"default"},{$set:{autoReassignmentEnabled:enabled,updatedBy:req.user!.id}},{upsert:true,new:true,setDefaultsOnInsert:true});await recordEntityChange({req,action:"DELIVERY_REASSIGNMENT_SETTINGS_CHANGED",targetType:"CONFIGURATION",targetId:"assignment-mode",before:{assignmentMode:previous?.autoReassignmentEnabled===true?"AUTO_REASSIGNMENT":"MANUAL_RECOMMENDATION"},after:{assignmentMode:enabled?"AUTO_REASSIGNMENT":"MANUAL_RECOMMENDATION"},reason:req.body?.reason||"Assignment mode changed"});return res.json({success:true,message:"Delivery reassignment settings updated",data:{autoReassignmentEnabled:Boolean(d.autoReassignmentEnabled)}});}catch{return res.status(400).json({success:false,message:"Unable to update delivery reassignment settings"});}});

app.get("/api/admin/delivery-partners/ranked",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const orderId=String(req.query.orderId||"");
    if(!orderId)return res.status(400).json({success:false,message:"Order ID is required"});
    const order:any=await Order.findOne({_id:orderId,...(await tenantFilter(req))}).lean();
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    const rows=await getRankedDeliveryPartners(orderId,req);
    const nearest=rows.find((x:any)=>x.distanceToStore!=null);
    return res.json({success:true,data:rows,coverage:{within30Km:Boolean(nearest&&Number(nearest.distanceToStore)<=30),distanceKm:nearest?.distanceToStore??null}});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to rank delivery partners"});}
});
app.get("/api/admin/delivery-partners/nearby",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const orderId=String(req.query.orderId||"");
    if(!orderId)return res.status(400).json({success:false,message:"Order ID is required"});
    const rows=await getRankedDeliveryPartners(orderId,req);
    return res.json({success:true,data:rows});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to load nearby delivery partners"});}
});

app.patch("/api/admin/orders/:id/assign",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const order:any=await Order.findOne({_id:req.params.id,...(await tenantFilter(req))});
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    if(["Delivered","Cancelled"].includes(order.status))return res.status(400).json({success:false,message:"Cannot assign a completed or cancelled order"});
    let deliveryPartnerId=String(req.body.deliveryPartnerId||"").trim();
    if(req.body.autoNearest===true){
      const ranked=await getRankedDeliveryPartners(String(order._id),req);
      const first=ranked.find((x:any)=>x.assignmentEligibility);
      if(!first)return res.status(400).json({success:false,message:"No eligible nearby Delivery Partner with a fresh live location is available."});
      deliveryPartnerId=String(first.partner._id);
    }

    if(!deliveryPartnerId){
      const existing=await DeliveryAssignment.findOne({order:order._id,status:"PENDING_ACCEPTANCE"}).sort({createdAt:-1});
      if(existing){ existing.status="CANCELLED"; await existing.save(); }
      order.deliveryPartner=null as any;
      order.deliveryAssignmentStatus="UNASSIGNED";
      order.deliveryAssignmentExpiresAt=null;
      order.deliveryPayout=0;
      order.deliveryPayoutStatus="CANCELLED";
      order.deliveryAssignmentType=null;
      order.deliveryBatchId=null;
      await order.save();
      return res.json({success:true,message:"Delivery partner unassigned successfully",data:order});
    }

    if(!mongoose.Types.ObjectId.isValid(deliveryPartnerId))return res.status(400).json({success:false,message:"Invalid delivery partner"});
    const partner:any=await User.findOne({_id:deliveryPartnerId,role:"delivery",blocked:{$ne:true}});
    if(!partner)return res.status(400).json({success:false,message:"Delivery partner not found or blocked"});
    // Delivery-partner location is routing/recommendation data, not a hard
    // assignment prerequisite. A partner may carry active orders from multiple
    // Store Admins/stores when the configured capacity allows it. This is
    // especially important for same-area multi-store batching. The ranking
    // endpoint still uses real location data for route-aware recommendations.

    // A Delivery Partner may carry multiple active orders when capacity allows.
    // Do not block an assignment merely because the partner already has an order,
    // including orders belonging to another Store Admin. The configured active-order
    // capacity remains the hard limit.
    const maxActiveOrders=Math.max(1,Number(process.env.DELIVERY_MAX_ACTIVE_ORDERS||3));
    const activeCount=await Order.countDocuments({
      deliveryPartner:partner._id,
      status:{$nin:["Delivered","Cancelled"]},
      $or:[
        {deliveryAssignmentStatus:{$in:["PENDING_ACCEPTANCE","ACCEPTED"]}},
        {deliveryAssignmentStatus:{$exists:false},status:{$in:["Packed","Out for Delivery"]}},
      ],
    });
    const sameOrderAlreadyActive=Boolean((order as any).deliveryPartner&&String((order as any).deliveryPartner)===String(partner._id));
    if(activeCount>=maxActiveOrders&&!sameOrderAlreadyActive){
      return res.status(400).json({success:false,message:`This Delivery Partner can handle at most ${maxActiveOrders} active orders at a time.`,code:"PARTNER_CAPACITY_REACHED",activeOrderCount:activeCount,capacity:maxActiveOrders});
    }

    const previousPartnerId=String((order as any).deliveryPartner||"");
    const hadExistingPartner=Boolean(previousPartnerId);
    const requestedPayout=req.body.deliveryPayout===undefined||req.body.deliveryPayout==="" ? (Number((order as any).deliveryPayout||0)||Number((await DeliveryPayoutConfig.findOne({key:"default"}).lean() as any)?.defaultPayout||35)) : Number(req.body.deliveryPayout);
    const existingPayout=Number((order as any).deliveryPayout??0);
    if(!Number.isFinite(requestedPayout)||requestedPayout<0||requestedPayout>10000)return res.status(400).json({success:false,message:"Delivery payout must be between ₹0 and ₹10,000"});
    const incompleteInitialAssignment=hadExistingPartner&&existingPayout<=0&&!(order as any).deliveryStartedAt&&!(order as any).deliveredAt;
    const protectedChange=hadExistingPartner&&!incompleteInitialAssignment&&(previousPartnerId!==deliveryPartnerId||existingPayout!==requestedPayout);
    if(protectedChange&&req.body.authorizedPayoutChange!==true)return res.status(400).json({success:false,message:"Delivery payout is locked after assignment. An authorized payout-change action with a reason is required."});
    if(protectedChange){
      const reason=String(req.body.payoutChangeReason||"").trim();
      if(!reason)return res.status(400).json({success:false,message:"A reason is required for reassignment/payout change."});
      await recordCustomerCareAudit({req,action:"DELIVERY_ASSIGNMENT_CHANGED",targetType:"ORDER",targetId:order._id,order:order._id,metadata:{previousPartnerId,newPartnerId:deliveryPartnerId,previousPayout:existingPayout,newPayout:requestedPayout,reason}});
    }

    await DeliveryAssignment.updateMany({order:order._id,status:"PENDING_ACCEPTANCE"},{$set:{status:"CANCELLED"}});
    const expiresAt=new Date(Date.now()+DELIVERY_ASSIGNMENT_TTL_MS);
    const assignment:any=await DeliveryAssignment.create({order:order._id,deliveryPartner:partner._id,assignedBy:req.user!.id,assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt,storeAdmin:order.storeAdmin||null,assignmentType:"MANUAL",deliveryBatchId:null});

    if(!Array.isArray((order as any).deliveryAssignmentHistory))(order as any).deliveryAssignmentHistory=[];
    (order as any).deliveryAssignmentHistory.push({
      assignmentId:assignment._id,deliveryPartner:partner._id,assignedBy:req.user!.id,assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt
    });
    order.deliveryPartner=partner._id as any;
    order.deliveryAssignmentStatus="PENDING_ACCEPTANCE";
    order.deliveryAssignmentType="MANUAL";
    order.deliveryBatchId=null;
    order.deliveryAssignmentExpiresAt=expiresAt;
    order.deliveryAcceptedAt=null;
    order.deliveryRejectedAt=null;
    order.deliveryRejectionReason="";
    order.deliveryRejectionDetails="";
    if(!(order as any).deliveryAssignedAt)(order as any).deliveryAssignedAt=new Date();
    order.deliveryPayout=requestedPayout;
    order.deliveryPayoutStatus="PENDING";
    await order.save();

    await notifyUser({user:partner._id,title:"New Delivery Assignment",message:`Order #${String(order._id).slice(-8).toUpperCase()} is waiting for your acceptance.`,type:"assignment",order:order._id,relatedEntity:"DELIVERY_ASSIGNMENT",relatedEntityId:assignment._id});
    await notifyUser({user:order.user,title:"Delivery partner assigned",message:`A Delivery Partner has been assigned and is awaiting acceptance for order #${String(order._id).slice(-8).toUpperCase()}.`,type:"delivery_assignment",order:order._id});
    await recordCustomerCareAudit({req,action:"DELIVERY_PARTNER_ASSIGNED",targetType:"ORDER",targetId:order._id,customer:order.user,order:order._id,metadata:{deliveryPartnerId,deliveryPayout:requestedPayout,assignmentId:assignment._id,status:"PENDING_ACCEPTANCE",assignmentType:"MANUAL"}});

    const updated:any=await Order.findById(order._id).populate("user","name email phone blocked").populate("deliveryPartner","name email phone role blocked");
    return res.json({success:true,message:"Delivery assignment sent for partner acceptance",data:updated,assignment});
  }catch(error){console.error("ASSIGN DELIVERY ERROR:",error);return res.status(500).json({success:false,message:"Unable to assign delivery partner"});}
});


const getBatchRecommendation = async (orders:any[], partner:any) => {
  const maxActiveOrders=Math.max(1,Number(process.env.DELIVERY_MAX_ACTIVE_ORDERS||3));
  const maxCustomerGapKm=Math.max(0.1,Number(process.env.DELIVERY_BATCH_MAX_CUSTOMER_GAP_KM||5));
  const maxSlotGapMinutes=Math.max(0,Number(process.env.DELIVERY_BATCH_MAX_SLOT_GAP_MINUTES||60));
  const minSlaBufferMinutes=Math.max(0,Number(process.env.DELIVERY_BATCH_MIN_SLA_BUFFER_MINUTES||20));
  const reasons:string[]=[];
  const warnings:string[]=[];
  const sameStore=orders.every(o=>String(o.storeAdmin||"")===String(orders[0]?.storeAdmin||""));
  if(sameStore) reasons.push("same store"); else warnings.push("orders come from different stores");
  const statuses=orders.map(o=>String(o.status||""));
  const pickupReady=orders.every(o=>["Packed","Out for Delivery"].includes(String(o.status||"")));
  if(pickupReady) reasons.push("pickup ready"); else warnings.push(`not all orders are pickup-ready (${statuses.join(", ")})`);

  const parseSlot=(value:any)=>{
    const text=String(value||"").trim();
    if(!text)return null;
    const matches=[...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/ig)];
    if(!matches.length)return null;
    const toMinutes=(m:any)=>{let h=Number(m[1]),min=Number(m[2]||0),ampm=String(m[3]||"").toUpperCase();if(ampm){if(h===12)h=0;if(ampm==="PM")h+=12;}return h*60+min;};
    const values=matches.slice(0,2).map(toMinutes).sort((a:number,b:number)=>a-b);
    return {start:values[0],end:values[1]??values[0]};
  };
  const slots=orders.map(o=>parseSlot(o.deliverySlot));
  const knownSlots=slots.filter(Boolean) as any[];
  let slotCompatible=true;
  if(knownSlots.length===orders.length && knownSlots.length>1){
    const minStart=Math.min(...knownSlots.map(x=>x.start));
    const maxEnd=Math.max(...knownSlots.map(x=>x.end));
    slotCompatible=(maxEnd-minStart)<=maxSlotGapMinutes;
    if(slotCompatible) reasons.push("compatible delivery slots"); else warnings.push(`delivery slots exceed configured ${maxSlotGapMinutes} minute batch window`);
  } else if(knownSlots.length>0) warnings.push("some delivery slots are unavailable for comparison");

  const slaDates=orders.map(o=>o.slaDueAt?new Date(o.slaDueAt).getTime():null).filter((x:any)=>Number.isFinite(x)) as number[];
  let slaSafe=true;
  if(slaDates.length){
    const earliest=Math.min(...slaDates);
    slaSafe=(earliest-Date.now())/60000>=minSlaBufferMinutes;
    if(slaSafe) reasons.push("SLA buffer available"); else warnings.push(`earliest SLA has less than configured ${minSlaBufferMinutes} minute safety buffer`);
  }

  const points=orders.map(o=>({
    orderId:o._id,
    latitude:o.address?.latitude??o.deliveryLocation?.latitude??null,
    longitude:o.address?.longitude??o.deliveryLocation?.longitude??null,
  }));
  const geo=points.filter(x=>isValidGeo(x.latitude,x.longitude));
  let maxGap=0;
  for(let i=0;i<geo.length;i++)for(let j=i+1;j<geo.length;j++)maxGap=Math.max(maxGap,haversineKm(Number(geo[i].latitude),Number(geo[i].longitude),Number(geo[j].latitude),Number(geo[j].longitude)));
  const geoCompatible=geo.length===points.length && maxGap<=maxCustomerGapKm;
  if(geoCompatible) reasons.push("customer destinations are nearby"); else if(geo.length<points.length) warnings.push("customer destination coordinates are unavailable"); else warnings.push(`customer destinations exceed configured ${maxCustomerGapKm} KM batch gap`);

  const currentActive=await Order.countDocuments({deliveryPartner:partner._id,status:{$nin:["Delivered","Cancelled"]},$or:[{deliveryAssignmentStatus:{$in:["PENDING_ACCEPTANCE","ACCEPTED"]}},{deliveryAssignmentStatus:{$exists:false},status:{$in:["Packed","Out for Delivery"]}}]});
  const capacityAvailable=currentActive+orders.length<=maxActiveOrders;
  if(capacityAvailable) reasons.push(`partner capacity available (${currentActive + orders.length}/${maxActiveOrders})`); else warnings.push(`partner capacity exceeded (${currentActive + orders.length}/${maxActiveOrders})`);

  // Existing active route is included as a soft compatibility signal. We never invent
  // road distance when routing data is unavailable; the recommendation stays advisory.
  const activeRoute:any[]=await Order.find({deliveryPartner:partner._id,status:{$nin:["Delivered","Cancelled"]},_id:{$nin:orders.map(o=>o._id)}}).select("_id address deliveryLocation deliveryBatchId").lean();
  const routePoints=[...activeRoute,...orders].map(o=>({latitude:o.address?.latitude??o.deliveryLocation?.latitude??null,longitude:o.address?.longitude??o.deliveryLocation?.longitude??null})).filter(x=>isValidGeo(x.latitude,x.longitude));
  const routeDataComplete=routePoints.length===activeRoute.length+orders.length;
  let routeSpreadKm=0;
  for(let i=0;i<routePoints.length;i++)for(let j=i+1;j<routePoints.length;j++)routeSpreadKm=Math.max(routeSpreadKm,haversineKm(Number(routePoints[i].latitude),Number(routePoints[i].longitude),Number(routePoints[j].latitude),Number(routePoints[j].longitude)));
  if(routeDataComplete && routeSpreadKm<=maxCustomerGapKm*2) reasons.push("compatible with current route area");
  else if(activeRoute.length) warnings.push(routeDataComplete?"current route is geographically wider than the batch threshold":"current route location data is incomplete");

  const recommended=sameStore&&pickupReady&&slotCompatible&&slaSafe&&geoCompatible&&capacityAvailable&&(activeRoute.length===0||routeDataComplete);
  if(!recommended && !warnings.length) warnings.push("selected orders do not meet all batch recommendation criteria");
  return {recommended, reasons, warnings, criteria:{sameStore,pickupReady,slotCompatible,slaSafe,geoCompatible,capacityAvailable,routeCompatible:activeRoute.length===0||routeDataComplete},metrics:{maxCustomerGapKm:Number(maxGap.toFixed(2)),currentActiveOrders:currentActive,maxActiveOrders,routeSpreadKm:Number(routeSpreadKm.toFixed(2))},config:{maxCustomerGapKm,maxSlotGapMinutes,minSlaBufferMinutes}};
};

app.get("/api/admin/orders/batch-recommendation",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const raw=String(req.query.orderIds||"");
    const ids=[...new Set(raw.split(",").map(x=>x.trim()).filter(x=>mongoose.Types.ObjectId.isValid(x)))];
    const partnerId=String(req.query.deliveryPartnerId||"").trim();
    if(ids.length<2)return res.status(400).json({success:false,message:"At least two order IDs are required."});
    if(!mongoose.Types.ObjectId.isValid(partnerId))return res.status(400).json({success:false,message:"A valid Delivery Partner is required."});
    const partner:any=await User.findOne({_id:partnerId,role:"delivery",blocked:{$ne:true}}).select("_id name onlineStatus availabilityStatus latitude longitude locationUpdatedAt").lean();
    if(!partner)return res.status(404).json({success:false,message:"Delivery Partner not found or blocked."});
    const filter:any=await tenantFilter(req);
    const orders:any[]=await Order.find({_id:{$in:ids},...filter,status:{$nin:["Delivered","Cancelled"]}}).select("_id user storeAdmin status address deliveryLocation deliverySlot slaDueAt deliveryPartner deliveryAssignmentStatus").populate("user","name").lean();
    if(orders.length!==ids.length)return res.status(400).json({success:false,message:"One or more selected orders are no longer available. Refresh and try again."});
    if(orders.some(o=>o.deliveryPartner&&String(o.deliveryPartner)!==partnerId))return res.status(409).json({success:false,message:"One or more selected orders are already assigned to another Delivery Partner."});
    const recommendation=await getBatchRecommendation(orders,partner);
    return res.json({success:true,data:{partner:{id:partner._id,name:partner.name},orders:orders.map(o=>({_id:o._id,status:o.status,deliverySlot:o.deliverySlot||null,slaDueAt:o.slaDueAt||null,customer:o.user?.name||"Customer"})),...recommendation}});
  }catch(e:any){console.error("BATCH RECOMMENDATION ERROR:",e);return res.status(500).json({success:false,message:"Unable to calculate batch recommendation."});}
});

app.post("/api/admin/orders/batch-assign",auth,role("admin"),async(req:AuthRequest,res)=>{
  try {
    const ids=[...new Set((Array.isArray(req.body.orderIds)?req.body.orderIds:[]).map((x:any)=>String(x||"").trim()).filter((x:string)=>mongoose.Types.ObjectId.isValid(x)))];
    const partnerId=String(req.body.deliveryPartnerId||"").trim();
    if(ids.length<2)return res.status(400).json({success:false,message:"Select at least two orders for batch assignment."});
    if(!mongoose.Types.ObjectId.isValid(partnerId))return res.status(400).json({success:false,message:"Select a valid Delivery Partner."});
    const partner:any=await User.findOne({_id:partnerId,role:"delivery",blocked:{$ne:true}}).lean();
    if(!partner)return res.status(400).json({success:false,message:"Delivery partner not found or blocked."});
    const filter:any=await tenantFilter(req);
    const orders:any[]=await Order.find({_id:{$in:ids},...filter,status:{$nin:["Delivered","Cancelled"]}}).lean();
    if(orders.length!==ids.length)return res.status(400).json({success:false,message:"One or more selected orders are no longer available for assignment. Refresh and try again."});
    const assignedElsewhere=orders.filter(o=>o.deliveryPartner && String(o.deliveryPartner)!==partnerId);
    if(assignedElsewhere.length)return res.status(409).json({success:false,message:"Some selected orders are already assigned to another Delivery Partner.",failed:assignedElsewhere.map(o=>({orderId:o._id,reason:"Already assigned to another Delivery Partner"}))});
    // Batch assignment follows the same multi-store rule as manual assignment:
    // real location remains useful for route optimization, but missing/stale
    // partner coordinates must not prevent an authorized admin from assigning
    // an order when the partner is otherwise valid and within capacity.
    const maxActiveOrders=Math.max(1,Number(process.env.DELIVERY_MAX_ACTIVE_ORDERS||3));
    const existingActive=await Order.countDocuments({deliveryPartner:partnerId,status:{$nin:["Delivered","Cancelled"]},$or:[{deliveryAssignmentStatus:{$in:["PENDING_ACCEPTANCE","ACCEPTED"]}},{deliveryAssignmentStatus:{$exists:false},status:{$in:["Packed","Out for Delivery"]}}]});
    if(existingActive+orders.length>maxActiveOrders)return res.status(400).json({success:false,message:`This Delivery Partner can handle at most ${maxActiveOrders} active orders at a time.`});
    const batchId=makeDeliveryBatchId();
    const defaultPayout=Number((await DeliveryPayoutConfig.findOne({key:"default"}).lean() as any)?.defaultPayout||35);
    const claimed:any[]=[];
    for(const id of ids){
      const claimedOrder:any=await Order.findOneAndUpdate({_id:id,status:{$nin:["Delivered","Cancelled"]},deliveryPartner:null},{$set:{deliveryPartner:partnerId,deliveryAssignmentStatus:"PENDING_ACCEPTANCE",deliveryAssignmentExpiresAt:new Date(Date.now()+DELIVERY_ASSIGNMENT_TTL_MS),deliveryAssignedAt:new Date(),deliveryPayout:defaultPayout,deliveryPayoutStatus:"PENDING",deliveryAssignmentType:"BATCH",deliveryBatchId:batchId}},{new:true});
      if(!claimedOrder){
        for(const c of claimed){ await DeliveryAssignment.deleteMany({order:c._id,deliveryBatchId:batchId}); await Order.collection.updateOne({_id:c._id,deliveryBatchId:batchId},{$set:{deliveryPartner:null,deliveryAssignmentStatus:"UNASSIGNED",deliveryAssignmentExpiresAt:null,deliveryAssignedAt:null,deliveryPayout:0,deliveryPayoutStatus:"CANCELLED",deliveryAssignmentType:"MANUAL",deliveryBatchId:null},$unset:{deliveryAssignmentHistory:""}}); }
        return res.status(409).json({success:false,message:"The selected orders changed while assigning. No batch assignment was kept.",failed:[{reason:"Concurrent assignment change"}]});
      }
      claimed.push(claimedOrder);
    }
    const assignments:any[]=[];
    for(const o of claimed){
      const expiresAt=o.deliveryAssignmentExpiresAt;
      const a:any=await DeliveryAssignment.create({order:o._id,deliveryPartner:partnerId,assignedBy:req.user!.id,assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt,storeAdmin:o.storeAdmin||null,assignmentType:"BATCH",deliveryBatchId:batchId});
      assignments.push(a);
      if(!Array.isArray((o as any).deliveryAssignmentHistory))(o as any).deliveryAssignmentHistory=[];
      (o as any).deliveryAssignmentHistory.push({assignmentId:a._id,deliveryPartner:partnerId,assignedBy:req.user!.id,assignedAt:new Date(),status:"PENDING_ACCEPTANCE",expiresAt,assignmentType:"BATCH",deliveryBatchId:batchId});
      await o.save();
    }
    await notifyUser({user:partnerId,title:"New Delivery Assignments",message:`${claimed.length} new orders have been assigned to you for delivery.`,type:"assignment",order:claimed[0]._id,relatedEntity:"DELIVERY_BATCH",relatedEntityId:batchId});
    await notifyAdmins({title:"Batch delivery assignment completed",message:`${claimed.length} orders were assigned together to ${partner.name||"a Delivery Partner"}.`,type:"delivery_assignment_batch",order:claimed[0]._id,relatedEntity:"DELIVERY_BATCH",relatedEntityId:batchId});
    await Promise.all(claimed.map(o=>recordCustomerCareAudit({req,action:"DELIVERY_PARTNER_ASSIGNED_BATCH",targetType:"ORDER",targetId:o._id,customer:o.user,order:o._id,metadata:{deliveryPartnerId:partnerId,assignmentType:"BATCH",deliveryBatchId:batchId,assignedCount:claimed.length}})));
    const updated:any[]=await Order.find({_id:{$in:ids}}).populate("user","name email phone customerId").populate("deliveryPartner","name email phone role").lean();
    const routeCustomers=updated.map(o=>({orderId:o._id,name:o.user?.name||"Customer",latitude:o.address?.latitude??o.deliveryLocation?.latitude??null,longitude:o.address?.longitude??o.deliveryLocation?.longitude??null}));
    const sameStore=updated.every(o=>String(o.storeAdmin||"")==String(updated[0].storeAdmin||""));
    const geoCustomers=routeCustomers.filter(x=>isValidGeo(x.latitude,x.longitude));
    let maxCustomerGapKm=0;
    for(let i=0;i<geoCustomers.length;i++)for(let j=i+1;j<geoCustomers.length;j++)maxCustomerGapKm=Math.max(maxCustomerGapKm,haversineKm(Number(geoCustomers[i].latitude),Number(geoCustomers[i].longitude),Number(geoCustomers[j].latitude),Number(geoCustomers[j].longitude)));
    const routeMatch=geoCustomers.length===routeCustomers.length?(sameStore&&maxCustomerGapKm<=5?"GOOD_ROUTE_MATCH":"NEARBY_DELIVERY"):"ROUTE_DATA_UNAVAILABLE";
    return res.status(201).json({success:true,message:`${claimed.length} orders assigned successfully as one delivery batch.`,data:updated,batch:{deliveryBatchId:batchId,orderIds:ids,deliveryPartnerId:partnerId,selectedOrders:claimed.length,sameStore,maxCustomerGapKm:Number(maxCustomerGapKm.toFixed(2)),routeMatch,routeSequence:routeCustomers}});
  }catch(e:any){console.error("BATCH ASSIGN ERROR:",e);return res.status(500).json({success:false,message:"Unable to assign the selected orders as a batch."});}
});

app.get("/api/delivery/assignments",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try{
    const now=new Date();
    await DeliveryAssignment.updateMany({deliveryPartner:req.user!.id,status:"PENDING_ACCEPTANCE",expiresAt:{$lte:now}},{$set:{status:"EXPIRED"}});
    const rows:any[]=await DeliveryAssignment.find({deliveryPartner:req.user!.id,status:{$in:["PENDING_ACCEPTANCE","ACCEPTED","REJECTED"]}})
      .sort({createdAt:-1}).limit(50)
      .populate("order","_id total status address deliverySlot storeAdmin items paymentMethod")
      .populate("assignedBy","name employeeId").lean();
    const enriched=await Promise.all(rows.map(async(a:any)=>{
      let metrics:any={};
      try{const ranked=await getRankedDeliveryPartners(String(a.order?._id||a.order),undefined);metrics=ranked.find((x:any)=>String(x.partner?._id)===String(req.user!.id))||{};}catch{}
      return {...a,metrics};
    }));
    return res.json({success:true,data:enriched});
  }catch(e){return res.status(500).json({success:false,message:"Unable to load delivery assignments"});}
});



app.get("/api/delivery/route-sequence",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try{
    const partner:any=await User.findById(req.user!.id).select("latitude longitude locationUpdatedAt").lean();
    if(!partner||!isValidGeo(partner.latitude,partner.longitude)){
      return res.json({success:true,data:{available:false,reason:"Delivery Partner live location is unavailable.",stops:[],nextStop:null,totalDistanceKm:null,estimatedRouteMinutes:null,remainingStops:0}});
    }
    const activeOrders:any[]=await Order.find({
      deliveryPartner:req.user!.id,
      status:{$in:["Packed","Out for Delivery"]},
      $or:[
        {deliveryAssignmentStatus:"ACCEPTED"},
        // Legacy assigned orders may have a partner but retain the schema
        // default UNASSIGNED. They are still active for that authenticated
        // partner and must remain routable. Explicit pending/rejected
        // assignments are not treated as active navigation stops.
        {deliveryAssignmentStatus:"UNASSIGNED"},
        {deliveryAssignmentStatus:{$exists:false}}
      ]
    }).select("_id orderId status storeAdmin address deliveryLocation deliveryBatchId").sort({updatedAt:-1}).lean();

    if(activeOrders.length<2){
      return res.json({success:true,data:{available:false,reason:"Navigation optimization is shown when you have multiple active orders.",stops:[],nextStop:null,totalDistanceKm:null,estimatedRouteMinutes:null,remainingStops:0,activeOrders:activeOrders.length}});
    }

    const mainId=await getMainAdminId();
    const ownerIds=[...new Set(activeOrders.map(o=>String(o.storeAdmin||mainId||"" )).filter(Boolean))];
    const storeDocs:any[]=ownerIds.length?await StoreLocation.find({$or:ownerIds.flatMap(id=>[{storeAdmin:id},{key:id}])}).lean():[];
    const storeByOwner=new Map<string,any>();
    for(const st of storeDocs){
      const owner=String(st.storeAdmin||st.key||"");
      if(owner&&!storeByOwner.has(owner)&&isValidGeo(st.latitude,st.longitude)) storeByOwner.set(owner,st);
    }
    const mainStore=await StoreLocation.findOne({key:"main"}).lean();
    const uniqueStops=new Map<string,any>();
    const customerStops:any[]=[];
    const missing:string[]=[];
    for(const order of activeOrders){
      const owner=String(order.storeAdmin||mainId||"");
      const store=storeByOwner.get(owner)||(mainId&&owner===String(mainId)?mainStore:null);
      const storePoint=store&&isValidGeo(store.latitude,store.longitude)?{latitude:Number(store.latitude),longitude:Number(store.longitude)}:null;
      let storeStopId:string|null=null;
      if(order.status==="Packed"){
        if(!storePoint){missing.push(`#${String(order._id).slice(-8).toUpperCase()} store pickup location`);continue;}
        const storeKey=`STORE:${owner}:${storePoint.latitude.toFixed(6)}:${storePoint.longitude.toFixed(6)}`;
        storeStopId=uniqueStops.get(storeKey)?.id||`store-${uniqueStops.size+1}`;
        if(!uniqueStops.has(storeKey)){
          uniqueStops.set(storeKey,{id:storeStopId,type:"STORE",name:store?.name||"Store Pickup",address:store?.address||"",latitude:storePoint.latitude,longitude:storePoint.longitude,orderIds:[]});
        }
        uniqueStops.get(storeKey).orderIds.push(String(order._id));
      }
      const destination=await resolveDeliveryDestination(order);
      if(!destination||!isValidGeo(destination.latitude,destination.longitude)){
        missing.push(`#${String(order._id).slice(-8).toUpperCase()} customer delivery location`);continue;
      }
      customerStops.push({
        id:`customer-${String(order._id)}`,
        type:"CUSTOMER",
        name:order.address?.name||"Customer Delivery",
        address:destination.address?.address||order.address?.address||order.deliveryLocation?.address?.address||"",
        latitude:Number(destination.latitude),longitude:Number(destination.longitude),
        orderId:String(order._id),orderNumber:order.orderId||String(order._id).slice(-8).toUpperCase(),
        approximateLocation:Boolean(destination.approximate),
        prerequisite:storeStopId
      });
    }
    if(missing.length){
      return res.json({success:true,data:{available:false,reason:`Route data is incomplete: ${missing.slice(0,3).join(", ")}${missing.length>3?" and more":""}.`,stops:[],nextStop:null,totalDistanceKm:null,estimatedRouteMinutes:null,remainingStops:0,activeOrders:activeOrders.length}});
    }

    const stops=[...uniqueStops.values(),...customerStops];
    if(stops.length<2){
      return res.json({success:true,data:{available:false,reason:"There are not enough mapped stops to calculate a route.",stops:[],nextStop:null,totalDistanceKm:null,estimatedRouteMinutes:null,remainingStops:0,activeOrders:activeOrders.length}});
    }
    const metricCache=new Map<string,any>();
    const metricFor=async(a:any,b:any)=>{
      const key=`${a.latitude.toFixed(6)},${a.longitude.toFixed(6)}>${b.latitude.toFixed(6)},${b.longitude.toFixed(6)}`;
      if(metricCache.has(key))return metricCache.get(key);
      const m=await roadMetrics(Number(a.latitude),Number(a.longitude),Number(b.latitude),Number(b.longitude));
      metricCache.set(key,m);return m;
    };
    const visited=new Set<string>();
    const sequence:any[]=[];
    let current={latitude:Number(partner.latitude),longitude:Number(partner.longitude)};
    let totalDistance=0,totalMinutes=0;
    while(sequence.length<stops.length){
      const candidates=stops.filter((stop:any)=>!visited.has(stop.id)&&(!stop.prerequisite||visited.has(stop.prerequisite)));
      if(!candidates.length){
        return res.json({success:true,data:{available:false,reason:"Route ordering could not satisfy pickup-before-delivery constraints.",stops:[],nextStop:null,totalDistanceKm:null,estimatedRouteMinutes:null,remainingStops:0,activeOrders:activeOrders.length}});
      }
      const ranked:any[]=[];
      for(const stop of candidates){
        const metric=await metricFor(current,stop);
        if(metric) ranked.push({stop,metric});
      }
      if(!ranked.length){
        return res.json({success:true,data:{available:false,reason:"Live road-routing data is currently unavailable for the remaining stops.",stops:[],nextStop:null,totalDistanceKm:null,estimatedRouteMinutes:null,remainingStops:0,activeOrders:activeOrders.length}});
      }
      ranked.sort((a,b)=>Number(a.metric.roadDistanceKm)-Number(b.metric.roadDistanceKm));
      const chosen=ranked[0];
      visited.add(chosen.stop.id);
      sequence.push({
        sequence:sequence.length+1,
        id:chosen.stop.id,
        type:chosen.stop.type,
        name:chosen.stop.name,
        address:chosen.stop.address||"",
        latitude:chosen.stop.latitude,
        longitude:chosen.stop.longitude,
        orderId:chosen.stop.orderId||null,
        orderNumber:chosen.stop.orderNumber||null,
        orderIds:chosen.stop.orderIds||undefined,
        approximateLocation:Boolean(chosen.stop.approximateLocation),
        distanceFromPreviousKm:Number(chosen.metric.roadDistanceKm.toFixed(2)),
        estimatedFromPreviousMinutes:Number(chosen.metric.etaMinutes)
      });
      totalDistance+=Number(chosen.metric.roadDistanceKm);
      totalMinutes+=Number(chosen.metric.etaMinutes);
      current={latitude:Number(chosen.stop.latitude),longitude:Number(chosen.stop.longitude)};
    }
    return res.json({success:true,data:{
      available:true,
      activeOrders:activeOrders.length,
      nextStop:sequence[0]||null,
      stops:sequence,
      totalDistanceKm:Number(totalDistance.toFixed(2)),
      estimatedRouteMinutes:Math.max(1,Math.round(totalMinutes)),
      remainingStops:Math.max(0,sequence.length-1),
      routingSource:"road-routing",
      optimization:"nearest reachable stop with pickup-before-delivery constraints",
      manualReorderAllowed:false
    }});
  }catch(e){console.error("DELIVERY ROUTE SEQUENCE ERROR:",e);return res.status(500).json({success:false,message:"Unable to calculate delivery route sequence"});}
});

app.post("/api/delivery/assignments/:id/accept",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Assignment not found"});
    const assignment:any=await DeliveryAssignment.findOne({_id:req.params.id,deliveryPartner:req.user!.id});
    if(!assignment)return res.status(404).json({success:false,message:"Assignment not found"});
    if(assignment.status!=="PENDING_ACCEPTANCE"){
      // Accept is idempotent for this authenticated partner. A duplicate click,
      // retry, or stale UI must not turn an already-accepted assignment into a
      // false 400 error. Other terminal assignment states remain rejected.
      if(assignment.status==="ACCEPTED"){
        const existingOrder:any=await Order.findById(assignment.order);
        if(!existingOrder||["Delivered","Cancelled"].includes(String(existingOrder.status||"")))return res.status(400).json({success:false,message:"Order is no longer assignable"});
        if(String(existingOrder.deliveryPartner)!==String(req.user!.id))return res.status(409).json({success:false,message:"This assignment is no longer active for you"});
        if(String((existingOrder as any).deliveryAssignmentStatus||"")!=="ACCEPTED"){
          (existingOrder as any).deliveryAssignmentStatus="ACCEPTED";
          (existingOrder as any).deliveryAcceptedAt=(existingOrder as any).deliveryAcceptedAt||new Date();
          await existingOrder.save();
        }
        await Notification.updateMany({user:req.user!.id,type:"assignment",order:assignment.order,read:false},{$set:{read:true,readAt:new Date()}});
        return res.json({success:true,message:"Order is already accepted",data:existingOrder});
      }
      await Notification.updateMany({user:req.user!.id,type:"assignment",order:assignment.order,read:false},{$set:{read:true,readAt:new Date()}});
      return res.status(400).json({success:false,message:`Assignment is already ${String(assignment.status).toLowerCase()}`});
    }
    if(assignment.expiresAt&&new Date(assignment.expiresAt)<=new Date()){
      assignment.status="EXPIRED";await assignment.save();
      await Notification.updateMany({user:req.user!.id,type:"assignment",order:assignment.order,read:false},{$set:{read:true,readAt:new Date()}});
      return res.status(400).json({success:false,message:"This delivery assignment has expired."});
    }
    const order:any=await Order.findById(assignment.order);
    if(!order||["Delivered","Cancelled"].includes(order.status))return res.status(400).json({success:false,message:"Order is no longer assignable"});
    if(String(order.deliveryPartner)!==String(req.user!.id))return res.status(409).json({success:false,message:"This assignment is no longer active for you"});
    const partner:any=await User.findOne({_id:req.user!.id,role:"delivery",blocked:{$ne:true}});
    if(!partner)return res.status(403).json({success:false,message:"Delivery Partner account is inactive"});
    const maxActiveOrders=Math.max(1,Number(process.env.DELIVERY_MAX_ACTIVE_ORDERS||3));
    const activeCount=await Order.countDocuments({deliveryPartner:req.user!.id,status:{$nin:["Delivered","Cancelled"]},$or:[{deliveryAssignmentStatus:{$in:["PENDING_ACCEPTANCE","ACCEPTED"]}},{deliveryAssignmentStatus:{$exists:false},status:{$in:["Packed","Out for Delivery"]}}]});
    if(activeCount>maxActiveOrders)return res.status(409).json({success:false,message:`You have reached the maximum of ${maxActiveOrders} active deliveries.`});
    assignment.status="ACCEPTED";assignment.acceptedAt=new Date();await assignment.save();
    order.deliveryAssignmentStatus="ACCEPTED";order.deliveryAcceptedAt=new Date();
    if(!Array.isArray((order as any).deliveryAssignmentHistory))(order as any).deliveryAssignmentHistory=[];
    (order as any).deliveryAssignmentHistory.push({assignmentId:assignment._id,status:"ACCEPTED",acceptedAt:assignment.acceptedAt,deliveryPartner:req.user!.id});
    await order.save();
    const availability=order.status==="Out for Delivery"?"ON_DELIVERY":"BUSY";
    await User.collection.updateOne({_id:new mongoose.Types.ObjectId(req.user!.id)},{$set:{onlineStatus:"ONLINE",availabilityStatus:availability,currentOrderId:order._id}});
    // Acceptance completes the actionable assignment alert. Clear all duplicate/stale
    // assignment notifications for this order so polling cannot re-queue voice playback.
    await Notification.updateMany({user:req.user!.id,type:"assignment",order:order._id,read:false},{$set:{read:true,readAt:new Date()}});
    await notifyAdmins({title:"Delivery assignment accepted",message:`Delivery Partner ${partner.name||""} accepted order #${String(order._id).slice(-8).toUpperCase()}.`,type:"assignment_accepted",order:order._id,storeAdmin:order.storeAdmin});
    await recordCustomerCareAudit({req,action:"DELIVERY_ASSIGNMENT_ACCEPTED",targetType:"ORDER",targetId:order._id,customer:order.user,order:order._id,metadata:{assignmentId:assignment._id,deliveryPartner:req.user!.id}});
    return res.json({success:true,message:"Order accepted successfully",data:order});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to accept assignment"});}
});

app.post("/api/delivery/assignments/:id/reject",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Assignment not found"});
    const reason=String(req.body.reason||"").trim(),details=String(req.body.details||"").trim();
    const allowed=["Too far","Already handling another order","Vehicle issue","Personal emergency","Unable to reach store","Unable to deliver in required time","Technical issue","Other"];
    if(!allowed.includes(reason))return res.status(400).json({success:false,message:"Select a valid rejection reason"});
    if(reason==="Other"&&details.length<3)return res.status(400).json({success:false,message:"Please provide details for Other"});
    const assignment:any=await DeliveryAssignment.findOne({_id:req.params.id,deliveryPartner:req.user!.id});
    if(!assignment)return res.status(404).json({success:false,message:"Assignment not found"});
    if(assignment.status!=="PENDING_ACCEPTANCE")return res.status(400).json({success:false,message:`Assignment is already ${String(assignment.status).toLowerCase()}`});
    const order:any=await Order.findById(assignment.order);
    if(!order||String(order.deliveryPartner)!==String(req.user!.id))return res.status(409).json({success:false,message:"This assignment is no longer active"});
    assignment.status="REJECTED";assignment.rejectedAt=new Date();assignment.rejectedBy=req.user!.id;assignment.rejectionReason=reason;assignment.rejectionDetails=details;await assignment.save();
    order.deliveryPartner=null as any;order.deliveryAssignmentStatus="REJECTED";order.deliveryRejectedAt=assignment.rejectedAt;order.deliveryRejectionReason=reason;order.deliveryRejectionDetails=details;order.deliveryAssignmentExpiresAt=null;
    if(!Array.isArray((order as any).deliveryAssignmentHistory))(order as any).deliveryAssignmentHistory=[];
    (order as any).deliveryAssignmentHistory.push({assignmentId:assignment._id,status:"REJECTED",rejectedAt:assignment.rejectedAt,rejectedBy:req.user!.id,rejectionReason:reason,rejectionDetails:details});
    await order.save();
    const partner:any=await User.findById(req.user!.id).select("name onlineStatus").lean();
    await User.collection.updateOne({_id:new mongoose.Types.ObjectId(req.user!.id)},{$set:{availabilityStatus:partner?.onlineStatus==="ONLINE"?"AVAILABLE":"PAUSED",currentOrderId:null}});
    await notifyAdmins({title:"Delivery assignment rejected",message:`${partner?.name||"Delivery Partner"} rejected order #${String(order._id).slice(-8).toUpperCase()}. Reason: ${reason}${details?` · ${details}`:""}`,type:"assignment_rejected",order:order._id,storeAdmin:order.storeAdmin});
    await recordCustomerCareAudit({req,action:"DELIVERY_ASSIGNMENT_REJECTED",targetType:"ORDER",targetId:order._id,customer:order.user,order:order._id,metadata:{assignmentId:assignment._id,rejectionReason:reason,rejectionDetails:details}});
    const reassignment=await recommendOrReassignDeliveryPartner(order._id,req.user!.id,req);
    return res.json({success:true,message:reassignment.assigned?"Assignment rejected and order automatically reassigned":"Assignment rejected successfully",data:{assignment,order},reassignment});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to reject assignment"});}
});



app.post("/api/orders/:id/payment/session",auth,roleAny("customer","delivery"),async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findById(req.params.id).lean();
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    const allowed=req.user!.role==="customer"?String(order.user)===String(req.user!.id):String(order.deliveryPartner)===String(req.user!.id);
    if(!allowed)return res.status(403).json({success:false,message:"Forbidden"});
    if(order.paymentStatus==="Paid")return res.status(400).json({success:false,message:"Payment is already completed"});
    if(String(order.paymentMethod||"").toUpperCase()!=="ONLINE")return res.status(400).json({success:false,message:"Online payment is not selected for this order"});
    const amount=Number(order.total||0);
    if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({success:false,message:"Invalid order amount"});

    await AuditLog.create({ actor:req.user!.id, actorRole:req.user!.role, action:"PAYMENT_ATTEMPT", targetType:"ORDER", targetId:String(order._id), order:order._id, securityAlert:false, securityEvent:"PAYMENT_ATTEMPT", metadata:{paymentMethod:"ONLINE",amount,provider:"RAZORPAY"} });
    await inspectSecurityThresholds({ req, event:"PAYMENT_ATTEMPT", actorId:req.user!.id, targetId:order._id, metadata:{amount,provider:"RAZORPAY"} });

    const keyId=String(process.env.RAZORPAY_KEY_ID||process.env.PAYMENT_PROVIDER_KEY_ID||"").trim();
    const keySecret=String(process.env.RAZORPAY_KEY_SECRET||process.env.PAYMENT_PROVIDER_KEY_SECRET||"").trim();
    if(keyId&&keySecret){
      const existing:any=order.paymentSession||{};
      const existingRazorpayOrder=String(existing.razorpayOrderId||"");
      const existingAmount=Number(existing.amount||0);
      if(existingRazorpayOrder&&existingAmount===amount&&String(existing.currency||"INR")==="INR"&&String(existing.provider||"").toUpperCase()==="RAZORPAY"){
        return res.json({success:true,data:{provider:"RAZORPAY",keyId,orderId:order._id,razorpayOrderId:existingRazorpayOrder,amount,currency:"INR",reference:existing.reference||`RZP-${String(order._id).slice(-10).toUpperCase()}`,expiresAt:existing.expiresAt||null}});
      }
      // Prefer a one-time Razorpay UPI QR for desktop/web checkout.
      // The QR is generated server-side with the exact FreshBasket order amount.
      try {
        const createdAt=new Date();
        const expiresAt=new Date(createdAt.getTime()+15*60*1000);
        const closeBy=Math.floor(expiresAt.getTime()/1000);
        const reference=`RZP-QR-${String(order._id).slice(-10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        const qrResp=await axios.post("https://api.razorpay.com/v1/payments/qr_codes",{
          type:"upi_qr",
          name:"FreshBasket Order",
          usage:"single_use",
          fixed_amount:true,
          payment_amount:Math.round(amount*100),
          description:`FreshBasket Order #${String(order._id).slice(-8).toUpperCase()}`,
          close_by:closeBy,
          notes:{freshbasketOrderId:String(order._id),reference},
        },{auth:{username:keyId,password:keySecret},headers:{"Content-Type":"application/json"},timeout:15000});
        let qr=qrResp.data||{};
        const qrCodeId=String(qr.id||"");
        if(!qrCodeId) throw new Error("Razorpay did not return a QR code ID");
        if(!String(qr.image_content||"").trim()){
          try {
            const qrDetails=await axios.get(`https://api.razorpay.com/v1/payments/qr_codes/${encodeURIComponent(qrCodeId)}`,{auth:{username:keyId,password:keySecret},timeout:10000});
            qr={...qr,...(qrDetails.data||{})};
          } catch {}
        }
        await Order.collection.updateOne({_id:order._id},{$set:{
          paymentStatus:"Pending",
          "paymentSession.reference":reference,
          "paymentSession.amount":amount,
          "paymentSession.currency":"INR",
          "paymentSession.createdAt":createdAt,
          "paymentSession.expiresAt":expiresAt,
          "paymentSession.provider":"RAZORPAY_QR",
          "paymentSession.qrCodeId":qrCodeId,
          "paymentSession.qrImageUrl":String(qr.image_url||""),
          "paymentSession.qrImageContent":String(qr.image_content||""),
          "paymentSession.providerStatus":"created",
          "paymentSession.razorpayPaymentId":"",
          "paymentSession.razorpaySignature":"",
          "paymentSession.lastWebhookEventId":""
        }});
        return res.json({success:true,data:{provider:"RAZORPAY_QR",keyId,orderId:order._id,qrCodeId,qrImageUrl:String(qr.image_url||""),qrImageContent:String(qr.image_content||""),amount,currency:"INR",reference,expiresAt}});
      } catch(qrError:any) {
        console.warn("RAZORPAY QR CREATE FAILED; FALLING BACK TO STANDARD CHECKOUT:",qrError?.response?.data||qrError?.message||qrError);
      }
      const receipt=`FB-${String(order._id).slice(-20)}`.replace(/[^A-Za-z0-9_-]/g,"").slice(0,40);
      const api=await axios.post("https://api.razorpay.com/v1/orders",{amount:Math.round(amount*100),currency:"INR",receipt,notes:{freshbasketOrderId:String(order._id)}},{auth:{username:keyId,password:keySecret},headers:{"Content-Type":"application/json"},timeout:15000});
      const rzOrder=api.data;
      const createdAt=new Date();
      const expiresAt=new Date(createdAt.getTime()+30*60*1000);
      const reference=`RZP-${String(order._id).slice(-10).toUpperCase()}-${String(rzOrder.id||"").slice(-8).toUpperCase()}`;
      await Order.collection.updateOne({_id:order._id},{$set:{paymentStatus:"Pending","paymentSession.reference":reference,"paymentSession.amount":amount,"paymentSession.currency":"INR","paymentSession.createdAt":createdAt,"paymentSession.expiresAt":expiresAt,"paymentSession.provider":"RAZORPAY","paymentSession.razorpayOrderId":String(rzOrder.id||""),"paymentSession.razorpayPaymentId":"","paymentSession.providerStatus":"created","paymentSession.razorpaySignature":"","paymentSession.lastWebhookEventId":""}});
      return res.json({success:true,data:{provider:"RAZORPAY",keyId,orderId:order._id,razorpayOrderId:String(rzOrder.id),amount,currency:"INR",reference,expiresAt}});
    }

    // Existing UPI/QR fallback remains available when Razorpay credentials are not configured.
    const settings:any=order.storeAdmin?await PaymentSetting.findOne({storeAdmin:order.storeAdmin}).lean():await PaymentSetting.findOne({storeAdmin:await getMainAdminId()}).lean();
    if(!settings?.isEnabled||!settings?.upiId)return res.status(503).json({success:false,message:"Online payment is not configured. Add Razorpay server credentials or configure the existing UPI payment settings."});
    const existingSession:any=order.paymentSession||null;
    const existingValid=existingSession?.reference&&existingSession?.uri&&existingSession?.expiresAt&&new Date(existingSession.expiresAt).getTime()>Date.now()&&Number(existingSession.amount)===amount&&String(existingSession.currency||"INR")==="INR";
    if(existingValid)return res.json({success:true,data:{provider:"UPI",reference:existingSession.reference,uri:existingSession.uri,amount,currency:"INR",expiresAt:existingSession.expiresAt,qrImage:settings.qrImage||"",merchantName:settings.merchantName||"FreshBasket",upiId:settings.upiId}});
    const reference=`UPI-${String(order._id).slice(-10).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const uri=`upi://pay?pa=${encodeURIComponent(String(settings.upiId))}&pn=${encodeURIComponent(String(settings.merchantName||"FreshBasket"))}&tr=${encodeURIComponent(reference)}&am=${amount.toFixed(2)}&cu=INR`;
    const createdAt=new Date(),expiresAt=new Date(createdAt.getTime()+15*60*1000);
    await Order.collection.updateOne({_id:order._id},{$set:{"paymentSession.reference":reference,"paymentSession.uri":uri,"paymentSession.amount":amount,"paymentSession.currency":"INR","paymentSession.createdAt":createdAt,"paymentSession.expiresAt":expiresAt,"paymentSession.provider":"UPI"}});
    return res.json({success:true,data:{provider:"UPI",reference,uri,amount,currency:"INR",expiresAt,qrImage:settings.qrImage||"",merchantName:settings.merchantName||"FreshBasket",upiId:settings.upiId}});
  }catch(e:any){
    console.error("PAYMENT SESSION ERROR:",e?.response?.data||e);
    return res.status(500).json({success:false,message:e?.response?.data?.error?.description||e?.message||"Unable to create payment session"});
  }
});

app.get("/api/orders/:id/payment/qr-status",auth,roleAny("customer","delivery"),async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findById(req.params.id);
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    const allowed=req.user!.role==="customer"?String(order.user)===String(req.user!.id):String(order.deliveryPartner)===String(req.user!.id);
    if(!allowed)return res.status(403).json({success:false,message:"Forbidden"});
    if(String(order.paymentStatus||"")==="Paid")return res.json({success:true,data:{paymentStatus:"Paid",message:"Payment already received"}});
    const qrCodeId=String(req.query.qrCodeId||order.paymentSession?.qrCodeId||"").trim();
    const storedQrCodeId=String(order.paymentSession?.qrCodeId||"").trim();
    if(!qrCodeId||!storedQrCodeId||qrCodeId!==storedQrCodeId)return res.status(400).json({success:false,message:"Invalid QR payment session"});
    const keyId=String(process.env.RAZORPAY_KEY_ID||process.env.PAYMENT_PROVIDER_KEY_ID||"").trim();
    const keySecret=String(process.env.RAZORPAY_KEY_SECRET||process.env.PAYMENT_PROVIDER_KEY_SECRET||"").trim();
    if(!keyId||!keySecret)return res.status(503).json({success:false,message:"Razorpay server credentials are not configured"});
    const expiresAt=order.paymentSession?.expiresAt ? new Date(order.paymentSession.expiresAt).getTime() : 0;
    if(expiresAt&&expiresAt<=Date.now())return res.json({success:true,data:{paymentStatus:"Pending",expired:true,message:"This QR has expired. Please start payment again."}});
    const response=await axios.get(`https://api.razorpay.com/v1/payments/qr_codes/${encodeURIComponent(qrCodeId)}/payments`,{auth:{username:keyId,password:keySecret},params:{count:10},timeout:15000});
    const items=Array.isArray(response.data?.items)?response.data.items:[];
    const expectedPaise=Math.round(Number(order.total||0)*100);
    const captured=items.find((p:any)=>String(p?.status||"").toLowerCase()==="captured"&&Number(p?.amount||0)===expectedPaise&&String(p?.currency||"INR")==="INR");
    if(captured){
      const paymentId=String(captured.id||"").trim();
      if(!paymentId)return res.status(409).json({success:false,message:"Razorpay returned an invalid payment record"});
      const now=new Date();
      await Order.collection.updateOne({_id:order._id},{$set:{
        paymentStatus:"Paid",
        paymentMode:String(captured.method||"UPI").toUpperCase(),
        paymentPaidAt:now,
        "paymentSession.razorpayPaymentId":paymentId,
        "paymentSession.provider":"RAZORPAY_QR",
        "paymentSession.providerStatus":"captured",
        "paymentSession.verifiedAt":now,
        "paymentSession.verifiedBy":String(req.user!.id)
      }});
      await createFinancialTransaction({type:"ORDER_PAYMENT",referenceId:`RAZORPAY_QR_PAYMENT:${paymentId}`,order:order._id,customer:order.user||null,storeAdmin:order.storeAdmin||null,amount:Number(captured.amount||0)/100,direction:"INFLOW",paymentMethod:String(captured.method||"UPI").toUpperCase(),status:"COMPLETED",completedAt:now,paymentReference:paymentId,metadata:{provider:"RAZORPAY_QR",qrCodeId,source:"qr_status"}});
      await notifyUser({user:order.user,title:"Payment successful",message:`Payment for order #${String(order._id).slice(-8).toUpperCase()} was received successfully.`,type:"payment",order:order._id});
      return res.json({success:true,data:{paymentStatus:"Paid",paymentId,message:"Payment received successfully"}});
    }
    const failed=items.find((p:any)=>String(p?.status||"").toLowerCase()==="failed"&&Number(p?.amount||0)===expectedPaise);
    if(failed)return res.json({success:true,data:{paymentStatus:"Failed",message:String(failed.error_description||"Payment failed. Please try again.")}});
    return res.json({success:true,data:{paymentStatus:order.paymentStatus||"Pending",message:"Waiting for Razorpay confirmation..."}});
  }catch(e:any){
    console.error("RAZORPAY QR STATUS ERROR:",e?.response?.data||e);
    return res.status(500).json({success:false,message:e?.response?.data?.error?.description||e?.message||"Unable to check QR payment status"});
  }
});
app.post("/api/orders/:id/payment/verify",auth,roleAny("customer","delivery"),async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findById(req.params.id);
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    const allowed=req.user!.role==="customer"?String(order.user)===String(req.user!.id):String(order.deliveryPartner)===String(req.user!.id);
    if(!allowed)return res.status(403).json({success:false,message:"Forbidden"});
    const razorpayPaymentId=String(req.body.razorpay_payment_id||"").trim();
    const razorpayOrderId=String(req.body.razorpay_order_id||"").trim();
    const razorpaySignature=String(req.body.razorpay_signature||"").trim();
    const storedOrderId=String(order.paymentSession?.razorpayOrderId||"");
    if(!razorpayPaymentId||!razorpayOrderId||!razorpaySignature||!storedOrderId||storedOrderId!==razorpayOrderId)return res.status(400).json({success:false,message:"Invalid Razorpay payment details"});
    const secret=String(process.env.RAZORPAY_KEY_SECRET||process.env.PAYMENT_PROVIDER_KEY_SECRET||"").trim();
    if(!secret)return res.status(503).json({success:false,message:"Razorpay server secret is not configured"});
    const expected=crypto.createHmac("sha256",secret).update(`${storedOrderId}|${razorpayPaymentId}`).digest("hex");
    const a=Buffer.from(expected,"utf8"),b=Buffer.from(razorpaySignature,"utf8");
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(400).json({success:false,message:"Razorpay signature verification failed"});
    const keyId=String(process.env.RAZORPAY_KEY_ID||process.env.PAYMENT_PROVIDER_KEY_ID||"").trim();
    const paymentResp=await axios.get(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`,{auth:{username:keyId,password:secret},timeout:15000});
    const payment:any=paymentResp.data||{};
    const expectedPaise=Math.round(Number(order.total||0)*100);
    if(String(payment.order_id||"")!==storedOrderId||Number(payment.amount||0)!==expectedPaise||String(payment.currency||"INR")!=="INR")return res.status(400).json({success:false,message:"Razorpay payment amount or order does not match FreshBasket order"});
    if(String(payment.status||"").toLowerCase()!=="captured"){
      await Order.collection.updateOne({_id:order._id},{$set:{paymentStatus:String(payment.status||"PENDING").toUpperCase(),"paymentSession.razorpayPaymentId":razorpayPaymentId,"paymentSession.razorpaySignature":razorpaySignature,"paymentSession.provider":"RAZORPAY","paymentSession.providerStatus":String(payment.status||"")}});
      return res.status(202).json({success:false,pending:true,message:`Payment is ${String(payment.status||"pending")}. We will update the order when Razorpay confirms capture.`});
    }
    const now=new Date();
    await Order.collection.updateOne({_id:order._id},{$set:{paymentStatus:"Paid",paymentMode:String(payment.method||"RAZORPAY").toUpperCase(),paymentPaidAt:now,"paymentSession.razorpayPaymentId":razorpayPaymentId,"paymentSession.razorpaySignature":razorpaySignature,"paymentSession.provider":"RAZORPAY","paymentSession.providerStatus":"captured","paymentSession.verifiedAt":now,"paymentSession.verifiedBy":String(req.user!.id)}});
    await createFinancialTransaction({type:"ORDER_PAYMENT",referenceId:`RAZORPAY_PAYMENT:${razorpayPaymentId}`,order:order._id,customer:order.user||null,storeAdmin:order.storeAdmin||null,amount:Number(payment.amount||0)/100,direction:"INFLOW",paymentMethod:String(payment.method||"RAZORPAY").toUpperCase(),status:"COMPLETED",completedAt:now,paymentReference:razorpayPaymentId,metadata:{provider:"RAZORPAY",razorpayOrderId:storedOrderId,source:"checkout_verify"}});
    await notifyUser({user:order.user,title:"Payment successful",message:`Payment for order #${String(order._id).slice(-8).toUpperCase()} was received successfully.`,type:"payment",order:order._id});
    return res.json({success:true,message:"Payment verified successfully",data:{orderId:order._id,paymentStatus:"Paid",paymentId:razorpayPaymentId}});
  }catch(e:any){
    console.error("RAZORPAY PAYMENT VERIFY ERROR:",e?.response?.data||e);
    return res.status(500).json({success:false,message:e?.response?.data?.error?.description||e?.message||"Unable to verify Razorpay payment"});
  }
});

app.get("/api/orders/:id/payment",auth,async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findById(req.params.id).select("user deliveryPartner total paymentMethod paymentStatus paymentMode paymentPaidAt paymentSession storeAdmin").lean();
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    const allowed=req.user!.role==="customer"?String(order.user)===String(req.user!.id):req.user!.role==="delivery"?String(order.deliveryPartner)===String(req.user!.id):req.user!.role==="admin"?await belongsToTenant(req,order):false;
    if(!allowed)return res.status(403).json({success:false,message:"Forbidden"});
    const session=order.paymentSession||null;
    return res.json({success:true,data:{orderId:order._id,amount:Number(order.total||0),paymentMethod:order.paymentMethod||"COD",paymentStatus:order.paymentStatus||"",paymentMode:order.paymentMode||"",paymentPaidAt:order.paymentPaidAt||null,session:session?{reference:session.reference,uri:session.uri,amount:session.amount,currency:session.currency,createdAt:session.createdAt,expiresAt:session.expiresAt,verifiedAt:session.verifiedAt,provider:session.provider||"UPI",razorpayOrderId:session.razorpayOrderId||"",razorpayPaymentId:session.razorpayPaymentId||"",providerStatus:session.providerStatus||""}:null}});
  }catch{return res.status(500).json({success:false,message:"Unable to load payment details"});}
});

/* =========================================================
   STORE PAYMENT SETTINGS
========================================================= */

app.get("/api/payment-settings", async (req, res) => {
  try {
    const storeAdminId = String(req.query.storeAdminId || "").trim();
    const mainId = await getMainAdminId();
    const owner = storeAdminId && mongoose.Types.ObjectId.isValid(storeAdminId) ? storeAdminId : mainId;
    const settings: any = owner ? await PaymentSetting.findOne({ storeAdmin: owner }).lean() : null;
    return res.json({ success: true, data: settings || { upiId: "", merchantName: "FreshBasket", qrImage: "", isEnabled: false } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load payment settings" });
  }
});

app.get("/api/admin/payment-settings", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const owner = await getTenantAdminId(req);
    const settings: any = owner ? await PaymentSetting.findOne({ storeAdmin: owner }).lean() : null;
    return res.json({ success: true, data: settings || { upiId: "", merchantName: "FreshBasket", qrImage: "", isEnabled: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load payment settings" });
  }
});

app.put("/api/admin/payment-settings", auth, role("admin"), async (req: AuthRequest, res) => {
  try {
    const owner = await getTenantAdminId(req);
    if (!owner) return res.status(400).json({ success: false, message: "Store account not found" });
    const upiId = String(req.body.upiId || "").trim();
    const merchantName = String(req.body.merchantName || "FreshBasket").trim();
    const qrImage = String(req.body.qrImage || "").trim();
    const isEnabled = req.body.isEnabled !== false;
    if (upiId && !/^[^\s@]+@[^\s@]+$/.test(upiId)) return res.status(400).json({ success: false, message: "Enter a valid UPI ID" });
    const previous:any = await PaymentSetting.findOne({ storeAdmin: owner }).select("upiId merchantName isEnabled").lean();
    const saved = await PaymentSetting.findOneAndUpdate({ storeAdmin: owner }, { $set: { storeAdmin: owner, upiId, merchantName, qrImage, isEnabled } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await recordEntityChange({ req, action:"PAYMENT_CONFIGURATION_CHANGED", targetType:"CONFIGURATION", targetId:`payment-settings:${String(owner)}`, before:{ upiId:previous?.upiId||"", merchantName:previous?.merchantName||"FreshBasket", isEnabled:previous?.isEnabled!==false }, after:{ upiId:saved?.upiId||"", merchantName:saved?.merchantName||"FreshBasket", isEnabled:saved?.isEnabled!==false }, reason:req.body?.reason||"Payment settings updated" });
    return res.json({ success: true, message: "Payment settings saved successfully", data: saved });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Unable to save payment settings" });
  }
});

app.get("/api/orders/:id/payment-settings", auth, async (req: AuthRequest, res) => {
  try {
    const order: any = await Order.findById(req.params.id).select("user deliveryPartner storeAdmin").lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const allowed = req.user?.role === "admin" ? await belongsToTenant(req, order) : req.user?.role === "customer" ? String(order.user) === String(req.user.id) : req.user?.role === "delivery" ? String(order.deliveryPartner) === String(req.user.id) : false;
    if (!allowed) return res.status(403).json({ success: false, message: "Forbidden" });
    const settings: any = order.storeAdmin ? await PaymentSetting.findOne({ storeAdmin: order.storeAdmin }).lean() : null;
    return res.json({ success: true, data: settings || { upiId: "", merchantName: "FreshBasket", qrImage: "", isEnabled: false } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load payment settings" });
  }
});

/* =========================================================
   DELIVERY MAP / PICKUP LOCATION
========================================================= */

app.get(
  "/api/admin/store-location",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      // Keep this endpoint backward-compatible with the existing StoreLocation
      // data. Point 7 must not make Store Location loading depend on the new
      // operating-hours / pause-order fields being present or well formed.
      const owner = await getTenantAdminId(req);
      const mainId = await getMainAdminId();
      const isMain = Boolean(mainId && String(owner) === String(mainId));

      let saved: any = null;
      if (isMain) {
        saved = await StoreLocation.findOne({ key: "main" }).lean();
        if (!saved) {
          saved = await StoreLocation.findOne({ storeAdmin: owner }).lean();
        }
      } else {
        saved = await StoreLocation.findOne({ key: String(owner), storeAdmin: owner }).lean();
        if (!saved) {
          saved = await StoreLocation.findOne({ key: String(owner) }).lean();
        }
      }

      const rawLat = saved?.latitude ?? (isMain && hasValidStoreCoordinates ? STORE_LAT : null);
      const rawLng = saved?.longitude ?? (isMain && hasValidStoreCoordinates ? STORE_LNG : null);
      const latitude = Number(rawLat);
      const longitude = Number(rawLng);
      const configured = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
        Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

      const operatingHoursInput = saved?.operatingHours && typeof saved.operatingHours === "object"
        ? saved.operatingHours
        : {};
      let operatingHours: any = {
        openingTime: "", closingTime: "", breakStart: "", breakEnd: "",
        weeklyOff: [], holidays: [], temporarilyClosed: false,
        temporaryClosureReason: ""
      };
      let operatingStatus: any = {
        configured: false,
        status: "NOT_CONFIGURED",
        label: "Hours not configured",
        message: "Store operating hours are not configured."
      };
      try {
        operatingHours = normalizeStoreHours(operatingHoursInput);
        operatingStatus = getStoreOperatingStatus(operatingHours);
      } catch (hoursError) {
        console.warn("STORE OPERATING HOURS NORMALIZATION ERROR:", hoursError);
      }

      return res.json({
        success: true,
        data: {
          name: saved?.name || "FreshBasket Store",
          address: saved?.address || (isMain ? STORE_ADDRESS : ""),
          latitude: configured ? latitude : null,
          longitude: configured ? longitude : null,
          accuracy: saved?.accuracy ?? null,
          image: saved?.image || "",
          category: saved?.category || "Local Store",
          description: saved?.description || "",
          phone: saved?.phone || "",
          email: saved?.email || "",
          configured,
          operatingHours,
          operatingStatus,
          newOrdersPaused: saved?.newOrdersPaused === true,
          newOrdersPauseReason: String(saved?.newOrdersPauseReason || "")
        }
      });
    } catch (error) {
      console.error("ADMIN STORE LOCATION ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to load store location" });
    }
  }
);

app.put(
  "/api/admin/store-location",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      const name = String(req.body.name || "FreshBasket Store").trim();
      const address = String(req.body.address || "").trim();
      const category = String(req.body.category || "Local Store").trim();
      const description = String(req.body.description || "").trim();
      const phone = String(req.body.phone || "").replace(/\D/g, "");
      const email = String(req.body.email || "").trim().toLowerCase();
      const image = String(req.body.image || "").trim();
      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);
      const accuracy = req.body.accuracy === undefined || req.body.accuracy === "" || req.body.accuracy === null ? null : Number(req.body.accuracy);
      const operatingHours = normalizeStoreHours(req.body.operatingHours || {});
      const newOrdersPaused = req.body.newOrdersPaused === true;
      const newOrdersPauseReason = String(req.body.newOrdersPauseReason || "").trim().slice(0, 240);

      if (!name) return res.status(400).json({ success: false, message: "Store name is required" });
      if (image && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image) && !/^https?:\/\//i.test(image)) return res.status(400).json({success:false,message:"Store image must be an image URL or data image"});
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({success:false,message:"Invalid store email"});
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return res.status(400).json({ success: false, message: "Enter a valid latitude" });
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return res.status(400).json({ success: false, message: "Enter a valid longitude" });
      if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) return res.status(400).json({ success:false, message:"Invalid location accuracy" });
      if ((operatingHours.breakStart && !operatingHours.breakEnd) || (!operatingHours.breakStart && operatingHours.breakEnd)) return res.status(400).json({ success:false, message:"Both break start and break end are required" });
      if (operatingHours.openingTime && operatingHours.closingTime && operatingHours.openingTime === operatingHours.closingTime) return res.status(400).json({ success:false, message:"Opening and closing time cannot be the same" });

      const owner = await getTenantAdminId(req);
      const mainId = await getMainAdminId();
      const isMain = mainId && String(owner) === String(mainId);
      const key = isMain ? "main" : String(owner);
      const previousFull: any = await StoreLocation.findOne({ key }).select("name address latitude longitude accuracy category description phone email operatingHours newOrdersPaused newOrdersPauseReason").lean();
      const previous: any = previousFull;
      const saved = await StoreLocation.findOneAndUpdate(
        { key },
        { $set: { key, storeAdmin: owner, name, address, latitude, longitude, accuracy, image, category, description, phone, email, operatingHours, newOrdersPaused, newOrdersPauseReason: newOrdersPaused ? newOrdersPauseReason : "" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (previous?.newOrdersPaused !== newOrdersPaused || String(previous?.newOrdersPauseReason || "") !== String(newOrdersPauseReason || "")) {
        await recordCustomerCareAudit({ req, action: newOrdersPaused ? "STORE_NEW_ORDERS_PAUSED" : "STORE_NEW_ORDERS_RESUMED", targetType: "STORE", targetId: owner, metadata: { paused: newOrdersPaused, reason: newOrdersPaused ? newOrdersPauseReason : "" } });
      }
      await recordEntityChange({ req, action:"STORE_CONFIGURATION_CHANGED", targetType:"CONFIGURATION", targetId:`store-location:${String(owner)}`, before: previousFull ? { name:previousFull.name||"", address:previousFull.address||"", latitude:previousFull.latitude??null, longitude:previousFull.longitude??null, accuracy:previousFull.accuracy??null, category:previousFull.category||"", description:previousFull.description||"", phone:previousFull.phone||"", email:previousFull.email||"", operatingHours:previousFull.operatingHours||{}, newOrdersPaused:Boolean(previousFull.newOrdersPaused), newOrdersPauseReason:previousFull.newOrdersPauseReason||"" } : null, after:{ name, address, latitude, longitude, accuracy, category, description, phone, email, operatingHours, newOrdersPaused, newOrdersPauseReason }, reason:req.body?.reason||"Store configuration updated" });

      return res.json({ success: true, message: "Store location saved successfully", data: saved });
    } catch (error) {
      console.error("ADMIN STORE LOCATION SAVE ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to save store location" });
    }
  }
);

app.post("/api/delivery/location", auth, role("delivery"), async (req:AuthRequest,res) => {
  try {
    const latitude=Number(req.body.latitude), longitude=Number(req.body.longitude), accuracy=req.body.accuracy==null?null:Number(req.body.accuracy);
    if(!isValidGeo(latitude,longitude)) return res.status(400).json({success:false,message:"Invalid location"});
    if(accuracy!==null && (!Number.isFinite(accuracy)||accuracy<0||accuracy>100000)) return res.status(400).json({success:false,message:"Invalid location accuracy"});
    const now=new Date();
    const active:any=await activeDeliveryForPartner(req.user!.id);
    const availability=active ? "ON_DELIVERY" : "AVAILABLE";
    await User.collection.updateOne({_id:new mongoose.Types.ObjectId(req.user!.id),role:"delivery"},{$set:{latitude,longitude,locationAccuracy:accuracy,locationUpdatedAt:now,lastLocationHeartbeatAt:now,locationPermissionStatus:"granted",onlineStatus:"ONLINE",availabilityStatus:availability,currentOrderId:active?._id||null}});
    await DeliveryLocationShare.updateMany({deliveryPartnerId:req.user!.id,sharedBy:"delivery",enabled:true,expiresAt:{$gt:now}},{$set:{latitude,longitude,accuracy}});
    void broadcastDeliveryEvent({partnerId:String(req.user!.id),latitude,longitude,accuracy,updatedAt:now.toISOString(),onlineStatus:"ONLINE",availabilityStatus:availability,currentOrderId:active?._id||null});
    return res.json({success:true,data:{latitude,longitude,accuracy,locationUpdatedAt:now,onlineStatus:"ONLINE",availabilityStatus:availability,currentOrderId:active?._id||null}});
  } catch(error){return res.status(500).json({success:false,message:"Unable to update delivery location"});}
});

app.patch("/api/delivery/status",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try{
    const requested=String(req.body.status||"").toUpperCase();
    if(!["ONLINE","OFFLINE","AVAILABLE","PAUSED"].includes(requested))return res.status(400).json({success:false,message:"Invalid delivery availability status"});
    const active:any=await activeDeliveryForPartner(req.user!.id);
    if(requested==="OFFLINE"&&active)return res.status(400).json({success:false,message:"You cannot go offline while an active delivery is assigned."});
    const update:any={};
    if(["ONLINE","OFFLINE"].includes(requested)){update.onlineStatus=requested;if(requested==="OFFLINE")update.availabilityStatus="PAUSED";else if(!active)update.availabilityStatus="AVAILABLE";}
    else update.availabilityStatus=requested;
    await User.collection.updateOne({_id:new mongoose.Types.ObjectId(req.user!.id),role:"delivery"},{$set:update});
    const updated:any=await User.findById(req.user!.id).select("onlineStatus availabilityStatus locationPermissionStatus latitude longitude locationAccuracy locationUpdatedAt currentOrderId").lean();
    void broadcastDeliveryEvent({partnerId:String(req.user!.id),...updated,updatedAt:updated?.locationUpdatedAt||new Date()});
    return res.json({success:true,data:updated});
  }catch{return res.status(500).json({success:false,message:"Unable to update delivery status"});}
});

app.post("/api/delivery/location-permission",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try{
    const status=String(req.body.status||"unknown").toLowerCase();
    if(!["granted","denied","prompt","unavailable","unknown"].includes(status))return res.status(400).json({success:false,message:"Invalid permission status"});
    await User.collection.updateOne({_id:new mongoose.Types.ObjectId(req.user!.id),role:"delivery"},{$set:{locationPermissionStatus:status,lastLocationHeartbeatAt:new Date()}});
    return res.json({success:true});
  }catch{return res.status(500).json({success:false,message:"Unable to save location permission status"});}
});

app.get(
  "/api/delivery/location",
  auth,
  role("delivery", "admin"),
  async (req: AuthRequest, res) => {
    try {
      const owner = await getTenantAdminId(req);
      const mainId = await getMainAdminId();
      const isMain = mainId && String(owner) === String(mainId);
      const key = isMain ? "main" : String(owner);
      const saved: any = await StoreLocation.findOne({ key }).lean();
      const latitude = saved?.latitude ?? (isMain && hasValidStoreCoordinates ? STORE_LAT : null);
      const longitude = saved?.longitude ?? (isMain && hasValidStoreCoordinates ? STORE_LNG : null);
      const address = saved?.address || (isMain ? STORE_ADDRESS : "");
      const name = saved?.name || "FreshBasket Store";
      const configured = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
      return res.json({ success: true, data: { name, address, latitude: configured ? Number(latitude) : null, longitude: configured ? Number(longitude) : null, configured } });
    } catch (error) {
      console.error("DELIVERY LOCATION ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to load pickup location" });
    }
  }
);

app.get("/api/orders/:id/pickup-location", auth, async (req: AuthRequest, res) => {
  try {
    const order: any = await Order.findById(req.params.id).select("user deliveryPartner storeAdmin").lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const allowed = req.user?.role === "delivery" ? String(order.deliveryPartner) === String(req.user.id) : req.user?.role === "admin" ? await belongsToTenant(req, order) : req.user?.role === "customer" ? String(order.user) === String(req.user.id) : false;
    if (!allowed) return res.status(403).json({ success: false, message: "Forbidden" });
    const mainId = await getMainAdminId();
    const owner = order.storeAdmin || mainId;
    const isMain = mainId && String(owner) === String(mainId);
    const location: any = await StoreLocation.findOne(isMain ? { $or: [{ key: "main", storeAdmin: owner }, { key: "main", storeAdmin: null }, { key: "main", storeAdmin: { $exists: false } }] } : { key: String(owner), storeAdmin: owner }).lean();
    const latitude = location?.latitude ?? (isMain && hasValidStoreCoordinates ? STORE_LAT : null);
    const longitude = location?.longitude ?? (isMain && hasValidStoreCoordinates ? STORE_LNG : null);
    return res.json({ success: true, data: { name: location?.name || "Store Pickup", address: location?.address || (isMain ? STORE_ADDRESS : ""), latitude, longitude, accuracy: location?.accuracy ?? null, configured: Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) } });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to load pickup location" }); }
});


/* =========================================================
   PRODUCTION BUSINESS OPERATIONS — additive APIs
========================================================= */

const imageList = (value: any) => {
  const out:string[] = [];
  const visit=(v:any)=>{
    if(out.length>=3 || v==null) return;
    if(typeof v === "string"){
      const x=v.trim();
      if(/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(x) || /^https?:\/\//i.test(x)) out.push(x);
      return;
    }
    if(Array.isArray(v)){ v.forEach(visit); return; }
    if(typeof v === "object"){ [v.image,v.url,v.src,v.data,v.value,v.path].forEach(visit); }
  };
  visit(value);
  return out.filter((x,i,a)=>a.indexOf(x)===i).slice(0,3);
};
const itemFromOrder = (order:any, itemId:any, productId:any = "") => {
  const key = String(itemId || "").trim();
  const productKey = String(productId || "").trim();
  const items = Array.isArray(order?.items) ? order.items : [];

  // Order.items uses an embedded schema with _id:false in the existing
  // FreshBasket architecture. Therefore an order-item identifier may be the
  // persisted product id, an index used by legacy UI, or (for older data) an
  // embedded _id if one existed before the current schema. Resolve only when
  // the match is deterministic; never fabricate an item.
  const direct = items.find((item:any, index:number) => {
    const embeddedId = String(item?._id || "").trim();
    const itemProduct = String(item?.product || "").trim();
    return Boolean(key) && (embeddedId === key || itemProduct === key || String(index) === key);
  });
  if (direct) return direct;

  // Safe legacy backfill resolution: when the request's stored orderItemId
  // is stale/missing but its persisted productId identifies exactly one item
  // in the same order, that item is deterministic and can be used.
  if (productKey) {
    const matches = items.filter((item:any) => String(item?.product || "").trim() === productKey);
    if (matches.length === 1) return matches[0];
  }
  return items.length===1 && (!productKey || String(items[0]?.product||"")===productKey) ? items[0] : null;
};
const policyForItem = async (item:any) => {
  if (!item?.product || !mongoose.Types.ObjectId.isValid(String(item.product))) {
    return { refundEligible:false, replacementEligible:false, refundAllowed:false, replacementAllowed:false, refundWindowHours:24, replacementWindowHours:24, reason:"Product information unavailable" };
  }
  const product:any = await Product.findById(item.product).select("name category refundAllowed replacementAllowed refundWindowHours replacementWindowHours refundEligible replacementEligible refundWindowDays replacementWindowDays refundTerms replacementTerms storeAdmin createdAt").lean();
  if (!product) return { refundEligible:false, replacementEligible:false, refundAllowed:false, replacementAllowed:false, refundWindowHours:24, replacementWindowHours:24, reason:"Product is no longer available" };

  const category:any = await Category.findOne({ name: product.category }).select("defaultRefundAvailable defaultReplacementAvailable").lean();
  const hasNewRefundPolicy = typeof product.refundAllowed === "boolean";
  const hasNewReplacementPolicy = typeof product.replacementAllowed === "boolean";
  const refundAllowed = hasNewRefundPolicy ? product.refundAllowed : (typeof product.refundEligible === "boolean" ? product.refundEligible : category?.defaultRefundAvailable === true);
  const replacementAllowed = hasNewReplacementPolicy ? product.replacementAllowed : (typeof product.replacementEligible === "boolean" ? product.replacementEligible : category?.defaultReplacementAvailable === true);

  return {
    refundAllowed: Boolean(refundAllowed),
    replacementAllowed: Boolean(replacementAllowed),
    // Customer eligibility is intentionally fixed to 24 hours from delivery.
    refundWindowHours:24,
    replacementWindowHours:24,
    refundEligible: Boolean(refundAllowed),
    replacementEligible: Boolean(replacementAllowed),
    refundTerms:String(product.refundTerms||""),
    replacementTerms:String(product.replacementTerms||""),
    productId:String(product._id),
    category:product.category,
    storeAdmin:product.storeAdmin || null,
  };
};

const makeRequestId = (type:"REFUND"|"REPLACEMENT") => `FB-${type === "REFUND" ? "REF" : "RPL"}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
const makeReplacementId = () => `FB-REPL-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
const replacementActiveStatuses = ["REQUESTED","UNDER_REVIEW","VERIFIED","PENDING_STORE_ADMIN","PENDING_MAIN_ADMIN","APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING","DELIVERY","DELIVERY_ASSIGNED","OUT_FOR_DELIVERY","ESCALATED"];
const replacementTerminalStatuses = ["REPLACED","COMPLETED","REJECTED","FAILED","CLOSED","EXPIRED"];
const replacementQuantity = (request:any) => Math.max(1, Number(request?.items?.[0]?.quantity || 1));
const replacementItem = (order:any, request:any) => itemFromOrder(order, request?.orderItemId, request?.productId || request?.items?.[0]?.product);
const replacementExpiry = (order:any) => {
  const deliveredAt = order?.deliveredAt ? new Date(order.deliveredAt) : null;
  return deliveredAt && Number.isFinite(deliveredAt.getTime()) ? new Date(deliveredAt.getTime() + 24 * 60 * 60 * 1000) : null;
};
const ensureReplacementIdentity = (request:any) => {
  if (!request.replacementId) request.replacementId = makeReplacementId();
  return request.replacementId;
};
const backfillReplacementLegacyFields = async (request:any, order:any) => {
  const patch:any={};
  if(!request.replacementId) patch.replacementId=makeReplacementId();
  const sourceType=String(request.sourceType||order?.sourceType||((request.storeId||order?.storeAdmin)?"STORE":"FRESHBASKET_DIRECT"));
  if(!request.sourceType)patch.sourceType=sourceType;
  if(!request.deliveredAtSnapshot && order?.deliveredAt)patch.deliveredAtSnapshot=order.deliveredAt;
  if(!request.expiryAt && order?.deliveredAt)patch.expiryAt=new Date(new Date(order.deliveredAt).getTime()+24*60*60*1000);
  if(sourceType==="STORE") {
    const storeId=request.storeId || order?.storeAdmin || request.storeAdmin || null;
    if(storeId && String(request.storeId||"")!==String(storeId)) patch.storeId=storeId;
    if(storeId && String(request.storeAdmin||"")!==String(storeId)) patch.storeAdmin=storeId;
    if(request.mainAdmin) patch.mainAdmin=null;
    if(String(request.fulfillmentOwnerType||"")!=="STORE_ADMIN") patch.fulfillmentOwnerType="STORE_ADMIN";
    if(storeId && String(request.fulfillmentOwnerId||"")!==String(storeId)) patch.fulfillmentOwnerId=storeId;
  }
  if(sourceType==="FRESHBASKET_DIRECT") {
    const mainId=await getMainAdminId();
    if(mainId && String(request.mainAdmin||"")!==String(mainId)) patch.mainAdmin=mainId;
    if(request.storeAdmin) patch.storeAdmin=null;
    if(request.storeId) patch.storeId=null;
    if(String(request.fulfillmentOwnerType||"")!=="MAIN_ADMIN") patch.fulfillmentOwnerType="MAIN_ADMIN";
    if(mainId && String(request.fulfillmentOwnerId||"")!==String(mainId)) patch.fulfillmentOwnerId=mainId;
  }
  if(Object.keys(patch).length){await ReplacementRequest.collection.updateOne({_id:request._id},{$set:patch});Object.assign(request,patch);}
  return request;
};
const releaseReplacementInventory = async (request:any, actorId:any, reason:string) => {
  if (!request?.inventoryReserved) return;
  const order:any = await Order.findById(request.order).select("items").lean();
  const item:any = replacementItem(order, request);
  if (!item?.product) return;
  const product:any = await Product.findById(item.product);
  if (!product) return;
  const quantity = replacementQuantity(request);
  const previousStock = Number(product.stock || 0);
  product.stock = previousStock + quantity;
  await product.save();
  await recordStockHistory({product:product._id,change:quantity,previousStock,newStock:product.stock,reason,order:request.order,adjustedBy:actorId});
  request.inventoryReserved=false;
  request.inventoryReservedAt=null;
};

const getRequestContext = async (orderId:string, orderItemId:string, productId:string = "") => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) throw new Error("Order not found");
  const order:any = await Order.findById(orderId).select("user items storeAdmin sourceType deliveryPartner status deliveredAt statusHistory").lean();
  if (!order) throw new Error("Order not found");

  // Order.items is an embedded schema with _id:false. Older requests can
  // therefore contain an item identifier that is no longer present on the
  // hydrated order item. Resolve the same persisted item using the request's
  // productId, then use the sole item only when the order is unambiguous.
  // Never guess an item in a multi-item order.
  const item:any = itemFromOrder(order, orderItemId, productId) || (() => {
    const items = Array.isArray(order?.items) ? order.items : [];
    if (items.length !== 1) return null;
    const only = items[0];
    if (productId && String(only?.product || "") !== String(productId)) return null;
    return only;
  })();
  if (!item) throw new Error("Order item not found");
  const product:any = item.product && mongoose.Types.ObjectId.isValid(String(item.product))
    ? await Product.findById(item.product).select("name category refundEligible replacementEligible refundWindowDays replacementWindowDays refundTerms replacementTerms storeAdmin").lean()
    : null;
  const mainAdminId:any = await getMainAdminId();
  const storeId:any = order.storeAdmin || product?.storeAdmin || null;
  const sourceType = String(order.sourceType || (storeId && mainAdminId && String(storeId) !== String(mainAdminId) ? "STORE" : "FRESHBASKET_DIRECT"));
  const policy:any = await policyForItem(item);
  return { order, item, product, policy, mainAdminId, storeId, sourceType };
};

const pushRequestHistory = (request:any, status:string, actor:any, roleName:string, note="") => {
  if (!Array.isArray(request.statusHistory)) request.statusHistory = [];
  request.statusHistory.push({ status, by: actor, role: roleName, at: new Date(), note });
};

const assignFinanceExecutive = async (request:any) => {
  const active:any[] = await User.find({ role:"finance_executive", blocked:{$ne:true} }).select("_id employeeId").lean();
  if (!active.length) return null;
  const counts:any[] = await RefundRequest.aggregate([
    { $match:{ financeEmployee:{$in:active.map(x=>x._id)}, status:{$nin:["COMPLETED","REJECTED","FAILED"]} } },
    { $group:{ _id:"$financeEmployee", count:{$sum:1} } }
  ]);
  const map = new Map(counts.map((x:any)=>[String(x._id), Number(x.count)]));
  const selected:any = active.slice().sort((a:any,b:any)=>(map.get(String(a._id))||0)-(map.get(String(b._id))||0))[0];
  request.financeEmployee = selected._id;
  request.assignedFinance = selected._id;
  request.assignedAt = new Date();
  return selected;
};

const notifyRequestStatus = async (request:any, type:"REFUND"|"REPLACEMENT", status:string, note="") => {
  const label = type === "REFUND" ? "Refund" : "Replacement";
  const suffix = note ? ` ${note}` : "";
  const entity=`${type}_REQUEST`;
  const id=request._id;
  await notifyUser({ user:request.customer, title:`${label} ${status.toLowerCase()}`, message:`Your ${label.toLowerCase()} request ${request.requestId ? `#${request.requestId}` : `#${String(request._id).slice(-8).toUpperCase()}`} is now ${status}.${suffix}`, type:`${type.toLowerCase()}_status`, order:request.order, relatedEntity:entity, relatedEntityId:id });
  if(type==="REPLACEMENT"){
    await notifyCustomerCareUsers({title:`Replacement ${status.toLowerCase()}`,message:`Replacement ${request.requestId || String(request._id).slice(-8).toUpperCase()} changed to ${status}.${suffix}`,type:"replacement_status",order:request.order,relatedEntity:entity,relatedEntityId:id});
    if(request.storeAdmin) await notifyUser({user:request.storeAdmin,title:`Replacement ${status.toLowerCase()}`,message:`Replacement ${request.requestId || String(request._id).slice(-8).toUpperCase()} is now ${status}.${suffix}`,type:"replacement_status",order:request.order,relatedEntity:entity,relatedEntityId:id});
    if(request.mainAdmin) await notifyUser({user:request.mainAdmin,title:`Replacement ${status.toLowerCase()}`,message:`Replacement ${request.requestId || String(request._id).slice(-8).toUpperCase()} is now ${status}.${suffix}`,type:"replacement_status",order:request.order,relatedEntity:entity,relatedEntityId:id});
    if(request.deliveryPartner && ["DELIVERY_ASSIGNED","OUT_FOR_DELIVERY","FAILED","REPLACED"].includes(status)) await notifyUser({user:request.deliveryPartner,title:`Replacement ${status.toLowerCase()}`,message:`Replacement ${request.requestId || String(request._id).slice(-8).toUpperCase()} is now ${status}.${suffix}`,type:"replacement_delivery",order:request.order,relatedEntity:entity,relatedEntityId:id});
  }
};


app.get("/api/customer-care/replacement-requests", auth, role("customer_care"), customerCarePermission("support.history"), async (req:AuthRequest,res) => {
  try {
    const page=Math.max(1,Number(req.query.page||1));
    const limit=Math.min(50,Math.max(1,Number(req.query.limit||10)));
    const search=String(req.query.search||"").trim();
    const status=String(req.query.status||"").trim().toUpperCase();
    const filter:any={};
    if(!status || status==="ALL") filter.status={$in:replacementActiveStatuses};
    else {
      const aliases:any={PENDING_VERIFICATION:"REQUESTED",REPLACEMENT_APPROVED:"APPROVED",REPLACEMENT_PROCESSING:"REPLACEMENT_PROCESSING",ASSIGNED_TO_DELIVERY:"DELIVERY_ASSIGNED"};
      filter.status=aliases[status]||status;
    }
    if(search){
      const regex=new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i");
      const [customers,products]=await Promise.all([
        User.find({role:"customer",$or:[{customerId:regex},{name:regex},{email:regex},{phone:regex}]}).select("_id").limit(100).lean(),
        Product.find({$or:[{name:regex},{sku:regex}]}).select("_id").limit(100).lean()
      ]);
      const ors:any[]=[{requestId:regex},{replacementId:regex},{orderItemId:regex},{reason:regex},{description:regex}];
      if(customers.length)ors.push({customer:{$in:customers.map((x:any)=>x._id)}});
      if(products.length)ors.push({productId:{$in:products.map((x:any)=>x._id)}});
      if(mongoose.Types.ObjectId.isValid(search))ors.push({_id:search},{order:search},{customer:search},{productId:search},{storeId:search},{storeAdmin:search},{mainAdmin:search},{customerCareAgent:search},{deliveryPartner:search});
      filter.$or=ors;
    }
    const total=await ReplacementRequest.countDocuments(filter);
    const rows:any[]=await ReplacementRequest.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit)
      .populate("customer","name email phone customerId")
      .populate("order","_id status total storeAdmin sourceType createdAt deliveredAt address deliveryPartner items")
      .populate("productId","name sku image category replacementAllowed replacementEligible")
      .populate("customerCareAgent","name employeeId")
      .populate("storeAdmin","name email employeeId")
      .populate("mainAdmin","name email employeeId")
      .populate("deliveryPartner","name employeeId")
      .lean();
    const data=await Promise.all(rows.map(async (r:any)=>{
      const order=r.order||{}; await backfillReplacementLegacyFields(r,order); const item=replacementItem(order,r);
      const product=r.productId || (item?.product ? await Product.findById(item.product).select("name sku image category replacementAllowed replacementEligible").lean() : null);
      const expiryAt=r.expiryAt || replacementExpiry(order);
      return {...r,product,orderItem:item||null,eligibility:{eligibleAtRequestTime:Boolean(r.eligibleAtRequestTime),deliveryCompleted:order.status==="Delivered",deliveredAt:r.deliveredAtSnapshot||order.deliveredAt||null,expiryAt,eligible:Boolean(r.eligibleAtRequestTime)}};
    }));
    return res.json({success:true,data,meta:{page,limit,total,pages:Math.max(1,Math.ceil(total/limit))}});
  } catch(e){ console.error("CUSTOMER CARE REPLACEMENT LIST ERROR",e); return res.status(500).json({success:false,message:"Unable to load replacement requests"}); }
});

app.get("/api/customer-care/replacement-requests/:id", auth, role("customer_care"), customerCarePermission("support.history"), async (req:AuthRequest,res) => {
  try {
    const id=String(req.params.id||"");
    const query:any=mongoose.Types.ObjectId.isValid(id)?{$or:[{_id:id},{requestId:id},{replacementId:id}]}:{$or:[{requestId:id},{replacementId:id}]};
    const request:any=await ReplacementRequest.findOne(query)
      .populate("customer","name email phone customerId")
      .populate("order")
      .populate("productId","name sku image category replacementAllowed replacementEligible replacementWindowHours replacementWindowDays")
      .populate("customerCareAgent","name email phone employeeId")
      .populate("storeAdmin","name email phone employeeId")
      .populate("mainAdmin","name email phone employeeId")
      .populate("deliveryPartner","name email phone employeeId")
      .lean();
    if(!request)return res.status(404).json({success:false,message:"Replacement request not found"});
    const order=request.order||{}; await backfillReplacementLegacyFields(request,order); const item=replacementItem(order,request);
    const product=request.productId || (item?.product ? await Product.findById(item.product).select("name sku image category replacementAllowed replacementEligible replacementWindowHours replacementWindowDays storeAdmin").lean() : null);
    const storeId=request.storeId||order.storeAdmin||product?.storeAdmin||null;
    const storeAdmin=request.storeAdmin || (storeId ? await User.findOne({_id:storeId,role:"admin"}).select("name email phone employeeId").lean() : null);
    const expiryAt=request.expiryAt || replacementExpiry(order);
    const audit=await AuditLog.find({targetType:"REPLACEMENT_REQUEST",targetId:String(request._id)}).sort({createdAt:1}).limit(500).lean();
    const timeline=Array.isArray(request.statusHistory)?request.statusHistory.map((x:any)=>({...x,at:x.at||x.createdAt})):[];
    const eligibility={productReplacementAllowed:Boolean(product?.replacementAllowed ?? product?.replacementEligible),deliveryCompleted:order.status==="Delivered",deliveredAt:request.deliveredAtSnapshot||order.deliveredAt||null,requestCreatedAt:request.createdAt,expiryAt,eligibleAtRequestTime:Boolean(request.eligibleAtRequestTime),currentlyWithinWindow:Boolean(request.eligibleAtRequestTime || (order.status==="Delivered" && expiryAt && new Date()<=new Date(expiryAt)))};
    return res.json({success:true,data:{request,customer:request.customer,order,orderItem:item,product,store:{id:storeId,name:storeAdmin?.name||"FreshBasket Direct",admin:storeAdmin},assignment:{customerCareAgent:request.customerCareAgent,storeAdmin:request.storeAdmin,mainAdmin:request.mainAdmin,deliveryPartner:request.deliveryPartner},delivery:{replacementId:request.replacementId,deliveryPartner:request.deliveryPartner,status:request.status,startedAt:request.deliveryStartedAt,replacementDeliveredAt:request.replacementDeliveredAt,proof:request.deliveryProof||null},eligibility,finance:{financeEmployeeId:request.financeEmployeeId||null,financeManagerId:request.financeManagerId||null,transactionId:request.transactionId||null},timeline,audit}});
  } catch(e){ console.error("CUSTOMER CARE REPLACEMENT DETAIL ERROR",e); return res.status(500).json({success:false,message:"Unable to load replacement request"}); }
});

app.get("/api/customer/orders/:id/support-options", auth, role("customer"), async (req:AuthRequest,res) => {
  try {
    const order:any = await Order.findOne({ _id:req.params.id, user:req.user!.id }).populate("deliveryPartner","name role ratingAverage ratingCount").lean();
    if(!order) return res.status(404).json({success:false,message:"Order not found"});
    const items = await Promise.all((order.items||[]).map(async (item:any,index:number)=>{
      const policy:any=await policyForItem(item);
      const deliveredAt=order.deliveredAt ? new Date(order.deliveredAt) : null;
      const expiryAt=deliveredAt && Number.isFinite(deliveredAt.getTime()) ? new Date(deliveredAt.getTime()+24*60*60*1000) : null;
      const within24=Boolean(deliveredAt && Date.now()<=expiryAt!.getTime());
      const itemId=String(item?._id||item?.product||index);
      const refundSummary=await getRefundItemSummary(order._id,itemId);
      const itemTotal=Math.max(0,Number(item.price||0)*Math.max(0,Number(item.quantity||0)));
      const refundableAmount=Math.max(0,itemTotal-Number(refundSummary.completedAmount||0)-Number(refundSummary.activeAmount||0));
      const refundInProgress=Number(refundSummary.activeAmount||0)>0;
      return { index, key:String(item?._id||item?.product||index), product:item.product, name:item.name, quantity:item.quantity, price:item.price, policy, deliveredAt, expiryAt, within24, itemTotal, refundedAmount:Number(refundSummary.completedAmount||0), activeRefundAmount:Number(refundSummary.activeAmount||0), refundableAmount, canRequestRefund:Boolean(order.status==="Delivered"&&within24&&policy.refundAllowed&&refundableAmount>0&&!refundInProgress), canRequestReplacement:Boolean(order.status==="Delivered"&&within24&&policy.replacementAllowed) };
    }));
    const rating = order.deliveryPartner ? await DeliveryRating.findOne({order:order._id}).lean() : null;
    return res.json({success:true,data:{order,items,deliveryRating:rating}});
  } catch(e){ console.error("CUSTOMER SUPPORT OPTIONS ERROR",e); return res.status(500).json({success:false,message:"Unable to load support options"}); }
});

app.get("/api/customer/support/requests", auth, role("customer"), async (req:AuthRequest,res)=>{
  try {
    const [refunds,replacements]=await Promise.all([
      RefundRequest.find({customer:req.user!.id})
        .sort({createdAt:-1}).limit(100)
        .populate("order","_id")
        .populate("assignedFinance","name employeeId")
        .populate("customerCareVerifiedBy","name employeeId")
        .populate("financeReviewedBy","name employeeId")
        .populate("approvedBy","name employeeId")
        .populate("financeManager","name employeeId")
        .lean(),
      ReplacementRequest.find({customer:req.user!.id})
        .sort({createdAt:-1}).limit(100)
        .populate("order","_id")
        .populate("customerCareAgent","name employeeId")
        .populate("storeAdmin","name employeeId")
        .populate("mainAdmin","name employeeId")
        .populate("deliveryPartner","name employeeId")
        .lean()
    ]);
    return res.json({success:true,data:{refunds,replacements}});
  } catch(e) {
    console.error("CUSTOMER SUPPORT REQUEST HISTORY ERROR:", e);
    return res.status(500).json({success:false,message:"Unable to load request history"});
  }
});

app.get("/api/customer/support/tickets", auth, role("customer"), async (req:AuthRequest,res) => {
  try { const tickets=await SupportTicket.find({customer:req.user!.id}).sort({createdAt:-1}).limit(100).populate("order","_id total status").populate("assignedCustomerCare","name employeeId").lean(); return res.json({success:true,data:tickets}); }
  catch(e){ return res.status(500).json({success:false,message:"Unable to load support tickets"}); }
});
app.post("/api/customer/support/tickets", auth, role("customer"), async (req:AuthRequest,res) => {
  try {
    const orderId=String(req.body.orderId||"").trim(), orderItemId=String(req.body.orderItemId||"").trim(), category=String(req.body.category||"Other").trim(), description=String(req.body.description||"").trim(), priority=String(req.body.priority||"MEDIUM").toUpperCase();
    if(description.length<3 || description.length>3000) return res.status(400).json({success:false,message:"Description must be between 3 and 3000 characters"});
    let order:any=null, item:any=null;
    if(orderId){ if(!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({success:false,message:"Invalid order"}); order=await Order.findOne({_id:orderId,user:req.user!.id}).lean(); if(!order) return res.status(403).json({success:false,message:"This order is not yours"}); if(orderItemId){ item=itemFromOrder(order,orderItemId); if(!item) return res.status(400).json({success:false,message:"Selected product is not part of this order"}); }}
    const active=await User.find({role:"customer_care",blocked:{$ne:true}}).select("_id").lean();
    let assigned:any=null; if(active.length){ const counts=await SupportTicket.aggregate([{ $match:{assignedCustomerCare:{$in:active.map(x=>x._id)},status:{$nin:["RESOLVED","CLOSED"]}}},{ $group:{_id:"$assignedCustomerCare",count:{$sum:1}}}]); const map=new Map(counts.map((x:any)=>[String(x._id),x.count])); assigned=active.sort((a:any,b:any)=>(map.get(String(a._id))||0)-(map.get(String(b._id))||0))[0]._id; }
    const cfg:any=await DeliveryPayoutConfig.findOne({key:"default"}).lean(); const sla=Number((cfg?.slaMinutes||{})[priority.toLowerCase()]||({URGENT:30,HIGH:60,MEDIUM:240,LOW:1440}[priority]||240));
    const ticket:any=await SupportTicket.create({ticketId:makeTicketId(),customer:req.user!.id,order:order?._id||null,orderItemId,store:order?.storeAdmin||null,deliveryPartner:order?.deliveryPartner||null,assignedCustomerCare:assigned,category,description,priority,status:"OPEN",requestType:String(req.body.requestType||"ISSUE").toUpperCase(),evidence:imageList(req.body.evidence),messages:[{sender:req.user!.id,senderRole:"customer",message:description,attachment:imageList(req.body.evidence)[0]||"",createdAt:new Date()}],slaDueAt:new Date(Date.now()+sla*60000)});
    if(assigned) await notifyUser({user:assigned,title:"New customer support ticket",message:`Ticket ${ticket.ticketId} has been assigned to you.`,type:"support_ticket",order:order?. _id || null}); else await notifyAdmins({title:"Unassigned support ticket",message:`Ticket ${ticket.ticketId} needs Customer Care assignment.`,type:"support_ticket",order:order?._id});
    return res.status(201).json({success:true,message:"Support ticket created",data:ticket});
  } catch(e){console.error("CUSTOMER TICKET CREATE ERROR",e);return res.status(500).json({success:false,message:"Unable to create support ticket"});}
});
app.get("/api/customer/support/tickets/:id", auth, role("customer"), async (req:AuthRequest,res) => { try { const ticket:any=await SupportTicket.findOne({$or:[{_id:mongoose.Types.ObjectId.isValid(req.params.id)?req.params.id:null},{ticketId:req.params.id}],customer:req.user!.id}).populate("assignedCustomerCare","name employeeId").populate("order","_id total status items deliveryPartner").lean(); if(!ticket)return res.status(404).json({success:false,message:"Ticket not found"}); return res.json({success:true,data:ticket}); }catch(e){return res.status(500).json({success:false,message:"Unable to load ticket"});} });
app.post("/api/customer/support/tickets/:id/messages", auth, role("customer"), async (req:AuthRequest,res) => { try {const ticket:any=await SupportTicket.findOne({$or:[{_id:mongoose.Types.ObjectId.isValid(req.params.id)?req.params.id:null},{ticketId:req.params.id}],customer:req.user!.id});if(!ticket)return res.status(404).json({success:false,message:"Ticket not found"});const message=String(req.body.message||"").trim();if(message.length<1||message.length>3000)return res.status(400).json({success:false,message:"Message is required"});ticket.messages.push({sender:req.user!.id,senderRole:"customer",message,attachment:imageList(req.body.evidence)[0]||"",createdAt:new Date()});if(ticket.status==="WAITING_FOR_CUSTOMER")ticket.status="IN_PROGRESS";await ticket.save();if(ticket.assignedCustomerCare)await notifyUser({user:ticket.assignedCustomerCare,title:"Customer replied",message:`Customer replied on ${ticket.ticketId}.`,type:"support_ticket",order:ticket.order});return res.json({success:true,data:ticket});}catch(e){return res.status(500).json({success:false,message:"Unable to send message"});} });
app.patch("/api/customer/support/tickets/:id/close", auth, role("customer"), async (req:AuthRequest,res) => { try {const ticket:any=await SupportTicket.findOne({$or:[{_id:mongoose.Types.ObjectId.isValid(req.params.id)?req.params.id:null},{ticketId:req.params.id}],customer:req.user!.id});if(!ticket)return res.status(404).json({success:false,message:"Ticket not found"});if(ticket.status!=="RESOLVED")return res.status(400).json({success:false,message:"Only resolved tickets can be closed"});ticket.status="CLOSED";await ticket.save();return res.json({success:true,message:"Ticket closed",data:ticket});}catch(e){return res.status(500).json({success:false,message:"Unable to close ticket"});} });

const secureSecret=()=>crypto.createHash("sha256").update(String(process.env.JWT_SECRET||"dev-secret")).digest();
const encryptSensitive=(plain:string)=>{if(!plain)return"";const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv("aes-256-gcm",secureSecret(),iv);const enc=Buffer.concat([cipher.update(plain,"utf8"),cipher.final()]);return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc.toString("hex")}`;};
const maskAccount=(x:string)=>x?`XXXX XXXX ${x.replace(/\D/g,"").slice(-4)}`:"";
const maskUpi=(x:string)=>{if(!x)return"";const [u,d]=x.split("@");return `${u.slice(0,2)}***@${d||""}`;};

const REFUND_ACTIVE_STATUSES = ["REQUESTED","UNDER_REVIEW","VERIFIED_BY_CUSTOMER_CARE","FINANCE_REVIEW","APPROVAL_PENDING","APPROVED","PROCESSING"];
const REFUND_TERMINAL_STATUSES = ["COMPLETED","REJECTED","FAILED"];
const getRefundItemSummary = async (orderId:any,itemId:string,excludeRequestId?:any)=>{
  const requests:any[]=await RefundRequest.find({order:orderId,orderItemId:itemId,...(excludeRequestId?{_id:{$ne:excludeRequestId}}:{})}).select("_id status amount requestedAmount approvedAmount").lean();
  const completedAmount=requests.filter(r=>String(r.status)==="COMPLETED").reduce((sum:number,r:any)=>sum+Number(r.approvedAmount??r.amount??0),0);
  const activeAmount=requests.filter(r=>REFUND_ACTIVE_STATUSES.includes(String(r.status))).reduce((sum:number,r:any)=>sum+Number(r.approvedAmount??r.requestedAmount??r.amount??0),0);
  return {completedAmount,activeAmount,requests};
};
const refundRemainingForItem = async (orderId:any,item:any,excludeRequestId?:any)=>{
  const itemTotal=Math.max(0,Number(item?.price||0)*Math.max(0,Number(item?.quantity||0)));
  const summary=await getRefundItemSummary(orderId,String(item?._id||""),excludeRequestId);
  return {itemTotal,completedAmount:summary.completedAmount,activeAmount:summary.activeAmount,remainingAmount:Math.max(0,itemTotal-summary.completedAmount-summary.activeAmount)};
};

const createItemRequest = async (req:AuthRequest,type:"refund"|"replacement")=>{
  const orderId=String(req.params.id||""); const itemId=String(req.body.orderItemId||"");
  if(!mongoose.Types.ObjectId.isValid(orderId)) throw new Error("Order not found");
  const order:any=await Order.findOne({_id:orderId,user:req.user!.id}).lean(); if(!order) throw new Error("Order not found");
  const item=itemFromOrder(order,itemId); if(!item) throw new Error("Selected product is not part of this order");
  const policy:any=await policyForItem(item);
  const now=Date.now();
  const deliveredAt=order.deliveredAt;
  if(order.status!=="Delivered") throw new Error(`Order status is ${order.status}; ${type} is available after delivery`);
  if(!deliveredAt) throw new Error("Delivery completion timestamp is missing; refund/replacement cannot be created");
  const deliveryMs=new Date(deliveredAt).getTime();
  if(!Number.isFinite(deliveryMs)) throw new Error("Invalid delivery completion timestamp");
  const expiryAt=deliveryMs + 24*60*60*1000;
  if(now>expiryAt) throw new Error(`${type==="refund"?"Refund":"Replacement"} window has expired. Requests are allowed only within 24 hours of successful delivery.`);
  if(type==="refund" && !policy.refundAllowed) throw new Error("Refund is not available for this product");
  if(type==="replacement" && !policy.replacementAllowed) throw new Error("Replacement is not available for this product");
  const q=Math.max(1,Math.min(Number(item.quantity||1),Number(req.body.quantity||1)));
  const itemTotal=Number(item.price||0)*q;
  const requestedAmount=Number(req.body.amount ?? req.body.requestedAmount ?? itemTotal);
  const evidence=imageList(req.body.evidence);
  const reason=String(req.body.reason||"").trim(); if(reason.length<3) throw new Error(`${type === "refund" ? "Refund" : "Replacement"} reason is required`);
  if(type==="refund"){
    if(!Number.isFinite(requestedAmount)||requestedAmount<=0) throw new Error("Enter a valid refund amount");
    if(requestedAmount>itemTotal+0.01) throw new Error(`Refund amount cannot exceed the selected item amount of ₹${itemTotal.toFixed(2)}`);
    const refundSummary=await getRefundItemSummary(order._id,itemId);
    const remainingAmount=Math.max(0,itemTotal-refundSummary.completedAmount-refundSummary.activeAmount);
    if(remainingAmount<=0) throw new Error("No refundable amount remains for this order item");
    if(requestedAmount>remainingAmount+0.01) throw new Error(`Refund amount cannot exceed the remaining refundable amount of ₹${remainingAmount.toFixed(2)}`);
    const dup=await RefundRequest.findOne({order:order._id,orderItemId:itemId,status:{$in:REFUND_ACTIVE_STATUSES}}); if(dup) throw new Error("Refund request already in progress");
    const activeReplacement=await ReplacementRequest.findOne({order:order._id,orderItemId:itemId,status:{$in:["REQUESTED","UNDER_REVIEW","APPROVED","STORE_PREPARATION","DELIVERY"]}}); if(activeReplacement) throw new Error("Replacement request is already in progress for this item");
    const method=String(req.body.refundMethod||"ORIGINAL").toUpperCase(); if(!["ORIGINAL","BANK","UPI"].includes(method))throw new Error("Invalid refund method");
    if(method==="BANK"){const a=String(req.body.accountNumber||"").replace(/\D/g,"");const c=String(req.body.confirmAccountNumber||"").replace(/\D/g,"");const ifsc=String(req.body.ifsc||"").trim().toUpperCase();const holder=String(req.body.accountHolderName||"").trim();const bank=String(req.body.bankName||"").trim();if(a.length<9||a!==c)throw new Error("Enter matching valid bank account numbers");if(!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))throw new Error("Enter a valid IFSC code");if(!holder||!bank)throw new Error("Bank name and account holder are required");return await RefundRequest.create({requestId:makeRequestId("REFUND"),order:order._id,customer:order.user,productId:item.product||null,amount:requestedAmount,requestedAmount,reason:String(req.body.reason||"").trim(),requestedBy:req.user!.id,status:"REQUESTED",orderItemId:itemId,storeId:order.storeAdmin||null,storeAdmin:order.storeAdmin||null,sourceType:String(order.sourceType||"FRESHBASKET_DIRECT"),deliveryPartner:order.deliveryPartner||null,refundMethod:method,bankName:bank,bankAccountEncrypted:encryptSensitive(a),bankAccountMasked:maskAccount(a),ifsc,accountHolderName:holder,evidence,statusHistory:[{status:"REQUESTED",by:req.user!.id,role:"customer",at:new Date()}]});}
    if(method==="UPI"){const upi=String(req.body.upiId||"").trim().toLowerCase();const confirm=String(req.body.confirmUpiId||"").trim().toLowerCase();if(!/^[\w.\-]{2,}@[\w.-]{2,}$/.test(upi)||upi!==confirm)throw new Error("Enter matching valid UPI ID");return await RefundRequest.create({requestId:makeRequestId("REFUND"),order:order._id,customer:order.user,productId:item.product||null,amount:requestedAmount,requestedAmount,reason:String(req.body.reason||"").trim(),requestedBy:req.user!.id,status:"REQUESTED",orderItemId:itemId,storeId:order.storeAdmin||null,storeAdmin:order.storeAdmin||null,sourceType:String(order.sourceType||"FRESHBASKET_DIRECT"),deliveryPartner:order.deliveryPartner||null,refundMethod:method,upiEncrypted:encryptSensitive(upi),upiMasked:maskUpi(upi),evidence,statusHistory:[{status:"REQUESTED",by:req.user!.id,role:"customer",at:new Date()}]});}
    return await RefundRequest.create({requestId:makeRequestId("REFUND"),order:order._id,customer:order.user,productId:item.product||null,amount:requestedAmount,requestedAmount,reason:String(req.body.reason||"").trim(),requestedBy:req.user!.id,status:"REQUESTED",orderItemId:itemId,storeId:order.storeAdmin||null,storeAdmin:order.storeAdmin||null,sourceType:String(order.sourceType||"FRESHBASKET_DIRECT"),deliveryPartner:order.deliveryPartner||null,refundMethod:"ORIGINAL",evidence,statusHistory:[{status:"REQUESTED",by:req.user!.id,role:"customer",at:new Date()}]});
  }
  const dup=await ReplacementRequest.findOne({order:order._id,customer:req.user!.id,orderItemId:itemId,status:{$in:replacementActiveStatuses}});if(dup)throw new Error("Replacement request already in progress");
  const completedReplacement=await ReplacementRequest.findOne({order:order._id,customer:req.user!.id,orderItemId:itemId,status:{$in:["REPLACED","COMPLETED","CLOSED"]}});if(completedReplacement)throw new Error("This order item has already been replaced");
  const activeRefund=await RefundRequest.findOne({order:order._id,customer:req.user!.id,orderItemId:itemId,status:{$in:["REQUESTED","UNDER_REVIEW","VERIFIED_BY_CUSTOMER_CARE","FINANCE_REVIEW","APPROVAL_PENDING","APPROVED","PROCESSING"]}});if(activeRefund)throw new Error("Refund request is already in progress for this item");
  const completedRefund=await RefundRequest.findOne({order:order._id,customer:req.user!.id,orderItemId:itemId,status:"COMPLETED"});if(completedRefund)throw new Error("This order item has already been refunded");
  const sourceType=String(order.sourceType||"FRESHBASKET_DIRECT"); const storeId=sourceType==="STORE"?(order.storeAdmin||null):null;
  return await ReplacementRequest.create({requestId:makeRequestId("REPLACEMENT"),replacementId:makeReplacementId(),order:order._id,customer:order.user,productId:item.product||null,requestedBy:req.user!.id,reason:String(req.body.reason||"").trim(),description:String(req.body.description||"").trim().slice(0,3000),items:[{product:item.product,name:item.name,quantity:q}],orderItemId:itemId,storeId,storeAdmin:storeId,mainAdmin:sourceType==="FRESHBASKET_DIRECT"?await getMainAdminId():null,sourceType,deliveryPartner:null,priority:["LOW","MEDIUM","HIGH","URGENT"].includes(String(req.body.priority||"").toUpperCase())?String(req.body.priority).toUpperCase():"MEDIUM",evidence,statusHistory:[{status:"REQUESTED",by:req.user!.id,role:"customer",at:new Date()}],deliveredAtSnapshot:order.deliveredAt,expiryAt,eligibleAtRequestTime:true});
};

app.post("/api/customer/orders/:id/refund-requests",auth,role("customer"),async(req:AuthRequest,res)=>{try{const r:any=await createItemRequest(req,"refund");await recordCustomerCareAudit({req,action:"REFUND_REQUESTED",targetType:"REFUND_REQUEST",targetId:r._id,customer:req.user!.id,order:req.params.id,metadata:{requestId:r.requestId,orderItemId:r.orderItemId,storeId:r.storeId,sourceType:r.sourceType}});await notifyCustomerCareUsers({title:"New refund request",message:`Refund request for order #${String(req.params.id).slice(-8).toUpperCase()}.`,type:"refund_request",order:req.params.id});return res.status(201).json({success:true,message:"Refund request submitted",data:r});}catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to submit refund request"});}});
app.post("/api/customer/orders/:id/replacement-requests",auth,role("customer"),async(req:AuthRequest,res)=>{try{const r:any=await createItemRequest(req,"replacement");await recordCustomerCareAudit({req,action:"REPLACEMENT_REQUESTED",targetType:"REPLACEMENT_REQUEST",targetId:r._id,customer:req.user!.id,order:req.params.id,metadata:{requestId:r.requestId,orderItemId:r.orderItemId,storeId:r.storeId,sourceType:r.sourceType}});await notifyCustomerCareUsers({title:"New replacement request",message:`Replacement request for order #${String(req.params.id).slice(-8).toUpperCase()}.`,type:"replacement_request",order:req.params.id});return res.status(201).json({success:true,message:"Replacement request submitted",data:r});}catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to submit replacement request"});}});

// Point 33: record a customer-not-available delivery attempt without changing
// the existing order status, cancellation, refund, or reschedule workflows.
app.post("/api/delivery/orders/:id/customer-not-available",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findOne({_id:req.params.id,deliveryPartner:req.user!.id,status:"Out for Delivery"}).lean();
    if(!order) return res.status(404).json({success:false,message:"Active delivery not found"});
    const reason=String(req.body.reason||"").trim();
    const allowed=["Customer not reachable","Customer requested later","No response at door","Access/gate issue","Address/access issue","Other"];
    if(!allowed.includes(reason)) return res.status(400).json({success:false,message:"Select a valid customer-not-available reason"});
    const note=String(req.body.note||"").trim();
    if(note.length>2000) return res.status(400).json({success:false,message:"Note cannot exceed 2000 characters"});
    if(reason==="Other" && note.length<3) return res.status(400).json({success:false,message:"Please provide details for Other"});
    const evidence=imageList(req.body.evidence).filter((x:string)=>/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(x));
    if(evidence.some((x:string)=>x.length>1200000)) return res.status(400).json({success:false,message:"Evidence image is too large"});
    const count=await DeliveryNotAvailableAttempt.countDocuments({order:order._id});
    const attemptNumber=count+1;
    const partner:any=await User.findById(req.user!.id).select("latitude longitude locationAccuracy").lean();
    const hasLocation=isValidGeo(partner?.latitude,partner?.longitude);
    const now=new Date();
    const attempt:any=await DeliveryNotAvailableAttempt.create({
      order:order._id, customer:order.user, deliveryPartner:req.user!.id, attemptNumber, reason, note,
      latitude:hasLocation?Number(partner.latitude):null, longitude:hasLocation?Number(partner.longitude):null,
      locationAccuracy:hasLocation && Number.isFinite(Number(partner.locationAccuracy))?Number(partner.locationAccuracy):null,
      locationCapturedAt:hasLocation?now:null, evidence
    });
    await notifyUser({user:order.user,title:"Delivery attempt recorded",message:`Your Delivery Partner could not complete delivery for order #${String(order._id).slice(-8).toUpperCase()}. Attempt ${attemptNumber}: ${reason}.`,type:"delivery_not_available",order:order._id,relatedEntity:"DELIVERY_NOT_AVAILABLE",relatedEntityId:attempt._id});
    await notifyAdmins({title:"Customer not available",message:`Delivery attempt ${attemptNumber} for order #${String(order._id).slice(-8).toUpperCase()} was recorded: ${reason}.`,type:"delivery_not_available",order:order._id,storeAdmin:order.storeAdmin,relatedEntity:"DELIVERY_NOT_AVAILABLE",relatedEntityId:attempt._id});
    await recordCustomerCareAudit({req,action:"CUSTOMER_NOT_AVAILABLE_RECORDED",targetType:"ORDER",targetId:order._id,customer:order.user,order:order._id,metadata:{attemptId:attempt._id,attemptNumber,reason,note,latitude:attempt.latitude,longitude:attempt.longitude}});
    return res.status(201).json({success:true,message:`Customer-not-available attempt ${attemptNumber} recorded.`,data:attempt});
  } catch(e:any) {
    console.error("CUSTOMER NOT AVAILABLE ERROR:",e);
    return res.status(500).json({success:false,message:e?.message||"Unable to record customer-not-available attempt"});
  }
});

app.get("/api/delivery/orders/:id/customer-not-available",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findOne({_id:req.params.id,deliveryPartner:req.user!.id}).select("_id").lean();
    if(!order) return res.status(404).json({success:false,message:"Order not found"});
    const attempts=await DeliveryNotAvailableAttempt.find({order:order._id,deliveryPartner:req.user!.id}).sort({attemptNumber:1}).lean();
    return res.json({success:true,data:attempts});
  } catch { return res.status(500).json({success:false,message:"Unable to load delivery attempt history"}); }
});

app.post("/api/delivery/orders/:id/proof",auth,role("delivery"),async(req:AuthRequest,res)=>{
  try {
    const order:any = await Order.findOne({ _id:req.params.id, deliveryPartner:req.user!.id, status:"Out for Delivery" });
    if (!order) return res.status(404).json({success:false,message:"Active delivery not found"});

    const evidence = imageList([req.body.image]);
    if (!evidence.length) return res.status(400).json({success:false,message:"Valid proof image is required"});
    const image = evidence[0];
    if (image.length > 1200000) return res.status(400).json({success:false,message:"Proof image is too large"});

    const uploadedAt = new Date();
    const latitudeRaw = req.body.latitude;
    const longitudeRaw = req.body.longitude;
    const accuracyRaw = req.body.locationAccuracy;
    const hasLatitude = latitudeRaw !== undefined && latitudeRaw !== null && String(latitudeRaw).trim() !== "";
    const hasLongitude = longitudeRaw !== undefined && longitudeRaw !== null && String(longitudeRaw).trim() !== "";
    let proofLatitude: number | null = null;
    let proofLongitude: number | null = null;
    let proofAccuracy: number | null = null;
    if (hasLatitude || hasLongitude) {
      const lat = Number(latitudeRaw);
      const lng = Number(longitudeRaw);
      if (!isValidGeo(lat, lng)) return res.status(400).json({success:false,message:"Delivery proof GPS coordinates are invalid."});
      proofLatitude = lat;
      proofLongitude = lng;
      if (accuracyRaw !== undefined && accuracyRaw !== null && String(accuracyRaw).trim() !== "") {
        const accuracy = Number(accuracyRaw);
        if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000) return res.status(400).json({success:false,message:"Delivery proof GPS accuracy is invalid."});
        proofAccuracy = accuracy;
      }
    }
    const locationCapturedAt = proofLatitude !== null && proofLongitude !== null ? new Date() : null;

    // Order is the single source of truth for delivery proof in this project.
    // Persist directly against the already-authorized order. This avoids any
    // stale/compiled Mongoose schema issue and prevents the proof from existing
    // only in frontend state.
    const updateResult:any = await Order.collection.updateOne(
      { _id: order._id },
      { $set: {
        "deliveryProof.image": image,
        "deliveryProof.uploadedAt": uploadedAt,
        "deliveryProof.completedAt": null,
        "deliveryProof.latitude": proofLatitude,
        "deliveryProof.longitude": proofLongitude,
        "deliveryProof.locationAccuracy": proofAccuracy,
        "deliveryProof.locationCapturedAt": locationCapturedAt,
      }}
    );

    if (Number(updateResult?.matchedCount || 0) !== 1) {
      return res.status(500).json({success:false,message:"Delivery proof could not be persisted. Please try again."});
    }

    // Read the actual MongoDB document immediately after the write.
    const persisted:any = await Order.collection.findOne(
      { _id: order._id },
      { projection: { _id:1, deliveryPartner:1, status:1, deliveryProof:1 } }
    );

    if (String(persisted?.deliveryPartner || "") !== String(req.user!.id) || persisted?.status !== "Out for Delivery") {
      return res.status(409).json({success:false,message:"Delivery state changed. Refresh the order and try again."});
    }
    if (!persisted?.deliveryProof?.image) {
      return res.status(500).json({success:false,message:"Delivery proof could not be persisted. Please try again."});
    }

    await recordCustomerCareAudit({req,action:"DELIVERY_PROOF_UPLOADED",targetType:"ORDER",targetId:order._id,customer:order.user,order:order._id});
    return res.json({
      success:true,
      message:"Delivery proof uploaded successfully",
      data:{
        deliveryProof:{
          image:persisted.deliveryProof.image,
          uploadedAt:persisted.deliveryProof.uploadedAt,
          completedAt:persisted.deliveryProof.completedAt,
          latitude:persisted.deliveryProof.latitude ?? null,
          longitude:persisted.deliveryProof.longitude ?? null,
          locationAccuracy:persisted.deliveryProof.locationAccuracy ?? null,
          locationCapturedAt:persisted.deliveryProof.locationCapturedAt ?? null
        },
        uploadedAt:persisted.deliveryProof.uploadedAt
      }
    });
  } catch(e:any) {
    console.error("DELIVERY PROOF UPLOAD ERROR:", e?.message || e);
    return res.status(500).json({success:false,message:"Unable to upload delivery proof"});
  }
});

app.post("/api/customer/orders/:id/delivery-rating",auth,role("customer"),async(req:AuthRequest,res)=>{try{const rating=Math.round(Number(req.body.rating));if(rating<1||rating>5)return res.status(400).json({success:false,message:"Rating must be between 1 and 5"});const order:any=await Order.findOne({_id:req.params.id,user:req.user!.id,status:"Delivered"}).lean();if(!order||!order.deliveryPartner)return res.status(400).json({success:false,message:"Only completed deliveries can be rated"});const existing=await DeliveryRating.findOne({order:order._id});if(existing)return res.status(409).json({success:false,message:"This delivery has already been rated"});const created:any=await DeliveryRating.create({customer:req.user!.id,order:order._id,deliveryPartner:order.deliveryPartner,rating,feedback:String(req.body.feedback||"").trim()});const agg:any[]=await DeliveryRating.aggregate([{$match:{deliveryPartner:order.deliveryPartner}},{$group:{_id:"$deliveryPartner",avg:{$avg:"$rating"},count:{$sum:1}}}]);const s=agg[0]||{avg:0,count:0};await User.collection.updateOne({_id:order.deliveryPartner},{$set:{ratingAverage:Number(Number(s.avg||0).toFixed(2)),ratingCount:Number(s.count||0)}});await recordCustomerCareAudit({req,action:"CUSTOMER_RATING_SUBMITTED",targetType:"DELIVERY_RATING",targetId:created._id,customer:req.user!.id,order:order._id,metadata:{rating}});return res.status(201).json({success:true,message:"Thank you for rating your delivery",data:created});}catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to submit rating"});}});

app.get("/api/delivery/earnings",auth,role("delivery"),async(req:AuthRequest,res)=>{try{const partnerId=req.user!.id;const rows:any[]=await Order.find({deliveryPartner:partnerId,status:"Delivered"}).select("_id deliveredAt deliveryPayout performanceIncentive deliveryPayoutStatus createdAt storeAdmin").sort({deliveredAt:-1,createdAt:-1}).lean();const paidTransactions:any[]=await FinancialTransaction.find({deliveryPartner:partnerId,type:{$in:["DELIVERY_PAYOUT","INCENTIVE"]},status:{$in:["PAID","COMPLETED"]}}).sort({createdAt:-1}).lean();const breakdownRows=rows.map((x:any)=>{const basePayout=Math.max(0,Number(x.deliveryPayout||0));const incentive=Math.max(0,Number(x.performanceIncentive||0));return {...x,payoutBreakdown:{basePayout,distanceBonus:null,peakBonus:null,incentive,total:Number((basePayout+incentive).toFixed(2)),distanceBonusRecorded:false,peakBonusRecorded:false}};});const total=breakdownRows.reduce((s,x)=>s+Number(x.payoutBreakdown?.total||0),0);const pending=breakdownRows.filter(x=>x.deliveryPayoutStatus==="PENDING").reduce((s,x)=>s+Number(x.payoutBreakdown?.total||0),0);const eligible=breakdownRows.filter(x=>["ELIGIBLE","FINALIZED","PROCESSING","ON_HOLD"].includes(x.deliveryPayoutStatus)).reduce((s,x)=>s+Number(x.payoutBreakdown?.total||0),0);const paid=paidTransactions.reduce((s,x)=>s+Number(x.amount||0),0);const now=new Date(),day=new Date(now);day.setHours(0,0,0,0);const week=new Date(day);week.setDate(week.getDate()-6);const month=new Date(now.getFullYear(),now.getMonth(),1);const sum=(from:Date)=>breakdownRows.filter(x=>new Date(x.deliveredAt||x.createdAt)>=from).reduce((s,x)=>s+Number(x.payoutBreakdown?.total||0),0);return res.json({success:true,data:{rows:breakdownRows,paidRows:paidTransactions,today:sum(day),weekly:sum(week),monthly:sum(month),total,pending,eligible,paid}});}catch(e){return res.status(500).json({success:false,message:"Unable to load earnings"});}});
const parseDeliverySlotEndMinutes = (value:any) => {
  const text=String(value||"").trim();
  if(!text)return null;
  const matches=[...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/ig)];
  if(matches.length<2)return null;
  const toMinutes=(m:any)=>{let h=Number(m[1]),min=Number(m[2]||0),ampm=String(m[3]||"").toUpperCase();if(ampm){if(h===12)h=0;if(ampm==="PM")h+=12;}if(h<0||h>23||min<0||min>59)return null;return h*60+min;};
  const values=matches.slice(0,2).map(toMinutes).filter((x:any): x is number => x != null);
  return values.length===2?Math.max(...values):null;
};
const deliveryLocalMinutes = (date:any) => {
  if(!date)return null;
  try {
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:process.env.DELIVERY_TIME_ZONE||"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(date));
    const hour=Number(parts.find((x:any)=>x.type==="hour")?.value);
    const minute=Number(parts.find((x:any)=>x.type==="minute")?.value);
    return Number.isFinite(hour)&&Number.isFinite(minute)?hour*60+minute:null;
  } catch { return null; }
};
const buildDeliveryPerformance = (orders:any[], assignmentCounts:any, user:any, recentRatings:any[]) => {
  const completedOrders=orders.filter(o=>o.status==="Delivered" && o.deliveredAt);
  const deliveryMinutes:number[]=[];
  const pickupMinutes:number[]=[];
  let onTimeEligible=0,onTimeCount=0,systemDelayExcluded=0;
  for(const o of completedOrders){
    const delivered=new Date(o.deliveredAt).getTime();
    const started=o.deliveryStartedAt?new Date(o.deliveryStartedAt).getTime():NaN;
    const accepted=o.deliveryAcceptedAt?new Date(o.deliveryAcceptedAt).getTime():NaN;
    if(Number.isFinite(started) && delivered>=started) deliveryMinutes.push((delivered-started)/60000);
    if(Number.isFinite(accepted) && Number.isFinite(started) && started>=accepted) pickupMinutes.push((started-accepted)/60000);
    const slotEnd=parseDeliverySlotEndMinutes(o.deliverySlot);
    const deliveredMinutes=deliveryLocalMinutes(o.deliveredAt);
    const startedMinutes=deliveryLocalMinutes(o.deliveryStartedAt);
    if(slotEnd!=null && deliveredMinutes!=null){
      // If the order only entered active delivery after its selected slot ended,
      // do not attribute that store/system delay to the Delivery Partner.
      if(startedMinutes!=null && startedMinutes>slotEnd){ systemDelayExcluded++; continue; }
      onTimeEligible++;
      if(deliveredMinutes<=slotEnd) onTimeCount++;
    }
  }
  const accepted=Number(assignmentCounts?.ACCEPTED||0);
  const rejected=Number(assignmentCounts?.REJECTED||0);
  const expired=Number(assignmentCounts?.EXPIRED||0);
  const decisionTotal=accepted+rejected;
  const pct=(n:number,d:number)=>d>0?Number(((n/d)*100).toFixed(1)):null;
  return {
    ...user,
    ordersDelivered:completedOrders.length,
    completed:completedOrders.length,
    failed:orders.filter(o=>o.status==="Cancelled").length,
    onTimeRate:pct(onTimeCount,onTimeEligible),
    onTimeEligibleOrders:onTimeEligible,
    onTimeOrders:onTimeCount,
    systemDelayExcluded,
    acceptanceRate:pct(accepted,decisionTotal),
    rejectionRate:pct(rejected,decisionTotal),
    acceptedAssignments:accepted,
    rejectedAssignments:rejected,
    expiredAssignments:expired,
    assignmentDecisionTotal:decisionTotal,
    averagePickupMinutes:pickupMinutes.length?Number((pickupMinutes.reduce((a,b)=>a+b,0)/pickupMinutes.length).toFixed(1)):null,
    averageDeliveryMinutes:deliveryMinutes.length?Number((deliveryMinutes.reduce((a,b)=>a+b,0)/deliveryMinutes.length).toFixed(1)):null,
    customerRating: Number(user?.ratingCount||0)>0?Number(Number(user?.ratingAverage||0).toFixed(2)):null,
    recentRatings
  };
};
const loadDeliveryPerformanceForPartner = async (partnerId:string) => {
  const [u,orders,assignmentCounts,recentRatings]=await Promise.all([
    User.findById(partnerId).select("name employeeId ratingAverage ratingCount").lean(),
    Order.find({deliveryPartner:partnerId}).select("status deliverySlot deliveryAcceptedAt deliveryStartedAt deliveredAt").lean(),
    DeliveryAssignment.aggregate([{$match:{deliveryPartner:new mongoose.Types.ObjectId(partnerId),status:{$in:["ACCEPTED","REJECTED","EXPIRED"]}}},{$group:{_id:"$status",count:{$sum:1}}}]),
    DeliveryRating.find({deliveryPartner:partnerId}).sort({createdAt:-1}).limit(10).select("rating feedback createdAt").lean()
  ]);
  const counts:any={}; for(const x of assignmentCounts) counts[String(x._id)]=Number(x.count||0);
  return buildDeliveryPerformance(orders,counts,u||{},recentRatings);
};

app.get("/api/delivery/performance",auth,role("delivery"),async(req:AuthRequest,res)=>{try{const data=await loadDeliveryPerformanceForPartner(String(req.user!.id));return res.json({success:true,data});}catch(e){return res.status(500).json({success:false,message:"Unable to load delivery performance"});}});

app.get("/api/admin/delivery-performance",auth,role("admin"),async(req:AuthRequest,res)=>{try{const filter:any=await tenantFilter(req);const orders:any[]=await Order.find({...filter,deliveryPartner:{$ne:null}}).select("_id deliveryPartner status deliverySlot deliveryAcceptedAt deliveryStartedAt deliveredAt deliveryPayout performanceIncentive deliveryPayoutStatus deliveryAssignedAt").populate("deliveryPartner","name employeeId ratingAverage ratingCount").sort({deliveredAt:-1,createdAt:-1}).limit(500).lean();const partnerIds=[...new Set(orders.map(o=>String(o.deliveryPartner?._id||o.deliveryPartner)).filter(Boolean))].map(x=>new mongoose.Types.ObjectId(x));const assignments=partnerIds.length?await DeliveryAssignment.aggregate([{$match:{deliveryPartner:{$in:partnerIds},status:{$in:["ACCEPTED","REJECTED","EXPIRED"]}}},{$group:{_id:{partner:"$deliveryPartner",status:"$status"},count:{$sum:1}}}]):[];const assignmentMap=new Map<string,any>();for(const a of assignments){const key=String(a._id.partner);const x=assignmentMap.get(key)||{};x[String(a._id.status)]=Number(a.count||0);assignmentMap.set(key,x);}const ratingIds=partnerIds;const ratingRows=ratingIds.length?await DeliveryRating.find({deliveryPartner:{$in:ratingIds}}).sort({createdAt:-1}).select("deliveryPartner rating feedback createdAt").lean():[];const recentMap=new Map<string,any[]>();for(const r of ratingRows){const key=String(r.deliveryPartner);const arr=recentMap.get(key)||[];if(arr.length<10)arr.push(r);recentMap.set(key,arr);}const grouped=new Map<string,any>();for(const o of orders){const id=String(o.deliveryPartner?._id||o.deliveryPartner);const x=grouped.get(id)||{partner:o.deliveryPartner,orders:[],totalPayout:0,totalIncentive:0};x.orders.push(o);x.totalPayout+=Number(o.deliveryPayout||0);x.totalIncentive+=Number(o.performanceIncentive||0);grouped.set(id,x);}const rows=[...grouped.values()].map(x=>{const p=buildDeliveryPerformance(x.orders,assignmentMap.get(String(x.partner?._id))||{},x.partner||{},recentMap.get(String(x.partner?._id))||[]);return {...p,partner:x.partner,assigned:x.orders.length,totalPayout:x.totalPayout,totalIncentive:x.totalIncentive,pending:x.orders.filter((o:any)=>!['Delivered','Cancelled'].includes(String(o.status))).length,failed:x.orders.filter((o:any)=>o.status==="Cancelled").length};});return res.json({success:true,data:rows});}catch(e){console.error("ADMIN DELIVERY PERFORMANCE ERROR:",e);return res.status(500).json({success:false,message:"Unable to load delivery performance"});}});

app.get("/api/admin/delivery-payout-config",auth,mainAdminOnly,async(_req,res)=>{try{const d:any=await DeliveryPayoutConfig.findOneAndUpdate({key:"default"},{},{upsert:true,new:true,setDefaultsOnInsert:true});return res.json({success:true,data:d});}catch(e){return res.status(500).json({success:false,message:"Unable to load payout configuration"});}});
app.patch("/api/admin/delivery-payout-config",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{
  const defaultPayout=Number(req.body.defaultPayout);
  if(!Number.isFinite(defaultPayout)||defaultPayout<0||defaultPayout>10000)return res.status(400).json({success:false,message:"Invalid default payout"});
  const rawRules=Array.isArray(req.body.incentiveThresholds)?req.body.incentiveThresholds:[];
  const thresholds=rawRules.map((x:any,i:number)=>{
    const minRating=Number(x.minRating),minDeliveries=Number(x.minDeliveries),amount=Number(x.amount);
    const activeFrom=x.activeFrom?new Date(x.activeFrom):null,activeTo=x.activeTo?new Date(x.activeTo):null;
    const eligibility=String(x.eligibility||"ALL").toUpperCase();
    const maxBonus=x.maxBonus===null||x.maxBonus===undefined||x.maxBonus===""?null:Number(x.maxBonus);
    return {ruleId:String(x.ruleId||`INC-RULE-${Date.now()}-${i}`).slice(0,120),minRating,minDeliveries,amount,activeFrom:activeFrom&&Number.isFinite(activeFrom.getTime())?activeFrom:null,activeTo:activeTo&&Number.isFinite(activeTo.getTime())?activeTo:null,eligibility:["ALL","ON_TIME"].includes(eligibility)?eligibility:"ALL",maxBonus:maxBonus===null?null:(Number.isFinite(maxBonus)&&maxBonus>=0?maxBonus:null)};
  }).filter((x:any)=>Number.isFinite(x.minRating)&&x.minRating>=0&&x.minRating<=5&&Number.isFinite(x.minDeliveries)&&x.minDeliveries>=1&&Number.isFinite(x.amount)&&x.amount>=0&&(!x.activeFrom||!x.activeTo||x.activeFrom<=x.activeTo));
  const previous:any=await DeliveryPayoutConfig.findOne({key:"default"}).lean();
  const d:any=await DeliveryPayoutConfig.findOneAndUpdate({key:"default"},{$set:{defaultPayout,incentiveThresholds:thresholds}},{upsert:true,new:true,setDefaultsOnInsert:true});
  await recordEntityChange({req,action:"DELIVERY_PAYOUT_CONFIGURATION_CHANGED",targetType:"CONFIGURATION",targetId:"delivery-payout",before:{defaultPayout:Number(previous?.defaultPayout||0),incentiveThresholds:Array.isArray(previous?.incentiveThresholds)?previous.incentiveThresholds:[]},after:{defaultPayout:Number(d.defaultPayout||0),incentiveThresholds:Array.isArray(d?.incentiveThresholds)?d.incentiveThresholds:[]},reason:req.body?.reason||"Delivery payout and incentive configuration updated"});
  return res.json({success:true,message:"Payout and incentive configuration updated",data:d});
}catch(e){return res.status(400).json({success:false,message:"Unable to update payout configuration"});}});

/* =========================================================
   COMPLETE FINANCE DEPARTMENT — additive workflow
========================================================= */
const financeAuth = async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.user?.role || !FINANCE_ROLES.includes(req.user.role)) return res.status(403).json({ success:false, message:"Finance access required" });
    const u:any = await User.findById(req.user.id).select("role blocked permissions forcePasswordChange").lean();
    if (!u || u.blocked || !FINANCE_ROLES.includes(u.role)) return res.status(403).json({ success:false, message:"Finance account not available" });
    (req as any).financeUser = u;
    next();
  } catch { return res.status(500).json({success:false,message:"Unable to verify finance access"}); }
};
const financeCan = (permission:string) => async (req:AuthRequest,res:any,next:any) => {
  try {
    if (req.user?.role === "admin") return next();
    const u:any = (req as any).financeUser || await User.findById(req.user!.id).select("role permissions blocked").lean();
    if (!u || u.blocked || !FINANCE_ROLES.includes(u.role)) return res.status(403).json({success:false,message:"Finance access required"});
    if (u.role === "finance_manager") return next();
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    if (!perms.includes(permission)) return res.status(403).json({success:false,message:`Missing permission: ${permission}`});
    next();
  } catch { return res.status(500).json({success:false,message:"Unable to verify finance permission"}); }
};


// =========================================================
// CUSTOMER 360 / COMPLETE CUSTOMER KUNDALI — additive view
// Uses the existing Customer, Order, Refund, Replacement, Support,
// Address, Finance and Audit records. No duplicate customer model is created.
// =========================================================
const customer360Auth = async (req: AuthRequest, res: any, next: any) => {
  try {
    const roleName = String(req.user?.role || "");
    const user: any = await User.findById(req.user?.id).select("role blocked permissions email").lean();
    if (!user || user.blocked) return res.status(403).json({ success: false, message: "Customer 360 access denied" });

    if (roleName === "admin") {
      const mainId = await getMainAdminId();
      if (!mainId || String(mainId) !== String(user._id) || String(user.email || "").toLowerCase() !== MAIN_ADMIN_EMAIL) {
        return res.status(403).json({ success: false, message: "Customer 360 is available only to Main Admin" });
      }
      (req as any).customer360Role = roleName;
      return next();
    }

    if (roleName === "customer_care") {
      const permissions = Array.isArray(user.permissions) ? user.permissions.map((x: any) => String(x)) : [];
      const allowed = permissions.length === 0 || (permissions.includes("customer.search") && permissions.includes("customer.view"));
      if (!allowed) return res.status(403).json({ success: false, message: "Customer 360 permission required" });
      (req as any).customer360Role = roleName;
      return next();
    }

    if (FINANCE_ROLES.includes(roleName)) {
      const permissions = Array.isArray(user.permissions) ? user.permissions.map((x: any) => String(x)) : [];
      const allowed = roleName === "finance_manager" || permissions.length === 0 || permissions.includes("FINANCE_VIEW_REFUNDS") || permissions.includes("FINANCE_VIEW_REPORTS");
      if (!allowed) return res.status(403).json({ success: false, message: "Finance Customer 360 permission required" });
      (req as any).customer360Role = roleName;
      (req as any).financeUser = user;
      return next();
    }

    return res.status(403).json({ success: false, message: "Customer 360 access denied" });
  } catch (error) {
    console.error("CUSTOMER 360 AUTH ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to verify Customer 360 access" });
  }
};

const customer360SafeUser = (u: any) => u ? ({
  _id: u._id,
  customerId: u.customerId || "",
  name: u.name || "",
  email: u.email || "",
  phone: u.phone || "",
  status: u.blocked ? "BLOCKED" : "ACTIVE",
  createdAt: u.createdAt || null,
  lastLogin: u.lastLogin || null,
  language: u.language || "en",
}) : null;

const buildCustomer360 = async (req: AuthRequest, customerId: any) => {
  const customer: any = await User.findOne({ _id: customerId, role: "customer" }).select("-password").lean();
  if (!customer) return null;

  const roleName = String((req as any).customer360Role || req.user?.role || "");
  const includeFinance = roleName === "admin" || FINANCE_ROLES.includes(roleName);

  // Customer 360 is a read-only aggregation over several legacy collections.
  // Do not let one optional/legacy populate reference take the whole profile down.
  // Load the records first, then hydrate known references in safe, batched queries.
  // This preserves the response contract while tolerating missing/null legacy refs.
  const [orders, addresses, refunds, replacements, tickets] = await Promise.all([
    Order.find({ user: customer._id }).sort({ createdAt: -1 }).limit(200).lean(),
    Address.find({ user: customer._id }).sort({ isDefault: -1, createdAt: -1 }).lean(),
    RefundRequest.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(200).lean(),
    ReplacementRequest.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(200).lean(),
    SupportTicket.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(200).lean(),
  ]);

  const orderIds = orders.map((x: any) => x._id).filter(Boolean);
  const transactions: any[] = includeFinance && orderIds.length
    ? await FinancialTransaction.find({ $or: [{ customer: customer._id }, { order: { $in: orderIds } }] })
      .sort({ createdAt: -1 }).limit(500).lean()
    : includeFinance
      ? await FinancialTransaction.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(500).lean()
      : [];

  const validObjectIds = (values: any[]) => Array.from(new Set(values
    .filter((v: any) => v && mongoose.Types.ObjectId.isValid(String(v)))
    .map((v: any) => String(v))));

  const userRefValues: any[] = [];
  for (const o of orders as any[]) userRefValues.push(o.storeAdmin, o.deliveryPartner);
  for (const r of refunds as any[]) userRefValues.push(r.storeAdmin, r.customerCareAgent, r.financeEmployee, r.assignedFinance, r.financeManager, r.approvedBy);
  for (const r of replacements as any[]) userRefValues.push(r.storeAdmin, r.mainAdmin, r.customerCareAgent, r.deliveryPartner, r.fulfillmentOwnerId);
  for (const t of tickets as any[]) userRefValues.push(t.assignedCustomerCare, t.store, t.deliveryPartner);
  for (const t of transactions as any[]) userRefValues.push(t.storeAdmin, t.processedBy, t.createdBy, t.deliveryPartner);

  const productRefValues = [
    ...(refunds as any[]).map((r: any) => r.productId),
    ...(replacements as any[]).map((r: any) => r.productId),
  ];

  const ticketOrderIds = (tickets as any[]).map((t: any) => t.order).filter(Boolean);
  const allOrderRefIds = validObjectIds([...orderIds, ...ticketOrderIds, ...(transactions as any[]).map((t: any) => t.order)]);
  const userIds = validObjectIds(userRefValues);
  const productIds = validObjectIds(productRefValues);

  const [userRefs, productRefs, orderRefs] = await Promise.all([
    userIds.length ? User.find({ _id: { $in: userIds } })
      .select("name email phone employeeId storeImage storeCategory storeDescription ratingAverage ratingCount role profilePhoto")
      .lean() : [],
    productIds.length ? Product.find({ _id: { $in: productIds } }).select("name image").lean() : [],
    allOrderRefIds.length ? Order.find({ _id: { $in: allOrderRefIds } })
      .select("_id total status createdAt deliveredAt deliveryPartner storeAdmin items paymentStatus paymentMethod statusHistory")
      .lean() : [],
  ]);

  const byId = (rows: any[]) => new Map(rows.map((row: any) => [String(row._id), row]));
  const userById = byId(userRefs as any[]);
  const productById = byId(productRefs as any[]);
  const orderByIdRaw = byId(orderRefs as any[]);
  const refUser = (value: any) => value ? (userById.get(String(value)) || null) : null;
  const refProduct = (value: any) => value ? (productById.get(String(value)) || null) : null;
  const refOrder = (value: any) => value ? (orderByIdRaw.get(String(value)) || null) : null;

  (orders as any[]).forEach((o: any) => {
    o.storeAdmin = refUser(o.storeAdmin);
    o.deliveryPartner = refUser(o.deliveryPartner);
  });
  (refunds as any[]).forEach((r: any) => {
    r.productId = refProduct(r.productId);
    r.storeAdmin = refUser(r.storeAdmin);
    r.customerCareAgent = refUser(r.customerCareAgent);
    r.financeEmployee = refUser(r.financeEmployee);
    r.assignedFinance = refUser(r.assignedFinance);
    r.financeManager = refUser(r.financeManager);
    r.approvedBy = refUser(r.approvedBy);
  });
  (replacements as any[]).forEach((r: any) => {
    r.productId = refProduct(r.productId);
    r.storeAdmin = refUser(r.storeAdmin);
    r.mainAdmin = refUser(r.mainAdmin);
    r.customerCareAgent = refUser(r.customerCareAgent);
    r.deliveryPartner = refUser(r.deliveryPartner);
    r.fulfillmentOwnerId = refUser(r.fulfillmentOwnerId);
  });
  (tickets as any[]).forEach((t: any) => {
    t.assignedCustomerCare = refUser(t.assignedCustomerCare);
    t.store = refUser(t.store);
    t.deliveryPartner = refUser(t.deliveryPartner);
    t.order = refOrder(t.order);
  });
  (transactions as any[]).forEach((t: any) => {
    t.storeAdmin = refUser(t.storeAdmin);
    t.processedBy = refUser(t.processedBy);
    t.createdBy = refUser(t.createdBy);
    t.deliveryPartner = refUser(t.deliveryPartner);
    const transactionOrder = refOrder(t.order);
    t.order = transactionOrder ? { _id: transactionOrder._id } : (t.order ? { _id: t.order } : null);
  });

  const itemMap = new Map<string, any>();
  orders.forEach((o: any) => {
    (Array.isArray(o.items) ? o.items : []).forEach((item: any, index: number) => {
      const key = String(item?._id || item?.product || `${o._id}:${index}`);
      itemMap.set(`${String(o._id)}:${key}`, { ...item, orderId: o._id, orderCreatedAt: o.createdAt, store: o.storeAdmin || null });
    });
  });

  const itemFor = (orderId: any, orderItemId: any, productId: any) => {
    const oid = String(orderId || "");
    const target = String(orderItemId || productId || "");
    const found = (orders.find((o: any) => String(o._id) === oid)?.items || []).find((item: any, index: number) => String(item?._id || item?.product || index) === target || (productId && String(item?.product || "") === String(productId)));
    return found || null;
  };

  const mapOrder = (o: any) => ({
    _id: o._id,
    orderId: `#${String(o._id).slice(-8).toUpperCase()}`,
    createdAt: o.createdAt || null,
    deliveredAt: o.deliveredAt || null,
    store: o.storeAdmin ? { id: o.storeAdmin._id, name: o.storeAdmin.name, email: o.storeAdmin.email, phone: o.storeAdmin.phone, employeeId: o.storeAdmin.employeeId, image: o.storeAdmin.storeImage || "" } : null,
    storeId: o.storeAdmin?._id || o.storeAdmin || null,
    amount: Number(o.total || 0),
    paymentStatus: o.paymentStatus || "",
    paymentMethod: o.paymentMethod || o.paymentMode || "",
    status: o.status || "",
    deliveryStatus: o.status || "",
    cancellationStatus: String(o.status || "").toLowerCase() === "cancelled" ? "CANCELLED" : "",
    deliveryPartner: o.deliveryPartner ? { id: o.deliveryPartner._id, name: o.deliveryPartner.name, phone: o.deliveryPartner.phone, employeeId: o.deliveryPartner.employeeId } : null,
    deliveryAssignedAt: o.deliveryAssignedAt || null,
    deliveryStartedAt: o.deliveryStartedAt || null,
    deliveryProof: o.deliveryProof ? { available: Boolean(o.deliveryProof.image), uploadedAt: o.deliveryProof.uploadedAt || null, completedAt: o.deliveryProof.completedAt || null } : null,
    statusHistory: Array.isArray(o.statusHistory) ? o.statusHistory : [],
  });

  const mappedOrders = orders.map(mapOrder);
  const orderById = new Map(mappedOrders.map((o: any) => [String(o._id), o]));

  const mappedRefunds = refunds.map((r: any) => {
    const item = itemFor(r.order, r.orderItemId, r.productId?._id || r.productId);
    const order = orderById.get(String(r.order));
    const { bankAccountEncrypted, upiEncrypted, ...safeRefund } = r;
    return {
      ...safeRefund,
      bankAccountMasked: r.bankAccountMasked || "",
      upiMasked: r.upiMasked || "",
      product: r.productId ? { id: r.productId._id, name: r.productId.name, image: r.productId.image } : item ? { id: item.product, name: item.name, image: item.image } : null,
      store: r.storeAdmin || order?.store || null,
      requestedAmount: Number(r.requestedAmount ?? r.amount ?? 0),
      eligibleAmount: Number(r.approvedAmount ?? r.amount ?? 0),
      transactionReference: r.transactionReference || "",
      item: item ? { id: item._id || r.orderItemId, productId: item.product, name: item.name, image: item.image, quantity: item.quantity, unitPrice: Number(item.price || 0), total: Number(item.price || 0) * Number(item.quantity || 0) } : null,
    };
  });

  const mappedReplacements = replacements.map((r: any) => {
    const item = itemFor(r.order, r.orderItemId, r.productId?._id || r.productId);
    const order = orderById.get(String(r.order));
    return {
      ...r,
      product: r.productId ? { id: r.productId._id, name: r.productId.name, image: r.productId.image } : item ? { id: item.product, name: item.name, image: item.image } : null,
      store: r.storeAdmin || order?.store || null,
      replacementProduct: r.replacementProduct || r.replacementItem || null,
      deliveryPartner: r.deliveryPartner ? { id: r.deliveryPartner._id, name: r.deliveryPartner.name, phone: r.deliveryPartner.phone, employeeId: r.deliveryPartner.employeeId } : null,
      item: item ? { id: item._id || r.orderItemId, productId: item.product, name: item.name, image: item.image, quantity: item.quantity, unitPrice: Number(item.price || 0), total: Number(item.price || 0) * Number(item.quantity || 0) } : null,
    };
  });

  const completedOrders = orders.filter((o: any) => ["Delivered", "COMPLETED", "Completed"].includes(String(o.status))).length;
  const cancelledOrders = orders.filter((o: any) => String(o.status).toLowerCase() === "cancelled").length;
  const pendingOrders = orders.filter((o: any) => !["Delivered", "COMPLETED", "Completed", "Cancelled", "CANCELLED"].includes(String(o.status))).length;
  const activeOrders = pendingOrders;
  const totalOrderValue = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  const totalSpent = orders.filter((o: any) => !["Cancelled", "CANCELLED"].includes(String(o.status))).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  const completedRefunds = mappedRefunds.filter((r: any) => String(r.status) === "COMPLETED");
  const pendingRefunds = mappedRefunds.filter((r: any) => !["COMPLETED", "REJECTED", "FAILED"].includes(String(r.status)));
  const refundedAmount = completedRefunds.reduce((sum: number, r: any) => sum + Number(r.approvedAmount ?? r.amount ?? 0), 0);
  const pendingRefundAmount = pendingRefunds.reduce((sum: number, r: any) => sum + Number(r.approvedAmount ?? r.amount ?? r.requestedAmount ?? 0), 0);
  const totalPaid = transactions.filter((t: any) => ["COMPLETED", "PAID"].includes(String(t.status)) && String(t.direction || "").toUpperCase() === "INFLOW" && ["ORDER_PAYMENT"].includes(String(t.type))).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const adjustments = transactions.filter((t: any) => String(t.type) === "ADJUSTMENT").reduce((sum: number, t: any) => sum + (String(t.direction).toUpperCase() === "OUTFLOW" ? -Number(t.amount || 0) : Number(t.amount || 0)), 0);

  const timeline: any[] = [];
  if (customer.createdAt) timeline.push({ at: customer.createdAt, type: "CUSTOMER", title: "Customer Registered", detail: customer.customerId || "Customer account created" });
  for (const o of orders) {
    if (o.createdAt) timeline.push({ at: o.createdAt, type: "ORDER", title: "Order Placed", detail: `Order #${String(o._id).slice(-8).toUpperCase()} · ₹${Number(o.total || 0).toLocaleString("en-IN")}`, orderId: o._id });
    for (const h of (Array.isArray(o.statusHistory) ? o.statusHistory : [])) {
      const at = h?.timestamp || h?.at || h?.createdAt;
      if (at) timeline.push({ at, type: "ORDER_STATUS", title: `Order ${String(h.status || "Status Updated").replace(/_/g, " ")}`, detail: `Order #${String(o._id).slice(-8).toUpperCase()}`, orderId: o._id });
    }
    if (o.deliveredAt) timeline.push({ at: o.deliveredAt, type: "DELIVERY", title: "Order Delivered", detail: `Order #${String(o._id).slice(-8).toUpperCase()}`, orderId: o._id });
  }
  for (const t of tickets) {
    if (t.createdAt) timeline.push({ at: t.createdAt, type: "SUPPORT", title: "Support Request Created", detail: `${t.ticketId || "Ticket"} · ${t.category || t.subject || "Support"}`, ticketId: t._id });
    if (t.resolvedAt) timeline.push({ at: t.resolvedAt, type: "SUPPORT", title: "Support Request Resolved", detail: t.ticketId || "Ticket", ticketId: t._id });
  }
  for (const r of mappedRefunds) {
    if (r.createdAt) timeline.push({ at: r.createdAt, type: "REFUND", title: "Refund Requested", detail: r.requestId || "Refund request", refundId: r._id });
    for (const h of (Array.isArray(r.statusHistory) ? r.statusHistory : [])) {
      const at = h?.at || h?.timestamp || h?.createdAt;
      if (at) timeline.push({ at, type: "REFUND", title: `Refund ${String(h.status || "Status Updated").replace(/_/g, " ")}`, detail: r.requestId || "Refund request", refundId: r._id });
    }
  }
  for (const r of mappedReplacements) {
    if (r.createdAt) timeline.push({ at: r.createdAt, type: "REPLACEMENT", title: "Replacement Requested", detail: r.requestId || r.replacementId || "Replacement request", replacementId: r._id });
    for (const h of (Array.isArray(r.statusHistory) ? r.statusHistory : [])) {
      const at = h?.at || h?.timestamp || h?.createdAt;
      if (at) timeline.push({ at, type: "REPLACEMENT", title: `Replacement ${String(h.status || "Status Updated").replace(/_/g, " ")}`, detail: r.requestId || r.replacementId || "Replacement request", replacementId: r._id });
    }
  }
  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const deliveryHistory = mappedOrders.filter((o: any) => o.deliveryPartner || o.deliveryAssignedAt || o.deliveryStartedAt || o.deliveredAt).map((o: any) => ({
    orderId: o.orderId, id: o._id, store: o.store, deliveryPartner: o.deliveryPartner, assignedAt: o.deliveryAssignedAt, pickupAt: o.deliveryStartedAt, outForDeliveryAt: o.deliveryStartedAt, deliveredAt: o.deliveredAt, status: o.status, proof: o.deliveryProof,
    payout: includeFinance ? undefined : undefined,
  }));

  return {
    customer: customer360SafeUser(customer),
    addresses,
    summary: {
      totalOrders: orders.length, activeOrders, completedOrders, cancelledOrders, pendingOrders,
      totalOrderValue, totalSpent, refunds: mappedRefunds.length, replacements: mappedReplacements.length,
      supportTickets: tickets.length, pendingRequests: pendingRefunds.length + mappedReplacements.filter((r: any) => !["COMPLETED", "CLOSED", "REJECTED", "FAILED", "EXPIRED"].includes(String(r.status))).length,
      openTickets: tickets.filter((t: any) => !["RESOLVED", "CLOSED"].includes(String(t.status))).length,
      pendingVerification: mappedRefunds.filter((r: any) => ["REQUESTED", "UNDER_REVIEW"].includes(String(r.status))).length + mappedReplacements.filter((r: any) => ["REQUESTED", "UNDER_REVIEW", "VERIFIED"].includes(String(r.status))).length,
      slaBreached: tickets.filter((t: any) => t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now() && !["RESOLVED", "CLOSED"].includes(String(t.status))).length,
      totalPaid, totalRefunded: refundedAmount, pendingRefundAmount, completedRefundAmount: refundedAmount, financialAdjustments: adjustments,
    },
    orders: mappedOrders,
    refunds: mappedRefunds,
    replacements: mappedReplacements,
    tickets: tickets.map((t: any) => ({ ...t, assignedCustomerCare: t.assignedCustomerCare || null })),
    deliveryHistory,
    finance: includeFinance ? { transactions, summary: { totalPaid, totalRefunded: refundedAmount, pendingRefundAmount, completedRefundAmount: refundedAmount, financialAdjustments: adjustments } } : null,
    timeline,
    access: { role: roleName, financeVisible: includeFinance },
  };
};

app.get("/api/customer-360/search", auth, customer360Auth, async (req: AuthRequest, res: any) => {
  try {
    const search = String(req.query.search || "").trim();
    if (!search) return res.json({ success: true, data: [] });
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const orderMatches = mongoose.Types.ObjectId.isValid(search) ? await Order.find({ _id: search }).select("user").lean() : [];
    const orderCustomerIds = orderMatches.map((x: any) => x.user).filter(Boolean);
    const customers = await User.find({ role: "customer", $or: [
      ...(orderCustomerIds.length ? [{ _id: { $in: orderCustomerIds } }] : []),
      { customerId: regex }, { name: regex }, { email: regex }, { phone: regex },
    ] }).select("_id customerId name email phone blocked createdAt lastLogin").sort({ createdAt: -1 }).limit(20).lean();
    const data = await Promise.all(customers.map(async (c: any) => ({
      ...customer360SafeUser(c),
      totalOrders: await Order.countDocuments({ user: c._id }),
    })));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("CUSTOMER 360 SEARCH ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to search customers" });
  }
});

app.get("/api/customer-360/:id", auth, customer360Auth, async (req: AuthRequest, res: any) => {
  try {
    let customerId: any = null;
    const raw = String(req.params.id || "").trim();
    if (mongoose.Types.ObjectId.isValid(raw)) customerId = raw;
    else {
      const c: any = await User.findOne({ role: "customer", customerId: raw }).select("_id").lean();
      customerId = c?._id || null;
    }
    if (!customerId) return res.status(404).json({ success: false, message: "Customer not found" });
    const data = await buildCustomer360(req, customerId);
    if (!data) return res.status(404).json({ success: false, message: "Customer not found" });
    await recordCustomerCareAudit({ req, action: "CUSTOMER_360_VIEW", targetType: "CUSTOMER", targetId: customerId, customer: customerId, metadata: { customer360Role: (req as any).customer360Role || req.user?.role } });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("CUSTOMER 360 PROFILE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load Customer 360 profile" });
  }
});

const csvEscape=(v:any)=>`"${String(v??"").replace(/"/g,'""')}"`;
const makeFinancialId=(prefix:string)=>`${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100+Math.random()*900)}`;
const ensureFinanceSettings=async()=>await FinanceSettings.findOneAndUpdate({key:"default"},{},{upsert:true,new:true,setDefaultsOnInsert:true});
const createFinancialTransaction=async(args:any)=>{
  const existing=await FinancialTransaction.findOne({type:args.type,referenceId:String(args.referenceId)});
  if(existing)return existing;
  return await FinancialTransaction.create({transactionId:makeFinancialId("TXN"),...args,referenceId:String(args.referenceId),createdAt:new Date()});
};

// Finalize an order's immutable store-finance snapshot exactly once. The rate is
// read from the existing Finance Settings collection; the default is 0%, so the
// application never invents a commission percentage. Future setting changes do
// not mutate an already-finalized order.
const finalizeOrderFinancials=async(order:any, actorId:any)=>{
  if(!order || String(order.status||"")!=="Delivered") return order;
  const raw:any=await Order.collection.findOne({_id:order._id},{projection:{financialFinalizedAt:1,sourceType:1,storeAdmin:1,user:1,subtotal:1,discount:1,total:1,deliveryCharge:1,paymentMethod:1,paymentStatus:1,paymentMode:1}});
  if(raw?.financialFinalizedAt) return order;
  const sourceType=String(raw?.sourceType||order.sourceType||"FRESHBASKET_DIRECT");
  const storeId=raw?.storeAdmin||order.storeAdmin||null;
  const subtotal=Math.max(0,Number(raw?.subtotal??order.subtotal??0));
  const discount=Math.max(0,Number(raw?.discount??order.discount??0));
  const netBeforeRefund=Math.max(0,subtotal-discount);
  const settings:any=await ensureFinanceSettings();
  const rate=sourceType==="STORE"?Math.max(0,Math.min(100,Number(settings?.commissionRate||0))):0;
  const commission=sourceType==="STORE"?Number((netBeforeRefund*rate/100).toFixed(2)):0;
  const storeEarnings=sourceType==="STORE"?Math.max(0,Number((netBeforeRefund-commission).toFixed(2))):0;
  const finalizedAt=new Date();
  const claimed=await Order.collection.updateOne({_id:order._id,$or:[{financialFinalizedAt:null},{financialFinalizedAt:{$exists:false}}]},{$set:{commissionRate:rate,commissionAmount:commission,storeGrossSales:sourceType==="STORE"?subtotal:0,storeEarnings,financialFinalizedAt:finalizedAt}});
  if(Number(claimed?.modifiedCount||0)!==1){ return order; }
  if(sourceType==="STORE" && storeId && commission>0){
    await createFinancialTransaction({type:"COMMISSION",referenceId:`ORDER:${String(order._id)}`,order:order._id,storeAdmin:storeId,amount:commission,direction:"INFLOW",paymentMethod:"INTERNAL",status:"COMPLETED",completedAt:new Date(),createdBy:actorId,processedBy:actorId,processedAt:new Date(),metadata:{commissionRate:rate,sourceType}});
  }
  const paymentStatus=String(raw?.paymentStatus||"").toLowerCase();
  if(paymentStatus==="paid") await createFinancialTransaction({type:"ORDER_PAYMENT",referenceId:String(order._id),order:order._id,customer:order.user||null,storeAdmin:storeId,amount:Number(raw?.total??order.total??0),direction:"INFLOW",paymentMethod:String(raw?.paymentMode||raw?.paymentMethod||""),status:"COMPLETED",completedAt:new Date(),createdBy:actorId,processedBy:actorId,processedAt:new Date(),metadata:{sourceType}});
  return order;
};

// Main Admin — Finance Team management. Existing Admin Management remains untouched.
app.get("/api/admin/finance/users",auth,mainAdminOnly,async(_req,res)=>{try{const users:any[]=await User.find({role:{$in:FINANCE_ROLES}}).select("name email phone username employeeId department role permissions blocked createdAt lastLogin forcePasswordChange").sort({createdAt:-1}).lean();const counts:any[]=await RefundRequest.aggregate([{ $match:{assignedFinance:{$in:users.map(x=>x._id)} ,status:{$nin:["COMPLETED","REJECTED","FAILED"]}}},{ $group:{_id:"$assignedFinance",count:{$sum:1}}}]); const cm=new Map(counts.map(x=>[String(x._id),Number(x.count)])); return res.json({success:true,permissions:FINANCE_PERMISSIONS,data:users.map(u=>({...u,status:u.blocked?"INACTIVE":"ACTIVE",assignedWork:cm.get(String(u._id))||0}))});}catch(e){return res.status(500).json({success:false,message:"Unable to load Finance team"});}});
app.post("/api/admin/finance/users",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{
 const name=String(req.body.name||"").trim(), email=String(req.body.email||"").trim().toLowerCase(), username=String(req.body.username||req.body.loginId||email).trim().toLowerCase(), phone=String(req.body.phone||req.body.mobile||"").replace(/\D/g,""), employeeId=String(req.body.employeeId||"").trim(), department=String(req.body.department||"Finance").trim(), password=String(req.body.password||""), confirm=String(req.body.confirmPassword||password), roleName=String(req.body.role||"finance_manager").toLowerCase(), blocked=String(req.body.status||"ACTIVE").toUpperCase()==="INACTIVE";
 if(name.length<2||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({success:false,message:"Valid name and email are required"});
 if(!employeeId)return res.status(400).json({success:false,message:"Employee ID is required"});
 if(phone&&!/^[6-9]\d{9}$/.test(phone))return res.status(400).json({success:false,message:"Invalid mobile number"});
 if(!FINANCE_ROLES.includes(roleName))return res.status(400).json({success:false,message:"Invalid Finance role"});
 if(password.length<8||password!==confirm)return res.status(400).json({success:false,message:"Password must be at least 8 characters and must match confirmation"});
 const dup:any=await User.findOne({$or:[{email},{username},{employeeId}]}).select("email username employeeId").lean(); if(dup)return res.status(409).json({success:false,message:"Email, Login ID or Employee ID already exists"});
 const permissions=Array.isArray(req.body.permissions)?req.body.permissions.map((x:any)=>String(x)).filter((x:string)=>FINANCE_PERMISSIONS.includes(x)): (roleName==="finance_manager"?FINANCE_PERMISSIONS:[]);
 const u:any=await User.create({name,email,username,phone,employeeId,department,password:await bcrypt.hash(password,10),role:roleName,blocked,permissions,forcePasswordChange:false});
 await recordCustomerCareAudit({req,action:"EMPLOYEE_CREATED",targetType:"EMPLOYEE",targetId:u._id,metadata:{employeeId,role:roleName,department}}); await recordCustomerCareAudit({req,action:"FINANCE_ACCOUNT_CREATED",targetType:"FINANCE_USER",targetId:u._id,metadata:{employeeId,role:roleName,department}});
 return res.status(201).json({success:true,message:"Finance account created successfully",data:{id:u._id,name:u.name,email:u.email,username:u.username,phone:u.phone,employeeId:u.employeeId,department:u.department,role:u.role,status:u.blocked?"INACTIVE":"ACTIVE",permissions:u.permissions,createdAt:u.createdAt,lastLogin:u.lastLogin||null}});
}catch(e){console.error("CREATE FINANCE ERROR",e);return res.status(500).json({success:false,message:"Unable to create Finance account"});}});
app.patch("/api/admin/finance/users/:id",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const u:any=await User.findOne({_id:req.params.id,role:{$in:FINANCE_ROLES}});if(!u)return res.status(404).json({success:false,message:"Finance account not found"});const updates:any={};for(const k of ["name","department","profilePhoto"]){if(req.body[k]!==undefined)updates[k]=String(req.body[k]||"").trim();}if(req.body.email!==undefined){const email=String(req.body.email).trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({success:false,message:"Invalid email"});const d=await User.findOne({email,_id:{$ne:u._id}}).lean();if(d)return res.status(409).json({success:false,message:"Email already registered"});updates.email=email;}if(req.body.username!==undefined){const username=String(req.body.username).trim().toLowerCase();const d=await User.findOne({username,_id:{$ne:u._id}}).lean();if(d)return res.status(409).json({success:false,message:"Login ID already registered"});updates.username=username;}if(req.body.phone!==undefined)updates.phone=String(req.body.phone||"").replace(/\D/g,"");if(req.body.employeeId!==undefined){const d=await User.findOne({employeeId:String(req.body.employeeId).trim(),_id:{$ne:u._id}}).lean();if(d)return res.status(409).json({success:false,message:"Employee ID already registered"});updates.employeeId=String(req.body.employeeId).trim();}if(req.body.role!==undefined&&FINANCE_ROLES.includes(String(req.body.role).toLowerCase()))updates.role=String(req.body.role).toLowerCase();if(Array.isArray(req.body.permissions))updates.permissions=req.body.permissions.map((x:any)=>String(x)).filter((x:string)=>FINANCE_PERMISSIONS.includes(x));if(req.body.blocked!==undefined)updates.blocked=Boolean(req.body.blocked);Object.assign(u,updates);await u.save();await recordCustomerCareAudit({req,action:"FINANCE_ACCOUNT_UPDATED",targetType:"FINANCE_USER",targetId:u._id,metadata:{fields:Object.keys(updates)}});return res.json({success:true,data:{id:u._id,name:u.name,email:u.email,username:u.username,phone:u.phone,employeeId:u.employeeId,department:u.department,role:u.role,status:u.blocked?"INACTIVE":"ACTIVE",permissions:u.permissions||[],createdAt:u.createdAt,lastLogin:u.lastLogin||null}});}catch(e){return res.status(500).json({success:false,message:"Unable to update Finance account"});}});
app.patch("/api/admin/finance/users/:id/status", auth, mainAdminOnly, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ success: false, message: "Finance account not found" });

    const rawBlocked = req.body?.blocked;
    const rawStatus = String(req.body?.status || "").trim().toUpperCase();
    const hasBlocked = rawBlocked !== undefined && rawBlocked !== null;
    const blocked = hasBlocked
      ? (rawBlocked === true || String(rawBlocked).toLowerCase() === "true")
      : rawStatus === "INACTIVE";

    const existing: any = await User.findOne({ _id: id, role: { $in: FINANCE_ROLES } })
      .select("_id name email role blocked")
      .lean();
    if (!existing) return res.status(404).json({ success: false, message: "Finance account not found" });

    const fresh: any = await User.findOneAndUpdate(
      { _id: existing._id, role: { $in: FINANCE_ROLES } },
      { $set: { blocked: Boolean(blocked) } },
      { new: true, runValidators: false }
    ).select("_id name email role blocked").lean();

    if (!fresh) return res.status(404).json({ success: false, message: "Finance account not found" });

    await recordCustomerCareAudit({
      req,
      action: fresh.blocked ? "FINANCE_ACCOUNT_DEACTIVATED" : "FINANCE_ACCOUNT_ACTIVATED",
      targetType: "FINANCE_USER",
      targetId: fresh._id,
      metadata: { status: fresh.blocked ? "INACTIVE" : "ACTIVE" },
    });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({
      success: true,
      message: fresh.blocked ? "Finance account deactivated" : "Finance account activated",
      data: { id: fresh._id, name: fresh.name, email: fresh.email, role: fresh.role, blocked: Boolean(fresh.blocked), status: fresh.blocked ? "INACTIVE" : "ACTIVE" },
    });
  } catch (error) {
    console.error("FINANCE STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update Finance status" });
  }
});
app.patch("/api/admin/finance/users/:id/permissions",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const u:any=await User.findOne({_id:req.params.id,role:{$in:FINANCE_ROLES}});if(!u)return res.status(404).json({success:false,message:"Finance account not found"});u.permissions=Array.isArray(req.body.permissions)?req.body.permissions.map((x:any)=>String(x)).filter((x:string)=>FINANCE_PERMISSIONS.includes(x)):[];await u.save();await recordCustomerCareAudit({req,action:"FINANCE_PERMISSIONS_UPDATED",targetType:"FINANCE_USER",targetId:u._id,metadata:{permissions:u.permissions}});return res.json({success:true,data:{permissions:u.permissions}});}catch(e){return res.status(500).json({success:false,message:"Unable to update permissions"});}});
app.patch("/api/admin/finance/users/:id/password",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const u:any=await User.findOne({_id:req.params.id,role:{$in:FINANCE_ROLES}});if(!u)return res.status(404).json({success:false,message:"Finance account not found"});const p=String(req.body.password||""),c=String(req.body.confirmPassword||p);if(p.length<8||p!==c)return res.status(400).json({success:false,message:"Password must be at least 8 characters and match confirmation"});u.password=await bcrypt.hash(p,10);u.forcePasswordChange=Boolean(req.body.forcePasswordChange);await u.save();await recordCustomerCareAudit({req,action:"FINANCE_PASSWORD_RESET",targetType:"FINANCE_USER",targetId:u._id,metadata:{forcePasswordChange:u.forcePasswordChange}});return res.json({success:true,message:"Finance password reset successfully"});}catch(e){return res.status(500).json({success:false,message:"Unable to reset Finance password"});}});

app.get("/api/admin/finance/settings",auth,mainAdminOnly,async(_req,res)=>{try{const d:any=await ensureFinanceSettings();return res.json({success:true,data:d});}catch(e){return res.status(500).json({success:false,message:"Unable to load Finance settings"});}});
app.patch("/api/admin/finance/settings",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const previous:any=await ensureFinanceSettings().then((x:any)=>x?.toObject?x.toObject():x);const patch:any={};if(req.body.requireMainAdminApproval!==undefined)patch.requireMainAdminApproval=Boolean(req.body.requireMainAdminApproval);if(req.body.refundApprovalThreshold!==undefined){const n=Number(req.body.refundApprovalThreshold);if(!Number.isFinite(n)||n<0)return res.status(400).json({success:false,message:"Invalid refund threshold"});patch.refundApprovalThreshold=n;}if(req.body.defaultPayout!==undefined){const n=Number(req.body.defaultPayout);if(!Number.isFinite(n)||n<0||n>10000)return res.status(400).json({success:false,message:"Invalid default payout"});patch.defaultPayout=n;}if(req.body.payoutSchedule!==undefined)patch.payoutSchedule=String(req.body.payoutSchedule).trim().slice(0,100);if(req.body.commissionRate!==undefined){const n=Number(req.body.commissionRate);if(!Number.isFinite(n)||n<0||n>100)return res.status(400).json({success:false,message:"Invalid commission rate"});patch.commissionRate=n;}if(Array.isArray(req.body.incentiveThresholds))patch.incentiveThresholds=req.body.incentiveThresholds.map((x:any)=>({minRating:Number(x.minRating),minDeliveries:Number(x.minDeliveries),amount:Number(x.amount)})).filter((x:any)=>Number.isFinite(x.minRating)&&x.minRating>=0&&x.minRating<=5&&Number.isFinite(x.minDeliveries)&&x.minDeliveries>=0&&Number.isFinite(x.amount)&&x.amount>=0);if(Array.isArray(req.body.permissions))patch.permissions=req.body.permissions.filter((x:any)=>FINANCE_PERMISSIONS.includes(String(x)));patch.updatedBy=req.user!.id;const d:any=await FinanceSettings.findOneAndUpdate({key:"default"},{$set:patch},{upsert:true,new:true,setDefaultsOnInsert:true});await DeliveryPayoutConfig.findOneAndUpdate({key:"default"},{$set:{defaultPayout:Number(d.defaultPayout||35),incentiveThresholds:Array.isArray(d.incentiveThresholds)?d.incentiveThresholds:[]}},{upsert:true,setDefaultsOnInsert:true});await recordEntityChange({req,action:"FINANCE_CONFIGURATION_CHANGED",targetType:"CONFIGURATION",targetId:"finance-settings",before:{requireMainAdminApproval:Boolean(previous?.requireMainAdminApproval),refundApprovalThreshold:Number(previous?.refundApprovalThreshold||0),defaultPayout:Number(previous?.defaultPayout||0),payoutSchedule:String(previous?.payoutSchedule||"Manual"),commissionRate:Number(previous?.commissionRate||0),incentiveThresholds:Array.isArray(previous?.incentiveThresholds)?previous.incentiveThresholds:[]},after:{requireMainAdminApproval:Boolean(d?.requireMainAdminApproval),refundApprovalThreshold:Number(d?.refundApprovalThreshold||0),defaultPayout:Number(d?.defaultPayout||0),payoutSchedule:String(d?.payoutSchedule||"Manual"),commissionRate:Number(d?.commissionRate||0),incentiveThresholds:Array.isArray(d?.incentiveThresholds)?d.incentiveThresholds:[]},reason:req.body?.reason||"Finance configuration updated"});return res.json({success:true,data:d});}catch(e){return res.status(400).json({success:false,message:"Unable to update Finance settings"});}});

app.get("/api/admin/finance/overview",auth,mainAdminOnly,async(_req,res)=>{try{const [refunds,payouts,incentives]=await Promise.all([FinancialTransaction.aggregate([{$match:{type:"REFUND"}},{$group:{_id:"$status",amount:{$sum:"$amount"},count:{$sum:1}}}]),FinancialTransaction.aggregate([{$match:{type:"DELIVERY_PAYOUT"}},{$group:{_id:"$status",amount:{$sum:"$amount"},count:{$sum:1}}}]),FinancialTransaction.aggregate([{$match:{type:"INCENTIVE"}},{$group:{_id:"$status",amount:{$sum:"$amount"},count:{$sum:1}}}])]);const sum=(a:any[])=>a.reduce((s,x)=>s+Number(x.amount||0),0);return res.json({success:true,data:{totalRefunds:sum(refunds),pendingRefunds:Number(refunds.find((x:any)=>x._id!=="COMPLETED")?.count||0),completedRefunds:Number(refunds.find((x:any)=>x._id==="COMPLETED")?.amount||0),deliveryPayout:sum(payouts),incentivePayout:sum(incentives),totalFinancialOutflow:sum(refunds)+sum(payouts)+sum(incentives)}});}catch(e){return res.status(500).json({success:false,message:"Unable to load financial overview"});}});
app.get("/api/admin/finance/audit-logs",auth,mainAdminOnly,async(_req,res)=>{try{const rows=await AuditLog.find({targetType:{$in:["FINANCE_USER","REFUND_REQUEST","ORDER","INCENTIVE","PAYOUT_BATCH","FINANCE_SETTINGS","FINANCE_REPORT"]}}).sort({createdAt:-1}).limit(500).populate("actor","name email role").lean();return res.json({success:true,data:rows});}catch(e){return res.status(500).json({success:false,message:"Unable to load Finance audit logs"});}});


/* =========================================================
   FINANCIAL OVERVIEW / STORE EARNINGS — additive APIs
   These endpoints are read-only reporting connections over the existing
   Order, RefundRequest and FinancialTransaction collections. No data is
   migrated, deleted or fabricated.
========================================================= */
const financeDateRange=(fromValue:any,toValue:any)=>{
  const now=new Date();
  const from=fromValue?new Date(String(fromValue)):new Date(now.getFullYear(),now.getMonth(),1);
  const to=toValue?new Date(String(toValue)):new Date(now);
  to.setHours(23,59,59,999);
  if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||from>to) throw new Error("Invalid date range");
  return {from,to};
};

const buildStoreFinancialSnapshot=async(storeId:any,from:Date,to:Date)=>{
  const oid=new mongoose.Types.ObjectId(String(storeId));
  const orderFilter:any={storeAdmin:oid,sourceType:"STORE",status:"Delivered",deliveredAt:{$gte:from,$lte:to}};
  const [orders,refunds,adjustmentRows,payoutRows]=await Promise.all([
    Order.find(orderFilter).select("_id subtotal discount total deliveryCharge commissionRate commissionAmount storeGrossSales storeEarnings deliveredAt sourceType").lean(),
    RefundRequest.find({storeId:oid,status:"COMPLETED",processedAt:{$gte:from,$lte:to}}).select("_id approvedAmount amount processedAt").lean(),
    FinancialTransaction.find({storeAdmin:oid,type:"ADJUSTMENT",status:{$in:["COMPLETED","PAID"]},createdAt:{$gte:from,$lte:to}}).select("direction amount createdAt").lean(),
    FinancialTransaction.find({storeAdmin:oid,type:"STORE_PAYOUT",status:{ $in:["COMPLETED","PAID"]},createdAt:{$gte:from,$lte:to}}).select("amount createdAt").lean()
  ]);
  const grossSales=orders.reduce((s:any,o:any)=>s+Number(o.storeGrossSales??o.subtotal??0),0);
  const sales=orders.reduce((s:any,o:any)=>s+Number(o.total??0),0);
  const discounts=orders.reduce((s:any,o:any)=>s+Number(o.discount??0),0);
  const commission=orders.reduce((s:any,o:any)=>s+Number(o.commissionAmount||0),0);
  const deliveryRevenue=orders.reduce((s:any,o:any)=>s+Number(o.deliveryCharge||0),0);
  const refundAmount=refunds.reduce((s:any,r:any)=>s+Number(r.approvedAmount??r.amount??0),0);
  const adjustmentIn=adjustmentRows.filter((x:any)=>x.direction==="INFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
  const adjustmentOut=adjustmentRows.filter((x:any)=>x.direction==="OUTFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
  const paidPayout=payoutRows.reduce((s:any,x:any)=>s+Number(x.amount||0),0);
  const netSales=Math.max(0,grossSales-refundAmount);
  const earnings=Math.max(0,netSales-commission-adjustmentOut+adjustmentIn);
  const todayStart=new Date();todayStart.setHours(0,0,0,0);
  const todaySales=orders.filter((o:any)=>new Date(o.deliveredAt||0)>=todayStart).reduce((s:any,o:any)=>s+Number(o.total||0),0);
  const series:any[]=[];
  for(let cursor=new Date(from);cursor<=to;cursor.setDate(cursor.getDate()+1)){
    const day=new Date(cursor);day.setHours(0,0,0,0);const next=new Date(day);next.setDate(next.getDate()+1);
    const inDay=(d:any)=>{const x=new Date(d||0);return x>=day&&x<next;};
    const dayOrders=orders.filter((o:any)=>inDay(o.deliveredAt));
    const dayRefunds=refunds.filter((r:any)=>inDay(r.processedAt));
    const dayAdjust=adjustmentRows.filter((x:any)=>inDay(x.createdAt));
    const dayPayouts=payoutRows.filter((x:any)=>inDay(x.createdAt));
    const daySales=dayOrders.reduce((s:any,o:any)=>s+Number(o.total||0),0);
    const dayCommission=dayOrders.reduce((s:any,o:any)=>s+Number(o.commissionAmount||0),0);
    const dayDeliveryRevenue=dayOrders.reduce((s:any,o:any)=>s+Number(o.deliveryCharge||0),0);
    const dayRefund=dayRefunds.reduce((s:any,r:any)=>s+Number(r.approvedAmount??r.amount??0),0);
    const dayIn=dayAdjust.filter((x:any)=>x.direction==="INFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const dayOut=dayAdjust.filter((x:any)=>x.direction==="OUTFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const dayPayout=dayPayouts.reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const income=dayCommission+dayDeliveryRevenue+dayIn;
    const expenses=dayRefund+dayPayout+dayOut;
    series.push({date:day.toISOString().slice(0,10),label:day.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),sales:daySales,income,expenses,profit:income-expenses});
  }
  return {orders,metrics:{todaySales,salesInPeriod:sales,grossSales,discounts,netSales,refunds:refundAmount,commission,adjustments:adjustmentIn-adjustmentOut,storeEarnings:earnings,pendingPayout:Math.max(0,earnings-paidPayout),paidPayout,deliveryRevenue,ordersCount:orders.length},series};
};


const buildPeakHourBuckets=(orders:any[])=>{
  const orderHours=Array.from({length:24},()=>0);
  const deliveryHours=Array.from({length:24},()=>0);
  const weekdays=Array.from({length:7},()=>0);
  const weekdayNames=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const hourDate=(value:any)=>{const d=new Date(value||0);if(Number.isNaN(d.getTime()))return null;const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kolkata",hour:"2-digit",hourCycle:"h23",weekday:"short"}).formatToParts(d);const hour=Number(parts.find((p:any)=>p.type==="hour")?.value);const wd=parts.find((p:any)=>p.type==="weekday")?.value||"";const wi=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wd);return {hour,weekday:wi};};
  for(const o of orders){
    const created=hourDate(o.createdAt);if(created&&created.hour>=0&&created.hour<24){orderHours[created.hour]++;if(created.weekday>=0)weekdays[created.weekday]++;}
    const delivery=hourDate(o.deliveryStartedAt||o.deliveredAt);if(delivery&&delivery.hour>=0&&delivery.hour<24)deliveryHours[delivery.hour]++;
  }
  const peak=(arr:number[])=>{const max=Math.max(0,...arr);return arr.map((count,hour)=>({hour,count,label:`${String(hour).padStart(2,"0")}:00–${String((hour+1)%24).padStart(2,"0")}:00`,intensity:max?Number((count/max).toFixed(3)):0})).sort((x,y)=>y.count-x.count||x.hour-y.hour);};
  const orderRanked=peak(orderHours),deliveryRanked=peak(deliveryHours);
  return {
    orderHourly:orderRanked.slice().sort((x,y)=>x.hour-y.hour),
    deliveryHourly:deliveryRanked.slice().sort((x,y)=>x.hour-y.hour),
    peakOrderHours:orderRanked.slice(0,5),
    peakDeliveryHours:deliveryRanked.slice(0,5),
    weekdays:weekdays.map((count,i)=>({day:i,name:weekdayNames[i],count})),
    peakOrderHour:orderRanked[0]||null,
    peakDeliveryHour:deliveryRanked[0]||null,
  };
};

app.get("/api/admin/peak-hour-detection",auth,mainAdminOnly,async(req:AuthRequest,res)=>{
  try{
    const now=new Date();const fromRaw=String(req.query.from||"").trim();const toRaw=String(req.query.to||"").trim();
    const from=fromRaw&&!Number.isNaN(new Date(fromRaw).getTime())?new Date(fromRaw):new Date(now.getTime()-30*24*60*60*1000);
    const to=toRaw&&!Number.isNaN(new Date(toRaw).getTime())?new Date(toRaw):now;if(from>to)return res.status(400).json({success:false,message:"Invalid date range"});
    const requestedStore=String(req.query.storeAdminId||"").trim();const filter:any={createdAt:{$gte:from,$lte:to},status:{$nin:["Cancelled","CANCELLED","Rejected","REJECTED"]}};if(requestedStore)filter.storeAdmin=requestedStore;
    const orders:any[]=await Order.find(filter).select("_id createdAt deliveryStartedAt deliveredAt status storeAdmin").lean();
    const buckets=buildPeakHourBuckets(orders);
    const storeRows:any[]=requestedStore?[]:await StoreLocation.find({}).select("storeAdmin name").lean();
    return res.json({success:true,data:{from:from.toISOString(),to:to.toISOString(),timezone:"Asia/Kolkata",orders:orders.length,deliveryEvents:orders.filter((o:any)=>o.deliveryStartedAt||o.deliveredAt).length,...buckets,stores:storeRows.map((x:any)=>({storeAdminId:String(x.storeAdmin||""),name:x.name||"FreshBasket Store"})).filter((x:any)=>x.storeAdminId)}});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to detect peak hours"});}
});

app.get("/api/store-admin/peak-hour-detection",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const owner=await getTenantAdminId(req);const now=new Date();const fromRaw=String(req.query.from||"").trim();const toRaw=String(req.query.to||"").trim();
    const from=fromRaw&&!Number.isNaN(new Date(fromRaw).getTime())?new Date(fromRaw):new Date(now.getTime()-30*24*60*60*1000);const to=toRaw&&!Number.isNaN(new Date(toRaw).getTime())?new Date(toRaw):now;if(from>to)return res.status(400).json({success:false,message:"Invalid date range"});
    const orders:any[]=await Order.find({createdAt:{$gte:from,$lte:to},status:{$nin:["Cancelled","CANCELLED","Rejected","REJECTED"]},$or:[{storeAdmin:owner},{storeAdmin:String(owner)}]}).select("_id createdAt deliveryStartedAt deliveredAt status storeAdmin").lean();
    const buckets=buildPeakHourBuckets(orders);return res.json({success:true,data:{from:from.toISOString(),to:to.toISOString(),timezone:"Asia/Kolkata",orders:orders.length,deliveryEvents:orders.filter((o:any)=>o.deliveryStartedAt||o.deliveredAt).length,...buckets}});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to detect peak hours"});}
});

app.get("/api/admin/delivery-heatmap",auth,mainAdminOnly,async(req:AuthRequest,res)=>{
  try{
    const now=new Date();
    const fromRaw=String(req.query.from||"").trim();
    const toRaw=String(req.query.to||"").trim();
    const from=fromRaw&& !Number.isNaN(new Date(fromRaw).getTime())?new Date(fromRaw):new Date(now.getTime()-30*24*60*60*1000);
    const to=toRaw&& !Number.isNaN(new Date(toRaw).getTime())?new Date(toRaw):now;
    if(from>to)return res.status(400).json({success:false,message:"Invalid date range"});
    const requestedStore=String(req.query.storeAdminId||"").trim();
    const storeFilter=requestedStore?{storeAdmin:requestedStore}:{};
    const orders:any[]=await Order.find({createdAt:{$gte:from,$lte:to},status:{$nin:["Cancelled","CANCELLED","Rejected","REJECTED"]},...storeFilter})
      .select("_id orderId storeAdmin status createdAt updatedAt deliveredAt deliveryPartner address deliveryLocation").lean();
    const bucketSize=0.005;
    const cells=new Map<string,any>();
    let mappedOrders=0,unmappedOrders=0,completedDeliveries=0,activeDeliveries=0;
    for(const order of orders){
      const delivered=String(order.status||"").toLowerCase()==="delivered"||Boolean(order.deliveredAt);
      if(delivered)completedDeliveries++;else if(order.deliveryPartner)activeDeliveries++;
      let destination:any=null;
      try{destination=await resolveDeliveryDestination(order);}catch{}
      if(!destination||!isValidGeo(destination.latitude,destination.longitude)){unmappedOrders++;continue;}
      mappedOrders++;
      const lat=Number(destination.latitude),lng=Number(destination.longitude);
      const cellLat=Math.floor(lat/bucketSize)*bucketSize+bucketSize/2;
      const cellLng=Math.floor(lng/bucketSize)*bucketSize+bucketSize/2;
      const key=`${cellLat.toFixed(5)}:${cellLng.toFixed(5)}`;
      const c=cells.get(key)||{id:key,latitude:Number(cellLat.toFixed(5)),longitude:Number(cellLng.toFixed(5)),deliveryCount:0,completedDeliveries:0,activeDeliveries:0,orderIds:[]};
      c.deliveryCount++;if(delivered)c.completedDeliveries++;else if(order.deliveryPartner)c.activeDeliveries++;
      if(c.orderIds.length<20)c.orderIds.push(String(order._id));
      cells.set(key,c);
    }
    const max=Math.max(1,...[...cells.values()].map((c:any)=>c.deliveryCount));
    const rows=[...cells.values()].map(c=>({id:c.id,latitude:c.latitude,longitude:c.longitude,deliveryCount:c.deliveryCount,completedDeliveries:c.completedDeliveries,activeDeliveries:c.activeDeliveries,intensity:Math.min(1,c.deliveryCount/max),orderIds:c.orderIds}));
    const partnerIds=[...new Set(orders.filter(o=>o.deliveryPartner&&!String(o.status||"").toLowerCase().includes("cancel")).map(o=>String(o.deliveryPartner)))];
    const partners:any[]=partnerIds.length?await User.find({_id:{$in:partnerIds},role:"delivery",blocked:{$ne:true}}).select("_id name employeeId latitude longitude locationUpdatedAt locationAccuracy onlineStatus availabilityStatus").lean():[];
    const activePartnerRows=partners.filter(p=>isValidGeo(p.latitude,p.longitude)).map(p=>({partnerId:p._id,name:p.name||"Delivery Partner",employeeId:p.employeeId||null,latitude:Number(p.latitude),longitude:Number(p.longitude),locationUpdatedAt:p.locationUpdatedAt||null,locationAccuracy:p.locationAccuracy??null,onlineStatus:p.onlineStatus||null,availabilityStatus:p.availabilityStatus||null}));
    const storeLocations:any[]=await StoreLocation.find({}).select("storeAdmin key name address latitude longitude").lean();
    const stores=storeLocations.filter((st:any)=>st.name||st.storeAdmin||st.key).map((st:any)=>({storeAdminId:String(st.storeAdmin||st.key||""),name:st.name||"FreshBasket Store",address:st.address||"",latitude:st.latitude??null,longitude:st.longitude??null})).filter((st:any)=>st.storeAdminId);
    const center=rows.length?rows.reduce((a,c)=>({latitude:a.latitude+c.latitude,longitude:a.longitude+c.longitude}),{latitude:0,longitude:0}):activePartnerRows.length?activePartnerRows.reduce((a,c)=>({latitude:a.latitude+c.latitude,longitude:a.longitude+c.longitude}),{latitude:0,longitude:0}):null;
    if(center){const n=rows.length||activePartnerRows.length;center.latitude/=n;center.longitude/=n;}
    return res.json({success:true,data:{from:from.toISOString(),to:to.toISOString(),bucketSizeKm:0.5,orders:orders.length,deliveryCount:mappedOrders,mappedOrders,unmappedOrders,completedDeliveries,activeDeliveries,cells:rows,partners:activePartnerRows,stores,center}});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to load delivery heatmap"});}
});

app.get("/api/store-admin/delivery-heatmap",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const owner=await getTenantAdminId(req);
    const now=new Date();
    const fromRaw=String(req.query.from||"").trim();const toRaw=String(req.query.to||"").trim();
    const from=fromRaw&& !Number.isNaN(new Date(fromRaw).getTime())?new Date(fromRaw):new Date(now.getTime()-30*24*60*60*1000);
    const to=toRaw&& !Number.isNaN(new Date(toRaw).getTime())?new Date(toRaw):now;
    if(from>to)return res.status(400).json({success:false,message:"Invalid date range"});
    const orders:any[]=await Order.find({createdAt:{$gte:from,$lte:to},status:{$nin:["Cancelled","CANCELLED","Rejected","REJECTED"]},$or:[{storeAdmin:owner},{storeAdmin:String(owner)}]})
      .select("_id orderId status createdAt updatedAt deliveredAt deliveryPartner address deliveryLocation").lean();
    const bucketSize=0.005;const cells=new Map<string,any>();let mappedOrders=0,unmappedOrders=0,completedDeliveries=0,activeDeliveries=0;
    for(const order of orders){const delivered=String(order.status||"").toLowerCase()==="delivered"||Boolean(order.deliveredAt);if(delivered)completedDeliveries++;else if(order.deliveryPartner)activeDeliveries++;let destination:any=null;try{destination=await resolveDeliveryDestination(order);}catch{}if(!destination||!isValidGeo(destination.latitude,destination.longitude)){unmappedOrders++;continue;}mappedOrders++;const lat=Number(destination.latitude),lng=Number(destination.longitude);const cellLat=Math.floor(lat/bucketSize)*bucketSize+bucketSize/2,cellLng=Math.floor(lng/bucketSize)*bucketSize+bucketSize/2,key=`${cellLat.toFixed(5)}:${cellLng.toFixed(5)}`;const c=cells.get(key)||{id:key,latitude:Number(cellLat.toFixed(5)),longitude:Number(cellLng.toFixed(5)),deliveryCount:0,completedDeliveries:0,activeDeliveries:0};c.deliveryCount++;if(delivered)c.completedDeliveries++;else if(order.deliveryPartner)c.activeDeliveries++;cells.set(key,c);}
    const max=Math.max(1,...[...cells.values()].map((c:any)=>c.deliveryCount));
    const rows=[...cells.values()].map(c=>({id:c.id,latitude:c.latitude,longitude:c.longitude,deliveryCount:c.deliveryCount,completedDeliveries:c.completedDeliveries,activeDeliveries:c.activeDeliveries,intensity:Math.min(1,c.deliveryCount/max)}));
    const partnerIds=[...new Set(orders.filter(o=>o.deliveryPartner).map(o=>String(o.deliveryPartner)))];
    const partners:any[]=partnerIds.length?await User.find({_id:{$in:partnerIds},role:"delivery",blocked:{$ne:true}}).select("_id name employeeId latitude longitude locationUpdatedAt locationAccuracy onlineStatus availabilityStatus").lean():[];
    const activePartnerRows=partners.filter(p=>isValidGeo(p.latitude,p.longitude)).map(p=>({partnerId:p._id,name:p.name||"Delivery Partner",employeeId:p.employeeId||null,latitude:Number(p.latitude),longitude:Number(p.longitude),locationUpdatedAt:p.locationUpdatedAt||null,locationAccuracy:p.locationAccuracy??null,onlineStatus:p.onlineStatus||null,availabilityStatus:p.availabilityStatus||null}));
    const center=rows.length?rows.reduce((a,c)=>({latitude:a.latitude+c.latitude,longitude:a.longitude+c.longitude}),{latitude:0,longitude:0}):activePartnerRows.length?activePartnerRows.reduce((a,c)=>({latitude:a.latitude+c.latitude,longitude:a.longitude+c.longitude}),{latitude:0,longitude:0}):null;if(center){const n=rows.length||activePartnerRows.length;center.latitude/=n;center.longitude/=n;}
    return res.json({success:true,data:{from:from.toISOString(),to:to.toISOString(),bucketSizeKm:0.5,orders:orders.length,deliveryCount:mappedOrders,mappedOrders,unmappedOrders,completedDeliveries,activeDeliveries,cells:rows,partners:activePartnerRows,center}});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to load delivery heatmap"});}
});

app.get("/api/admin/store-demand-heatmap",auth,mainAdminOnly,async(req:AuthRequest,res)=>{
  try{
    const now=new Date();
    const fromRaw=String(req.query.from||"").trim();
    const toRaw=String(req.query.to||"").trim();
    const from=fromRaw&& !Number.isNaN(new Date(fromRaw).getTime()) ? new Date(fromRaw) : new Date(now.getTime()-30*24*60*60*1000);
    const to=toRaw&& !Number.isNaN(new Date(toRaw).getTime()) ? new Date(toRaw) : now;
    if(from>to)return res.status(400).json({success:false,message:"Invalid date range"});
    const mainId=await getMainAdminId();
    const requestedStore=String(req.query.storeAdminId||"").trim();
    const storeFilter=requestedStore ? {storeAdmin:requestedStore} : {};
    const orders:any[]=await Order.find({createdAt:{$gte:from,$lte:to},status:{$nin:["Cancelled","CANCELLED","Rejected","REJECTED"]},...storeFilter})
      .select("_id orderId storeAdmin createdAt status address deliveryLocation customer")
      .lean();
    const ownerIds=[...new Set(orders.map(o=>String(o.storeAdmin||mainId||"")).filter(Boolean))];
    const stores:any[]=ownerIds.length?await StoreLocation.find({$or:ownerIds.flatMap(id=>[{storeAdmin:id},{key:id}])}).select("storeAdmin key name address latitude longitude").lean():[];
    const mainStore:any=await StoreLocation.findOne({key:"main"}).select("storeAdmin key name address latitude longitude").lean();
    const storeByOwner=new Map<string,any>();
    for(const st of stores){const owner=String(st.storeAdmin||st.key||"");if(owner&&!storeByOwner.has(owner)&&isValidGeo(st.latitude,st.longitude))storeByOwner.set(owner,st);}
    if(mainStore&&isValidGeo(mainStore.latitude,mainStore.longitude)){const owner=String(mainStore.storeAdmin||mainId||"main");if(!storeByOwner.has(owner))storeByOwner.set(owner,mainStore);}
    const bucketSize=0.005;
    const cells=new Map<string,any>();
    const storeStats=new Map<string,any>();
    let mappedOrders=0,unmappedOrders=0;
    for(const order of orders){
      const owner=String(order.storeAdmin||mainId||"");
      const store=storeByOwner.get(owner)||null;
      const st=storeStats.get(owner)||{storeAdminId:owner||null,name:store?.name||"FreshBasket Store",address:store?.address||"",latitude:store?.latitude??null,longitude:store?.longitude??null,orders:0,mappedOrders:0,unmappedOrders:0};
      st.orders+=1;
      let destination:any=null;
      try{destination=await resolveDeliveryDestination(order);}catch{}
      if(!destination||!isValidGeo(destination.latitude,destination.longitude)){st.unmappedOrders+=1;storeStats.set(owner,st);unmappedOrders++;continue;}
      mappedOrders++;st.mappedOrders+=1;storeStats.set(owner,st);
      const lat=Number(destination.latitude),lng=Number(destination.longitude);
      const cellLat=Math.floor(lat/bucketSize)*bucketSize+bucketSize/2;
      const cellLng=Math.floor(lng/bucketSize)*bucketSize+bucketSize/2;
      const key=`${owner}:${cellLat.toFixed(5)}:${cellLng.toFixed(5)}`;
      const c=cells.get(key)||{id:key,storeAdminId:owner||null,latitude:Number(cellLat.toFixed(5)),longitude:Number(cellLng.toFixed(5)),orderCount:0,customerIds:new Set<string>()};
      c.orderCount+=1;if(order.customer)c.customerIds.add(String(order.customer));cells.set(key,c);
    }
    const cellRows=Array.from(cells.values()).map((c:any)=>{const {customerIds,...row}=c;return {...row,uniqueCustomers:customerIds.size,intensity:Math.min(1,c.orderCount/Math.max(1,...Array.from(cells.values()).map((x:any)=>x.orderCount)))};});
    const storeRows=[...storeStats.values()].sort((a,b)=>b.orders-a.orders);
    return res.json({success:true,data:{from:from.toISOString(),to:to.toISOString(),bucketSizeKm:0.5,orders:orders.length,mappedOrders,unmappedOrders,cells:cellRows,stores:storeRows,center:storeRows.find((s:any)=>isValidGeo(s.latitude,s.longitude))||null}});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to load store demand heatmap"});}
});

app.get("/api/store-admin/store-demand-heatmap",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const owner=await getTenantAdminId(req);
    const now=new Date();
    const fromRaw=String(req.query.from||"").trim();const toRaw=String(req.query.to||"").trim();
    const from=fromRaw&& !Number.isNaN(new Date(fromRaw).getTime())?new Date(fromRaw):new Date(now.getTime()-30*24*60*60*1000);
    const to=toRaw&& !Number.isNaN(new Date(toRaw).getTime())?new Date(toRaw):now;
    if(from>to)return res.status(400).json({success:false,message:"Invalid date range"});
    const orders:any[]=await Order.find({createdAt:{$gte:from,$lte:to},status:{$nin:["Cancelled","CANCELLED","Rejected","REJECTED"]},$or:[{storeAdmin:owner},{storeAdmin:String(owner)}]}).select("_id orderId storeAdmin createdAt status address deliveryLocation customer").lean();
    const store:any=await getStoreLocationForOwner(owner);
    const bucketSize=0.005;const cells=new Map<string,any>();let mappedOrders=0,unmappedOrders=0;
    for(const order of orders){let destination:any=null;try{destination=await resolveDeliveryDestination(order);}catch{}if(!destination||!isValidGeo(destination.latitude,destination.longitude)){unmappedOrders++;continue;}mappedOrders++;const lat=Number(destination.latitude),lng=Number(destination.longitude);const cellLat=Math.floor(lat/bucketSize)*bucketSize+bucketSize/2,cellLng=Math.floor(lng/bucketSize)*bucketSize+bucketSize/2,key=`${cellLat.toFixed(5)}:${cellLng.toFixed(5)}`;const c=cells.get(key)||{id:key,storeAdminId:String(owner),latitude:Number(cellLat.toFixed(5)),longitude:Number(cellLng.toFixed(5)),orderCount:0,uniqueCustomerIds:new Set<string>()};c.orderCount++;if(order.customer)c.uniqueCustomerIds.add(String(order.customer));cells.set(key,c);}
    const max=Math.max(1,...[...cells.values()].map((c:any)=>c.orderCount));
    const rows=[...cells.values()].map((c:any)=>({id:c.id,storeAdminId:c.storeAdminId,latitude:c.latitude,longitude:c.longitude,orderCount:c.orderCount,uniqueCustomers:c.uniqueCustomerIds.size,intensity:Math.min(1,c.orderCount/max)}));
    return res.json({success:true,data:{from:from.toISOString(),to:to.toISOString(),bucketSizeKm:0.5,orders:orders.length,mappedOrders,unmappedOrders,cells:rows,stores:[{storeAdminId:String(owner),name:store?.name||"FreshBasket Store",address:store?.address||"",latitude:store?.latitude??null,longitude:store?.longitude??null,orders:orders.length,mappedOrders,unmappedOrders}],center:store||null}});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to load store demand heatmap"});}
});

app.get("/api/store-admin/financial-overview",auth,role("admin"),async(req:AuthRequest,res)=>{
  try{
    const mainId=await getMainAdminId();
    if(String(req.user!.id)===String(mainId||"")) return res.status(403).json({success:false,message:"Use Main Admin financial overview for global data"});
    const {from,to}=financeDateRange(req.query.from,req.query.to);
    const snapshot=await buildStoreFinancialSnapshot(req.user!.id,from,to);
    return res.json({success:true,data:{from,to,storeAdminId:req.user!.id,...snapshot.metrics,orders:snapshot.orders,series:snapshot.series}});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to load Store financial overview"});}
});

app.get("/api/admin/financial-overview",auth,mainAdminOnly,async(req,res)=>{
  try{
    const {from,to}=financeDateRange(req.query.from,req.query.to);
    const storeId=String(req.query.storeAdminId||"").trim();
    const storeFilter:any=storeId&&mongoose.Types.ObjectId.isValid(storeId)?{storeAdmin:new mongoose.Types.ObjectId(storeId),sourceType:"STORE",status:"Delivered",deliveredAt:{$gte:from,$lte:to}}:{status:"Delivered",deliveredAt:{$gte:from,$lte:to}};
    const [orders,refunds,txs,stores]=await Promise.all([
      Order.find(storeFilter).select("_id storeAdmin sourceType subtotal discount total deliveryCharge commissionAmount commissionRate deliveredAt").lean(),
      RefundRequest.find({status:"COMPLETED",processedAt:{$gte:from,$lte:to},...(storeId&&mongoose.Types.ObjectId.isValid(storeId)?{storeId:new mongoose.Types.ObjectId(storeId)}:{})}).select("_id storeId approvedAmount amount processedAt").lean(),
      FinancialTransaction.find({createdAt:{$gte:from,$lte:to},status:{$in:["COMPLETED","PAID"]}}).select("type direction amount storeAdmin order customer deliveryPartner createdAt referenceId transactionId").lean(),
      User.find({role:"admin",blocked:{$ne:true}}).select("_id name email employeeId").sort({name:1}).lean()
    ]);
    const completedRefund=refunds.reduce((s:any,r:any)=>s+Number(r.approvedAmount??r.amount??0),0);
    const totalSales=orders.reduce((s:any,o:any)=>s+Number(o.total||0),0);
    const grossSales=orders.reduce((s:any,o:any)=>s+Number(o.subtotal||0),0);
    const netSales=Math.max(0,grossSales-completedRefund);
    const storeOrders=orders.filter((o:any)=>String(o.sourceType||"")==="STORE");
    const storeRevenue=storeOrders.reduce((s:any,o:any)=>s+Number(o.total||0),0);
    const commissionIncome=orders.reduce((s:any,o:any)=>s+Number(o.commissionAmount||0),0);
    const deliveryRevenue=orders.reduce((s:any,o:any)=>s+Number(o.deliveryCharge||0),0);
    const adjustmentsIn=txs.filter((x:any)=>x.type==="ADJUSTMENT"&&x.direction==="INFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const adjustmentsOut=txs.filter((x:any)=>x.type==="ADJUSTMENT"&&x.direction==="OUTFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const storePayouts=txs.filter((x:any)=>x.type==="STORE_PAYOUT").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const deliveryPayouts=txs.filter((x:any)=>x.type==="DELIVERY_PAYOUT").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const incentives=txs.filter((x:any)=>x.type==="INCENTIVE").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
    const totalIncome=commissionIncome+deliveryRevenue+adjustmentsIn;
    // No separate expense module exists in the current architecture. Do not
    // manufacture an "expense" figure from arbitrary adjustment notes. Refunds,
    // payouts and incentives are real recorded financial outflows.
    const totalExpenses=completedRefund+storePayouts+deliveryPayouts+incentives;
    const netProfit=totalIncome-totalExpenses;
    const storeWise:any[]=await Promise.all(stores.map(async(st:any)=>{const x=await buildStoreFinancialSnapshot(st._id,from,to);return {storeId:st._id,name:st.name,employeeId:st.employeeId,...x.metrics};}));
    const series:any[]=[];
    for(let cursor=new Date(from);cursor<=to;cursor.setDate(cursor.getDate()+1)){
      const day=new Date(cursor);day.setHours(0,0,0,0);const next=new Date(day);next.setDate(next.getDate()+1);
      const inDay=(d:any)=>{const x=new Date(d||0);return x>=day&&x<next;};
      const dayOrders=orders.filter((o:any)=>inDay(o.deliveredAt));
      const dayRefunds=refunds.filter((r:any)=>inDay(r.processedAt));
      const dayTx=txs.filter((x:any)=>inDay(x.createdAt));
      const sales=dayOrders.reduce((s:any,o:any)=>s+Number(o.total||0),0);
      const commission=dayOrders.reduce((s:any,o:any)=>s+Number(o.commissionAmount||0),0);
      const delivery=dayOrders.reduce((s:any,o:any)=>s+Number(o.deliveryCharge||0),0);
      const refund=dayRefunds.reduce((s:any,r:any)=>s+Number(r.approvedAmount??r.amount??0),0);
      const adjIn=dayTx.filter((x:any)=>x.type==="ADJUSTMENT"&&x.direction==="INFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
      const adjOut=dayTx.filter((x:any)=>x.type==="ADJUSTMENT"&&x.direction==="OUTFLOW").reduce((s:any,x:any)=>s+Number(x.amount||0),0);
      const payout=dayTx.filter((x:any)=>["STORE_PAYOUT","DELIVERY_PAYOUT","INCENTIVE"].includes(x.type)).reduce((s:any,x:any)=>s+Number(x.amount||0),0);
      const income=commission+delivery+adjIn;const expenses=refund+payout;
      series.push({date:day.toISOString().slice(0,10),label:day.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),sales,income,expenses,profit:income-expenses});
    }
    return res.json({success:true,data:{from,to,filters:{storeAdminId:storeId||null},sales:{totalSales,grossSales,netSales,orders:orders.length,storeRevenue},income:{commissionIncome,deliveryRevenue,otherConfiguredIncome:adjustmentsIn,totalIncome},expenses:{recordedExpenses:0,refunds:completedRefund,storePayouts,deliveryPayouts,incentives,totalExpenses,adjustments:adjustmentsOut},profit:{netProfit,expensesAvailable:true},storeWise,series}});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to load global financial overview"});}
});

app.get("/api/admin/financial-overview/stores",auth,mainAdminOnly,async(req,res)=>{
  try{
    const {from,to}=financeDateRange(req.query.from,req.query.to);
    const stores:any[]=await User.find({role:"admin",blocked:{$ne:true}}).select("_id name email employeeId").sort({name:1}).lean();
    const rows=await Promise.all(stores.map(async(st:any)=>{const x=await buildStoreFinancialSnapshot(st._id,from,to);return {storeId:st._id,name:st.name,email:st.email,employeeId:st.employeeId,...x.metrics};}));
    return res.json({success:true,data:{from,to,rows}});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to load store financials"});}
});

app.get("/api/finance/dashboard",auth,financeAuth,async(req:AuthRequest,res)=>{
  try {
    const fu:any=(req as any).financeUser||{};
    const isManager=fu.role==="finance_manager";
    const perms= isManager ? FINANCE_PERMISSIONS : (Array.isArray(fu.permissions)?fu.permissions:[]);
    const allow=(p:string)=>perms.includes(p);
    const financeUserId=req.user!.id;

    // Finance Executive work is assignment-scoped for refunds. Payouts and
    // incentives remain shared operational queues because those records do not
    // carry a financeEmployee assignment in the existing data model.
    const refundScope:any=isManager?{}:{$or:[{financeEmployee:financeUserId},{assignedFinance:financeUserId}]};
    const assignedRefundIds:any[]=allow("FINANCE_VIEW_REFUNDS")
      ? await RefundRequest.find(refundScope).select("_id").lean()
      : [];
    const assignedRefundIdStrings=assignedRefundIds.map((x:any)=>String(x._id));

    const refundMatch:any=allow("FINANCE_VIEW_REFUNDS")?refundScope:{_id:null};
    const payoutMatch:any=allow("FINANCE_VIEW_PAYOUTS")
      ? {deliveryPartner:{$ne:null},status:"Delivered",deliveryPayoutStatus:{$in:["PENDING","ELIGIBLE","FINALIZED","PAID","PROCESSING","ON_HOLD","FAILED","CANCELLED"]}}
      : {_id:null};
    const incentiveMatch:any=allow("FINANCE_VIEW_INCENTIVES")?{}:{_id:null};

    const [refundCounts,payoutCounts,incentiveCounts]=await Promise.all([
      RefundRequest.aggregate([
        {$match:refundMatch},
        {$group:{_id:"$status",count:{$sum:1},amount:{$sum:{$ifNull:["$approvedAmount","$amount"]}}}}
      ]),
      Order.aggregate([
        {$match:payoutMatch},
        {$group:{_id:"$deliveryPayoutStatus",count:{$sum:1},amount:{$sum:{$add:[{$ifNull:["$deliveryPayout",0]},{$ifNull:["$performanceIncentive",0]}]}}}}
      ]),
      Incentive.aggregate([
        {$match:incentiveMatch},
        {$group:{_id:"$status",count:{$sum:1},amount:{$sum:{$ifNull:["$approvedAmount","$eligibleAmount"]}}}}
      ])
    ]);

    const map=(a:any[])=>Object.fromEntries(a.map(x=>[String(x._id),x]));
    const rm=map(refundCounts),pm=map(payoutCounts),im=map(incentiveCounts);
    const count=(m:any,statuses:string[])=>statuses.reduce((n:number,s:string)=>n+Number(m[s]?.count||0),0);

    // Completed/paid financial activity is authoritative from the existing
    // FinancialTransaction ledger. The completedAt field is preferred for
    // business-day/month reporting, falling back to createdAt for legacy rows.
    const transactionBase:any={
      type:{$in:["REFUND","DELIVERY_PAYOUT","INCENTIVE"]}
    };
    const transactionScope:any={...transactionBase};
    const txOr:any[]=[];
    if(allow("FINANCE_VIEW_REFUNDS")){
      if(isManager) txOr.push({type:"REFUND"});
      else txOr.push({type:"REFUND",referenceId:{$in:assignedRefundIdStrings}});
    }
    if(allow("FINANCE_VIEW_PAYOUTS")) txOr.push({type:"DELIVERY_PAYOUT"});
    if(allow("FINANCE_VIEW_INCENTIVES")) txOr.push({type:"INCENTIVE"});
    if(allow("FINANCE_VIEW_PAYOUTS")) txOr.push({type:"STORE_PAYOUT"});
    if(allow("FINANCE_VIEW_REPORTS")) txOr.push({type:"COMMISSION"});
    if(!txOr.length) txOr.push({_id:null});
    transactionScope.$or=txOr;

    const txMatchCompleted={...transactionScope,status:{$in:["COMPLETED","PAID"]}};
    const now=new Date();
    const day=new Date(now); day.setHours(0,0,0,0);
    const month=new Date(now.getFullYear(),now.getMonth(),1);
    const nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1);
    const dateExpr={$ifNull:["$completedAt","$createdAt"]};
    const [todayRows,monthlyRows,visibleActivities]=await Promise.all([
      FinancialTransaction.aggregate([
        {$match:txMatchCompleted},
        {$match:{$expr:{$and:[{$gte:[dateExpr,day]},{$lt:[dateExpr,new Date(day.getTime()+86400000)]}]}}},
        {$group:{_id:"$type",amount:{$sum:"$amount"}}}
      ]),
      FinancialTransaction.aggregate([
        {$match:txMatchCompleted},
        {$match:{$expr:{$and:[{$gte:[dateExpr,month]},{$lt:[dateExpr,nextMonth]}]}}},
        {$group:{_id:"$type",amount:{$sum:"$amount"}}}
      ]),
      FinancialTransaction.find(transactionScope).sort({createdAt:-1}).limit(10).lean()
    ]);
    const tm=map(todayRows),sm=map(monthlyRows);

    const refundPending=allow("FINANCE_VIEW_REFUNDS")?count(rm,["REQUESTED","VERIFIED_BY_CUSTOMER_CARE"]):0;
    const refundReview=allow("FINANCE_VIEW_REFUNDS")?count(rm,["UNDER_REVIEW","FINANCE_REVIEW"]):0;
    const refundApproved=allow("FINANCE_VIEW_REFUNDS")?count(rm,["APPROVED"]):0;
    // A completed refund is a completed financial refund transaction. This
    // also recognizes legacy rows where the ledger was written successfully.
    const completedRefundRows=allow("FINANCE_VIEW_REFUNDS")
      ? await FinancialTransaction.aggregate([
          {$match:{...transactionScope,type:"REFUND",status:"COMPLETED"}},
          {$group:{_id:"$referenceId"}}
        ])
      : [];
    const adjustmentRows=allow("FINANCE_VIEW_REPORTS") ? await FinancialTransaction.aggregate([{$match:{type:"ADJUSTMENT",...(isManager?{}:{createdBy:financeUserId}),status:{$in:["COMPLETED","PAID"]}}},{$group:{_id:null,count:{$sum:1},amount:{$sum:"$amount"}}}]) : [];

    return res.json({success:true,data:{
      refunds:{
        REQUESTED:{count:refundPending},
        UNDER_REVIEW:{count:refundReview},
        FINANCE_REVIEW:{count:refundReview},
        APPROVED:{count:refundApproved},
        COMPLETED:{count:completedRefundRows.length}
      },
      payouts:{
        PENDING:{count:Number(pm.PENDING?.count||0)},
        ELIGIBLE:{count:Number(pm.ELIGIBLE?.count||0)},
        FINALIZED:{count:Number(pm.FINALIZED?.count||0)},
        PAID:{count:Number(pm.PAID?.count||0)},
        FAILED:{count:Number(pm.FAILED?.count||0)}
      },
      incentives:{
        PENDING:{count:Number(im.PENDING?.count||0)},
        ELIGIBLE:{count:Number(im.ELIGIBLE?.count||0)},
        APPROVED:{count:Number(im.APPROVED?.count||0)},
        PAID:{count:Number(im.PAID?.count||0)},
        REJECTED:{count:Number(im.REJECTED?.count||0)}
      },
      adjustments:{pending:0,completed:Number(adjustmentRows[0]?.count||0),amount:Number(adjustmentRows[0]?.amount||0)},
      summary:{
        todayRefunds:allow("FINANCE_VIEW_REFUNDS")?Number(tm.REFUND?.amount||0):0,
        todayPayouts:allow("FINANCE_VIEW_PAYOUTS")?Number(tm.DELIVERY_PAYOUT?.amount||0):0,
        monthlyRefunds:allow("FINANCE_VIEW_REFUNDS")?Number(sm.REFUND?.amount||0):0,
        monthlyDeliveryPayout:allow("FINANCE_VIEW_PAYOUTS")?Number(sm.DELIVERY_PAYOUT?.amount||0):0,
        monthlyIncentives:allow("FINANCE_VIEW_INCENTIVES")?Number(sm.INCENTIVE?.amount||0):0
      },
      recentActivities:visibleActivities,
      forcePasswordChange:Boolean(fu.forcePasswordChange),
      financeEmployeeId:String(fu.employeeId||"")
    }});
  } catch(e) {
    console.error("FINANCE DASHBOARD ERROR",e);
    return res.status(500).json({success:false,message:"Unable to load Finance dashboard"});
  }
});

const financeRefundFind=async(id:string, userId?:any, roleName?:string)=>await RefundRequest.findOne({_id:id,...(roleName==="finance_executive"?{financeEmployee:userId}:{})}).populate("customer","name email phone").populate("order","_id total status paymentStatus paymentMode items").populate("assignedFinance","name employeeId role").populate("customerCareVerifiedBy","name employeeId").populate("financeReviewedBy","name employeeId").lean();
app.get("/api/finance/refunds",auth,financeAuth,financeCan("FINANCE_VIEW_REFUNDS"),async(req:AuthRequest,res)=>{try{const status=String(req.query.status||"").toUpperCase();const assigned=String(req.query.assigned||"");const filter:any={};if(status)filter.status=status;if(assigned)filter.assignedFinance=assigned;else if((req.user as any).role==="finance_executive")filter.financeEmployee=req.user!.id;const rows=await RefundRequest.find(filter).sort({createdAt:-1}).limit(500).populate("customer","name email phone").populate("order","_id total status paymentStatus paymentMode").populate("assignedFinance","name employeeId role").populate("customerCareVerifiedBy","name employeeId").lean();return res.json({success:true,data:rows});}catch(e){return res.status(500).json({success:false,message:"Unable to load refund requests"});}});
app.get("/api/finance/refunds/:id",auth,financeAuth,financeCan("FINANCE_VIEW_REFUNDS"),async(req:AuthRequest,res)=>{try{const r=await financeRefundFind(req.params.id,req.user!.id,(req.user as any).role);if(!r)return res.status(404).json({success:false,message:"Refund request not found"});await recordCustomerCareAudit({req:req as AuthRequest,action:"FINANCE_REFUND_VIEWED",targetType:"REFUND_REQUEST",targetId:req.params.id,customer:(r as any).customer?._id||null,order:(r as any).order?._id||null});return res.json({success:true,data:r});}catch(e){return res.status(500).json({success:false,message:"Unable to load refund"});}});
app.patch("/api/finance/refunds/:id/review",auth,financeAuth,financeCan("FINANCE_REVIEW_REFUNDS"),async(req:AuthRequest,res)=>{try{const r:any=await RefundRequest.findOne({_id:req.params.id,...((req.user as any).role==="finance_executive"?{financeEmployee:req.user!.id}:{})});if(!r)return res.status(404).json({success:false,message:"Refund request not found"});if(!["REQUESTED","UNDER_REVIEW","VERIFIED_BY_CUSTOMER_CARE","FINANCE_REVIEW"].includes(r.status))return res.status(400).json({success:false,message:"Refund is not available for review"});r.status="FINANCE_REVIEW";r.financeReviewedBy=req.user!.id;r.financeReviewedAt=new Date();r.requestedAmount=Number(r.amount||0);pushRequestHistory(r,"FINANCE_REVIEW",req.user!.id,String((req.user as any).role));await r.save();await notifyRequestStatus(r,"REFUND","FINANCE_REVIEW");if(r.customerCareAgent)await notifyUser({user:r.customerCareAgent,title:"Refund Finance review updated",message:`Refund ${r.requestId} was reviewed by Finance.`,type:"refund_review",order:r.order,relatedEntity:"REFUND_REQUEST",relatedEntityId:r._id});await recordCustomerCareAudit({req,action:"REFUND_REVIEWED",targetType:"REFUND_REQUEST",targetId:r._id,customer:r.customer,order:r.order});return res.json({success:true,data:await financeRefundFind(req.params.id,req.user!.id,(req.user as any).role)});}catch(e){return res.status(500).json({success:false,message:"Unable to review refund"});}});
app.patch("/api/finance/refunds/:id/approve",auth,financeAuth,financeCan("FINANCE_APPROVE_REFUNDS"),async(req:AuthRequest,res)=>{try{const r:any=await RefundRequest.findOne({_id:req.params.id,...((req.user as any).role==="finance_executive"?{financeEmployee:req.user!.id}:{})});if(!r)return res.status(404).json({success:false,message:"Refund request not found"});if(["COMPLETED","REJECTED","FAILED"].includes(r.status))return res.status(400).json({success:false,message:"Refund is already closed"});if((req.user as any).role==="finance_manager"&&r.status!=="FINANCE_REVIEW"&&r.status!=="APPROVAL_PENDING")return res.status(400).json({success:false,message:"Refund is not awaiting Manager approval"});const requested=Number(r.requestedAmount??r.amount??0);if(!Number.isFinite(requested)||requested<=0)return res.status(400).json({success:false,message:"Invalid requested refund amount"});const existingTxn=await FinancialTransaction.findOne({type:"REFUND",referenceId:String(r._id)}).lean();if(existingTxn)return res.status(409).json({success:false,message:"Refund transaction already exists"});const orderForRefund:any=await Order.findById(r.order).select("items").lean();const refundItem=orderForRefund?itemFromOrder(orderForRefund,String(r.orderItemId||""),String(r.productId||"")):null;if(!refundItem)return res.status(400).json({success:false,message:"Refund order item is no longer available"});const refundSummary=await getRefundItemSummary(r.order,String(refundItem?._id||refundItem?.product||r.orderItemId||""),r._id);const itemTotal=Number(refundItem.price||0)*Math.max(0,Number(refundItem.quantity||0));const remainingEligible=Math.max(0,itemTotal-Number(refundSummary.completedAmount||0)-Number(refundSummary.activeAmount||0));if(remainingEligible<=0)return res.status(400).json({success:false,message:"No refundable amount remains for this order item"});const eligible=Math.min(requested,remainingEligible);const approved=Number(req.body.approvedAmount===undefined?eligible:req.body.approvedAmount);if(!Number.isFinite(approved)||approved<=0||approved>remainingEligible+0.01)return res.status(400).json({success:false,message:`Approved refund cannot exceed the remaining refundable amount of ₹${remainingEligible.toFixed(2)}`});const settings:any=await ensureFinanceSettings();if((req.user as any).role==="finance_executive"){r.status="APPROVAL_PENDING";r.approvedAmount=approved;r.financeReviewedBy=r.financeReviewedBy||req.user!.id;r.approvedBy=req.user!.id;if((req.user as any).role==="finance_manager")r.financeManager=req.user!.id;r.financeReviewedAt=r.financeReviewedAt||new Date();pushRequestHistory(r,"APPROVAL_PENDING",req.user!.id,"finance_executive","Finance Executive review completed; Finance Manager approval required.");await r.save();const managers:any[]=await User.find({role:"finance_manager",blocked:{$ne:true}}).select("_id").lean();for(const m of managers)await notifyUser({user:m._id,title:"Finance Manager approval required",message:`Refund ${r.requestId} requires your approval after Finance Executive review.`,type:"refund_approval",order:r.order,relatedEntity:"REFUND_REQUEST",relatedEntityId:r._id});await notifyRequestStatus(r,"REFUND","APPROVAL_PENDING");await recordCustomerCareAudit({req,action:"REFUND_EXECUTIVE_REVIEW_PENDING_MANAGER",targetType:"REFUND_REQUEST",targetId:r._id,customer:r.customer,order:r.order});return res.json({success:true,data:await financeRefundFind(req.params.id,req.user!.id,(req.user as any).role),mainAdminApprovalRequired:false});}const override=approved>eligible;if(approved<0)return res.status(400).json({success:false,message:"Invalid approved amount"});if(approved>remainingEligible+0.01)return res.status(400).json({success:false,message:`Approved refund cannot exceed the remaining refundable amount of ₹${remainingEligible.toFixed(2)}`});if(override&&!(req.body.overrideReason&&String(req.body.overrideReason).trim()))return res.status(400).json({success:false,message:"Override reason is required for an amount above the requested refund"});if(override&&!((req.user as any).role==="finance_manager"))return res.status(403).json({success:false,message:"Only Finance Manager may approve an override"});const requireAdmin=Boolean(settings?.requireMainAdminApproval)&&approved>Number(settings?.refundApprovalThreshold||0);if(requireAdmin){r.status="APPROVAL_PENDING";}else{r.status="APPROVED";r.approvedAt=new Date();}r.approvedAmount=approved;r.financeReviewedBy=r.financeReviewedBy||req.user!.id;r.approvedBy=req.user!.id;if((req.user as any).role==="finance_manager")r.financeManager=req.user!.id;if(override)r.override={allowed:true,reason:String(req.body.overrideReason).trim(),changedBy:req.user!.id,changedAt:new Date()};pushRequestHistory(r,r.status,req.user!.id,String((req.user as any).role));await r.save();if(requireAdmin)await notifyAdmins({title:"Refund approval required",message:`Refund #${String(r._id).slice(-8)} requires Main Admin approval.`,type:"refund_approval",order:r.order});else await notifyUser({user:r.customer,title:"Refund approved",message:`Your refund request #${String(r._id).slice(-8)} has been approved.`,type:"refund_status",order:r.order});await recordCustomerCareAudit({req,action:requireAdmin?"REFUND_APPROVAL_PENDING":"REFUND_APPROVED",targetType:"REFUND_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{approvedAmount:approved,override}});return res.json({success:true,data:await financeRefundFind(req.params.id),mainAdminApprovalRequired:requireAdmin});}catch(e){console.error(e);return res.status(500).json({success:false,message:"Unable to approve refund"});}});
app.patch("/api/admin/finance/refunds/:id/approve",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const r:any=await RefundRequest.findOne({_id:req.params.id,...((req.user as any).role==="finance_executive"?{financeEmployee:req.user!.id}:{})});if(!r||r.status!=="APPROVAL_PENDING")return res.status(404).json({success:false,message:"Refund approval not pending"});const orderForRefund:any=await Order.findById(r.order).select("items").lean();const refundItem=orderForRefund?itemFromOrder(orderForRefund,String(r.orderItemId||""),String(r.productId||"")):null;if(!refundItem)return res.status(400).json({success:false,message:"Refund order item is no longer available"});const refundSummary=await getRefundItemSummary(r.order,String(refundItem?._id||refundItem?.product||r.orderItemId||""),r._id);const itemTotal=Number(refundItem.price||0)*Math.max(0,Number(refundItem.quantity||0));const remainingEligible=Math.max(0,itemTotal-Number(refundSummary.completedAmount||0)-Number(refundSummary.activeAmount||0));const approvedAmount=Number(r.approvedAmount??r.requestedAmount??r.amount??0);if(!Number.isFinite(approvedAmount)||approvedAmount<=0||approvedAmount>remainingEligible+0.01)return res.status(400).json({success:false,message:`Approved refund exceeds the remaining refundable amount of ₹${remainingEligible.toFixed(2)}`});r.status="APPROVED";r.approvedBy=req.user!.id;r.approvedAt=new Date();pushRequestHistory(r,"APPROVED",req.user!.id,"admin","Main Admin approved the escalated refund.");await r.save();await notifyUser({user:r.customer,title:"Refund approved",message:`Your refund request #${String(r._id).slice(-8)} has been approved.`,type:"refund_status",order:r.order});await recordCustomerCareAudit({req,action:"MAIN_ADMIN_REFUND_APPROVED",targetType:"REFUND_REQUEST",targetId:r._id,customer:r.customer,order:r.order});return res.json({success:true,data:r});}catch(e){return res.status(500).json({success:false,message:"Unable to approve refund"});}});
app.patch("/api/finance/refunds/:id/reject",auth,financeAuth,financeCan("FINANCE_APPROVE_REFUNDS"),async(req:AuthRequest,res)=>{try{const reason=String(req.body.reason||"").trim();if(reason.length<3)return res.status(400).json({success:false,message:"Rejection reason is required"});const r:any=await RefundRequest.findOne({_id:req.params.id,...((req.user as any).role==="finance_executive"?{financeEmployee:req.user!.id}:{})});if(!r)return res.status(404).json({success:false,message:"Refund request not found"});r.status="REJECTED";r.rejectedAt=new Date();r.rejectionReason=reason;r.financeReviewedBy=r.financeReviewedBy||req.user!.id;pushRequestHistory(r,"REJECTED",req.user!.id,String((req.user as any).role),reason);await r.save();await notifyUser({user:r.customer,title:"Refund rejected",message:`Your refund request was rejected: ${reason}`,type:"refund_status",order:r.order});if(r.customerCareVerifiedBy)await notifyUser({user:r.customerCareVerifiedBy,title:"Refund rejected",message:`Refund #${String(r._id).slice(-8)} was rejected by Finance: ${reason}`,type:"refund_status",order:r.order});await recordCustomerCareAudit({req,action:"REFUND_REJECTED",targetType:"REFUND_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{reason}});return res.json({success:true,data:await financeRefundFind(req.params.id,req.user!.id,(req.user as any).role)});}catch(e){return res.status(500).json({success:false,message:"Unable to reject refund"});}});
app.patch("/api/finance/refunds/:id/process",auth,financeAuth,financeCan("FINANCE_PROCESS_REFUNDS"),async(req:AuthRequest,res)=>{try{const r:any=await RefundRequest.findOne({_id:req.params.id,...((req.user as any).role==="finance_executive"?{financeEmployee:req.user!.id}:{})});if(!r)return res.status(404).json({success:false,message:"Refund request not found"});const status=String(req.body.status||"").toUpperCase();if(!["PROCESSING","COMPLETED","FAILED"].includes(status))return res.status(400).json({success:false,message:"Invalid processing status"});if(status==="PROCESSING"&&!["APPROVED","PROCESSING"].includes(r.status))return res.status(400).json({success:false,message:"Refund must be approved before processing"});if(status==="COMPLETED"&&r.status!=="PROCESSING")return res.status(400).json({success:false,message:"Refund must be in processing state"});r.status=status;pushRequestHistory(r,status,req.user!.id,String((req.user as any).role),String(req.body.notes||""));r.transactionReference=String(req.body.transactionReference||r.transactionReference||"").trim();r.processingNotes=String(req.body.notes||r.processingNotes||"").trim();if(status==="COMPLETED"){const orderForRefund:any=await Order.findById(r.order).select("items").lean();const refundItem=orderForRefund?itemFromOrder(orderForRefund,String(r.orderItemId||""),String(r.productId||"")):null;if(!refundItem)throw new Error("Refund order item is no longer available");const refundSummary=await getRefundItemSummary(r.order,String(refundItem?._id||refundItem?.product||r.orderItemId||""),r._id);const itemTotal=Number(refundItem.price||0)*Math.max(0,Number(refundItem.quantity||0));const remainingEligible=Math.max(0,itemTotal-Number(refundSummary.completedAmount||0)-Number(refundSummary.activeAmount||0));const amount=Number(r.approvedAmount??r.amount??0);if(!Number.isFinite(amount)||amount<=0||amount>remainingEligible+0.01)throw new Error(`Refund amount exceeds the remaining refundable amount of ₹${remainingEligible.toFixed(2)}`);r.processedAt=new Date();await createFinancialTransaction({type:"REFUND",referenceId:r._id,order:r.order,customer:r.customer,storeAdmin:r.storeAdmin||r.storeId||null,orderItemId:String(r.orderItemId||""),amount,direction:"OUTFLOW",paymentMethod:r.refundMethod||"ORIGINAL",status:"COMPLETED",completedAt:new Date(),createdBy:req.user!.id,processedBy:req.user!.id,processedByRole:String((req.user as any).role||""),processedAt:new Date(),paymentReference:r.transactionReference||"",metadata:{transactionReference:r.transactionReference,storeId:r.storeId||null}});}await r.save();await notifyUser({user:r.customer,title:`Refund ${status.toLowerCase()}`,message:`Your refund request is now ${status}.`,type:"refund_status",order:r.order});if(r.customerCareVerifiedBy)await notifyUser({user:r.customerCareVerifiedBy,title:`Refund ${status.toLowerCase()}`,message:`Refund #${String(r._id).slice(-8)} is now ${status}.`,type:"refund_status",order:r.order});await recordCustomerCareAudit({req,action:`REFUND_${status}`,targetType:"REFUND_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{transactionReference:r.transactionReference}});return res.json({success:true,data:await financeRefundFind(req.params.id,req.user!.id,(req.user as any).role)});}catch(e){console.error(e);return res.status(500).json({success:false,message:"Unable to process refund"});}});
app.patch("/api/finance/refunds/:id/assign",auth,financeAuth,financeCan("FINANCE_REVIEW_REFUNDS"),async(req:AuthRequest,res)=>{try{const r:any=await RefundRequest.findOne({_id:req.params.id,...((req.user as any).role==="finance_executive"?{financeEmployee:req.user!.id}:{})});if(!r)return res.status(404).json({success:false,message:"Refund request not found"});const u:any=await User.findOne({_id:req.body.financeUserId,role:"finance_executive",blocked:{$ne:true}}).select("_id name employeeId").lean();if(!u)return res.status(400).json({success:false,message:"Finance Executive not found"});r.assignedFinance=u._id;r.financeEmployee=u._id;r.assignedAt=new Date();pushRequestHistory(r,"FINANCE_REVIEW",req.user!.id,String((req.user as any).role),`Assigned to Finance Executive ${u.employeeId||u._id}`);await r.save();await notifyUser({user:u._id,title:"Refund assigned",message:`Refund #${r.requestId||String(r._id).slice(-8)} has been assigned to you.`,type:"finance_assignment",order:r.order,relatedEntity:"REFUND_REQUEST",relatedEntityId:r._id});await recordCustomerCareAudit({req,action:"REFUND_FINANCE_ASSIGNED",targetType:"REFUND_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{requestId:r.requestId,financeEmployee:r.financeEmployee}});return res.json({success:true,data:await financeRefundFind(req.params.id,req.user!.id,(req.user as any).role)});}catch(e){return res.status(500).json({success:false,message:"Unable to assign refund"});}});
app.get("/api/finance/team",auth,financeAuth,async(_req,res)=>{try{const rows=await User.find({role:{$in:FINANCE_ROLES},blocked:{$ne:true}}).select("name employeeId role").lean();return res.json({success:true,data:rows});}catch(e){return res.status(500).json({success:false,message:"Unable to load Finance team"});}});


app.get("/api/finance/store-payouts",auth,financeAuth,financeCan("FINANCE_VIEW_PAYOUTS"),async(req:AuthRequest,res)=>{
  try{
    const {from,to}=financeDateRange(req.query.from,req.query.to);
    const stores:any[]=await User.find({role:"admin",blocked:{$ne:true}}).select("_id name email employeeId").sort({name:1}).lean();
    const rows=await Promise.all(stores.map(async(st:any)=>{
      const x=await buildStoreFinancialSnapshot(st._id,from,to);
      return {storeId:st._id,name:st.name,email:st.email,employeeId:st.employeeId,...x.metrics,approvalRequired:true};
    }));
    return res.json({success:true,data:{from,to,rows}});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to load Store payouts"});}
});

app.get("/api/finance/store-payout-batches",auth,financeAuth,financeCan("FINANCE_VIEW_PAYOUTS"),async(_req,res)=>{try{const rows=await PayoutBatch.find({payoutType:"STORE"}).sort({createdAt:-1}).limit(300).populate("storeAdmin","name email employeeId").populate("createdBy","name employeeId role").populate("processedBy","name employeeId role").lean();return res.json({success:true,data:rows});}catch(e){return res.status(500).json({success:false,message:"Unable to load Store payout batches"});}});

app.post("/api/finance/store-payout-batches",auth,financeAuth,financeCan("FINANCE_PROCESS_PAYOUTS"),async(req:AuthRequest,res)=>{
  try{
    const storeId=String(req.body.storeAdminId||"").trim();
    if(!mongoose.Types.ObjectId.isValid(storeId)) return res.status(400).json({success:false,message:"Valid Store Admin is required"});
    const {from,to}=financeDateRange(req.body.from,req.body.to);
    const store:any=await User.findOne({_id:storeId,role:"admin",blocked:{$ne:true}}).select("_id name email employeeId").lean();
    if(!store)return res.status(404).json({success:false,message:"Store not found"});
    const snapshot=await buildStoreFinancialSnapshot(storeId,from,to);
    const amount=Number(snapshot.metrics.pendingPayout||0);
    if(amount<=0)return res.status(400).json({success:false,message:"No pending store payout for this period"});
    const existing:any=await PayoutBatch.findOne({payoutType:"STORE",storeAdmin:storeId,payoutPeriodStart:from,payoutPeriodEnd:to,status:{$nin:["FAILED"]}}).lean();
    if(existing)return res.status(409).json({success:false,message:"A Store payout batch already exists for this period",data:existing});
    const batch:any=await PayoutBatch.create({batchId:makeFinancialId("PAY"),payoutType:"STORE",storeAdmin:storeId,orders:snapshot.orders.map((o:any)=>o._id),partners:[],total:amount,netPayable:amount,grossSales:snapshot.metrics.grossSales,refunds:snapshot.metrics.refunds,commission:snapshot.metrics.commission,adjustments:snapshot.metrics.adjustments,payoutPeriodStart:from,payoutPeriodEnd:to,status:"CREATED",createdBy:req.user!.id,notes:String(req.body.notes||"").trim()});
    const managers:any[]=await User.find({role:"finance_manager",blocked:{$ne:true}}).select("_id").lean();
    for(const m of managers) await notifyUser({user:m._id,title:"Store payout requires approval",message:`Store payout ${batch.batchId} for ${store.name} is ready for Finance Manager approval.`,type:"store_payout_approval",relatedEntity:"PAYOUT_BATCH",relatedEntityId:batch._id});
    await recordCustomerCareAudit({req,action:"STORE_PAYOUT_BATCH_CREATED",targetType:"PAYOUT_BATCH",targetId:batch._id,metadata:{storeId,from,to,amount}});
    return res.status(201).json({success:true,data:batch});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to create Store payout batch"});}
});

app.patch("/api/finance/store-payout-batches/:id",auth,financeAuth,financeCan("FINANCE_PROCESS_PAYOUTS"),async(req:AuthRequest,res)=>{
  try{
    const b:any=await PayoutBatch.findOne({_id:req.params.id,payoutType:"STORE"});
    if(!b)return res.status(404).json({success:false,message:"Store payout batch not found"});
    const status=String(req.body.status||"").toUpperCase();
    if(!["CREATED","UNDER_REVIEW","APPROVED","PROCESSING","PAID","FAILED"].includes(status))return res.status(400).json({success:false,message:"Invalid Store payout status"});
    const roleName=String((req.user as any)?.role||"");
    if((status==="APPROVED"||status==="PAID")&&roleName!=="finance_manager")return res.status(403).json({success:false,message:"Finance Manager approval is required for Store payout settlement"});
    if(status==="APPROVED"&&b.status!=="UNDER_REVIEW")return res.status(400).json({success:false,message:"Store payout must be under review before approval"});
    if(status==="PROCESSING"&&b.status!=="APPROVED")return res.status(400).json({success:false,message:"Store payout must be approved before processing"});
    if(status==="PAID"&&!['APPROVED','PROCESSING'].includes(String(b.status)))return res.status(400).json({success:false,message:"Store payout must be approved before payment"});
    if(status==="PAID"){
      const existing=await FinancialTransaction.findOne({type:"STORE_PAYOUT",referenceId:String(b._id)});
      if(existing)return res.status(409).json({success:false,message:"Store payout transaction already exists"});
      b.processedBy=req.user!.id;b.processedAt=new Date();
      await createFinancialTransaction({type:"STORE_PAYOUT",referenceId:b._id,storeAdmin:b.storeAdmin,amount:Number(b.netPayable||b.total||0),direction:"OUTFLOW",paymentMethod:String(req.body.paymentMethod||"MANUAL"),status:"PAID",completedAt:new Date(),createdBy:req.user!.id,processedBy:req.user!.id,processedByRole:roleName,processedAt:new Date(),paymentReference:String(req.body.transactionReference||"")});
      await notifyUser({user:b.storeAdmin,title:"Store payout paid",message:`Store payout ${b.batchId} has been paid.`,type:"store_payout_paid",relatedEntity:"PAYOUT_BATCH",relatedEntityId:b._id});
    }
    b.status=status;b.transactionReference=String(req.body.transactionReference||b.transactionReference||"");b.notes=String(req.body.notes||b.notes||"");await b.save();
    await recordCustomerCareAudit({req,action:`STORE_PAYOUT_BATCH_${status}`,targetType:"PAYOUT_BATCH",targetId:b._id,metadata:{status,storeAdmin:b.storeAdmin,amount:b.netPayable||b.total}});
    return res.json({success:true,data:b});
  }catch(e:any){return res.status(500).json({success:false,message:e?.message||"Unable to update Store payout"});}
});

app.get("/api/finance/payouts",auth,financeAuth,financeCan("FINANCE_VIEW_PAYOUTS"),async(_req,res)=>{try{const rows=await Order.find({deliveryPartner:{$ne:null},status:"Delivered"}).select("_id user deliveryPartner storeAdmin deliveryPayout performanceIncentive deliveryPayoutStatus deliveredAt createdAt").populate("deliveryPartner","name employeeId ratingAverage ratingCount").populate("user","name email").sort({deliveredAt:-1}).limit(500).lean();return res.json({success:true,data:rows});}catch(e){return res.status(500).json({success:false,message:"Unable to load payout records"});}});
app.patch("/api/finance/payouts/:id",auth,financeAuth,financeCan("FINANCE_PROCESS_PAYOUTS"),async(req:AuthRequest,res)=>{try{const status=String(req.body.status||"").toUpperCase();if(!["PENDING","ELIGIBLE","FINALIZED","PROCESSING","PAID","ON_HOLD","FAILED","CANCELLED"].includes(status))return res.status(400).json({success:false,message:"Invalid payout status"});const o:any=await Order.findOne({_id:req.params.id,status:"Delivered"});if(!o)return res.status(404).json({success:false,message:"Delivered order not found"});if(["PAID","CANCELLED"].includes(o.deliveryPayoutStatus)&&status!==o.deliveryPayoutStatus)return res.status(400).json({success:false,message:"Payout is already closed"});if(status==="FINALIZED"&&o.deliveryPayoutStatus!=="ELIGIBLE")return res.status(400).json({success:false,message:"Payout must be eligible before finalization"});if(status==="PAID"&&!["FINALIZED","PROCESSING","PAID"].includes(o.deliveryPayoutStatus))return res.status(400).json({success:false,message:"Payout must be finalized before payment"});o.deliveryPayoutStatus=status;await o.save();if(status==="PAID")await createFinancialTransaction({type:"DELIVERY_PAYOUT",referenceId:o._id,order:o._id,storeAdmin:o.storeAdmin||null,deliveryPartner:o.deliveryPartner,amount:Number(o.deliveryPayout||0)+Number(o.performanceIncentive||0),direction:"OUTFLOW",paymentMethod:String(req.body.paymentMethod||"MANUAL"),status:"PAID",completedAt:new Date(),createdBy:req.user!.id,processedBy:req.user!.id,processedByRole:String((req.user as any).role||""),processedAt:new Date(),paymentReference:String(req.body.transactionReference||""),metadata:{transactionReference:String(req.body.transactionReference||"")}});if(o.deliveryPartner)await notifyUser({user:o.deliveryPartner,title:`Delivery payout ${status.toLowerCase()}`,message:`Your payout for order #${String(o._id).slice(-8)} is ${status}.`,type:"payout_status",order:o._id});await recordCustomerCareAudit({req,action:"PAYOUT_STATUS_UPDATED",targetType:"ORDER",targetId:o._id,order:o._id,metadata:{status}});return res.json({success:true,data:o});}catch(e){return res.status(500).json({success:false,message:"Unable to update payout"});}});

app.get("/api/finance/incentives",auth,financeAuth,financeCan("FINANCE_VIEW_INCENTIVES"),async(_req,res)=>{try{const rows=await Incentive.find({}).sort({createdAt:-1}).limit(500).populate("deliveryPartner","name employeeId ratingAverage ratingCount").lean();return res.json({success:true,data:rows});}catch(e){return res.status(500).json({success:false,message:"Unable to load incentives"});}});
app.patch("/api/finance/incentives/:id",auth,financeAuth,financeCan("FINANCE_MANAGE_INCENTIVES"),async(req:AuthRequest,res)=>{try{const i:any=await Incentive.findById(req.params.id);if(!i)return res.status(404).json({success:false,message:"Incentive not found"});const status=String(req.body.status||"").toUpperCase();if(!["PENDING","APPROVED","PROCESSING","PAID","REJECTED","ON_HOLD"].includes(status))return res.status(400).json({success:false,message:"Invalid incentive status"});i.status=status;if(status==="APPROVED")i.approvedBy=req.user!.id;if(req.body.approvedAmount!==undefined){const n=Number(req.body.approvedAmount);if(!Number.isFinite(n)||n<0||n>Number(i.eligibleAmount||0))return res.status(400).json({success:false,message:"Approved incentive cannot exceed eligible amount"});i.approvedAmount=n;}if(status==="PAID"){i.paidAt=new Date();await createFinancialTransaction({type:"INCENTIVE",referenceId:i._id,deliveryPartner:i.deliveryPartner,amount:Number(i.approvedAmount||0),direction:"OUTFLOW",paymentMethod:"MANUAL",status:"PAID",completedAt:new Date(),createdBy:req.user!.id,processedBy:req.user!.id,processedByRole:String((req.user as any).role||""),processedAt:new Date()});}await i.save();if(i.deliveryPartner)await notifyUser({user:i.deliveryPartner,title:`Incentive ${status.toLowerCase()}`,message:`Your incentive is now ${status}.`,type:"incentive_status"});await recordCustomerCareAudit({req,action:"INCENTIVE_STATUS_UPDATED",targetType:"INCENTIVE",targetId:i._id,metadata:{status}});return res.json({success:true,data:i});}catch(e){return res.status(500).json({success:false,message:"Unable to update incentive"});}});

const financeTransactionScope=async(req:AuthRequest)=>{
  const fu:any=(req as any).financeUser||{};
  if(fu.role==="finance_manager") return {};
  const refundIds:any[]=await RefundRequest.find({$or:[{financeEmployee:req.user!.id},{assignedFinance:req.user!.id}]}).select("_id").lean();
  const refs=refundIds.map((x:any)=>String(x._id));
  return {$or:[
    ...(refs.length?[{type:"REFUND",referenceId:{$in:refs}}]:[]),
    {type:"DELIVERY_PAYOUT"},
    {type:"STORE_PAYOUT"},
    {type:"INCENTIVE"},
    {type:"COMMISSION"},
    {type:"ADJUSTMENT",createdBy:req.user!.id}
  ]};
};
app.get("/api/finance/reconciliation",auth,financeAuth,financeCan("FINANCE_VIEW_REPORTS"),async(req:AuthRequest,res)=>{
  try{
    const from=req.query.from?new Date(String(req.query.from)):new Date(new Date().getFullYear(),new Date().getMonth(),1);
    const to=req.query.to?new Date(String(req.query.to)):new Date(); to.setHours(23,59,59,999);
    if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||from>to)return res.status(400).json({success:false,message:"Invalid date range"});
    const orders:any[]=await Order.find({createdAt:{$gte:from,$lte:to},paymentMethod:{$in:["ONLINE","COD"]}}).select("_id total paymentMethod paymentMode paymentStatus status createdAt paymentPaidAt").sort({createdAt:-1}).limit(2000).lean();
    const orderIds=orders.map(o=>o._id);
    const deliveryPayoutOrders:any[]=await Order.find({createdAt:{$gte:from,$lte:to},deliveryPartner:{$ne:null},status:"Delivered"}).select("_id deliveryPayout performanceIncentive deliveryPayoutStatus createdAt").sort({createdAt:-1}).limit(2000).lean();
    const refundRows:any[]=await RefundRequest.find({createdAt:{$gte:from,$lte:to}}).select("_id order amount requestedAmount approvedAmount status refundMethod transactionReference createdAt processedAt").lean();
    const refundIds=refundRows.map(r=>r._id);
    const tx:any[]=await FinancialTransaction.find({createdAt:{$gte:from,$lte:to},type:{$in:["ORDER_PAYMENT","REFUND","DELIVERY_PAYOUT","STORE_PAYOUT"]}}).select("_id transactionId type referenceId order amount direction paymentMethod status paymentReference createdAt completedAt").sort({createdAt:-1}).limit(5000).lean();
    const payoutBatches:any[]=await PayoutBatch.find({createdAt:{$gte:from,$lte:to},payoutType:"STORE"}).select("_id batchId status total netPayable transactionReference createdAt").lean();
    const txByRef=new Map<string,any[]>(); for(const t of tx){const k=String(t.referenceId||"");if(!txByRef.has(k))txByRef.set(k,[]);txByRef.get(k)!.push(t);}
    const rows:any[]=[];
    const add=(source:string,reference:string,expected:number,recorded:number,status:string,detail:string,method:string,createdAt:any)=>rows.push({source,reference,expectedAmount:Number(expected||0),recordedAmount:Number(recorded||0),status,detail,paymentMethod:method||"",createdAt});
    for(const o of orders){
      const key=String(o._id); const matches=txByRef.get(key)||[]; const payments=matches.filter(t=>t.type==="ORDER_PAYMENT");
      const expected=Number(o.total||0), recorded=payments.reduce((n,t)=>n+Number(t.amount||0),0);
      const failed=["FAILED","FAILURE"].includes(String(o.paymentStatus||"").toUpperCase())||String(o.status||"").toLowerCase()==="payment failed";
      const pending=String(o.paymentStatus||"").toLowerCase()!=="paid" && !failed;
      const duplicate=payments.length>1;
      const mismatch=payments.length===1 && Math.abs(recorded-expected)>0.01;
      let st="MATCHED",detail="Order payment and financial transaction agree";
      if(failed) {st="FAILED";detail="Order payment is marked failed";} else if(duplicate){st="DUPLICATE";detail=`${payments.length} financial payment records reference the same order`;} else if(mismatch){st="MISMATCH";detail="Recorded financial amount differs from order total";} else if(pending){st="PENDING";detail="Payment is not marked paid";} else if(payments.length===0){st="MISMATCH";detail="Paid order has no matching financial transaction";}
      add(String(o.paymentMode||o.paymentMethod||"ONLINE").toUpperCase()==="COD"?"COD":"UPI",key,expected,recorded,st,detail,String(o.paymentMode||o.paymentMethod||""),o.createdAt);
    }
    for(const r of refundRows){
      const key=String(r._id); const matches=(txByRef.get(key)||[]).filter(t=>t.type==="REFUND"); const expected=Number(r.approvedAmount??r.amount??r.requestedAmount??0), recorded=matches.reduce((n,t)=>n+Number(t.amount||0),0);
      const rs=String(r.status||"").toUpperCase(); let st="MATCHED",detail="Refund record and financial transaction agree";
      if(["REQUESTED","UNDER_REVIEW","VERIFIED_BY_CUSTOMER_CARE","FINANCE_REVIEW","APPROVAL_PENDING","APPROVED","PROCESSING"].includes(rs)){st="PENDING";detail=`Refund is ${rs.toLowerCase().replaceAll("_"," ")}`;}
      else if(rs==="FAILED"){st="FAILED";detail="Refund is marked failed";}
      else if(matches.length>1){st="DUPLICATE";detail=`${matches.length} refund transactions reference the same request`;} else if(rs==="COMPLETED"&&matches.length===0){st="MISMATCH";detail="Completed refund has no matching financial transaction";} else if(matches.length===1&&Math.abs(recorded-expected)>0.01){st="MISMATCH";detail="Recorded refund amount differs from approved amount";}
      add("REFUND",key,expected,recorded,st,detail,String(r.refundMethod||"ORIGINAL"),r.createdAt);
    }
    for(const o of deliveryPayoutOrders){
      const key=String(o._id); const matches=(txByRef.get(key)||[]).filter(t=>t.type==="DELIVERY_PAYOUT"); const expected=Number(o.deliveryPayout||0)+Number(o.performanceIncentive||0),recorded=matches.reduce((n,t)=>n+Number(t.amount||0),0); const ps=String(o.deliveryPayoutStatus||"PENDING").toUpperCase(); let st="PENDING",detail=`Delivery payout is ${ps.toLowerCase().replaceAll("_"," ")}`;
      if(ps==="CANCELLED"||ps==="FAILED"){st="FAILED";detail=`Delivery payout is ${ps.toLowerCase()}`;} else if(matches.length>1){st="DUPLICATE";detail=`${matches.length} payout transactions reference the same delivery order`;} else if(ps==="PAID"&&matches.length===0){st="MISMATCH";detail="Paid delivery payout has no matching financial transaction";} else if(ps==="PAID"&&Math.abs(recorded-expected)>0.01){st="MISMATCH";detail="Recorded delivery payout differs from order payout";} else if(ps==="PAID"){st="MATCHED";detail="Delivery payout and financial transaction agree";}
      add("PAYOUT",key,expected,recorded,st,detail,"",o.createdAt);
    }
    for(const b of payoutBatches){
      const key=String(b._id); const matches=(txByRef.get(key)||[]).filter(t=>t.type==="STORE_PAYOUT"); const expected=Number(b.netPayable??b.total??0),recorded=matches.reduce((n,t)=>n+Number(t.amount||0),0); const bs=String(b.status||"").toUpperCase(); let st="PENDING",detail=`Store payout is ${bs.toLowerCase()}`;
      if(bs==="FAILED"){st="FAILED";detail="Store payout batch is marked failed";} else if(matches.length>1){st="DUPLICATE";detail=`${matches.length} payout transactions reference the same batch`;} else if(bs==="PAID"&&matches.length===0){st="MISMATCH";detail="Paid store payout has no matching financial transaction";} else if(bs==="PAID"&&Math.abs(recorded-expected)>0.01){st="MISMATCH";detail="Recorded payout amount differs from batch payable";} else if(bs==="PAID"){st="MATCHED";detail="Payout batch and financial transaction agree";}
      add("PAYOUT",key,expected,recorded,st,detail,"",b.createdAt);
    }
    const summary={MATCHED:0,PENDING:0,MISMATCH:0,FAILED:0,DUPLICATE:0}; rows.forEach(r=>{summary[r.status as keyof typeof summary]++});
    return res.json({success:true,data:{from,to,gateway:{available:false,message:"Gateway reconciliation unavailable"},summary,totalRecords:rows.length,rows,financialTransactions:tx.length,orderPayments:orders.length,refunds:refundRows.length,payoutBatches:payoutBatches.length,deliveryPayoutOrders:deliveryPayoutOrders.length}});
  }catch(e){console.error("FINANCE RECONCILIATION ERROR",e);return res.status(500).json({success:false,message:"Unable to load payment reconciliation"});}
});

app.get("/api/finance/transactions",auth,financeAuth,financeCan("FINANCE_VIEW_REPORTS"),async(req,res)=>{try{const scope=await financeTransactionScope(req as AuthRequest);const filter:any={...scope};if(req.query.type)filter.type=String(req.query.type).toUpperCase();if(req.query.status)filter.status=String(req.query.status).toUpperCase();if(req.query.from||req.query.to){filter.createdAt={};if(req.query.from)filter.createdAt.$gte=new Date(String(req.query.from));if(req.query.to){const d=new Date(String(req.query.to));d.setHours(23,59,59,999);filter.createdAt.$lte=d;}}const rows=await FinancialTransaction.find(filter).sort({createdAt:-1}).limit(1000).populate("order","_id").populate("customer","name email").populate("deliveryPartner","name employeeId").lean();return res.json({success:true,data:rows});}catch(e){return res.status(500).json({success:false,message:"Unable to load transactions"});}});
app.get("/api/finance/reports",auth,financeAuth,financeCan("FINANCE_VIEW_REPORTS"),async(req,res)=>{try{const scope=await financeTransactionScope(req as AuthRequest);const type=String(req.query.type||"").toUpperCase();const from=req.query.from?new Date(String(req.query.from)):new Date(new Date().getFullYear(),new Date().getMonth(),1);const to=req.query.to?new Date(String(req.query.to)):new Date();to.setHours(23,59,59,999);const filter:any={...scope,createdAt:{$gte:from,$lte:to}};if(type)filter.type=type;const rows=await FinancialTransaction.find(filter).sort({createdAt:-1}).limit(5000).lean();return res.json({success:true,data:{from,to,rows}});}catch(e){return res.status(500).json({success:false,message:"Unable to load Finance report"});}});
app.get("/api/finance/reports/export",auth,financeAuth,financeCan("FINANCE_EXPORT_REPORTS"),async(req,res)=>{try{const scope=await financeTransactionScope(req as AuthRequest);const from=req.query.from?new Date(String(req.query.from)):new Date(new Date().getFullYear(),new Date().getMonth(),1);const to=req.query.to?new Date(String(req.query.to)):new Date();to.setHours(23,59,59,999);const filter:any={...scope,createdAt:{$gte:from,$lte:to}};if(req.query.type)filter.type=String(req.query.type).toUpperCase();const rows:any[]=await FinancialTransaction.find(filter).sort({createdAt:-1}).lean();const lines=[['Transaction ID','Date','Reference','Type','Order ID','Amount','Direction','Payment Method','Status','Completed At'].map(csvEscape).join(','),...rows.map(x=>[x.transactionId,x.createdAt,x.referenceId,x.type,x.order||"",x.amount,x.direction,x.paymentMethod,x.status,x.completedAt||""].map(csvEscape).join(','))];await recordCustomerCareAudit({req:req as AuthRequest,action:"FINANCE_REPORT_EXPORTED",targetType:"FINANCE_REPORT",metadata:{from,to,type:req.query.type||"ALL",count:rows.length}});res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition","attachment; filename=FreshBasket-financial-report.csv");return res.send(lines.join("\n"));}catch(e){return res.status(500).json({success:false,message:"Unable to export report"});}});

app.post("/api/finance/transactions/adjustment",auth,financeAuth,financeCan("FINANCE_PROCESS_PAYOUTS"),async(req:AuthRequest,res)=>{try{const amount=Number(req.body.amount),direction=String(req.body.direction||"OUTFLOW").toUpperCase(),reason=String(req.body.reason||"").trim();if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({success:false,message:"Valid adjustment amount is required"});if(!["OUTFLOW","INFLOW"].includes(direction))return res.status(400).json({success:false,message:"Invalid adjustment direction"});if(reason.length<3)return res.status(400).json({success:false,message:"Adjustment reason is required"});const tx:any=await FinancialTransaction.create({transactionId:makeFinancialId("TXN"),type:"ADJUSTMENT",referenceId:String(req.body.referenceId||makeFinancialId("ADJ")),order:req.body.orderId||null,customer:req.body.customerId||null,deliveryPartner:req.body.deliveryPartnerId||null,amount,direction,paymentMethod:String(req.body.paymentMethod||"MANUAL"),status:"COMPLETED",notes:reason,completedAt:new Date(),createdBy:req.user!.id,metadata:{reversalOf:String(req.body.reversalOf||"")}});await recordCustomerCareAudit({req,action:"FINANCIAL_ADJUSTMENT_CREATED",targetType:"FINANCIAL_TRANSACTION",targetId:tx._id,metadata:{amount,direction,reason}});return res.status(201).json({success:true,data:tx});}catch(e){return res.status(500).json({success:false,message:"Unable to create adjustment"});}});
app.post("/api/finance/payout-batches",auth,financeAuth,financeCan("FINANCE_PROCESS_PAYOUTS"),async(req:AuthRequest,res)=>{try{const ids=Array.isArray(req.body.orderIds)?req.body.orderIds.filter((x:any)=>mongoose.Types.ObjectId.isValid(x)):[];if(!ids.length)return res.status(400).json({success:false,message:"Select at least one payout"});const orders:any[]=await Order.find({_id:{$in:ids},status:"Delivered",deliveryPayoutStatus:{$in:["ELIGIBLE","FINALIZED"]}}).select("_id deliveryPartner deliveryPayout performanceIncentive deliveryPayoutStatus").lean();if(!orders.length)return res.status(400).json({success:false,message:"No eligible payouts found"});const total=orders.reduce((s,o)=>s+Number(o.deliveryPayout||0)+Number(o.performanceIncentive||0),0);const batch:any=await PayoutBatch.create({batchId:makeFinancialId("PAY"),orders:orders.map(o=>o._id),partners:[...new Set(orders.map(o=>String(o.deliveryPartner)).filter(Boolean))],total,status:"CREATED",createdBy:req.user!.id});return res.status(201).json({success:true,data:batch});}catch(e){return res.status(500).json({success:false,message:"Unable to create payout batch"});}});
app.get("/api/finance/payout-batches",auth,financeAuth,financeCan("FINANCE_VIEW_PAYOUTS"),async(_req,res)=>{try{return res.json({success:true,data:await PayoutBatch.find({}).sort({createdAt:-1}).limit(200).lean()});}catch(e){return res.status(500).json({success:false,message:"Unable to load payout batches"});}});
app.patch("/api/finance/payout-batches/:id",auth,financeAuth,financeCan("FINANCE_PROCESS_PAYOUTS"),async(req:AuthRequest,res)=>{try{const b:any=await PayoutBatch.findById(req.params.id);if(!b)return res.status(404).json({success:false,message:"Payout batch not found"});const status=String(req.body.status||"").toUpperCase();if(!["CREATED","UNDER_REVIEW","APPROVED","PROCESSING","PAID","FAILED"].includes(status))return res.status(400).json({success:false,message:"Invalid batch status"});b.status=status;b.transactionReference=String(req.body.transactionReference||b.transactionReference||"");b.notes=String(req.body.notes||b.notes||"");if(status==="PAID"){b.processedBy=req.user!.id;b.processedAt=new Date();await Order.updateMany({_id:{$in:b.orders}},{$set:{deliveryPayoutStatus:"PAID"}});}await b.save();await recordCustomerCareAudit({req,action:"PAYOUT_BATCH_STATUS_UPDATED",targetType:"PAYOUT_BATCH",targetId:b._id,metadata:{status}});return res.json({success:true,data:b});}catch(e){return res.status(500).json({success:false,message:"Unable to update payout batch"});}});

app.patch("/api/finance/profile/password",auth,financeAuth,async(req:AuthRequest,res)=>{try{const current=String(req.body.currentPassword||""),next=String(req.body.newPassword||"");if(next.length<8)return res.status(400).json({success:false,message:"New password must be at least 8 characters"});const u:any=await User.findById(req.user!.id);if(!u||!(await bcrypt.compare(current,u.password)))return res.status(401).json({success:false,message:"Current password is incorrect"});u.password=await bcrypt.hash(next,10);u.forcePasswordChange=false;await u.save();await recordCustomerCareAudit({req,action:"FINANCE_PASSWORD_CHANGED",targetType:"FINANCE_USER",targetId:u._id});return res.json({success:true,message:"Password changed successfully"});}catch(e){return res.status(500).json({success:false,message:"Unable to change password"});}});

const storeAdminOnly = async (req:AuthRequest,res:any,next:any) => {
  try {
    if(req.user?.role!=="admin") return res.status(403).json({success:false,message:"Store Admin access required"});
    const mainId=await getMainAdminId();
    if(String(req.user.id)===String(mainId||"")) return res.status(403).json({success:false,message:"Use Main Admin operations for global requests"});
    const u:any=await User.findById(req.user.id).select("_id role blocked storeAdmin").lean();
    if(!u||u.blocked||u.role!=="admin") return res.status(403).json({success:false,message:"Store Admin account not available"});
    next();
  }catch(e){return res.status(500).json({success:false,message:"Unable to verify Store Admin access"});}
};

app.get("/api/store-admin/replacement-requests", auth, storeAdminOnly, async (req:AuthRequest,res) => {
  try {
    const status=String(req.query.status||"").toUpperCase();
    const filter:any={sourceType:"STORE",storeId:req.user!.id}; if(status)filter.status=status;
    const rows=await ReplacementRequest.find(filter).sort({createdAt:-1}).limit(500).populate("customer","name email phone customerId").populate("order","_id total status items sourceType storeAdmin").populate("customerCareAgent","name employeeId").populate("deliveryPartner","name employeeId").lean();
    return res.json({success:true,data:rows});
  }catch(e){return res.status(500).json({success:false,message:"Unable to load store replacement requests"});}
});

app.patch("/api/store-admin/replacement-requests/:id", auth, storeAdminOnly, async (req:AuthRequest,res) => {
  try {
    const r:any=await ReplacementRequest.findOne({_id:req.params.id,sourceType:"STORE",storeId:req.user!.id});
    if(!r)return res.status(404).json({success:false,message:"Replacement request not found"});
    const status=String(req.body.status||"").toUpperCase();
    if(!["APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING","DELIVERY","DELIVERY_ASSIGNED","REJECTED"].includes(status))return res.status(400).json({success:false,message:"Invalid Store Admin replacement status"});
    if(replacementTerminalStatuses.includes(r.status))return res.status(400).json({success:false,message:`Replacement is already ${r.status}`});
    if(status==="REJECTED") {
      const reason=String(req.body.reason||"").trim();
      if(reason.length<3)return res.status(400).json({success:false,message:"Rejection reason is required"});
      const oldStatus=r.status;
      r.rejectionReason=reason;
      r.status="REJECTED";
      pushRequestHistory(r,"REJECTED",req.user!.id,"store_admin",reason);
      await releaseReplacementInventory(r,req.user!.id,"Replacement fulfillment rejected; reserved stock released");
      await r.save();
      await notifyRequestStatus(r,"REPLACEMENT","REJECTED",`Reason: ${reason}`);
      await recordCustomerCareAudit({req,action:"REPLACEMENT_STORE_ADMIN_REJECTED",targetType:"REPLACEMENT_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{requestId:r.requestId,oldStatus,newStatus:"REJECTED",reason}});
      return res.json({success:true,message:"Replacement request rejected",data:r});
    }
    if(!["PENDING_STORE_ADMIN","APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING","DELIVERY","DELIVERY_ASSIGNED"].includes(r.status))return res.status(400).json({success:false,message:"Replacement is not ready for store fulfillment"});
    ensureReplacementIdentity(r);
    const order:any=await Order.findById(r.order).select("status deliveredAt address user items storeAdmin sourceType").lean();
    const item:any=order?replacementItem(order,r):null; if(!item)return res.status(409).json({success:false,message:"Original order item could not be resolved"});
    const product:any=await Product.findById(item.product); if(!product)return res.status(409).json({success:false,message:"Replacement product is no longer available"});
    if(["APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING"].includes(status) && !r.inventoryReserved){
      const qty=replacementQuantity(r); if(Number(product.stock||0)<qty)return res.status(409).json({success:false,message:"Replacement unavailable due to insufficient stock"});
      const previousStock=Number(product.stock||0); product.stock=previousStock-qty; await product.save(); await recordStockHistory({product:product._id,change:-qty,previousStock,newStock:product.stock,reason:"Replacement fulfillment stock reserved",order:r.order,adjustedBy:req.user!.id}); r.inventoryReserved=true; r.inventoryReservedAt=new Date();
    }
    if(status==="DELIVERY"||status==="DELIVERY_ASSIGNED"){
      const partnerId=String(req.body.deliveryPartnerId||r.deliveryPartner||""); if(!mongoose.Types.ObjectId.isValid(partnerId))return res.status(400).json({success:false,message:"Delivery Partner is required"});
      const partner:any=await User.findOne({_id:partnerId,role:"delivery",blocked:{$ne:true},storeAdmin:req.user!.id}).select("_id employeeId name").lean(); if(!partner)return res.status(403).json({success:false,message:"Delivery Partner does not belong to this store"});
      r.deliveryPartner=partner._id; r.status="DELIVERY_ASSIGNED"; pushRequestHistory(r,"DELIVERY_ASSIGNED",req.user!.id,"store_admin","Replacement fulfillment prepared and Delivery Partner assigned."); await r.save(); await ReplacementRequest.collection.updateOne({_id:r._id},{$set:{deliveryPartner:partner._id,status:"DELIVERY_ASSIGNED"}});
      await notifyRequestStatus(r,"REPLACEMENT","DELIVERY_ASSIGNED"); await notifyUser({user:r.deliveryPartner,title:"Replacement Delivery Assigned",message:`Replacement ${r.requestId} is assigned to you for delivery.`,type:"replacement_delivery",order:r.order,relatedEntity:"REPLACEMENT_REQUEST",relatedEntityId:r._id});
    } else {
      const normalized=status==="APPROVED"?"REPLACEMENT_APPROVED":status; r.status=normalized; if(normalized==="REPLACEMENT_PROCESSING")r.inventoryReserved=true;
      if(normalized==="REJECTED"){const reason=String(req.body.reason||"").trim();if(reason.length<3)return res.status(400).json({success:false,message:"Rejection reason is required"});r.rejectionReason=reason;await releaseReplacementInventory(r,req.user!.id,"Replacement fulfillment rejected; reserved stock released");}
      pushRequestHistory(r,normalized,req.user!.id,"store_admin",String(req.body.note||req.body.reason||"")); await r.save(); await notifyRequestStatus(r,"REPLACEMENT",normalized);
    }
    await recordCustomerCareAudit({req,action:`REPLACEMENT_STORE_ADMIN_${status}`,targetType:"REPLACEMENT_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{requestId:r.requestId,replacementId:r.replacementId,storeId:r.storeId,deliveryPartner:r.deliveryPartner,inventoryReserved:r.inventoryReserved}});
    return res.json({success:true,data:r});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to update replacement"});}
});

app.get("/api/admin/replacement-requests", auth, mainAdminOnly, async (req:AuthRequest,res) => {
  try { const status=String(req.query.status||"").toUpperCase(); const filter:any={}; if(status)filter.status=status; const rows:any[]=await ReplacementRequest.find(filter).sort({createdAt:-1}).limit(1000).populate("customer","name email phone customerId").populate("order","_id total status items sourceType storeAdmin").populate("storeAdmin","name email employeeId").populate("mainAdmin","name email employeeId").populate("customerCareAgent","name employeeId").populate("deliveryPartner","name employeeId").lean(); await Promise.all(rows.map(async(r:any)=>{const order=r.order||{}; await backfillReplacementLegacyFields(r,order);})); return res.json({success:true,data:rows}); }
  catch(e){return res.status(500).json({success:false,message:"Unable to load replacement requests"});}
});

app.patch("/api/admin/replacement-requests/:id", auth, mainAdminOnly, async (req:AuthRequest,res) => {
  try {
    const r:any=await ReplacementRequest.findById(req.params.id); if(!r)return res.status(404).json({success:false,message:"Replacement request not found"});
    const status=String(req.body.status||"").toUpperCase();
    if(!["APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING","DELIVERY","DELIVERY_ASSIGNED","REJECTED","FAILED","ESCALATED"].includes(status))return res.status(400).json({success:false,message:"Invalid replacement status"});
    if(replacementTerminalStatuses.includes(r.status))return res.status(400).json({success:false,message:`Replacement is already ${r.status}`});
    if(r.sourceType==="STORE" && !["REJECTED","FAILED","ESCALATED"].includes(status))return res.status(403).json({success:false,message:"Store replacement must be fulfilled by the owning Store Admin"});
    if(status==="REJECTED") {
      const reason=String(req.body.reason||"").trim();
      if(reason.length<3)return res.status(400).json({success:false,message:"Rejection reason is required"});
      const oldStatus=r.status;
      r.rejectionReason=reason;
      r.status="REJECTED";
      r.mainAdmin=req.user!.id;
      if(r.sourceType==="FRESHBASKET_DIRECT") { r.fulfillmentOwnerType="MAIN_ADMIN"; r.fulfillmentOwnerId=req.user!.id; r.storeAdmin=null; r.storeId=null; }
      pushRequestHistory(r,"REJECTED",req.user!.id,"main_admin",reason);
      await releaseReplacementInventory(r,req.user!.id,"FreshBasket Direct replacement rejected; reserved stock released");
      await r.save();
      await notifyRequestStatus(r,"REPLACEMENT","REJECTED",`Reason: ${reason}`);
      await recordCustomerCareAudit({req,action:"MAIN_ADMIN_REPLACEMENT_REJECTED",targetType:"REPLACEMENT_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{requestId:r.requestId,oldStatus,newStatus:"REJECTED",reason,sourceType:r.sourceType}});
      return res.json({success:true,message:"Replacement request rejected",data:r});
    }
    ensureReplacementIdentity(r);
    const order:any=await Order.findById(r.order).select("status deliveredAt address user items storeAdmin sourceType").lean(); const item:any=order?replacementItem(order,r):null; if(!item)return res.status(409).json({success:false,message:"Original order item could not be resolved"});
    const product:any=await Product.findById(item.product); if(!product)return res.status(409).json({success:false,message:"Replacement product is no longer available"});
    if(["APPROVED","REPLACEMENT_APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING"].includes(status) && !r.inventoryReserved){
      const qty=replacementQuantity(r); if(Number(product.stock||0)<qty)return res.status(409).json({success:false,message:"Replacement unavailable due to insufficient stock"});
      const previousStock=Number(product.stock||0); product.stock=previousStock-qty; await product.save(); await recordStockHistory({product:product._id,change:-qty,previousStock,newStock:product.stock,reason:"FreshBasket Direct replacement stock reserved",order:r.order,adjustedBy:req.user!.id}); r.inventoryReserved=true; r.inventoryReservedAt=new Date();
    }
    if(status==="DELIVERY"||status==="DELIVERY_ASSIGNED"){
      const partnerId=String(req.body.deliveryPartnerId||r.deliveryPartner||""); if(!mongoose.Types.ObjectId.isValid(partnerId))return res.status(400).json({success:false,message:"Delivery Partner is required"});
      const partner:any=await User.findOne({_id:partnerId,role:"delivery",blocked:{$ne:true}}).select("_id employeeId name").lean(); if(!partner)return res.status(403).json({success:false,message:"Invalid Delivery Partner for this replacement"});
      await ReplacementRequest.updateOne({_id:r._id},{$set:{deliveryPartner:partner._id,status:"DELIVERY_ASSIGNED"}}); r.deliveryPartner=partner._id; r.status="DELIVERY_ASSIGNED"; pushRequestHistory(r,"DELIVERY_ASSIGNED",req.user!.id,"main_admin","FreshBasket Direct replacement assigned for delivery."); await r.save(); await ReplacementRequest.collection.updateOne({_id:r._id},{$set:{deliveryPartner:partner._id,status:"DELIVERY_ASSIGNED"}}); await notifyRequestStatus(r,"REPLACEMENT","DELIVERY_ASSIGNED"); await notifyUser({user:r.deliveryPartner,title:"Replacement Delivery Assigned",message:`Replacement ${r.requestId} is assigned to you for delivery.`,type:"replacement_delivery",order:r.order,relatedEntity:"REPLACEMENT_REQUEST",relatedEntityId:r._id});
    } else if(status==="ESCALATED"){
      const reason=String(req.body.reason||"").trim(); if(reason.length<3)return res.status(400).json({success:false,message:"Escalation reason is required"}); r.escalationReason=reason; r.escalatedAt=new Date(); r.status="ESCALATED"; pushRequestHistory(r,"ESCALATED",req.user!.id,"main_admin",reason); await r.save(); await notifyRequestStatus(r,"REPLACEMENT","ESCALATED",reason);
    } else {
      const normalized=status==="APPROVED"?"REPLACEMENT_APPROVED":status; r.mainAdmin=req.user!.id; r.fulfillmentOwnerType="MAIN_ADMIN"; r.fulfillmentOwnerId=req.user!.id; r.status=normalized; if(normalized==="REPLACEMENT_PROCESSING")r.inventoryReserved=true;
      if(normalized==="REJECTED"){const reason=String(req.body.reason||"").trim();if(reason.length<3)return res.status(400).json({success:false,message:"Rejection reason is required"});r.rejectionReason=reason;await releaseReplacementInventory(r,req.user!.id,"FreshBasket Direct replacement rejected; reserved stock released");} if(normalized==="FAILED")r.rejectionReason=String(req.body.reason||"Replacement fulfillment failed").trim();
      pushRequestHistory(r,normalized,req.user!.id,"main_admin",String(req.body.note||req.body.reason||"")); await r.save(); await notifyRequestStatus(r,"REPLACEMENT",normalized);
    }
    await recordCustomerCareAudit({req,action:`MAIN_ADMIN_REPLACEMENT_${status}`,targetType:"REPLACEMENT_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{requestId:r.requestId,replacementId:r.replacementId,sourceType:r.sourceType,storeId:r.storeId,deliveryPartner:r.deliveryPartner,inventoryReserved:r.inventoryReserved}}); return res.json({success:true,data:r});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to update replacement request"});}
});

app.get("/api/delivery/replacement-requests", auth, role("delivery"), async (req:AuthRequest,res) => {
  try {
    const rows=await ReplacementRequest.find({deliveryPartner:req.user!.id,status:{$in:["DELIVERY","DELIVERY_ASSIGNED","OUT_FOR_DELIVERY"]}}).sort({createdAt:-1}).limit(100)
      .populate("customer","name phone customerId").populate("order","_id address items sourceType storeAdmin deliveredAt status").populate("productId","name sku image").lean();
    return res.json({success:true,data:rows});
  } catch(e){return res.status(500).json({success:false,message:"Unable to load replacement deliveries"});}
});
app.get("/api/delivery/replacement-requests/:id", auth, role("delivery"), async (req:AuthRequest,res) => {
  try {
    const r:any=await ReplacementRequest.findOne({_id:req.params.id,deliveryPartner:req.user!.id}).populate("customer","name phone customerId").populate("order").populate("productId","name sku image").lean();
    if(!r)return res.status(404).json({success:false,message:"Replacement delivery not found"});
    return res.json({success:true,data:r});
  } catch(e){return res.status(500).json({success:false,message:"Unable to load replacement delivery"});}
});
app.post("/api/delivery/replacement-requests/:id/proof", auth, role("delivery"), async (req:AuthRequest,res) => {
  try {
    const r:any=await ReplacementRequest.findOne({_id:req.params.id,deliveryPartner:req.user!.id}); if(!r)return res.status(404).json({success:false,message:"Replacement delivery not found"});
    if(!["DELIVERY_ASSIGNED","OUT_FOR_DELIVERY"].includes(r.status))return res.status(400).json({success:false,message:"Replacement is not active for delivery"});
    const evidence=imageList([req.body.image]); if(!evidence.length)return res.status(400).json({success:false,message:"Valid proof image is required"}); if(evidence[0].length>1200000)return res.status(400).json({success:false,message:"Proof image is too large"});
    const uploadedAt=new Date();
    const proofPayload={image:evidence[0],uploadedAt,completedAt:null};
    // Persist the complete Mixed field so legacy records with deliveryProof=null
    // are handled safely. Only report success after reading the saved proof back.
    // The request was already loaded with the authenticated delivery partner above.
    // Do not treat a driver-version-specific update result shape as an assignment
    // conflict: some Mongo/Mongoose versions expose `n` instead of `matchedCount`.
    // Persist first, then verify by reading the authoritative document back.
    await ReplacementRequest.collection.updateOne(
      {_id:r._id},
      {$set:{deliveryProof:proofPayload}}
    );
    let persisted:any=await ReplacementRequest.collection.findOne({_id:r._id},{projection:{deliveryProof:1,deliveryPartner:1,status:1}});
    if(!persisted?.deliveryProof?.image){
      (r as any).deliveryProof=proofPayload;
      await r.save();
      persisted=await ReplacementRequest.collection.findOne({_id:r._id},{projection:{deliveryProof:1,deliveryPartner:1,status:1}});
    }
    if(!persisted?.deliveryProof?.image)return res.status(500).json({success:false,message:"Replacement delivery proof could not be persisted"});
    await recordCustomerCareAudit({req,action:"REPLACEMENT_PROOF_UPLOADED",targetType:"REPLACEMENT_REQUEST",targetId:r._id,customer:r.customer,order:r.order,metadata:{requestId:r.requestId,deliveryPartner:r.deliveryPartner,uploadedAt}});
    return res.json({success:true,message:"Replacement delivery proof uploaded successfully",data:{deliveryProof:persisted.deliveryProof}});
  }catch(e:any){return res.status(400).json({success:false,message:e?.message||"Unable to upload replacement proof"});}
});
app.patch("/api/delivery/replacement-requests/:id", auth, role("delivery"), async (req:AuthRequest,res) => {
  try {
    const r:any=await ReplacementRequest.findOne({
      _id:req.params.id,
      deliveryPartner:req.user!.id
    });

    if(!r){
      return res.status(404).json({
        success:false,
        message:"Replacement delivery not found"
      });
    }

    const status=String(req.body.status||"").trim().toUpperCase();

    if(status==="OUT_FOR_DELIVERY"){
      if(r.status!=="DELIVERY_ASSIGNED"){
        return res.status(400).json({
          success:false,
          message:"Replacement must be assigned before starting delivery"
        });
      }

      const startedAt=new Date();
      r.status="OUT_FOR_DELIVERY";
      r.deliveryStartedAt=startedAt;
      pushRequestHistory(r,"OUT_FOR_DELIVERY",req.user!.id,"delivery");
      await r.save();

      try{
        await notifyRequestStatus(r,"REPLACEMENT","OUT_FOR_DELIVERY");
        await recordCustomerCareAudit({
          req,
          action:"REPLACEMENT_OUT_FOR_DELIVERY",
          targetType:"REPLACEMENT_REQUEST",
          targetId:r._id,
          customer:r.customer,
          order:r.order,
          metadata:{requestId:r.requestId,deliveryPartner:r.deliveryPartner}
        });
      }catch(notificationError){
        console.error("REPLACEMENT OUT-FOR-DELIVERY NOTIFICATION/AUDIT ERROR:",notificationError);
      }

      return res.json({success:true,data:r});
    }

    if(!["COMPLETED","FAILED"].includes(status)){
      return res.status(400).json({
        success:false,
        message:"Invalid delivery status"
      });
    }

    if(!["OUT_FOR_DELIVERY","DELIVERY"].includes(r.status)){
      if(["REPLACED","COMPLETED","CLOSED"].includes(String(r.status))){
        return res.status(409).json({
          success:false,
          message:"Replacement is already completed"
        });
      }
      return res.status(400).json({
        success:false,
        message:"Replacement is not out for delivery"
      });
    }

    if(status==="COMPLETED"){
      // Always re-read the authoritative document before completing. This
      // prevents stale frontend state from completing the wrong lifecycle.
      let persisted:any=await ReplacementRequest.findOne({
        _id:r._id,
        deliveryPartner:req.user!.id
      }).lean();

      if(!persisted){
        return res.status(404).json({
          success:false,
          message:"Replacement delivery not found"
        });
      }

      if(["REPLACED","COMPLETED","CLOSED"].includes(String(persisted.status))){
        return res.status(409).json({
          success:false,
          message:"Replacement is already completed"
        });
      }

      let proofImage=String(persisted?.deliveryProof?.image||"").trim();

      // Recovery path for a legacy/partially persisted proof. The frontend
      // only sends the same proof that the authenticated rider already owns.
      if(!proofImage){
        const recoveryImage=String(req.body.proofImage||"").trim();
        if(
          /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(recoveryImage) &&
          recoveryImage.length<=1200000
        ){
          const recoveryProof={
            image:recoveryImage,
            uploadedAt:persisted?.deliveryProof?.uploadedAt||new Date(),
            completedAt:null
          };

          await ReplacementRequest.collection.updateOne(
            {_id:r._id,deliveryPartner:req.user!.id},
            {$set:{deliveryProof:recoveryProof}}
          );

          persisted=await ReplacementRequest.findOne({
            _id:r._id,
            deliveryPartner:req.user!.id
          }).lean();

          proofImage=String(persisted?.deliveryProof?.image||"").trim();
        }
      }

      if(!proofImage){
        return res.status(400).json({
          success:false,
          message:"Upload replacement delivery proof before completing delivery."
        });
      }

      const deliveredAt=new Date();

      // Atomic transition: only an active delivery can be completed.
      const completedResult:any=await (ReplacementRequest.collection as any).updateOne(
        {
          // r was already loaded with deliveryPartner:req.user!.id above.
          // Do not re-match the raw MongoDB ObjectId field against the auth
          // string here; the native collection API does not perform the
          // Mongoose casting that findOne() does.
          _id:r._id,
          status:{$in:["OUT_FOR_DELIVERY","DELIVERY"]}
        },
        {
          $set:{
            status:"REPLACED",
            replacementDeliveredAt:deliveredAt,
            "deliveryProof.completedAt":deliveredAt
          },
          $push:{
            statusHistory: {
              status:"REPLACED",
              by:req.user!.id,
              role:"delivery",
              at:deliveredAt,
              note:"Replacement delivered with persisted proof."
            }
          }
        } as any
      );

      const matchedCount=Number(
        completedResult?.matchedCount ??
        completedResult?.n ??
        0
      );

      if(matchedCount!==1){
        const latest:any=await ReplacementRequest.findById(r._id).lean();
        if(["REPLACED","COMPLETED","CLOSED"].includes(String(latest?.status))){
          return res.status(409).json({
            success:false,
            message:"Replacement is already completed"
          });
        }
        return res.status(409).json({
          success:false,
          message:"Replacement status changed. Refresh and try again."
        });
      }

      // Close only after the delivery transition has definitely persisted.
      const closedAt=new Date();
      await (ReplacementRequest.collection as any).updateOne(
        {_id:r._id,status:"REPLACED"},
        {
          $set:{
            status:"CLOSED",
            closedAt
          },
          $push:{
            statusHistory: {
              status:"CLOSED",
              by:req.user!.id,
              role:"delivery",
              at:closedAt,
              note:"Replacement request closed after successful delivery."
            }
          }
        }
      );

      const finalRequest:any=await ReplacementRequest.findById(r._id).lean();

      // Notifications/audit are secondary. They must never turn a successful
      // database transition into a failed API response.
      try{
        await notifyRequestStatus(finalRequest,"REPLACEMENT","REPLACED");
        await notifyRequestStatus({...finalRequest,status:"CLOSED"},"REPLACEMENT","CLOSED");
        await recordCustomerCareAudit({
          req,
          action:"REPLACEMENT_DELIVERY_COMPLETED",
          targetType:"REPLACEMENT_REQUEST",
          targetId:r._id,
          customer:r.customer,
          order:r.order,
          metadata:{
            requestId:r.requestId,
            deliveryPartner:r.deliveryPartner,
            replacementDeliveredAt:deliveredAt
          }
        });
      }catch(notificationError){
        console.error("REPLACEMENT COMPLETION NOTIFICATION/AUDIT ERROR:",notificationError);
      }

      return res.json({
        success:true,
        message:"Replacement delivery completed successfully",
        data:finalRequest
      });
    }

    const reason=String(req.body.note||"Replacement delivery failed").trim();
    if(reason.length<3){
      return res.status(400).json({
        success:false,
        message:"A replacement delivery failure reason is required"
      });
    }

    r.status="FAILED";
    r.rejectionReason=reason;
    pushRequestHistory(r,"FAILED",req.user!.id,"delivery",reason);
    await r.save();

    try{
      await notifyRequestStatus(r,"REPLACEMENT","FAILED",reason);
      await recordCustomerCareAudit({
        req,
        action:"REPLACEMENT_DELIVERY_FAILED",
        targetType:"REPLACEMENT_REQUEST",
        targetId:r._id,
        customer:r.customer,
        order:r.order,
        metadata:{
          requestId:r.requestId,
          deliveryPartner:r.deliveryPartner,
          reason
        }
      });
    }catch(notificationError){
      console.error("REPLACEMENT FAILURE NOTIFICATION/AUDIT ERROR:",notificationError);
    }

    return res.json({success:true,data:r});
  } catch(e:any){
    console.error("REPLACEMENT DELIVERY UPDATE ERROR:",e);
    return res.status(400).json({
      success:false,
      message:e?.message||"Unable to update replacement delivery"
    });
  }
});

app.get("/api/admin/support-center",auth,mainAdminOnly,async(req,res)=>{try{const status=String(req.query.status||"");const category=String(req.query.category||"");const filter:any={};if(status)filter.status=status;if(category)filter.category=category;const [tickets,refunds,replacements]=await Promise.all([SupportTicket.find(filter).sort({createdAt:-1}).limit(300).populate("customer","name email phone").populate("order","_id total status").populate("assignedCustomerCare","name employeeId").lean(),RefundRequest.find({}).sort({createdAt:-1}).limit(300).lean(),ReplacementRequest.find({}).sort({createdAt:-1}).limit(300).lean()]);return res.json({success:true,data:{tickets,refunds,replacements}});}catch(e){return res.status(500).json({success:false,message:"Unable to load support center"});}});
app.patch("/api/admin/support-center/tickets/:id",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const t:any=await SupportTicket.findById(req.params.id);if(!t)return res.status(404).json({success:false,message:"Ticket not found"});if(req.body.status&&SUPPORT_TICKET_STATUSES.includes(String(req.body.status)))t.status=String(req.body.status);if(req.body.priority)t.priority=String(req.body.priority).toUpperCase();if(req.body.assignedCustomerCareId){const u:any=await User.findOne({_id:req.body.assignedCustomerCareId,role:"customer_care",blocked:{$ne:true}}).lean();if(!u)return res.status(400).json({success:false,message:"Customer Care Executive not found"});t.assignedCustomerCare=u._id;}if(["RESOLVED","CLOSED"].includes(t.status)&&!t.resolvedAt)t.resolvedAt=new Date();await t.save();await recordCustomerCareAudit({req,action:"ADMIN_TICKET_UPDATED",targetType:"SUPPORT_TICKET",targetId:t.ticketId,ticket:t._id,customer:t.customer,order:t.order});return res.json({success:true,data:t});}catch(e){return res.status(500).json({success:false,message:"Unable to update ticket"});}});

app.get("/api/admin/delivery-sla",auth,mainAdminOnly,async(_req,res)=>{try{const d:any=await DeliveryPayoutConfig.findOneAndUpdate({key:"default"},{},{upsert:true,new:true,setDefaultsOnInsert:true}).lean();return res.json({success:true,data:normalizeDeliverySlaConfig(d)});}catch(e){return res.status(500).json({success:false,message:"Unable to load delivery SLA settings"});}});
app.patch("/api/admin/delivery-sla",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const incoming=req.body?.deliverySlaMinutes||req.body||{};const deliverySlaMinutes:any={};for(const key of ["orderReceived","packing","pickup","delivery"]){if(incoming[key]===null||incoming[key]===""||incoming[key]===undefined){deliverySlaMinutes[key]=null;continue;}const n=Number(incoming[key]);if(!Number.isFinite(n)||n<=0||n>10080)return res.status(400).json({success:false,message:`Invalid ${key} SLA. Use minutes from 1 to 10080 or null to disable.`});deliverySlaMinutes[key]=n;}const previous:any=await DeliveryPayoutConfig.findOne({key:"default"}).lean();const d:any=await DeliveryPayoutConfig.findOneAndUpdate({key:"default"},{$set:{deliverySlaMinutes}},{upsert:true,new:true,setDefaultsOnInsert:true});await recordEntityChange({req,action:"DELIVERY_SLA_CONFIGURATION_CHANGED",targetType:"CONFIGURATION",targetId:"delivery-sla",before:{deliverySlaMinutes:previous?.deliverySlaMinutes||{}},after:{deliverySlaMinutes:d?.deliverySlaMinutes||{}},reason:req.body?.reason||"Delivery SLA configuration updated"});return res.json({success:true,message:"Delivery SLA configuration updated",data:normalizeDeliverySlaConfig(d)});}catch(e){return res.status(400).json({success:false,message:"Unable to update delivery SLA settings"});}});

app.get("/api/admin/support-sla",auth,mainAdminOnly,async(_req,res)=>{try{const d:any=await DeliveryPayoutConfig.findOneAndUpdate({key:"default"},{},{upsert:true,new:true,setDefaultsOnInsert:true});return res.json({success:true,data:d?.slaMinutes||{urgent:30,high:60,medium:240,low:1440}});}catch(e){return res.status(500).json({success:false,message:"Unable to load SLA settings"});}});
app.patch("/api/admin/support-sla",auth,mainAdminOnly,async(req:AuthRequest,res)=>{try{const x:any={urgent:Number(req.body.urgent),high:Number(req.body.high),medium:Number(req.body.medium),low:Number(req.body.low)};if(!Object.values(x).every((v:any)=>Number.isFinite(v)&&v>0&&v<=10080))return res.status(400).json({success:false,message:"SLA values must be valid minutes"});const previous:any=await DeliveryPayoutConfig.findOne({key:"default"}).lean();const d:any=await DeliveryPayoutConfig.findOneAndUpdate({key:"default"},{$set:{slaMinutes:x}},{upsert:true,new:true,setDefaultsOnInsert:true});await recordEntityChange({req,action:"SUPPORT_SLA_CONFIGURATION_CHANGED",targetType:"CONFIGURATION",targetId:"support-sla",before:{slaMinutes:previous?.slaMinutes||{}},after:{slaMinutes:d?.slaMinutes||{}},reason:req.body?.reason||"Support SLA configuration updated"});return res.json({success:true,data:d.slaMinutes});}catch(e){return res.status(400).json({success:false,message:"Unable to update SLA"});}});

/* =========================================================
   GET SINGLE ORDER / TRACK ORDER
========================================================= */

app.get(
  "/api/orders/:id",
  auth,
  async (req: AuthRequest, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const order = await Order.findById(req.params.id)
        .populate("user", "name email phone customerId")
        .populate("deliveryPartner", "name email phone role");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Customers can track only their own orders. Admins can track only their store.
      // Delivery partners can track only orders assigned to them.
      if (req.user!.role === "customer" && String(order.user?._id || order.user) !== String(req.user!.id)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      if (req.user!.role === "admin" && !(await belongsToTenant(req, order))) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      if (req.user!.role === "delivery" && String(order.deliveryPartner?._id || order.deliveryPartner) !== String(req.user!.id)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      // Keep the initial status timestamp for older orders and record the
      // current known status when statusHistory was not present before.
      if (!Array.isArray((order as any).statusHistory)) {
        (order as any).statusHistory = [];
      }

      const hasCurrentStatus = (order as any).statusHistory.some(
        (entry: any) => entry.status === order.status
      );

      if (!hasCurrentStatus) {
        (order as any).statusHistory.push({
          status: order.status,
          timestamp: order.updatedAt || order.createdAt,
        });
        await order.save();
      }

      const responseOrder:any = order.toObject ? order.toObject() : order;
      if (req.user!.role === "customer" && responseOrder?.deliveryProof) {
        responseOrder.deliveryProof = { uploadedAt: responseOrder.deliveryProof.uploadedAt, completedAt: responseOrder.deliveryProof.completedAt, available: Boolean(responseOrder.deliveryProof.image) };
      }
      return res.json({
        success: true,
        data: responseOrder,
      });
    } catch (error) {
      console.error("SINGLE ORDER ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load this order",
      });
    }
  }
);


const getActiveDeliveryLocationShare = async (orderId:string, sharedBy:"customer"|"delivery") => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null;
  const share:any = await DeliveryLocationShare.findOne({orderId, sharedBy, enabled:true, expiresAt:{$gt:new Date()}}).lean();
  return share || null;
};

app.patch("/api/orders/:id/delivery-location-share", auth, roleAny("customer", "delivery"), async (req:AuthRequest,res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Order not found"});
    const order:any = await Order.findById(req.params.id).select("_id user deliveryPartner status").lean();
    if (!order) return res.status(404).json({success:false,message:"Order not found"});
    const role = String(req.user?.role || "").trim().toLowerCase();
    const userId = String(req.user!.id);
    const customerId = String(order.user || "");
    const partnerId = String(order.deliveryPartner || "");
    if ((role === "customer" && userId !== customerId) || (role === "delivery" && userId !== partnerId)) return res.status(403).json({success:false,message:"Forbidden"});
    if (String(order.status) !== "Out for Delivery") return res.status(400).json({success:false,message:"Location sharing is available only while the order is out for delivery."});
    if (!partnerId) return res.status(409).json({success:false,message:"A Delivery Partner is not currently assigned to this order."});

    const enabled = req.body?.enabled !== false;
    const sharedBy = role as "customer"|"delivery";
    if (!enabled) {
      await DeliveryLocationShare.updateOne({orderId:order._id,sharedBy},{$set:{enabled:false,expiresAt:new Date()}});
      return res.json({success:true,data:{enabled:false,sharedBy}});
    }

    const durationRaw = Number(req.body?.durationMinutes ?? 30);
    const durationMinutes = Number.isFinite(durationRaw) ? Math.min(120, Math.max(5, Math.floor(durationRaw))) : 30;
    let latitude:any = null, longitude:any = null, accuracy:any = null;
    if (sharedBy === "customer") {
      latitude = Number(req.body?.latitude); longitude = Number(req.body?.longitude);
      accuracy = req.body?.accuracy == null ? null : Number(req.body.accuracy);
      if (!isValidGeo(latitude, longitude)) return res.status(400).json({success:false,message:"A valid current customer location is required to share location."});
      if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000)) return res.status(400).json({success:false,message:"Invalid location accuracy"});
    } else {
      const partner:any = await User.findById(req.user!.id).select("latitude longitude locationAccuracy locationUpdatedAt").lean();
      if (!partner || !isValidGeo(partner.latitude, partner.longitude)) return res.status(400).json({success:false,message:"Delivery Partner location is not configured with valid coordinates."});
      latitude = Number(partner.latitude); longitude = Number(partner.longitude); accuracy = partner.locationAccuracy ?? null;
    }
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const share:any = await DeliveryLocationShare.findOneAndUpdate(
      {orderId:order._id,sharedBy},
      {$set:{customerId:order.user,deliveryPartnerId:order.deliveryPartner,enabled:true,latitude,longitude,accuracy,expiresAt}},
      {upsert:true,new:true,setDefaultsOnInsert:true}
    ).lean();
    return res.json({success:true,data:{enabled:true,sharedBy,latitude,longitude,accuracy,expiresAt,remainingSeconds:Math.max(0,Math.round((new Date(expiresAt).getTime()-Date.now())/1000))}});
  } catch(e) {
    console.error("DELIVERY LOCATION SHARE ERROR:",e);
    return res.status(500).json({success:false,message:"Unable to update location sharing."});
  }
});

app.get("/api/orders/:id/delivery-location-share", auth, roleAny("customer", "delivery"), async (req:AuthRequest,res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Order not found"});
    const order:any = await Order.findById(req.params.id).select("_id user deliveryPartner status").lean();
    if (!order) return res.status(404).json({success:false,message:"Order not found"});
    const role = String(req.user?.role || "").trim().toLowerCase();
    const userId = String(req.user!.id);
    if ((role === "customer" && userId !== String(order.user)) || (role === "delivery" && userId !== String(order.deliveryPartner || ""))) return res.status(403).json({success:false,message:"Forbidden"});
    const now = new Date();
    await DeliveryLocationShare.updateMany({orderId:order._id,enabled:true,expiresAt:{$lte:now}},{$set:{enabled:false}});
    const own:any = await DeliveryLocationShare.findOne({orderId:order._id,sharedBy:role,enabled:true,expiresAt:{$gt:now}}).lean();
    const otherRole = role === "customer" ? "delivery" : "customer";
    const other:any = await DeliveryLocationShare.findOne({orderId:order._id,sharedBy:otherRole,enabled:true,expiresAt:{$gt:now}}).lean();
    return res.json({success:true,data:{own:own?{enabled:true,sharedBy:own.sharedBy,expiresAt:own.expiresAt,remainingSeconds:Math.max(0,Math.round((new Date(own.expiresAt).getTime()-Date.now())/1000))}:null,other:other?{enabled:true,sharedBy:other.sharedBy,latitude:other.latitude,longitude:other.longitude,accuracy:other.accuracy,expiresAt:other.expiresAt,remainingSeconds:Math.max(0,Math.round((new Date(other.expiresAt).getTime()-Date.now())/1000))}:null}});
  } catch(e) { return res.status(500).json({success:false,message:"Unable to load location sharing status."}); }
});

app.get("/api/orders/:id/tracking/route",auth,async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findById(req.params.id).populate("deliveryPartner","_id latitude longitude locationUpdatedAt").lean();
    if(!order) return res.status(404).json({success:false,message:"Order not found"});
    if(req.user!.role==="customer"&&String(order.user)!==String(req.user!.id)) return res.status(403).json({success:false,message:"Forbidden"});
    if(req.user!.role==="delivery"&&String(order.deliveryPartner?._id||order.deliveryPartner)!==String(req.user!.id)) return res.status(403).json({success:false,message:"Forbidden"});
    if(req.user!.role==="admin"&&!(await belongsToTenant(req,order))) return res.status(403).json({success:false,message:"Forbidden"});

    const destination=await resolveDeliveryDestination(order);
    const owner=order.storeAdmin||await getMainAdminId();
    const store:any=await StoreLocation.findOne(owner?{$or:[{storeAdmin:owner},{key:String(owner)},{key:"main"}]}:{key:"main"}).lean();
    const storePoint=isValidGeo(store?.latitude,store?.longitude)?{latitude:Number(store.latitude),longitude:Number(store.longitude)}:null;
    const partner:any=order.deliveryPartner?await User.findById(order.deliveryPartner._id||order.deliveryPartner).select("latitude longitude locationUpdatedAt").lean():null;
    const partnerPoint=partner&&isValidGeo(partner.latitude,partner.longitude)?{latitude:Number(partner.latitude),longitude:Number(partner.longitude)}:null;

    let points:any[]=[];
    if(order.status==="Out for Delivery" && partnerPoint && destination){
      // After pickup, the store is no longer a route stop. Including it here
      // can force the road route to backtrack through the store.
      points=[partnerPoint,destination];
    } else if(order.status==="Packed" && storePoint && destination){
      points=[storePoint,destination];
    } else if(storePoint && destination){
      points=[storePoint,destination];
    }
    if(points.length<2) return res.json({success:true,data:{available:false,coordinates:[],message:"Live route data is unavailable."}});
    const result=await routeGeometry(points);
    if(!result) return res.json({success:true,data:{available:false,coordinates:[],message:"Live road route is currently unavailable."}});
    return res.json({success:true,data:{available:true,coordinates:result.coordinates,distanceKm:result.distanceKm,etaMinutes:result.etaMinutes,source:result.source}});
  }catch(e){console.error("DELIVERY ROUTE ERROR:",e);return res.status(500).json({success:false,message:"Unable to load delivery route"});}
});

/* =========================================================
   POINT 36 — AI DELIVERY ETA ASSISTANT
   Customer-facing, order-grounded ETA assistant. Uses the same
   live delivery location + road-routing signals as tracking.
   Never fabricates an ETA when reliable routing data is unavailable.
========================================================= */
app.post("/api/customer/ai-delivery-eta",auth,role("customer"),async(req:AuthRequest,res)=>{
  try{
    const query=String(req.body?.query||"").trim();
    const requestedOrderId=String(req.body?.orderId||"").trim();
    if(query.length>500)return res.status(400).json({success:false,message:"Question is too long."});

    const orderQuery:any={user:req.user!.id,status:{$nin:["Cancelled"]}};
    if(requestedOrderId){
      if(!mongoose.Types.ObjectId.isValid(requestedOrderId))return res.status(400).json({success:false,message:"Invalid order ID."});
      orderQuery._id=requestedOrderId;
    }
    const orders:any[]=await Order.find(orderQuery)
      .select("_id status total createdAt updatedAt deliveryPartner deliveryAssignmentStatus deliveredAt deliverySlot slaDueAt storeAdmin deliveryLocation address")
      .sort({createdAt:-1}).limit(20).lean();
    if(!orders.length)return res.json({success:true,data:{available:false,message:"I could not find an order available for delivery ETA."}});

    const activeStatuses=["Packed","Out for Delivery"];
    const active=orders.find((o:any)=>activeStatuses.includes(String(o.status))) || orders[0];
    const order=active;
    const owner=order.storeAdmin||await getMainAdminId();
    const store:any=await StoreLocation.findOne(owner?{$or:[{storeAdmin:owner},{key:String(owner)},{key:"main"}]}:{key:"main"}).lean();
    const destination=await resolveDeliveryDestination(order);
    const partner:any=order.deliveryPartner?await User.findById(order.deliveryPartner._id||order.deliveryPartner).select("_id name latitude longitude locationAccuracy locationUpdatedAt onlineStatus availabilityStatus").lean():null;
    const freshness=locationFreshness(partner?.locationUpdatedAt);
    const partnerPoint=partner&&isValidGeo(partner.latitude,partner.longitude)&&freshness.fresh?{latitude:Number(partner.latitude),longitude:Number(partner.longitude)}:null;
    let metrics:any=null;
    if(String(order.status)==="Out for Delivery"&&partnerPoint&&destination){
      metrics=await roadMetrics(partnerPoint.latitude,partnerPoint.longitude,destination.latitude,destination.longitude);
    }
    const sla=deliverySlaSnapshot(order);
    const confidence=etaConfidenceSnapshot({status:order.status,location:freshness,routing:metrics,sla});
    const window=etaWindowSnapshot(metrics?.etaMinutes,confidence);
    const isEtaQuestion=/(eta|arriv|how long|when.*(arrive|deliver)|delivery.*(time|when)|kab|kitne.*minute|pahu[nñ]ch|aayega|aayegi)/i.test(query);
    const hasFreshRoute=Boolean(metrics?.etaMinutes!=null&&metrics?.roadDistanceKm!=null&&metrics?.source);

    let message="";
    if(String(order.status)==="Delivered"){
      message="This order has already been delivered.";
    }else if(String(order.status)==="Cancelled"){
      message="This order was cancelled and has no delivery ETA.";
    }else if(String(order.status) !== "Out for Delivery"){
      message=order.deliverySlot
        ? `Your order is currently ${String(order.status||"in preparation")}. The selected delivery slot is ${String(order.deliverySlot)}. A live arrival ETA will be available once the order is out for delivery.`
        : `Your order is currently ${String(order.status||"in preparation")}. A live arrival ETA will be available once the order is out for delivery.`;
    }else if(hasFreshRoute&&window){
      const eta=Number(metrics.etaMinutes);
      const start=new Date(window.startAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
      const end=new Date(window.endAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
      message=`Based on the Delivery Partner's fresh location and current road route, the estimated travel time is about ${eta} minutes. Expected arrival: ${start}–${end}.`;
    }else if(!destination){
      message="I can't provide a reliable ETA because the delivery destination does not have usable coordinates yet. The normal order tracking remains available.";
    }else if(!partner){
      message="A Delivery Partner has not been assigned yet, so a live ETA is not available.";
    }else if(!freshness.fresh){
      message=`A reliable live ETA is not available because the Delivery Partner's location is ${freshness.ageSeconds!=null?`about ${Math.max(1,Math.round(freshness.ageSeconds/60))} minutes old`:"currently unavailable"}.`;
    }else{
      message="The Delivery Partner location is available, but live road-routing data is currently unavailable. I won't estimate a delivery time without a reliable route.";
    }
    return res.json({success:true,data:{
      available:hasFreshRoute,
      questionRecognized:isEtaQuestion,
      order:{id:order._id,status:order.status,total:order.total,createdAt:order.createdAt,deliverySlot:order.deliverySlot||null},
      message,
      etaMinutes:hasFreshRoute?metrics.etaMinutes:null,
      distanceRemainingKm:hasFreshRoute?metrics.roadDistanceKm:null,
      etaWindow:window,
      confidence,
      deliveryPartner:partner?{id:partner._id,name:partner.name||"Delivery Partner"}:null,
      location:{fresh:freshness.fresh,ageSeconds:freshness.ageSeconds,updatedAt:partner?.locationUpdatedAt||null},
      routingSource:metrics?.source||null,
      sla,
      handoffRequired:!hasFreshRoute
    }});
  }catch(e:any){console.error("AI DELIVERY ETA ASSISTANT ERROR:",e);return res.status(500).json({success:false,message:"Unable to calculate delivery ETA right now."});}
});

app.get("/api/orders/:id/tracking",auth,async(req:AuthRequest,res)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(404).json({success:false,message:"Order not found"});
    const order:any=await Order.findById(req.params.id).populate("deliveryPartner","_id name phone profilePhoto").lean();
    if(!order)return res.status(404).json({success:false,message:"Order not found"});
    if(req.user!.role==="customer"&&String(order.user)!==String(req.user!.id))return res.status(403).json({success:false,message:"Forbidden"});
    if(req.user!.role==="delivery"&&String(order.deliveryPartner?._id||order.deliveryPartner)!==String(req.user!.id))return res.status(403).json({success:false,message:"Forbidden"});
    if(req.user!.role==="admin"&&!(await belongsToTenant(req,order)))return res.status(403).json({success:false,message:"Forbidden"});
    const locationSharePartner = req.user!.role === "customer" ? await getActiveDeliveryLocationShare(String(order._id), "delivery") : null;
    const locationShareCustomer = req.user!.role === "delivery" ? await getActiveDeliveryLocationShare(String(order._id), "customer") : null;
    const owner=order.storeAdmin||await getMainAdminId();
    const store:any=await StoreLocation.findOne(owner?{$or:[{storeAdmin:owner},{key:String(owner)},{key:"main"}]}:{key:"main"}).lean();
    const storePoint=isValidGeo(store?.latitude,store?.longitude)?{latitude:Number(store.latitude),longitude:Number(store.longitude),name:store?.name||"Store",address:store?.address||""}:null;
    const destination=await resolveDeliveryDestination(order);
    const phase=order.status==="Out for Delivery"?"CUSTOMER_DELIVERY":order.status==="Packed"?"STORE_PICKUP":"PREPARING";
    let partnerLocation:any=null,metrics:any=null;
    if(order.deliveryPartner&&["Out for Delivery"].includes(order.status) && (req.user!.role === "delivery" || Boolean(locationSharePartner))){
      const partner:any=await User.findById(order.deliveryPartner._id||order.deliveryPartner).select("latitude longitude locationAccuracy locationUpdatedAt onlineStatus availabilityStatus name profilePhoto").lean();
      const freshness=locationFreshness(partner?.locationUpdatedAt);
      if(partner&&isValidGeo(partner.latitude,partner.longitude)&&freshness.fresh){
        partnerLocation={latitude:Number(partner.latitude),longitude:Number(partner.longitude),accuracy:partner.locationAccuracy??null,updatedAt:partner.locationUpdatedAt,onlineStatus:partner.onlineStatus,availabilityStatus:partner.availabilityStatus};
        if(destination)metrics=await roadMetrics(partnerLocation.latitude,partnerLocation.longitude,destination.latitude,destination.longitude);
      } else if(partner?.locationUpdatedAt){partnerLocation={latitude:null,longitude:null,accuracy:partner.locationAccuracy??null,updatedAt:partner.locationUpdatedAt,stale:true};}
    }
    if(!metrics&&phase==="STORE_PICKUP"&&storePoint&&order.deliveryPartner){
      const partner:any=await User.findById(order.deliveryPartner._id||order.deliveryPartner).select("latitude longitude locationUpdatedAt").lean();
      const fresh=locationFreshness(partner?.locationUpdatedAt);
      if(partner&&isValidGeo(partner.latitude,partner.longitude)&&fresh.fresh)metrics=await roadMetrics(Number(partner.latitude),Number(partner.longitude),storePoint.latitude,storePoint.longitude);
    }
    const slaSnapshot=deliverySlaSnapshot(order);
    const locationSnapshot=order.deliveryPartner&&["Out for Delivery"].includes(order.status) ? locationFreshness(partnerLocation?.updatedAt) : {fresh:false,stale:false,ageSeconds:null};
    const etaConfidence=etaConfidenceSnapshot({status:order.status,location:locationSnapshot,routing:metrics,sla:slaSnapshot});
    const etaWindow=etaWindowSnapshot(metrics?.etaMinutes,etaConfidence);
    const sharedCustomerLocation = locationShareCustomer ? {latitude:Number(locationShareCustomer.latitude),longitude:Number(locationShareCustomer.longitude),accuracy:locationShareCustomer.accuracy??null,updatedAt:locationShareCustomer.updatedAt||null,expiresAt:locationShareCustomer.expiresAt} : null;
    return res.json({success:true,data:{
      orderId:order._id,status:order.status,phase,store:storePoint,destination,
      locationSharing:{partnerSharing:Boolean(locationSharePartner),customerSharing:Boolean(locationShareCustomer),partnerExpiresAt:locationSharePartner?.expiresAt||null,customerExpiresAt:locationShareCustomer?.expiresAt||null},
      customerSharedLocation:sharedCustomerLocation,
      deliveryPartner:order.deliveryPartner?{id:order.deliveryPartner._id||order.deliveryPartner,name:order.deliveryPartner.name||"Delivery Partner",phone:order.deliveryPartner.phone||"",profilePhoto:order.deliveryPartner.profilePhoto||""}:null,
      partnerLocation, distanceRemainingKm:metrics?.roadDistanceKm??null, etaMinutes:metrics?.etaMinutes??null, routingSource:metrics?.source||null,
      updatedAt:partnerLocation?.updatedAt||order.updatedAt||null,
      deliveryAssignmentStatus:order.deliveryAssignmentStatus||"UNASSIGNED",
      sla: slaSnapshot, etaConfidence, etaWindow
    }});
  }catch(e){return res.status(500).json({success:false,message:"Unable to load delivery tracking"});}
});

/* =========================================================
   CUSTOMER CANCEL ORDER
========================================================= */

/* =========================================================
   ORDER DELIVERY CHAT — CUSTOMER <-> CURRENT DELIVERY PARTNER
   Additive only. Does not replace Customer Support / SupportTicket.
========================================================= */
const DELIVERY_CHAT_ACTIVE_STATUSES = ["Out for Delivery"];
const DELIVERY_CHAT_TERMINAL_STATUSES = ["Delivered", "Cancelled"];
const deliveryChatRate = new Map<string, { windowStartedAt: number; count: number }>();

const getDeliveryChatContext = async (req: AuthRequest, orderId: string) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return { error: "Order not found", code: 404 };
  const order:any = await Order.findById(orderId).select("_id user deliveryPartner status storeAdmin").lean();
  if (!order) return { error: "Order not found", code: 404 };
  const role = String(req.user?.role || "");
  const userId = String(req.user?.id || "");
  const customerId = String(order.user || "");
  const partnerId = String(order.deliveryPartner || "");
  if (role === "customer" && userId === customerId) {
    return { order, participant: "customer" as const, receiverId: partnerId || null };
  }
  if (role === "delivery" && partnerId && userId === partnerId) {
    return { order, participant: "delivery" as const, receiverId: customerId || null };
  }
  return { error: "You are not authorized to access this delivery chat", code: 403 };
};

app.get("/api/orders/:id/delivery-chat", auth, roleAny("customer", "delivery"), async (req:AuthRequest,res) => {
  try {
    const ctx:any = await getDeliveryChatContext(req, String(req.params.id));
    if (ctx.error) return res.status(ctx.code || 403).json({success:false,message:ctx.error});
    if (![...DELIVERY_CHAT_ACTIVE_STATUSES, ...DELIVERY_CHAT_TERMINAL_STATUSES].includes(String(ctx.order.status))) {
      return res.status(400).json({success:false,message:"Delivery chat is not available for this order yet."});
    }
    const limitRaw = Number(req.query.limit || 100);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 100));
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const query:any = { orderId:ctx.order._id };
    if (before && !Number.isNaN(before.getTime())) query.createdAt = { $lt: before };
    const messages:any[] = await DeliveryChatMessage.find(query)
      .sort({createdAt:-1}).limit(limit).populate("senderId","name profilePhoto").lean();
    const ordered = messages.reverse();
    const unreadCount = await DeliveryChatMessage.countDocuments({orderId:ctx.order._id,receiverId:req.user!.id,readAt:null});
    return res.json({success:true,data:{
      orderId:ctx.order._id,
      status:ctx.order.status,
      readOnly:DELIVERY_CHAT_TERMINAL_STATUSES.includes(String(ctx.order.status)),
      chatEnabled:DELIVERY_CHAT_ACTIVE_STATUSES.includes(String(ctx.order.status)) || DELIVERY_CHAT_TERMINAL_STATUSES.includes(String(ctx.order.status)),
      messages:ordered,
      unreadCount,
      latestMessage:ordered.length ? ordered[ordered.length-1] : null,
    }});
  } catch(e) {
    console.error("DELIVERY CHAT LOAD ERROR:",e);
    return res.status(500).json({success:false,message:"Unable to load delivery chat. Please try again."});
  }
});

app.post("/api/orders/:id/delivery-chat/messages", auth, roleAny("customer", "delivery"), async (req:AuthRequest,res) => {
  try {
    const ctx:any = await getDeliveryChatContext(req, String(req.params.id));
    if (ctx.error) return res.status(ctx.code || 403).json({success:false,message:ctx.error});
    if (!DELIVERY_CHAT_ACTIVE_STATUSES.includes(String(ctx.order.status))) {
      return res.status(400).json({success:false,message:"Delivery chat is no longer available for sending messages."});
    }
    if (!ctx.receiverId) return res.status(409).json({success:false,message:"A Delivery Partner is not currently assigned to this order."});
    const raw = String(req.body?.message || "");
    const message = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if (message.length > 2000) return res.status(400).json({success:false,message:"Message must be 2000 characters or less."});
    const attachment = String(req.body?.attachment || "").trim();
    const requestedType = String(req.body?.messageType || "TEXT").trim().toUpperCase();
    const hasAttachment = Boolean(attachment);
    if (!message && !hasAttachment) return res.status(400).json({success:false,message:"Message or delivery photo is required."});
    if (hasAttachment) {
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(attachment)) return res.status(400).json({success:false,message:"Delivery chat photo must be a JPEG, PNG or WebP image."});
      const base64Payload = attachment.split(",",2)[1] || "";
      const decodedBytes = Math.floor((base64Payload.replace(/\s/g, "").length * 3) / 4) - (base64Payload.endsWith("==") ? 2 : base64Payload.endsWith("=") ? 1 : 0);
      if (decodedBytes <= 0 || decodedBytes > 700 * 1024) return res.status(400).json({success:false,message:"Delivery chat photo must be 700 KB or smaller."});
    }
    const messageType = hasAttachment ? "PHOTO" : requestedType === "QUICK_REPLY" ? "QUICK_REPLY" : "TEXT";
    const clientMessageId = String(req.body?.clientMessageId || "").trim().slice(0,120);
    const rateKey = `${String(req.user!.id)}:${String(ctx.order._id)}`;
    const now = Date.now(); const existingRate=deliveryChatRate.get(rateKey);
    if (existingRate && now-existingRate.windowStartedAt < 60_000 && existingRate.count >= 30) {
      return res.status(429).json({success:false,message:"You are sending messages too quickly. Please try again shortly."});
    }
    if (!existingRate || now-existingRate.windowStartedAt >= 60_000) deliveryChatRate.set(rateKey,{windowStartedAt:now,count:1});
    else existingRate.count += 1;

    if (clientMessageId) {
      const duplicate:any = await DeliveryChatMessage.findOne({orderId:ctx.order._id,senderId:req.user!.id,clientMessageId}).populate("senderId","name profilePhoto").lean();
      if (duplicate) return res.json({success:true,data:duplicate,duplicate:true});
    }
    // Sender identity is always derived from the authenticated request.
    // Frontend senderId/senderRole/customerId/deliveryPartnerId are never trusted.
    const authenticatedUser:any = await User.findById(req.user!.id).select("_id role").lean();
    if (!authenticatedUser) return res.status(401).json({success:false,message:"Authenticated user not found."});
    const authenticatedRole = String(authenticatedUser.role || "").trim().toLowerCase();
    if (!["customer", "delivery"].includes(authenticatedRole) || authenticatedRole !== ctx.participant) {
      return res.status(403).json({success:false,message:"You are not authorized to send messages in this delivery chat."});
    }
    const senderId = authenticatedUser._id;
    const receiverId = ctx.receiverId && mongoose.Types.ObjectId.isValid(String(ctx.receiverId))
      ? new mongoose.Types.ObjectId(String(ctx.receiverId))
      : null;
    if (!receiverId) return res.status(409).json({success:false,message:"The other delivery chat participant is not available."});
    const senderRole = authenticatedRole as "customer" | "delivery";
    let created:any;
    try {
      created = await DeliveryChatMessage.create({orderId:ctx.order._id,senderId, senderRole, receiverId, message,attachment:attachment.slice(0,1000000),messageType,clientMessageId});
    } catch(e:any) {
      if (clientMessageId && e?.code===11000) {
        const duplicate:any = await DeliveryChatMessage.findOne({orderId:ctx.order._id,senderId:req.user!.id,clientMessageId}).populate("senderId","name profilePhoto").lean();
        if (duplicate) return res.json({success:true,data:duplicate,duplicate:true});
      }
      throw e;
    }
    const messageDoc:any = await DeliveryChatMessage.findById(created._id).populate("senderId","name profilePhoto").lean();
    await notifyUser({user:ctx.receiverId,title:hasAttachment?"New delivery chat photo":"New delivery chat message",message:hasAttachment?(message || "A delivery-related photo was shared with you."):(message.length>120?message.slice(0,117)+"...":message),type:"delivery_chat",order:ctx.order._id,relatedEntity:"DELIVERY_CHAT",relatedEntityId:ctx.order._id});
    broadcastDeliveryChatEvent({eventType:"delivery-chat",orderId:String(ctx.order._id),message:messageDoc});
    await recordCustomerCareAudit({req,action:"DELIVERY_CHAT_MESSAGE_SENT",targetType:"ORDER",targetId:ctx.order._id,customer:ctx.order.user,order:ctx.order._id,metadata:{messageType:messageDoc?.messageType||"TEXT"}});
    return res.status(201).json({success:true,data:messageDoc});
  } catch(e:any) {
    console.error("DELIVERY CHAT SEND ERROR:",e);
    return res.status(500).json({success:false,message:"Message could not be sent."});
  }
});

app.patch("/api/orders/:id/delivery-chat/read", auth, roleAny("customer", "delivery"), async (req:AuthRequest,res) => {
  try {
    const ctx:any = await getDeliveryChatContext(req, String(req.params.id));
    if (ctx.error) return res.status(ctx.code || 403).json({success:false,message:ctx.error});
    await DeliveryChatMessage.updateMany({orderId:ctx.order._id,receiverId:req.user!.id,readAt:null},{$set:{readAt:new Date()}});
    return res.json({success:true});
  } catch(e) {
    console.error("DELIVERY CHAT READ ERROR:",e);
    return res.status(500).json({success:false,message:"Unable to update chat read status."});
  }
});


app.patch(
  "/api/orders/:id/cancel",
  auth,
  role("customer"),
  async (req: AuthRequest, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (String(order.user) !== String(req.user!.id)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      if (!["Pending", "Confirmed"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "This order can no longer be cancelled",
        });
      }

      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (!product) continue;
        const previousStock = Number(product.stock || 0);
        const quantity = Number(item.quantity);
        product.stock = previousStock + quantity;
        await product.save();
        await recordStockHistory({
          product: product._id,
          change: quantity,
          previousStock,
          newStock: previousStock + quantity,
          reason: "Order cancelled",
          order: order._id,
        });
      }

      order.status = "Cancelled" as any;

      if (!Array.isArray((order as any).statusHistory)) {
        (order as any).statusHistory = [];
      }

      (order as any).statusHistory.push({
        status: "Cancelled",
        timestamp: new Date(),
      });

      order.deliveryPartner = null as any;
      await order.save();

      await notifyUser({
        user: order.user,
        title: "Order cancelled",
        message: `Your order #${String(order._id).slice(-8).toUpperCase()} has been cancelled successfully.`,
        type: "order_cancelled",
        order: order._id,
      });
      await notifyAdmins({
        title: "Order cancelled",
        message: `Order #${String(order._id).slice(-8).toUpperCase()} was cancelled by the customer.`,
        type: "order_cancelled",
        order: order._id,
      });

      const updated = await Order.findById(order._id)
        .populate("user", "name email phone customerId")
        .populate("deliveryPartner", "name email phone role");

      return res.json({
        success: true,
        message: "Order cancelled successfully",
        data: updated,
      });
    } catch (error) {
      console.error("CUSTOMER CANCEL ORDER ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to cancel order",
      });
    }
  }
);

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

app.patch(
  "/api/orders/:id/status",
  auth,
  role("admin", "delivery"),
  async (req: AuthRequest, res) => {
    try {
      const allowedStatuses = [
        "Pending",
        "Confirmed",
        "Processing",
        "Packed",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ];

      const nextStatus = String(
        req.body.status || ""
      );

      if (!allowedStatuses.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }

      // Always read the latest database state. Never trust a stale frontend
      // order object or a temporary proof value during delivery completion.
      const order = await Order.findOne({
        _id: req.params.id,
        ...(req.user!.role === "admin" ? await tenantFilter(req) : {}),
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const previousStatus = order.status;

      if (nextStatus === "Out for Delivery" && (!order.deliveryPartner || ((order as any).deliveryAssignmentStatus && String((order as any).deliveryAssignmentStatus) !== "ACCEPTED"))) {
        return res.status(409).json({success:false,message:"A Delivery Partner must accept the assignment before the order can go Out for Delivery."});
      }

      if (req.user!.role === "delivery") {
        if (String(order.deliveryPartner || "") !== String(req.user!.id)) {
          return res.status(403).json({
            success: false,
            message: "This order is not assigned to you",
          });
        }

        if (!["Out for Delivery", "Delivered"].includes(nextStatus)) {
          return res.status(403).json({
            success: false,
            message: "Delivery partner can only update delivery status",
          });
        }

        if ((order as any).deliveryAssignmentStatus && String((order as any).deliveryAssignmentStatus) !== "ACCEPTED") {
          return res.status(409).json({ success:false, message:"Accept the delivery assignment before updating delivery status." });
        }

        if (nextStatus === "Delivered") {
          // The partner check above has already established ownership. Read the
          // proof from the exact MongoDB order document that will be completed.
          const persistedProof:any = await Order.collection.findOne(
            { _id: order._id },
            { projection: { deliveryProof:1, deliveryPartner:1, status:1 } }
          );
          const proof = persistedProof?.deliveryProof;
          if (String(persistedProof?.deliveryPartner || "") !== String(req.user!.id)) {
            return res.status(403).json({ success:false, message:"This order is not assigned to you" });
          }
          if (persistedProof?.status !== "Out for Delivery") {
            return res.status(400).json({ success:false, message:`Order is ${persistedProof?.status || "not available"}` });
          }
          if (!proof || typeof proof.image !== "string" || !proof.image.trim()) {
            return res.status(400).json({ success: false, message: "Upload delivery proof before completing delivery." });
          }
          (order as any).deliveryProof = proof;
        }
      }

      /* ---------------------------------------------
         Restore stock if order is cancelled
      --------------------------------------------- */

      if (
        previousStatus !== "Cancelled" &&
        nextStatus === "Cancelled"
      ) {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (!product) continue;
          const previousStock = Number(product.stock || 0);
          const quantity = Number(item.quantity);
          product.stock = previousStock + quantity;
          await product.save();
          await recordStockHistory({
            product: product._id,
            change: quantity,
            previousStock,
            newStock: previousStock + quantity,
            reason: "Order cancelled",
            order: order._id,
            adjustedBy: (req as any).user?.id,
          });
        }
      }

      /* ---------------------------------------------
         If cancelled order is re-opened,
         deduct stock again
      --------------------------------------------- */

      if (
        previousStatus === "Cancelled" &&
        nextStatus !== "Cancelled"
      ) {
        for (const item of order.items) {
          const product = await Product.findById(
            item.product
          );

          if (!product) {
            return res.status(400).json({
              success: false,
              message: `Product not found: ${item.name}`,
            });
          }

          if (product.stock < Number(item.quantity)) {
            return res.status(400).json({
              success: false,
              message: `Not enough stock for ${item.name}`,
            });
          }
        }

        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (!product) continue;
          const previousStock = Number(product.stock || 0);
          const quantity = Number(item.quantity);
          product.stock = previousStock - quantity;
          await product.save();
          await recordStockHistory({
            product: product._id,
            change: -quantity,
            previousStock,
            newStock: previousStock - quantity,
            reason: "Cancelled order reopened",
            order: order._id,
            adjustedBy: (req as any).user?.id,
          });
        }
      }

      order.status = nextStatus as any;
      if (previousStatus !== nextStatus) {
        if (["Delivered","Cancelled"].includes(nextStatus)) clearDeliverySla(order);
        else await applyDeliverySlaForStatus(order, nextStatus);
      }
      if (previousStatus !== "Out for Delivery" && nextStatus === "Out for Delivery") (order as any).deliveryStartedAt = new Date();
      if (previousStatus !== "Delivered" && nextStatus === "Delivered") {
        (order as any).deliveredAt = new Date();
        if ((order as any).deliveryProof) (order as any).deliveryProof.completedAt = new Date();
        (order as any).deliveryPayoutStatus = "ELIGIBLE";
        if (order.deliveryPartner) await notifyFinanceUsers({title:"Payout ready for verification",message:`Delivery payout for order #${String(order._id).slice(-8)} is now eligible.`,type:"payout_ready",order:order._id});
      }
      if (previousStatus !== "Delivered" && nextStatus === "Delivered" && order.deliveryPartner) {
        const cfg:any = await DeliveryPayoutConfig.findOne({key:"default"}).lean();
        const completedCount = await Order.countDocuments({deliveryPartner:order.deliveryPartner,status:"Delivered"}) + 1;
        const partner:any = await User.findById(order.deliveryPartner).select("ratingAverage").lean();
        const now=new Date();
        const rules=Array.isArray(cfg?.incentiveThresholds)?cfg.incentiveThresholds:[];
        const parseSlotEnd=(value:any)=>{const text=String(value||"").trim();const ms=[...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/ig)];if(ms.length<2)return null;const toM=(m:any)=>{let h=Number(m[1]),mi=Number(m[2]||0),ap=String(m[3]||"").toUpperCase();if(ap){if(h===12)h=0;if(ap==="PM")h+=12;}return h>=0&&h<=23&&mi>=0&&mi<=59?h*60+mi:null;};const a=toM(ms[0]),b=toM(ms[1]);return a==null||b==null?null:Math.max(a,b);};
        const localMinutes=(d:any)=>{try{const ps=new Intl.DateTimeFormat("en-GB",{timeZone:process.env.DELIVERY_TIME_ZONE||"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(d));return Number(ps.find((x:any)=>x.type==="hour")?.value)*60+Number(ps.find((x:any)=>x.type==="minute")?.value);}catch{return null;}};
        const slotEnd=parseSlotEnd((order as any).deliverySlot);
        const deliveredMin=localMinutes((order as any).deliveredAt);
        const startedMin=(order as any).deliveryStartedAt?localMinutes((order as any).deliveryStartedAt):null;
        const onTime=slotEnd!=null&&deliveredMin!=null&&!(startedMin!=null&&startedMin>slotEnd)&&deliveredMin<=slotEnd;
        let awarded=0;
        for(const rule of rules){
          const from=rule.activeFrom?new Date(rule.activeFrom):null,to=rule.activeTo?new Date(rule.activeTo):null;
          if((from&&now<from)||(to&&now>to))continue;
          const minDeliveries=Number(rule.minDeliveries||0);
          if(minDeliveries<1||completedCount!==minDeliveries)continue;
          if(Number(partner?.ratingAverage||0)<Number(rule.minRating||0))continue;
          if(String(rule.eligibility||"ALL").toUpperCase()==="ON_TIME"&&!onTime)continue;
          const periodStart=from||new Date(now.getFullYear(),now.getMonth(),now.getDate());
          const periodEnd=to||new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
          const ruleId=String(rule.ruleId||`${minDeliveries}-${Number(rule.amount||0)}`);
          const already=await Incentive.findOne({deliveryPartner:order.deliveryPartner,ruleId,createdAt:{$gte:periodStart,$lte:periodEnd},status:{$ne:"REJECTED"}}).select("_id").lean();
          if(already)continue;
          const maxBonus=rule.maxBonus==null?null:Number(rule.maxBonus);
          let bonus=Number(rule.amount||0);
          if(maxBonus!=null){
            const existing:any[]=await Incentive.find({deliveryPartner:order.deliveryPartner,ruleId,createdAt:{$gte:periodStart,$lte:periodEnd},status:{$ne:"REJECTED"}}).select("eligibleAmount approvedAmount").lean();
            const used=existing.reduce((sum:number,x:any)=>sum+Math.max(Number(x.approvedAmount||0),Number(x.eligibleAmount||0)),0);
            bonus=Math.max(0,Math.min(bonus,maxBonus-used));
          }
          if(bonus<=0)continue;
          awarded+=bonus;
          try{await Incentive.create({incentiveId:makeFinancialId("INC"),deliveryPartner:order.deliveryPartner,order:order._id,ruleId,completedDeliveries:completedCount,averageRating:Number(partner?.ratingAverage||0),eligibleAmount:bonus,approvedAmount:0,status:"PENDING",awardedAt:now,periodStart,periodEnd,eligibility:String(rule.eligibility||"ALL"),bonusReason:`Milestone: ${completedCount} completed deliveries`});}catch(e){}
        }
        (order as any).performanceIncentive = Number(awarded.toFixed(2));
      }

      // Record the exact time of every status transition.
      if (previousStatus !== nextStatus) {
        if (!Array.isArray((order as any).statusHistory)) {
          (order as any).statusHistory = [];
        }

        (order as any).statusHistory.push({
          status: nextStatus,
          timestamp: new Date(),
        });
      }

      await order.save();

      // Auto-assignment is additive: the order remains Packed if no eligible
      // partner exists, and manual assignment remains available.
      if (previousStatus !== "Packed" && nextStatus === "Packed" && !order.deliveryPartner) {
        void autoAssignPackedOrder(order._id);
      }

      if (order.deliveryPartner) {
        if (nextStatus === "Delivered" || nextStatus === "Cancelled") {
          const remaining:any = await Order.findOne({
            _id: { $ne: order._id },
            deliveryPartner: order.deliveryPartner,
            status: { $nin: ["Delivered", "Cancelled"] },
          }).select("_id status").sort({updatedAt:-1}).lean();
          await User.collection.updateOne(
            { _id: order.deliveryPartner },
            { $set: { availabilityStatus: remaining ? "ON_DELIVERY" : "AVAILABLE", currentOrderId: remaining?._id || null } }
          );
        } else if (nextStatus === "Out for Delivery") {
          await User.collection.updateOne(
            { _id: order.deliveryPartner },
            { $set: { onlineStatus: "ONLINE", availabilityStatus: "ON_DELIVERY", currentOrderId: order._id } }
          );
        } else {
          await User.collection.updateOne(
            { _id: order.deliveryPartner },
            { $set: { availabilityStatus: "BUSY", currentOrderId: order._id } }
          );
        }
      }

      if (previousStatus !== "Delivered" && nextStatus === "Delivered") {
        await finalizeOrderFinancials(order, req.user!.id);
      }

      if (previousStatus === "Delivered" && nextStatus === "Cancelled") {
        await reverseLoyaltyForCancelledOrder(order);
      }

      if (previousStatus !== "Delivered" && nextStatus === "Delivered") {
        await awardLoyaltyForDeliveredOrder(order);
      }

      if (previousStatus !== nextStatus) {
        await notifyUser({
          user: order.user,
          title: `Order ${nextStatus}`,
          message: `Your order #${String(order._id).slice(-8).toUpperCase()} is now ${nextStatus}.`,
          type: "order_status",
          order: order._id,
        });
      }
      if (previousStatus !== "Delivered" && nextStatus === "Delivered") {
        await notifyUser({ user: order.user, title: "Your order has been delivered", message: `Delivered by ${String((await User.findById(order.deliveryPartner).select("name").lean() as any)?.name || "your delivery partner")}. You can now rate your delivery experience.`, type: "delivery_completed", order: order._id });
        await recordCustomerCareAudit({ req: req as AuthRequest, action: "ORDER_DELIVERED", targetType: "ORDER", targetId: order._id, customer: order.user, order: order._id });
      }

      const updated = await Order.findById(
        order._id
      )
        .populate("user", "name email phone customerId")
        .populate("deliveryPartner", "name email phone role");

      return res.json({
        success: true,
        message: "Order status updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("ORDER STATUS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update order status",
      });
    }
  }
);

/* =========================================================
   DELIVERY PAYMENT COLLECTION
========================================================= */

app.patch(
  "/api/orders/:id/payment",
  auth,
  role("delivery"),
  async (req: AuthRequest, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const order: any = await Order.findById(req.params.id).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (String((order as any).deliveryPartner || "") !== String(req.user!.id)) {
        return res.status(403).json({
          success: false,
          message: "This order is not assigned to you",
        });
      }

      if (String((order as any).paymentMethod || 'COD') !== "COD") {
        return res.status(400).json({ success: false, message: "Online/UPI payment must be verified by the payment provider before it can be marked paid." });
      }

      if ((order as any).status !== "Out for Delivery") {
        return res.status(400).json({
          success: false,
          message: "Payment can be collected only during delivery",
        });
      }

      if (String(req.body.paymentStatus || "") !== "Paid") {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        });
      }

      const paymentMode = String(req.body.paymentMode || "").toUpperCase();
      if (paymentMode === "UPI") {
        // Opening a QR/UPI app is not proof of payment. Without a configured
        // verified gateway/webhook, this endpoint must never mark UPI as Paid.
        return res.status(409).json({
          success: false,
          code: "PAYMENT_VERIFICATION_REQUIRED",
          message: "UPI payment is awaiting verified payment-provider confirmation.",
        });
      }

      if (paymentMode !== "CASH") {
        return res.status(400).json({ success: false, message: "Use CASH for COD collection or a verified online payment provider." });
      }

      const updatedPayment:any = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $ne: "Paid" }, paymentMethod: "COD", status: "Out for Delivery" },
        { $set: { paymentStatus: "Paid", paymentMode: "CASH", paymentPaidAt: new Date() } },
        { new: true }
      ).populate("user", "name email phone customerId").lean();

      if (!updatedPayment) {
        return res.status(409).json({ success: false, message: "Payment was already completed or the order is no longer eligible for cash collection." });
      }

      await notifyUser({
        user: order.user,
        title: "Payment received",
        message: `Cash payment for order #${String(order._id).slice(-8).toUpperCase()} has been recorded.`,
        type: "payment",
        order: order._id,
      });

      return res.json({
        success: true,
        message: "Cash payment marked as received",
        data: updatedPayment,
      });
    } catch (error) {
      console.error("DELIVERY PAYMENT ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update payment status",
      });
    }
  }
);

/* =========================================================
   ADMIN CUSTOMERS
========================================================= */

app.get(
  "/api/admin/customers",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const page = Math.max(
        1,
        Number(req.query.page || 1)
      );

      const limit = Math.min(
        50,
        Math.max(
          1,
          Number(req.query.limit || 10)
        )
      );

      const search = String(
        req.query.search || ""
      ).trim();

      const storeFilter = await tenantFilter(req as AuthRequest);
      const storeOrders = await Order.find(storeFilter).select("user").lean();
      const storeCustomerIds = Array.from(new Set(storeOrders.map((o: any) => String(o.user)).filter(Boolean)));
      const filter: any = {
        role: "customer",
        ...(storeCustomerIds.length ? { _id: { $in: storeCustomerIds } } : { _id: { $in: [] } }),
      };

      if (search) {
        const regex = new RegExp(search, "i");

        filter.$or = [
          { customerId: regex },
          { name: regex },
          { email: regex },
          { phone: regex },
        ];
      }

      const total = await User.countDocuments(filter);

      const customers = await User.find(filter)
        .select(
          "-password"
        )
        .sort({
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const customerIds = customers.map(
        (customer) => customer._id
      );

      const orderStats =
        customerIds.length
          ? await Order.aggregate([
              {
                $match: {
                  ...storeFilter,
                  user: {
                    $in: customerIds,
                  },
                },
              },
              {
                $group: {
                  _id: "$user",
                  orders: {
                    $sum: 1,
                  },
                  spending: {
                    $sum: {
                      $cond: [
                        {
                          $ne: [
                            "$status",
                            "Cancelled",
                          ],
                        },
                        "$total",
                        0,
                      ],
                    },
                  },
                },
              },
            ])
          : [];

      const statsMap = new Map(
        orderStats.map((item: any) => [
          String(item._id),
          item,
        ])
      );

      const data = customers.map(
        (customer: any) => {
          const stats =
            statsMap.get(
              String(customer._id)
            ) || {
              orders: 0,
              spending: 0,
            };

          return {
            id: customer._id,
            customerId: customer.customerId || "",
            name: customer.name,
            email: customer.email,
            phone: customer.phone || "—",
            createdAt: customer.createdAt,
            blocked: Boolean(
              customer.blocked
            ),
            orders: stats.orders || 0,
            spending:
              stats.spending || 0,
          };
        }
      );

      return res.json({
        success: true,
        data,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(
            total / limit
          ),
        },
      });
    } catch (error) {
      console.error(
        "ADMIN CUSTOMERS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load customers",
      });
    }
  }
);

/* =========================================================
   ADMIN CUSTOMER DETAILS
   Resolves the existing MongoDB _id or permanent customerId while
   respecting the same tenant/store visibility used by the customer list.
========================================================= */

app.get(
  "/api/admin/customers/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const rawId = String(req.params.id || "").trim();
      if (!rawId) {
        return res.status(400).json({ success: false, message: "Customer identifier is required" });
      }

      const storeFilter = await tenantFilter(req as AuthRequest);
      const storeOrders = await Order.find(storeFilter).select("user").lean();
      const storeCustomerIds = Array.from(new Set(
        storeOrders.map((o: any) => String(o.user || "")).filter(Boolean)
      ));

      if (!storeCustomerIds.length) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }

      const customerQuery: any = { role: "customer" };
      if (mongoose.Types.ObjectId.isValid(rawId)) {
        customerQuery._id = new mongoose.Types.ObjectId(rawId);
      } else {
        customerQuery.customerId = rawId;
      }

      if (mongoose.Types.ObjectId.isValid(rawId)) {
        if (!storeCustomerIds.includes(rawId)) {
          return res.status(404).json({ success: false, message: "Customer not found" });
        }
      } else {
        customerQuery._id = {
          $in: storeCustomerIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id)),
        };
      }

      const customer: any = await User.findOne(customerQuery).select("-password").lean();
      if (!customer) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }

      const orders: any[] = await Order.find({
        ...storeFilter,
        user: customer._id,
      }).sort({ createdAt: -1 }).limit(200).lean();

      const spending = orders
        .filter((o: any) => String(o.status || "").toLowerCase() !== "cancelled")
        .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

      return res.json({
        success: true,
        data: {
          customer,
          orders,
          stats: { orders: orders.length, spending },
        },
      });
    } catch (error) {
      console.error("ADMIN CUSTOMER DETAILS ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to load customer details" });
    }
  }
);

/* =========================================================
   BLOCK / UNBLOCK CUSTOMER
========================================================= */

app.patch(
  "/api/admin/customers/:id/block",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      const blocked =
        Boolean(req.body.blocked);

      const customer =
        await User.findOneAndUpdate(
          {
            _id: { $in: (await Order.distinct("user", await tenantFilter(req as AuthRequest))) },
            role: "customer",
          },
          {
            blocked,
          },
          {
            new: true,
          }
        ).select("-password");

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      return res.json({
        success: true,
        message: blocked
          ? "Customer blocked successfully"
          : "Customer unblocked successfully",
        data: customer,
      });
    } catch (error) {
      console.error(
        "CUSTOMER BLOCK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update customer status",
      });
    }
  }
);

/* =========================================================
   MAIN ADMIN ACTION-REQUIRED INBOX
========================================================= */
/* =========================================================
   ADMIN APPROVAL CENTER — consolidated view over existing workflows
   Additive only. Actions reuse the existing approval endpoints below.
========================================================= */

/* =========================================================
   SAFE SUPPORT "VIEW AS" — temporary read-only inspection
   Additive only. Uses existing User/Product/Customer 360 data and AuditLog.
   No target password is read, returned, changed or exposed.
========================================================= */
const SAFE_VIEW_AS_TTL_SECONDS = 15 * 60;
const SAFE_VIEW_AS_SECRET = () => String(process.env.JWT_SECRET || "dev-secret");

const safeViewAsAllowed = async (req: AuthRequest) => {
  const roleName = String(req.user?.role || "");
  if (roleName === "admin") {
    const user:any = await User.findById(req.user!.id).select("_id email role blocked").lean();
    return Boolean(user && !user.blocked && user.role === "admin" && String(user.email || "").toLowerCase() === MAIN_ADMIN_EMAIL);
  }
  if (roleName === "customer_care") return await hasCustomerCarePermission(req, "customer.view");
  return false;
};

const verifySafeViewToken = (raw:string) => {
  try {
    const decoded:any = jwt.verify(raw, SAFE_VIEW_AS_SECRET());
    if (!decoded?.viewAs || decoded?.readOnly !== true || !decoded?.actorId || !decoded?.targetId || !decoded?.targetRole) return null;
    return decoded;
  } catch { return null; }
};

app.get("/api/admin/safe-view-as/search", auth, async (req:AuthRequest,res) => {
  try {
    if (!(await safeViewAsAllowed(req))) return res.status(403).json({success:false,message:"Safe View As access denied"});
    const mode = String(req.query.mode || "customer");
    const search = String(req.query.search || "").trim();
    if (!search) return res.json({success:true,data:[]});
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i");
    if (mode === "store") {
      const rows:any[] = await User.find({role:"admin",blocked:{$ne:true},$or:[{name:regex},{email:regex},{employeeId:regex},{storeCategory:regex},{storeDescription:regex}]})
        .select("_id name email phone employeeId storeAdmin storeCategory storeDescription storeImage").sort({name:1}).limit(20).lean();
      return res.json({success:true,data:rows});
    }
    let orderUserIds:any[]=[];
    if (mongoose.Types.ObjectId.isValid(search)) {
      const orders:any[] = await Order.find({_id:search}).select("user").limit(10).lean();
      orderUserIds = orders.map(x=>x.user).filter(Boolean);
    }
    const rows:any[] = await User.find({role:"customer",blocked:{$ne:true},$or:[{_id:{$in:orderUserIds}},{customerId:regex},{name:regex},{email:regex},{phone:regex}]})
      .select("_id name email phone customerId profilePhoto createdAt blocked").sort({createdAt:-1}).limit(20).lean();
    return res.json({success:true,data:rows});
  } catch(e:any) { return res.status(500).json({success:false,message:"Unable to search View As targets"}); }
});

app.post("/api/admin/safe-view-as/start", auth, async (req:AuthRequest,res) => {
  try {
    if (!(await safeViewAsAllowed(req))) return res.status(403).json({success:false,message:"Safe View As access denied"});
    const mode = String(req.body?.mode || "customer");
    const targetId = String(req.body?.targetId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({success:false,message:"Valid target is required"});
    const targetRole = mode === "store" ? "admin" : "customer";
    const target:any = await User.findOne({_id:targetId,role:targetRole,blocked:{$ne:true}}).select("_id name email phone customerId employeeId storeCategory").lean();
    if (!target) return res.status(404).json({success:false,message:"Target account not found"});
    const sessionId = crypto.randomUUID();
    const token = jwt.sign({viewAs:true,readOnly:true,sessionId,actorId:String(req.user!.id),actorRole:String(req.user!.role),targetId:String(target._id),targetRole,mode},SAFE_VIEW_AS_SECRET(),{expiresIn:SAFE_VIEW_AS_TTL_SECONDS});
    await recordCustomerCareAudit({req,action:"SAFE_VIEW_AS_STARTED",targetType:"VIEW_AS_SESSION",targetId:sessionId,customer:targetRole==="customer"?target._id:null,metadata:{mode,targetId:String(target._id),targetRole,expiresInSeconds:SAFE_VIEW_AS_TTL_SECONDS}});
    return res.json({success:true,data:{token,sessionId,mode,targetId:String(target._id),targetRole,targetName:target.name||"",expiresAt:new Date(Date.now()+SAFE_VIEW_AS_TTL_SECONDS*1000).toISOString()}});
  } catch(e:any) { return res.status(500).json({success:false,message:"Unable to start safe view session"}); }
});

app.get("/api/admin/safe-view-as/session", async (req:any,res) => {
  try {
    const token = String(req.headers["x-freshbasket-view-token"] || "");
    const decoded:any = verifySafeViewToken(token);
    if (!decoded) return res.status(401).json({success:false,message:"Safe View As session is invalid or expired"});
    const actor:any = await User.findById(decoded.actorId).select("_id role blocked email permissions").lean();
    if (!actor || actor.blocked) return res.status(403).json({success:false,message:"Authorizing account is no longer available"});
    if (actor.role === "admin") {
      if (String(actor.email||"").toLowerCase() !== MAIN_ADMIN_EMAIL) return res.status(403).json({success:false,message:"Safe View As access denied"});
    } else if (actor.role === "customer_care") {
      const perms = Array.isArray(actor.permissions)?actor.permissions.map((x:any)=>String(x)):[];
      if (perms.length && !perms.includes("customer.view")) return res.status(403).json({success:false,message:"Customer Care permission required"});
    } else return res.status(403).json({success:false,message:"Safe View As access denied"});
    const target:any = await User.findOne({_id:decoded.targetId,role:decoded.targetRole,blocked:{$ne:true}}).select("-password").lean();
    if (!target) return res.status(404).json({success:false,message:"Target account is no longer available"});
    await AuditLog.create({actor:actor._id,actorRole:actor.role,actorEmployeeId:String(actor.employeeId||""),action:"SAFE_VIEW_AS_ACCESSED",targetType:"VIEW_AS_SESSION",targetId:String(decoded.sessionId),customer:decoded.targetRole==="customer"?target._id:null,metadata:{mode:decoded.mode,targetId:String(target._id),targetRole:decoded.targetRole,readOnly:true}});
    if (decoded.targetRole === "customer") {
      const reqFor360:any = {user:{id:actor._id,role:actor.role}};
      reqFor360.customer360Role = actor.role;
      const data = await buildCustomer360(reqFor360 as AuthRequest,target._id);
      if (!data) return res.status(404).json({success:false,message:"Customer preview unavailable"});
      return res.json({success:true,data:{mode:"customer",readOnly:true,sessionId:String(decoded.sessionId),expiresAt:new Date(Number(decoded.exp)*1000).toISOString(),...data}});
    }
    const safeViewTarget:any = target;
    const storeFilter:any = {$or:[{storeAdmin:safeViewTarget._id},{storeAdmin:String(safeViewTarget._id)}]};
    const [products,rawLocation] = await Promise.all([
      Product.find({...storeFilter,active:{$ne:false}}).select("name brand unit price mrp stock image category variants active").sort({createdAt:-1}).limit(100).lean(),
      StoreLocation.findOne({storeAdmin:safeViewTarget._id}).select("name image address category description latitude longitude phone email openingTime closingTime").lean()
    ]);
    const location:any = rawLocation;
    return res.json({success:true,data:{mode:"store",readOnly:true,sessionId:String(decoded.sessionId),expiresAt:new Date(Number(decoded.exp)*1000).toISOString(),store:{_id:safeViewTarget._id,name:location?.name||safeViewTarget.name,email:location?.email||safeViewTarget.email,phone:location?.phone||safeViewTarget.phone,storeCategory:location?.category||safeViewTarget.storeCategory||"Grocery",image:location?.image||safeViewTarget.storeImage||"",address:location?.address||""},products}});
  } catch(e:any) { return res.status(500).json({success:false,message:"Unable to load safe view session"}); }
});

app.post("/api/admin/safe-view-as/end", async (req:any,res) => {
  try {
    const token = String(req.headers["x-freshbasket-view-token"] || "");
    const decoded:any = verifySafeViewToken(token);
    if (!decoded) return res.status(401).json({success:false,message:"Safe View As session is invalid or expired"});
    const actor:any = await User.findById(decoded.actorId).select("_id role employeeId blocked").lean();
    if (!actor || actor.blocked) return res.status(403).json({success:false,message:"Authorizing account unavailable"});
    await AuditLog.create({actor:actor._id,actorRole:actor.role,actorEmployeeId:String(actor.employeeId||""),action:"SAFE_VIEW_AS_ENDED",targetType:"VIEW_AS_SESSION",targetId:String(decoded.sessionId),customer:decoded.targetRole==="customer"?decoded.targetId:null,metadata:{mode:decoded.mode,targetId:String(decoded.targetId),targetRole:decoded.targetRole}});
    return res.json({success:true,message:"Safe View As session ended"});
  } catch { return res.status(500).json({success:false,message:"Unable to end safe view session"}); }
});

app.get("/api/admin/approval-center", auth, mainAdminOnly, async (_req: AuthRequest, res) => {
  try {
    const [storeApplications, deliveryApplications, refundApprovals, replacementApprovals, financeApprovals] = await Promise.all([
      Application.find({ applicationType:"STORE", status:{ $in:["SUBMITTED","UNDER_REVIEW","NEED_MORE_INFORMATION","ON_HOLD"] } }).sort({createdAt:-1}).limit(200).lean(),
      Application.find({ applicationType:"DELIVERY", status:{ $in:["SUBMITTED","UNDER_REVIEW","NEED_MORE_INFORMATION","ON_HOLD"] } }).sort({createdAt:-1}).limit(200).lean(),
      RefundRequest.find({ status:"APPROVAL_PENDING" }).sort({createdAt:-1}).limit(200).populate("customer","name email phone customerId").populate("order","_id total status").lean(),
      ReplacementRequest.find({ status:"PENDING_MAIN_ADMIN" }).sort({createdAt:-1}).limit(200).populate("customer","name email phone customerId").populate("order","_id total status").populate("storeAdmin","name employeeId").lean(),
      PayoutBatch.find({ status:{ $in:["CREATED","UNDER_REVIEW"] } }).sort({createdAt:-1}).limit(200).populate("storeAdmin","name employeeId").lean(),
    ]);
    return res.json({success:true,data:{
      storeApplications:storeApplications.map(applicationListProjection),
      deliveryApplications:deliveryApplications.map(applicationListProjection),
      refundApprovals,
      replacementApprovals,
      financeApprovals,
      employeeRequests:[],
      employeeRequestsAvailable:false,
    }});
  } catch(e:any) {
    console.error("ADMIN APPROVAL CENTER ERROR:",e);
    return res.status(500).json({success:false,message:"Unable to load Approval Center"});
  }
});

app.get("/api/admin/action-required", auth, mainAdminOnly, async (_req: AuthRequest, res) => {
  try {
    const openTicketStatuses = { $nin: ["RESOLVED", "CLOSED"] };
    const paymentIssueCategories = ["Payment Failed", "Payment Deducted but Order Failed", "Refund Issue"];
    const activeOrderStatuses = { $nin: ["Delivered", "Cancelled"] };
    const now = new Date();

    const [
      paymentIssues,
      unassignedOrders,
      rejectedAssignments,
      refundApprovals,
      storeApplications,
      deliverySlaBreaches,
      supportSlaBreaches,
      staleLocationOrders,
    ] = await Promise.all([
      SupportTicket.countDocuments({ category: { $in: paymentIssueCategories }, status: openTicketStatuses }),
      Order.countDocuments({ status: activeOrderStatuses, deliveryAssignmentStatus: "UNASSIGNED" }),
      Order.countDocuments({ status: activeOrderStatuses, deliveryAssignmentStatus: "REJECTED" }),
      RefundRequest.countDocuments({ status: "APPROVAL_PENDING" }),
      Application.countDocuments({ applicationType: "STORE", status: { $in: ["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "ON_HOLD"] } }),
      Order.countDocuments({ slaBreached: true, status: activeOrderStatuses }),
      SupportTicket.countDocuments({ slaDueAt: { $lte: now }, status: openTicketStatuses }),
      (async () => {
        const active = await Order.find({ status: "Out for Delivery", deliveryPartner: { $ne: null } }).select("deliveryPartner").lean();
        const partnerIds = [...new Set(active.map((o: any) => String(o.deliveryPartner || "")).filter(Boolean))];
        if (!partnerIds.length) return 0;
        const partners = await User.find({ _id: { $in: partnerIds } }).select("_id locationUpdatedAt").lean();
        const byId = new Map<string, any>(partners.map((p: any) => [String(p._id), p.locationUpdatedAt] as [string, any]));
        const staleMs = DELIVERY_LOCATION_STALE_MS;
        return active.filter((o: any) => {
          const updatedAt = byId.get(String(o.deliveryPartner));
          if (!updatedAt) return true;
          const age = now.getTime() - new Date(updatedAt).getTime();
          return age > staleMs;
        }).length;
      })(),
    ]);

    const items: any[] = [];
    const add = (key: string, label: string, count: number, description: string, tab: string) => {
      const n = Number(count || 0);
      if (n > 0) items.push({ key, label, count: n, description, tab });
    };

    add("payment-issues", "Payment Issues", paymentIssues, "Open payment-related support cases requiring review.", "customer-support");
    add("unassigned-orders", "Unassigned Orders", unassignedOrders, "Active orders that currently have no delivery partner assignment.", "orders");
    add("rejected-assignments", "Rejected Assignments", rejectedAssignments, "Active orders whose current delivery assignment was rejected.", "orders");
    add("refund-approvals", "Refund Approvals", refundApprovals, "Refund requests waiting for the configured approval stage.", "customer-support");
    add("store-applications", "Store Applications", storeApplications, "Store onboarding applications still awaiting Main Admin action.", "store-applications");
    add("sla-breaches", "SLA Breaches", Number(deliverySlaBreaches || 0) + Number(supportSlaBreaches || 0), "Open delivery or support records that have passed their configured SLA.", Number(deliverySlaBreaches || 0) > 0 ? "orders" : "customer-support");
    add("stale-delivery-locations", "Stale Delivery Locations", staleLocationOrders, `Active deliveries with missing or stale partner location data (over ${Math.round(DELIVERY_LOCATION_STALE_MS / 60000)} minutes).`, "delivery-partners");

    return res.json({
      success: true,
      data: {
        total: items.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0),
        generatedAt: now,
        items,
      },
    });
  } catch (error) {
    console.error("ADMIN ACTION REQUIRED ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load action-required items" });
  }
});

/* =========================================================
   ADMIN STATS
========================================================= */

app.get(
  "/api/admin/stats",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      const storeFilter = await tenantFilter(req);
      const [
        orders,
        customers,
        products,
      ] = await Promise.all([
        Order.find(storeFilter).lean(),
        (async () => {
          const ids = await Order.distinct("user", storeFilter);
          return User.countDocuments({ role: "customer", _id: { $in: ids } });
        })(),
        Product.countDocuments(storeFilter),
      ]);

      const validOrders =
        orders.filter(
          (order: any) =>
            order.status !== "Cancelled"
        );

      const revenue =
        validOrders.reduce(
          (sum: number, order: any) =>
            sum + Number(order.total || 0),
          0
        );

      const todayStart =
        new Date();

      todayStart.setHours(
        0,
        0,
        0,
        0
      );

      const todayRevenue =
        validOrders
          .filter(
            (order: any) =>
              new Date(
                order.createdAt
              ) >= todayStart
          )
          .reduce(
            (sum: number, order: any) =>
              sum +
              Number(
                order.total || 0
              ),
            0
          );

      const pending =
        orders.filter(
          (order: any) =>
            order.status ===
            "Pending"
        ).length;

      const completed =
        orders.filter(
          (order: any) =>
            order.status ===
            "Delivered"
        ).length;

      const lowStock =
        await Product.countDocuments({
          ...storeFilter,
          $expr: {
            $lte: [
              "$stock",
              "$lowStockThreshold",
            ],
          },
        });

      /* ---------------------------------------------
         Last 7 days
      --------------------------------------------- */

      const sales7d: any[] = [];

      for (let i = 6; i >= 0; i--) {
        const start = new Date();
        start.setHours(
          0,
          0,
          0,
          0
        );
        start.setDate(
          start.getDate() - i
        );

        const end = new Date(start);
        end.setDate(
          end.getDate() + 1
        );

        const dayOrders =
          validOrders.filter(
            (order: any) => {
              const created =
                new Date(
                  order.createdAt
                );

              return (
                created >= start &&
                created < end
              );
            }
          );

        sales7d.push({
          date:
            start
              .toISOString()
              .split("T")[0],
          label:
            start.toLocaleDateString(
              "en-IN",
              {
                weekday: "short",
              }
            ),
          revenue:
            dayOrders.reduce(
              (
                sum: number,
                order: any
              ) =>
                sum +
                Number(
                  order.total || 0
                ),
              0
            ),
          orders:
            dayOrders.length,
        });
      }

      return res.json({
        success: true,
        data: {
          revenue,
          todayRevenue,
          orders: orders.length,
          customers,
          products,
          pending,
          completed,
          lowStock,
          sales7d,
        },
      });
    } catch (error) {
      console.error(
        "ADMIN STATS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load dashboard statistics",
      });
    }
  }
);

/* =========================================================
   ADMIN REPORTS
========================================================= */

app.get(
  "/api/admin/reports",
  auth,
  role("admin"),
  async (req: AuthRequest, res) => {
    try {
      const period =
        String(
          req.query.period || "7d"
        );

      const days =
        period === "90d"
          ? 90
          : period === "30d"
          ? 30
          : 7;

      const start = new Date();

      start.setHours(
        0,
        0,
        0,
        0
      );

      start.setDate(
        start.getDate() -
          (days - 1)
      );

      let reportFilter: any = { createdAt: { $gte: start } };
      const requestedAdminId = String(req.query.storeAdminId || "").trim();
      if (requestedAdminId && req.user?.role === "admin" && String(req.user.id) === String(await getMainAdminId()) && mongoose.Types.ObjectId.isValid(requestedAdminId)) {
        reportFilter.storeAdmin = requestedAdminId;
      } else {
        reportFilter = { $and: [reportFilter, await tenantFilter(req as AuthRequest)] };
      }
      const orders = await Order.find(reportFilter).lean();

      const validOrders =
        orders.filter(
          (order: any) =>
            order.status !==
            "Cancelled"
        );

      const revenue =
        validOrders.reduce(
          (sum: number, order: any) =>
            sum +
            Number(
              order.total || 0
            ),
          0
        );

      const averageOrderValue =
        validOrders.length
          ? revenue /
            validOrders.length
          : 0;

      const cancelled =
        orders.filter(
          (order: any) =>
            order.status ===
            "Cancelled"
        ).length;

      /* ---------------------------------------------
         Revenue series
      --------------------------------------------- */

      const series: any[] = [];

      for (
        let i = 0;
        i < days;
        i++
      ) {
        const dayStart =
          new Date(start);

        dayStart.setDate(
          start.getDate() + i
        );

        const dayEnd =
          new Date(dayStart);

        dayEnd.setDate(
          dayEnd.getDate() + 1
        );

        const dayOrders =
          validOrders.filter(
            (order: any) => {
              const created =
                new Date(
                  order.createdAt
                );

              return (
                created >= dayStart &&
                created < dayEnd
              );
            }
          );

        series.push({
          date:
            dayStart
              .toISOString()
              .split("T")[0],

          label:
            dayStart.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
              }
            ),

          revenue:
            dayOrders.reduce(
              (
                sum: number,
                order: any
              ) =>
                sum +
                Number(
                  order.total || 0
                ),
              0
            ),

          orders:
            dayOrders.length,
        });
      }

      /* ---------------------------------------------
         Status report
      --------------------------------------------- */

      const statuses =
        await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
              },
            },
          },
          {
            $group: {
              _id: "$status",
              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              count: -1,
            },
          },
        ]);

      /* ---------------------------------------------
         Top selling products
      --------------------------------------------- */

      const topProducts =
        await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
              },
              status: {
                $ne: "Cancelled",
              },
            },
          },
          {
            $unwind: "$items",
          },
          {
            $group: {
              _id: "$items.product",
              name: {
                $first:
                  "$items.name",
              },
              quantity: {
                $sum:
                  "$items.quantity",
              },
              revenue: {
                $sum: {
                  $multiply: [
                    "$items.price",
                    "$items.quantity",
                  ],
                },
              },
            },
          },
          {
            $sort: {
              revenue: -1,
            },
          },
          {
            $limit: 10,
          },
        ]);

      return res.json({
        success: true,
        data: {
          period,
          days,

          // Keep the flattened fields expected by the existing Reports UI.
          revenue,
          orders: orders.length,
          averageOrderValue,
          cancelled,

          // Keep summary as well for compatibility with any other consumer.
          summary: {
            revenue,
            orders: orders.length,
            averageOrderValue,
            cancelled,
          },

          series,
          statuses,
          topProducts,
        },
      });
    } catch (error) {
      console.error(
        "ADMIN REPORTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate reports",
      });
    }
  }
);

/* =========================================================
   SERVER START
========================================================= */

if ((STORE_LAT_RAW || STORE_LNG_RAW) && !hasValidStoreCoordinates) {
  console.warn(
    "Invalid STORE_LAT/STORE_LNG. Delivery pickup map will be unavailable until valid coordinates are configured."
  );
}

const PORT = Number(
  process.env.PORT || 5000
);

mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/grocery_shop"
  )
  .then(async () => {
    console.log(
      "MongoDB connected successfully"
    );
    void checkDeliverySlaBreaches();
    setInterval(() => { void checkDeliverySlaBreaches(); }, 60000);
    try { await backfillUserIdentifiers(); } catch (error) { console.error("IDENTIFIER BACKFILL ERROR:", error); }

    app.listen(
      PORT,
      () =>
        console.log(
          `API running on ${PORT}`
        )
    );
  })
  .catch((error) => {
    console.error(
      "MongoDB unavailable:",
      error.message
    );

    app.listen(
      PORT,
      () =>
        console.log(
          `API running in demo/no-db mode on ${PORT}`
        )
    );
  });

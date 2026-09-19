import mongoose, { Schema } from "mongoose";

const applicationDocumentSchema = new Schema(
  {
    documentType: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, default: "", trim: true, maxlength: 120 },
    required: { type: Boolean, default: false },
    fileName: { type: String, default: "", trim: true, maxlength: 240 },
    mimeType: { type: String, default: "", trim: true, maxlength: 120 },
    data: { type: String, default: "", maxlength: 5000000 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const applicationHistorySchema = new Schema(
  {
    status: { type: String, required: true, trim: true, maxlength: 50 },
    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: "public", trim: true, maxlength: 50 },
    note: { type: String, default: "", trim: true, maxlength: 2000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new Schema(
  {
    applicationId: { type: String, required: true, unique: true, index: true, trim: true },
    applicationType: { type: String, required: true, enum: ["STORE", "DELIVERY"], index: true },
    status: {
      type: String,
      required: true,
      enum: ["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED", "ON_HOLD"],
      default: "SUBMITTED",
      index: true,
    },

    applicantName: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, default: "", trim: true, maxlength: 180 },
    alternatePhone: { type: String, default: "", trim: true, maxlength: 30 },
    dateOfBirth: { type: String, default: "", trim: true, maxlength: 30 },
    gender: { type: String, default: "", trim: true, maxlength: 40 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    pincode: { type: String, required: true, trim: true, maxlength: 20 },
    currentAddress: { type: String, default: "", trim: true, maxlength: 600 },

    storeName: { type: String, default: "", trim: true, maxlength: 180 },
    storeCategory: { type: String, default: "", trim: true, maxlength: 120 },
    otherStoreCategory: { type: String, default: "", trim: true, maxlength: 120 },
    storeDescription: { type: String, default: "", trim: true, maxlength: 2000 },
    storeAddress: { type: String, default: "", trim: true, maxlength: 700 },
    landmark: { type: String, default: "", trim: true, maxlength: 180 },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    storeType: { type: String, default: "", trim: true, maxlength: 80 },
    storeImage: { type: String, default: "", maxlength: 1500000 },
    storeImageUrl: { type: String, default: "", trim: true, maxlength: 800 },

    businessName: { type: String, default: "", trim: true, maxlength: 180 },
    gstin: { type: String, default: "", trim: true, maxlength: 30 },
    pan: { type: String, default: "", trim: true, maxlength: 30 },
    businessType: { type: String, default: "", trim: true, maxlength: 80 },
    yearsInBusiness: { type: String, default: "", trim: true, maxlength: 30 },
    employeeCount: { type: String, default: "", trim: true, maxlength: 30 },
    contactPersonName: { type: String, default: "", trim: true, maxlength: 160 },
    contactNumber: { type: String, default: "", trim: true, maxlength: 30 },
    contactEmail: { type: String, default: "", trim: true, maxlength: 180 },
    preferredContactMethod: { type: String, default: "Phone", trim: true, maxlength: 30 },

    preferredDeliveryCity: { type: String, default: "", trim: true, maxlength: 120 },
    preferredAreas: { type: String, default: "", trim: true, maxlength: 1000 },
    servicePincodes: { type: String, default: "", trim: true, maxlength: 500 },
    availability: { type: String, default: "Flexible", trim: true, maxlength: 40 },
    preferredWorkingHours: { type: String, default: "", trim: true, maxlength: 120 },
    vehicleType: { type: String, default: "", trim: true, maxlength: 60 },
    vehicleRegistrationNumber: { type: String, default: "", trim: true, maxlength: 50 },
    drivingLicenceNumber: { type: String, default: "", trim: true, maxlength: 60 },
    vehicleOwnership: { type: String, default: "", trim: true, maxlength: 60 },
    emergencyContactName: { type: String, default: "", trim: true, maxlength: 160 },
    emergencyContactRelationship: { type: String, default: "", trim: true, maxlength: 80 },
    emergencyContactNumber: { type: String, default: "", trim: true, maxlength: 30 },
    previousDeliveryExperience: { type: String, default: "No", trim: true, maxlength: 10 },
    previousDeliveryCompany: { type: String, default: "", trim: true, maxlength: 160 },
    previousDeliveryDuration: { type: String, default: "", trim: true, maxlength: 80 },

    documents: { type: [applicationDocumentSchema], default: [] },
    declarationAccurate: { type: Boolean, default: false },
    declarationContact: { type: Boolean, default: false },

    adminNotes: { type: String, default: "", trim: true, maxlength: 5000 },
    publicMessage: { type: String, default: "", trim: true, maxlength: 2000 },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true, maxlength: 2000 },
    createdStoreId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdEmployeeId: { type: String, default: "", trim: true, maxlength: 80 },
    createdDeliveryPartnerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    statusHistory: { type: [applicationHistorySchema], default: [] },
  },
  { timestamps: true }
);

applicationSchema.index({ applicationType: 1, status: 1, createdAt: -1 });
applicationSchema.index({ phone: 1, createdAt: -1 });
applicationSchema.index({ email: 1, createdAt: -1 });

export default mongoose.models.Application || mongoose.model("Application", applicationSchema);

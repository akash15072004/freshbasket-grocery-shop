import mongoose, { Schema } from "mongoose";

export type UserRole = "customer" | "admin" | "delivery" | "customer_care" | "finance_manager" | "finance_executive";

export interface IUser {
  name: string; email: string; phone?: string; password: string; role: UserRole; blocked: boolean;
  employeeId?: string; customerId?: string; username?: string; department?: string; profilePhoto?: string; permissions?: string[]; lastLogin?: Date | null;
  forcePasswordChange?: boolean;
  ratingAverage?: number; ratingCount?: number;
}

const schema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, trim: true, lowercase: true },
  phone: { type: String, default: "" }, password: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin", "delivery", "customer_care", "finance_manager", "finance_executive"], default: "customer" },
  blocked: { type: Boolean, default: false },
  customerId: { type: String, default: undefined, trim: true },
  employeeId: { type: String, default: "", trim: true },
  username: { type: String, default: "", trim: true, lowercase: true },
  department: { type: String, default: "", trim: true },
  profilePhoto: { type: String, default: "", maxlength: 1000000 }, permissions: { type: [String], default: [] }, lastLogin: { type: Date, default: null },
  forcePasswordChange: { type: Boolean, default: false },
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 }, ratingCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
schema.index({ customerId: 1 }, { unique: true, sparse: true });
schema.index({ employeeId: 1 }, { unique: true, sparse: true });
schema.index({ username: 1 }, { unique: true, sparse: true });
export default mongoose.models.User || mongoose.model<IUser>("User", schema);

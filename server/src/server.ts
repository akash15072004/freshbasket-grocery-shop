import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import Review from "./models/Review";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import crypto from "crypto";

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
import OtpVerification from "./models/OtpVerification";

import { auth, role, AuthRequest } from "./middleware/auth";

const app = express();
const MAIN_ADMIN_EMAIL = String(process.env.MAIN_ADMIN_EMAIL || "admin@grocery.com").trim().toLowerCase();

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


const allowedOrigins = [
  "https://freshbasket-grocery-shop.vercel.app",
  "http://localhost:5173",
  "http://localhost",
  "https://localhost",
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
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
}: {
  product: any;
  change: number;
  previousStock: number;
  newStock: number;
  reason: string;
  order?: any;
  adjustedBy?: any;
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
    });
  } catch (error) {
    console.error("STOCK HISTORY ERROR:", error);
  }
};

const notifyUser = async ({ user, title, message, type = "info", order }: { user: any; title: string; message: string; type?: string; order?: any }) => {
  try {
    if (!user) return;
    await Notification.create({ user, title, message, type, ...(order ? { order } : {}) });
  } catch (error) {
    console.error("NOTIFICATION CREATE ERROR:", error);
  }
};

const notifyAdmins = async ({ title, message, type = "info", order }: { title: string; message: string; type?: string; order?: any }) => {
  try {
    const admins = await User.find({ role: "admin", blocked: { $ne: true } }).select("_id").lean();
    if (!admins.length) return;
    await Notification.insertMany(admins.map((admin: any) => ({ user: admin._id, title, message, type, ...(order ? { order } : {}) })));
  } catch (error) {
    console.error("ADMIN NOTIFICATION ERROR:", error);
  }
};


/* =========================================================
   OTP / VERIFICATION HELPERS
========================================================= */

const normalizePhone = (value: any) => String(value || "").replace(/\D/g, "");
const hashOtp = (otp: string) => crypto.createHash("sha256").update(otp).digest("hex");
const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const otpExpiryMs = 10 * 60 * 1000;
const otpCooldownMs = 60 * 1000;

const sendEmailOtp = async (email: string, otp: string, purpose: string) => {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.OTP_FROM_EMAIL || "FreshBasket <onboarding@resend.dev>").trim();
  const subject = purpose === "forgot" ? "FreshBasket password reset OTP" : "FreshBasket verification OTP";

  if (!apiKey) {
    console.log(`[FreshBasket OTP] EMAIL ${email}: ${otp}`);
    return process.env.OTP_DEV_MODE === "true" || process.env.NODE_ENV !== "production" ? otp : null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html: `<div style="font-family:Arial,sans-serif"><h2>FreshBasket</h2><p>Your OTP is:</p><h1 style="letter-spacing:6px">${otp}</h1><p>This OTP expires in 10 minutes. Do not share it with anyone.</p></div>`,
    }),
  });
  if (!response.ok) {
  const errorText = await response.text();

  console.error(
    "RESEND ERROR:",
    response.status,
    errorText
  );

  throw new Error(
    `Email provider returned ${response.status}: ${errorText}`
  );
}
  return null;
};

const sendSmsOtp = async (phone: string, otp: string) => {
  const sid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const token = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = String(process.env.TWILIO_FROM_NUMBER || "").trim();
  const to = phone.startsWith("+") ? phone : `+91${phone}`;

  if (!sid || !token || !from) {
    console.log(`[FreshBasket OTP] SMS ${phone}: ${otp}`);
    return process.env.OTP_DEV_MODE === "true" || process.env.NODE_ENV !== "production" ? otp : null;
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `FreshBasket verification OTP: ${otp}. Valid for 10 minutes.`,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  return null;
};

const createOtp = async ({
  channel,
  target,
  user,
  purpose,
}: {
  channel: "email" | "mobile";
  target: string;
  user?: any;
  purpose: string;
}) => {
  const normalizedTarget = channel === "email" ? target.toLowerCase() : normalizePhone(target);
  const recent = await OtpVerification.findOne({
    channel,
    target: normalizedTarget,
    purpose,
    createdAt: { $gte: new Date(Date.now() - otpCooldownMs) },
  }).lean();
  if (recent) throw new Error("Please wait 60 seconds before requesting another OTP");

  const otp = makeOtp();
  await OtpVerification.deleteMany({ channel, target: normalizedTarget, purpose, verifiedAt: { $exists: false } });
  await OtpVerification.create({
    channel,
    target: normalizedTarget,
    otpHash: hashOtp(otp),
    user: user?._id,
    purpose,
    expiresAt: new Date(Date.now() + otpExpiryMs),
  });

  const devOtp = channel === "email"
    ? await sendEmailOtp(normalizedTarget, otp, purpose)
    : await sendSmsOtp(normalizedTarget, otp);
  return devOtp;
};

const verifyOtp = async ({ channel, target, otp, purpose }: { channel: "email" | "mobile"; target: string; otp: string; purpose: string }) => {
  const normalizedTarget = channel === "email" ? target.toLowerCase() : normalizePhone(target);
  const record: any = await OtpVerification.findOne({
    channel,
    target: normalizedTarget,
    purpose,
    verifiedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (!record || record.expiresAt < new Date()) throw new Error("OTP is invalid or expired");
  if (record.attempts >= 5) throw new Error("Too many incorrect OTP attempts. Request a new OTP");

  if (record.otpHash !== hashOtp(String(otp || "").trim())) {
    record.attempts = Number(record.attempts || 0) + 1;
    await record.save();
    throw new Error("Invalid OTP");
  }

  record.verifiedAt = new Date();
  await record.save();
  return record;
};

const requireVerifiedOtp = async (channel: "email" | "mobile", target: string, purpose: string, userId?: any) => {
  const normalizedTarget = channel === "email" ? target.toLowerCase() : normalizePhone(target);
  const filter: any = {
    channel,
    target: normalizedTarget,
    purpose,
    verifiedAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
  };
  if (userId) filter.user = userId;
  const record = await OtpVerification.findOne(filter).sort({ verifiedAt: -1 });
  if (!record) throw new Error("Please verify the OTP first");
  return record;
};

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


app.post("/api/auth/send-email-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const purpose = String(req.body.purpose || "register").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    if (!["register", "forgot", "change-email"].includes(purpose)) return res.status(400).json({ success: false, message: "Invalid OTP purpose" });

    const existing: any = await User.findOne({ email }).lean();
    if (purpose === "register" && existing) return res.status(409).json({ success: false, message: "Email already registered" });
    if (purpose !== "register" && (!existing || existing.role !== "customer")) return res.status(404).json({ success: false, message: "Customer account not found" });

    const devOtp = await createOtp({ channel: "email", target: email, user: existing, purpose });
    return res.json({ success: true, message: "Email OTP sent successfully", ...(devOtp ? { devOtp } : {}) });
  } catch (error: any) {
    return res.status(429).json({ success: false, message: error?.message || "Unable to send email OTP" });
  }
});

app.post("/api/auth/verify-email-otp", async (req, res) => {
  try {
    await verifyOtp({ channel: "email", target: String(req.body.email || ""), otp: String(req.body.otp || ""), purpose: String(req.body.purpose || "register") });
    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error?.message || "Unable to verify email OTP" });
  }
});

app.post("/api/auth/send-mobile-otp", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const purpose = String(req.body.purpose || "register").trim();
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Please enter a valid 10-digit Indian mobile number" });
    if (!["register", "change-mobile"].includes(purpose)) return res.status(400).json({ success: false, message: "Invalid OTP purpose" });

    const existing: any = await User.findOne({ phone, role: "customer" }).lean();
    if (purpose === "register" && existing) return res.status(409).json({ success: false, message: "Mobile number already registered" });
    if (purpose === "change-mobile" && existing && String(existing._id) !== String(req.body.userId || "")) return res.status(409).json({ success: false, message: "Mobile number already registered" });

    const devOtp = await createOtp({ channel: "mobile", target: phone, user: existing, purpose });
    return res.json({ success: true, message: "Mobile OTP sent successfully", ...(devOtp ? { devOtp } : {}) });
  } catch (error: any) {
    return res.status(429).json({ success: false, message: error?.message || "Unable to send mobile OTP" });
  }
});

app.post("/api/auth/verify-mobile-otp", async (req, res) => {
  try {
    await verifyOtp({ channel: "mobile", target: String(req.body.phone || ""), otp: String(req.body.otp || ""), purpose: String(req.body.purpose || "register") });
    return res.json({ success: true, message: "Mobile number verified successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error?.message || "Unable to verify mobile OTP" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const newPassword = String(req.body.newPassword || "");
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    const user: any = await User.findOne({ email, role: "customer" });
    if (!user) return res.status(404).json({ success: false, message: "Customer account not found" });
    await requireVerifiedOtp("email", email, "forgot", user._id);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.collection.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
    await OtpVerification.deleteMany({ user: user._id, purpose: "forgot" });
    return res.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error?.message || "Unable to reset password" });
  }
});

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
    // OTP verification is intentionally disabled for registration.
    // OTP remains available for forgot-password and account changes.

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      role: "customer",
      blocked: false,
    });
    await User.collection.updateOne({ _id: user._id }, { $set: { emailVerified: true, phoneVerified: true } });
    await OtpVerification.deleteMany({ $or: [
      { target: normalizedEmail, purpose: "register" },
      { target: normalizedPhone, purpose: "register" },
    ] });

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
        },
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

    const user = await User.findOne({ email });

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (requestedRole && !["customer", "admin", "delivery"].includes(requestedRole)) {
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
          emailVerified: Boolean((user as any).emailVerified),
          phoneVerified: Boolean((user as any).phoneVerified),
          isMainAdmin: String(user.email || "").toLowerCase() === MAIN_ADMIN_EMAIL,
        },
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

    await User.collection.updateOne(
      { _id: user._id },
      { $set: { name, phone: phone || "" } }
    );

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
      return res.status(400).json({ success: false, message: "Mobile number changes require OTP verification" });
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


app.post("/api/profile/send-email-otp", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user: any = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: "Customer account not found" });
    const existing: any = await User.findOne({ email, _id: { $ne: user._id } }).select("_id").lean();
    if (existing) return res.status(409).json({ success: false, message: "This email is already registered" });
    const devOtp = await createOtp({ channel: "email", target: email, user, purpose: "change-email" });
    return res.json({ success: true, message: "Email OTP sent successfully", ...(devOtp ? { devOtp } : {}) });
  } catch (error: any) { return res.status(429).json({ success: false, message: error?.message || "Unable to send email OTP" }); }
});

app.post("/api/profile/verify-email-otp", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    await verifyOtp({ channel: "email", target: String(req.body.email || ""), otp: String(req.body.otp || ""), purpose: "change-email" });
    const email = String(req.body.email || "").trim().toLowerCase();
    const user: any = await User.findById(req.user!.id);
    await User.collection.updateOne({ _id: user._id }, { $set: { email, emailVerified: true } });
    const updated: any = await User.findById(user._id).select("-password").lean();
    return res.json({ success: true, message: "Email verified and updated successfully", data: updated });
  } catch (error: any) { return res.status(400).json({ success: false, message: error?.message || "Unable to verify email OTP" }); }
});

app.post("/api/profile/send-mobile-otp", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Please enter a valid 10-digit Indian mobile number" });
    const existing: any = await User.findOne({ phone, role: "customer", _id: { $ne: req.user!.id } }).select("_id").lean();
    if (existing) return res.status(409).json({ success: false, message: "This mobile number is already registered" });
    const user: any = await User.findById(req.user!.id);
    const devOtp = await createOtp({ channel: "mobile", target: phone, user, purpose: "change-mobile" });
    return res.json({ success: true, message: "Mobile OTP sent successfully", ...(devOtp ? { devOtp } : {}) });
  } catch (error: any) { return res.status(429).json({ success: false, message: error?.message || "Unable to send mobile OTP" }); }
});

app.post("/api/profile/verify-mobile-otp", auth, role("customer"), async (req: AuthRequest, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    await verifyOtp({ channel: "mobile", target: phone, otp: String(req.body.otp || ""), purpose: "change-mobile" });
    await User.collection.updateOne({ _id: new User.base.Types.ObjectId(req.user!.id) }, { $set: { phone, phoneVerified: true } });
    const updated: any = await User.findById(req.user!.id).select("-password").lean();
    return res.json({ success: true, message: "Mobile number verified and updated successfully", data: updated });
  } catch (error: any) { return res.status(400).json({ success: false, message: error?.message || "Unable to verify mobile OTP" }); }
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

    if (label.length < 2) return res.status(400).json({ success: false, message: "Please enter an address label" });
    if (name.length < 2) return res.status(400).json({ success: false, message: "Please enter your full name" });
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number" });
    if (address.length < 5) return res.status(400).json({ success: false, message: "Please enter a complete address" });
    if (city.length < 2) return res.status(400).json({ success: false, message: "Please enter your city" });
    if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ success: false, message: "Please enter a valid 6-digit pincode" });

    const count = await Address.countDocuments({ user: req.user!.id });
    const makeDefault = isDefault || count === 0;
    if (makeDefault) await Address.updateMany({ user: req.user!.id }, { $set: { isDefault: false } });

    const created = await Address.create({
      user: req.user!.id, label, name, phone, address, city, state, pincode, isDefault: makeDefault,
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

    if (label.length < 2 || name.length < 2 || address.length < 5 || city.length < 2) return res.status(400).json({ success: false, message: "Please complete all address details" });
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number" });
    if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ success: false, message: "Please enter a valid 6-digit pincode" });

    if (isDefault) await Address.updateMany({ user: req.user!.id, _id: { $ne: addressDoc._id } }, { $set: { isDefault: false } });
    addressDoc.label = label; addressDoc.name = name; addressDoc.phone = phone; addressDoc.address = address;
    addressDoc.city = city; addressDoc.state = state; addressDoc.pincode = pincode; addressDoc.isDefault = isDefault;
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
   BANNERS / OFFERS
========================================================= */

app.get("/api/banners", async (_req, res) => {
  try {
    const now = new Date();
    const banners = await Banner.find({
      isActive: true,
      $and: [
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

app.get("/api/admin/banners", auth, role("admin"), async (_req, res) => {
  try {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ success: true, data: banners });
  } catch (error) {
    console.error("ADMIN BANNER LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load banners" });
  }
});

app.post("/api/admin/banners", auth, role("admin"), async (req, res) => {
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

    const before: any = await Banner.findById(req.params.id);
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

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
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
    const banner = await Banner.findByIdAndDelete(req.params.id);
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

app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error("CATEGORY LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load categories" });
  }
});

app.get("/api/admin/categories", auth, role("admin"), async (_req, res) => {
  try {
    const productCategories = await Product.distinct("category", { category: { $nin: [null, ""] } });
    for (const rawName of productCategories) {
      const name = String(rawName || "").trim();
      if (!name) continue;
      await Category.updateOne(
        { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { $setOnInsert: { name, image: "", isActive: true } },
        { upsert: true }
      );
    }
    const categories = await Category.find().sort({ name: 1 }).lean();
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error("ADMIN CATEGORY LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load categories" });
  }
});

app.post("/api/admin/categories", auth, role("admin"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const image = String(req.body.image || "").trim();
    if (name.length < 2) return res.status(400).json({ success: false, message: "Category name is required" });

    const existing = await Category.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (existing) return res.status(400).json({ success: false, message: "Category already exists" });

    const category = await Category.create({ name, image, isActive: true });
    return res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error) {
    console.error("CATEGORY CREATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to create category" });
  }
});

app.put("/api/admin/categories/:id", auth, role("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Category not found" });
    const before = await Category.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: "Category not found" });

    const name = String(req.body.name ?? before.name).trim();
    const image = String(req.body.image ?? before.image ?? "").trim();
    const isActive = req.body.isActive === undefined ? before.isActive : Boolean(req.body.isActive);
    if (name.length < 2) return res.status(400).json({ success: false, message: "Category name is required" });

    const duplicate = await Category.findOne({ _id: { $ne: before._id }, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (duplicate) return res.status(400).json({ success: false, message: "Category already exists" });

    const category = await Category.findByIdAndUpdate(req.params.id, { name, image, isActive }, { new: true, runValidators: true });
    return res.json({ success: true, message: "Category updated successfully", data: category });
  } catch (error) {
    console.error("CATEGORY UPDATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to update category" });
  }
});

app.delete("/api/admin/categories/:id", auth, role("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Category not found" });
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const used = await Product.exists({ category: category.name });
    if (used) return res.status(400).json({ success: false, message: "Category is assigned to products. Disable it instead." });

    await category.deleteOne();
    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("CATEGORY DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to delete category" });
  }
});

/* =========================================================
   PRODUCTS
========================================================= */

app.get("/api/products", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();

    const filter: any = {
      isActive: true,
    };

    if (q) {
      filter.$or = [
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
      ];
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

app.get(
  "/api/admin/products",
  auth,
  role("admin"),
  async (_, res) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

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

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

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
      const product = await Product.create(req.body);

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
      const before = await Product.findById(req.params.id);
      if (!before) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const requestedStock =
        req.body.stock === undefined ? Number(before.stock || 0) : Number(req.body.stock);

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
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
        await recordStockHistory({
          product: product._id,
          change: requestedStock - previousStock,
          previousStock,
          newStock: requestedStock,
          reason: "Manual stock update",
          adjustedBy: (req as any).user?.id,
        });
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
      const filter: any = {};

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

      const product = await Product.findById(req.params.id);
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
      const product = await Product.findByIdAndDelete(
        req.params.id
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

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

app.get("/api/coupons", async (_req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({ isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now } })
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
    const coupon: any = await Coupon.findOne({ code });
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

app.get("/api/admin/coupons", auth, mainAdminOnly, async (_req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: coupons });
  } catch (error) {
    console.error("ADMIN COUPON LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load coupons" });
  }
});

app.post("/api/admin/coupons", auth, mainAdminOnly, async (req, res) => {
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

    const existing = await Coupon.findOne({ code });
    if (existing) return res.status(409).json({ success: false, message: "Coupon code already exists" });

    const coupon = await Coupon.create({ code, discountType, value, minOrderAmount, maxDiscount, startDate, expiryDate, usageLimit, isActive: payload.isActive !== false, usedCount: 0 });
    return res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
  } catch (error) {
    console.error("COUPON CREATE ERROR:", error);
    return res.status(400).json({ success: false, message: "Unable to create coupon" });
  }
});

app.put("/api/admin/coupons/:id", auth, mainAdminOnly, async (req, res) => {
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
    const coupon: any = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.json({ success: true, message: "Coupon updated successfully", data: coupon });
  } catch (error: any) {
    console.error("COUPON UPDATE ERROR:", error);
    return res.status(400).json({ success: false, message: error?.message || "Unable to update coupon" });
  }
});

app.delete("/api/admin/coupons/:id", auth, mainAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Coupon not found" });
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
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
   NOTIFICATIONS
========================================================= */

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
      } else if (req.user!.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      const orders = await Order.find(filter)
        .populate("user", "name email phone")
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
         Validate stock before creating order
      --------------------------------------------- */

      for (const item of items) {
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

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.stock} units of ${product.name} are available`,
          });
        }
      }

      const subtotal = items.reduce(
        (sum: number, item: any) =>
          sum + Number(item.price) * Number(item.quantity),
        0
      );

      let safeDiscount = 0;
      let appliedCoupon: any = null;
      if (couponCode) {
        const coupon: any = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
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

      const order = await Order.create({
        user: req.user!.id,
        items,
        subtotal,
        discount: safeDiscount,
        deliveryCharge,
        total,
        paymentMethod,
        address,
        deliverySlot,
        status: "Pending",
      });

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

      /* ---------------------------------------------
         Deduct stock
      --------------------------------------------- */

      for (const item of items) {
        const productBefore = await Product.findById(item.product);
        if (!productBefore) continue;
        const previousStock = Number(productBefore.stock || 0);
        const quantity = Number(item.quantity);
        productBefore.stock = previousStock - quantity;
        await productBefore.save();
        await recordStockHistory({
          product: productBefore._id,
          change: -quantity,
          previousStock,
          newStock: previousStock - quantity,
          reason: "Order placed",
          order: order._id,
        });
      }

      await notifyUser({
        user: order.user,
        title: "Order placed",
        message: `Your order #${String(order._id).slice(-8).toUpperCase()} has been placed successfully.`,
        type: "order",
        order: order._id,
      });
      await notifyAdmins({
        title: "New order received",
        message: `New order #${String(order._id).slice(-8).toUpperCase()} has been placed.`,
        type: "order",
        order: order._id,
      });

      return res.status(201).json({
        success: true,
        message: "Order placed successfully",
        data: order,
      });
    } catch (error) {
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

      const status = String(
        req.query.status || ""
      ).trim();

      const filter: any = {};

      if (status) {
        filter.status = status;
      }

      let userIds: mongoose.Types.ObjectId[] = [];

      if (search) {
        const regex = new RegExp(search, "i");

        const matchingUsers = await User.find({
          role: "customer",
          $or: [
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
          filter.$or = orderConditions;
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
   ADMIN MANAGEMENT
========================================================= */

app.get(
  "/api/admin/admins",
  auth,
  mainAdminOnly,
  async (_req, res) => {
    try {
      const admins = await User.find({ role: "admin" })
        .select("name email phone role blocked")
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

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await User.create({
        name,
        email,
        phone: phone || undefined,
        password: hashedPassword,
        role: "admin",
        blocked: false,
      });

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

      const admin: any = await User.findOne({
        _id: req.params.id,
        role: "admin",
      });

      if (!admin) {
        return res.status(404).json({ success: false, message: "Admin not found" });
      }

      admin.blocked = blocked;
      await admin.save();

      return res.json({
        success: true,
        message: blocked ? "Admin blocked successfully" : "Admin activated successfully",
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          blocked: admin.blocked,
        },
      });
    } catch (error) {
      console.error("ADMIN STATUS ERROR:", error);
      return res.status(500).json({ success: false, message: "Unable to update admin status" });
    }
  }
);

/* =========================================================
   DELIVERY PARTNERS / ASSIGNMENT
========================================================= */

app.get(
  "/api/admin/delivery-partners",
  auth,
  role("admin"),
  async (_req, res) => {
    try {
      const partners = await User.find({
        role: "delivery",
      })
        .select("name email phone role blocked")
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

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Name, email and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email" });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const partner = await User.create({
        name,
        email,
        phone: phone || undefined,
        password: hashedPassword,
        role: "delivery",
        blocked: false,
      });

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
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ success: false, message: "Delivery partner not found" });
      }

      const blocked = Boolean(req.body.blocked);
      const partner: any = await User.findOne({
        _id: req.params.id,
        role: "delivery",
      });

      if (!partner) {
        return res.status(404).json({ success: false, message: "Delivery partner not found" });
      }

      partner.blocked = blocked;
      await partner.save();

      return res.json({
        success: true,
        message: blocked ? "Delivery partner blocked successfully" : "Delivery partner activated successfully",
        data: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          role: partner.role,
          blocked: partner.blocked,
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

app.patch(
  "/api/admin/orders/:id/assign",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { deliveryPartnerId } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (["Delivered", "Cancelled"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "Cannot assign a completed or cancelled order",
        });
      }

      if (deliveryPartnerId) {
        if (!mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid delivery partner",
          });
        }

        const partner = await User.findOne({
          _id: deliveryPartnerId,
          role: "delivery",
          blocked: { $ne: true },
        });

        if (!partner) {
          return res.status(400).json({
            success: false,
            message: "Delivery partner not found or blocked",
          });
        }

        order.deliveryPartner = partner._id as any;
      } else {
        order.deliveryPartner = null as any;
      }

      await order.save();

      if (deliveryPartnerId) {
        await notifyUser({
          user: deliveryPartnerId,
          title: "New order assigned",
          message: `Order #${String(order._id).slice(-8).toUpperCase()} has been assigned to you.`,
          type: "assignment",
          order: order._id,
        });
      }

      const updated = await Order.findById(order._id)
        .populate("user", "name email phone blocked")
        .populate("deliveryPartner", "name email phone role blocked");

      return res.json({
        success: true,
        message: deliveryPartnerId
          ? "Delivery partner assigned successfully"
          : "Delivery partner unassigned successfully",
        data: updated,
      });
    } catch (error) {
      console.error("ASSIGN DELIVERY ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to assign delivery partner",
      });
    }
  }
);

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
        .populate("user", "name email phone")
        .populate("deliveryPartner", "name email phone role");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Customers can track only their own orders. Admins can track any order.
      // Delivery partners can track only orders assigned to them.
      if (req.user!.role === "customer" && String(order.user?._id || order.user) !== String(req.user!.id)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
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

      return res.json({
        success: true,
        data: order,
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

/* =========================================================
   CUSTOMER CANCEL ORDER
========================================================= */

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
        .populate("user", "name email phone")
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

      const order = await Order.findById(
        req.params.id
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const previousStatus = order.status;

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

      const updated = await Order.findById(
        order._id
      )
        .populate("user", "name email phone")
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

      const order = await Order.findById(req.params.id).lean();

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

      if ((order as any).paymentMethod !== "COD") {
        return res.status(400).json({
          success: false,
          message: "Payment collection is only available for COD orders",
        });
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

      const paymentMode = String(req.body.paymentMode || "UPI").toUpperCase();
      if (paymentMode !== "UPI") {
        return res.status(400).json({
          success: false,
          message: "Only UPI payment is supported for QR collection",
        });
      }

      await Order.collection.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentStatus: "Paid",
            paymentMode: "UPI",
            paymentPaidAt: new Date(),
          },
        }
      );

      await notifyUser({
        user: order.user,
        title: "Payment received",
        message: `UPI payment for order #${String(order._id).slice(-8).toUpperCase()} has been marked as received.`,
        type: "payment",
        order: order._id,
      });

      const updated = await Order.findById(order._id)
        .populate("user", "name email phone")
        .lean();

      return res.json({
        success: true,
        message: "Payment marked as received",
        data: updated,
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

      const filter: any = {
        role: "customer",
      };

      if (search) {
        const regex = new RegExp(search, "i");

        filter.$or = [
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
   BLOCK / UNBLOCK CUSTOMER
========================================================= */

app.patch(
  "/api/admin/customers/:id/block",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const blocked =
        Boolean(req.body.blocked);

      const customer =
        await User.findOneAndUpdate(
          {
            _id: req.params.id,
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
   ADMIN STATS
========================================================= */

app.get(
  "/api/admin/stats",
  auth,
  role("admin"),
  async (_, res) => {
    try {
      const [
        orders,
        customers,
        products,
      ] = await Promise.all([
        Order.find().lean(),
        User.countDocuments({
          role: "customer",
        }),
        Product.countDocuments(),
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
  async (req, res) => {
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

      const orders =
        await Order.find({
          createdAt: {
            $gte: start,
          },
        }).lean();

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

const PORT = Number(
  process.env.PORT || 5000
);

mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/grocery_shop"
  )
  .then(() => {
    console.log(
      "MongoDB connected successfully"
    );

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

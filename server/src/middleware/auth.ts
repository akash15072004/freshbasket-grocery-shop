import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Authentication middleware
 * - Verifies JWT
 * - Loads the latest user role from MongoDB
 * - Prevents stale/wrong role information inside old JWTs
 */
export async function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = header.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    ) as {
      id?: string;
      role?: string;
    };

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Get the latest role from MongoDB.
    const user = await User.findById(decoded.id).select(
      "_id role blocked"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.blocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function role(...roles: string[]) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    const currentRole = String(req.user?.role || "")
      .trim()
      .toLowerCase();

    const allowedRoles = roles.map((r) =>
      String(r).trim().toLowerCase()
    );

    if (allowedRoles.includes(currentRole)) {
      return next();
    }

    console.warn(
      `ROLE FORBIDDEN: current=${currentRole}, allowed=${allowedRoles.join(", ")}`
    );

    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  };
}
import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

const AUTH_INACTIVITY_MAX_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;

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
 * - Blocks disabled accounts
 * - Enforces backend-authoritative 7-day inactivity
 * - Updates authenticated activity timestamp at a bounded interval
 */
export const auth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthRequest;
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

    /**
     * MongoDB remains authoritative for:
     * - account existence
     * - current role
     * - blocked status
     * - last authenticated activity
     */
    const user = await User.findById(decoded.id).select(
      "_id role blocked lastActivityAt"
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

    const now = Date.now();

    const lastActivity = user.lastActivityAt
      ? new Date(user.lastActivityAt).getTime()
      : 0;

    /**
     * Enforce seven days of authenticated inactivity on the backend.
     *
     * Legacy users that do not have lastActivityAt yet are initialized
     * on this authenticated request instead of being incorrectly expired.
     */
    if (
      lastActivity > 0 &&
      now - lastActivity >= AUTH_INACTIVITY_MAX_MS
    ) {
      return res.status(401).json({
        success: false,
        message: "Session expired after 7 days of inactivity",
        code: "SESSION_INACTIVITY_EXPIRED",
      });
    }

    /**
     * Do not write to MongoDB on every authenticated API request.
     * Refresh the activity timestamp at most once every five minutes.
     */
    if (
      !lastActivity ||
      now - lastActivity >= AUTH_ACTIVITY_WRITE_INTERVAL_MS
    ) {
      await User.collection.updateOne(
        { _id: user._id },
        {
          $set: {
            lastActivityAt: new Date(now),
          },
        }
      );
    }

    authReq.user = {
      id: user._id.toString(),
      role: user.role,
    };

    return next();
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Role-based authorization middleware
 */
export function role(...roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    const currentRole = String(authReq.user?.role || "")
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
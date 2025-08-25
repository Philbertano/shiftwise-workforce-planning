// Authentication and authorization middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
        active: boolean;
      };
    }
  }
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  active: boolean;
  iat?: number;
  exp?: number;
}

// Main authentication middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required'
      }
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'test-secret';

  try {
    const payload = jwt.verify(token, jwtSecret) as JWTPayload;
    
    req.user = {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
      active: payload.active
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
    }

    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid access token'
      }
    });
  }
};

// Legacy alias for compatibility
export const authenticateToken = authMiddleware;

// Middleware to require specific roles
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const hasRequiredRole = allowedRoles.includes(req.user.role);

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

// Simple auth requirement middleware (no role checking)
export const requireAuth = (allowedRoles?: string[]) => {
  if (allowedRoles) {
    return requireRole(allowedRoles);
  }
  return authMiddleware;
};
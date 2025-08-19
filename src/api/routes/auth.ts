// Authentication API routes

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { loginSchema, refreshTokenSchema } from '../schemas/auth';
import { UserRole } from '../../types';

const router = Router();

// Mock user database - In production, this would be replaced with actual user repository
const mockUsers = [
  {
    id: '1',
    email: 'admin@shiftwise.com',
    name: 'System Administrator',
    passwordHash: '$2b$10$T0SpnDIobAO2IqqbkXC8d.ZxeRaQf7ZORiS/BEJwXtDWR44tp.fbu', // 'admin123'
    roles: [UserRole.ADMIN],
    active: true
  },
  {
    id: '2',
    email: 'hr@shiftwise.com',
    name: 'HR Planner',
    passwordHash: '$2b$10$T0SpnDIobAO2IqqbkXC8d.ZxeRaQf7ZORiS/BEJwXtDWR44tp.fbu', // 'hr123' (using same hash for simplicity)
    roles: [UserRole.HR_PLANNER],
    active: true
  },
  {
    id: '3',
    email: 'shift@shiftwise.com',
    name: 'Shift Leader',
    passwordHash: '$2b$10$T0SpnDIobAO2IqqbkXC8d.ZxeRaQf7ZORiS/BEJwXtDWR44tp.fbu', // 'shift123' (using same hash for simplicity)
    roles: [UserRole.SHIFT_LEADER],
    active: true
  }
];

// Login endpoint
router.post('/login',
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user by email
      const user = mockUsers.find(u => u.email === email && u.active);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date()
        });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date()
        });
      }
      
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET environment variable not set');
        return res.status(500).json({
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'Server configuration error'
          },
          timestamp: new Date()
        });
      }
      
      // Generate JWT token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles
      };
      
      const accessToken = jwt.sign(tokenPayload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
      });
      
      const refreshToken = jwt.sign(
        { userId: user.id },
        jwtSecret,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles
          },
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '8h'
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed'
        },
        timestamp: new Date()
      });
    }
  }
);

// Refresh token endpoint
router.post('/refresh',
  validateRequest(refreshTokenSchema),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'Server configuration error'
          },
          timestamp: new Date()
        });
      }
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtSecret) as { userId: string };
      
      // Find user
      const user = mockUsers.find(u => u.id === decoded.userId && u.active);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          },
          timestamp: new Date()
        });
      }
      
      // Generate new access token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles
      };
      
      const accessToken = jwt.sign(tokenPayload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
      });
      
      res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '8h'
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Refresh token has expired'
          },
          timestamp: new Date()
        });
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Token refresh failed'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get current user profile
router.get('/me',
  authenticateToken,
  async (req, res) => {
    try {
      if (!req.auth) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        data: {
          user: req.auth.user,
          permissions: req.auth.permissions
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user profile'
        },
        timestamp: new Date()
      });
    }
  }
);

// Logout endpoint (client-side token invalidation)
router.post('/logout',
  authenticateToken,
  async (req, res) => {
    try {
      // In a production system, you might want to maintain a blacklist of tokens
      // For now, we'll just return success and let the client handle token removal
      
      res.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date()
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed'
        },
        timestamp: new Date()
      });
    }
  }
);

export { router as authRoutes };
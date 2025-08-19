import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Mock users for testing
const mockUsers = [
  {
    id: 'user-admin',
    username: 'test-admin',
    role: 'admin',
    active: true
  },
  {
    id: 'user-planner',
    username: 'test-planner',
    role: 'planner',
    active: true
  },
  {
    id: 'user-viewer',
    username: 'test-viewer',
    role: 'viewer',
    active: true
  },
  {
    id: 'user-inactive',
    username: 'test-inactive',
    role: 'planner',
    active: false
  }
];

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = mockUsers.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }

    if (!user.active) {
      return res.status(401).json({
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive'
        }
      });
    }
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        active: user.active
      },
      jwtSecret,
      { expiresIn: '8h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      }
    });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Logout failed'
      }
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profile'
      }
    });
  }
});

export { router as authRoutes };
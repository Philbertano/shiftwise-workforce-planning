import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/system/config - Get system configuration (admin only)
router.get('/config', async (req, res) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }
    
    res.json({
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      features: {
        aiAssistant: true,
        constraintSolver: true,
        auditLogging: true
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch system config'
      }
    });
  }
});

export { router as systemRoutes };
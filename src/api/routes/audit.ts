import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/audit/logs - Get audit logs (admin only)
router.get('/logs', async (req, res) => {
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
      logs: [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
          action: 'CREATE_EMPLOYEE',
          resource: 'employee',
          details: { employeeId: 'emp-1' }
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch audit logs'
      }
    });
  }
});

export { router as auditRoutes };
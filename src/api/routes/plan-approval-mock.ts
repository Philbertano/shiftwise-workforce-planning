import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// POST /api/plan-approval/commit - Commit plan
router.post('/commit', async (req, res) => {
  try {
    // Check permissions
    if (req.user?.role === 'viewer') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Planning access required'
        }
      });
    }

    const { assignments } = req.body;
    
    res.json({
      committedCount: assignments?.length || 0,
      success: true
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to commit plan'
      }
    });
  }
});

export { router as planApprovalRoutes };
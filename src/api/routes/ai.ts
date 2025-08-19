import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// POST /api/ai/plan - Natural language planning
router.post('/plan', async (req, res) => {
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

    res.json({
      planId: `plan-${Date.now()}`,
      explanation: 'Generated plan based on your request',
      assignments: [
        {
          id: 'assignment-1',
          employeeId: 'emp-1',
          stationId: 'station-1',
          shiftId: 'morning'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate AI plan'
      }
    });
  }
});

// POST /api/ai/explain - Get AI explanation
router.post('/explain', async (req, res) => {
  try {
    res.json({
      explanation: 'This assignment was made based on skill match and availability constraints.'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate explanation'
      }
    });
  }
});

export { router as aiRoutes };
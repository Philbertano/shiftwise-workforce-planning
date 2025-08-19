import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/plans - List plans
router.get('/', async (req, res) => {
  try {
    res.json({
      plans: [
        {
          id: 'plan-1',
          date: '2024-01-15',
          status: 'proposed',
          assignmentCount: 5
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch plans'
      }
    });
  }
});

export { router as planRoutes };
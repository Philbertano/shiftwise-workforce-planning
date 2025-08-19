import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/coverage - Get coverage status
router.get('/', async (req, res) => {
  try {
    res.json({
      heatmap: {
        stations: ['station-1', 'station-2'],
        shifts: ['morning', 'afternoon'],
        coverage: [[100, 85], [90, 95]]
      },
      gaps: [
        {
          stationId: 'station-1',
          shiftId: 'afternoon',
          severity: 'medium',
          requiredCount: 2,
          assignedCount: 1
        }
      ],
      overallCoverage: 92.5
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch coverage'
      }
    });
  }
});

export { router as coverageRoutes };
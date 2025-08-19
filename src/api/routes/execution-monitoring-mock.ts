import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/execution/status - Get execution status
router.get('/status', async (req, res) => {
  try {
    res.json({
      assignments: [
        {
          id: 'assignment-1',
          employeeId: 'emp-1',
          stationId: 'station-1',
          status: 'confirmed',
          date: req.query.date || '2024-01-15'
        },
        {
          id: 'assignment-2',
          employeeId: 'emp-2',
          stationId: 'station-2',
          status: 'confirmed',
          date: req.query.date || '2024-01-15'
        },
        {
          id: 'assignment-3',
          employeeId: 'emp-3',
          stationId: 'station-3',
          status: 'confirmed',
          date: req.query.date || '2024-01-15'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch execution status'
      }
    });
  }
});

export { router as executionMonitoringRoutes };
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// POST /api/absence - Create absence
router.post('/', async (req, res) => {
  try {
    const { employeeId, type, dateStart, dateEnd, reason } = req.body;
    
    // Mock absence creation
    const absence = {
      id: `absence-${Date.now()}`,
      employeeId,
      type,
      dateStart,
      dateEnd,
      reason,
      approved: false,
      conflicts: [] // Mock no conflicts for simplicity
    };
    
    res.status(201).json(absence);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create absence'
      }
    });
  }
});

// GET /api/absence - List absences
router.get('/', async (req, res) => {
  try {
    res.json({
      absences: [
        {
          id: 'absence-1',
          employeeId: 'emp-1',
          type: 'vacation',
          dateStart: '2024-01-20',
          dateEnd: '2024-01-22',
          approved: true
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch absences'
      }
    });
  }
});

export { router as absenceRoutes };
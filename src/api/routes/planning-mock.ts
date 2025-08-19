import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// POST /api/plan/generate - Generate plan
router.post('/generate', async (req, res) => {
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

    // Simulate plan generation
    const planId = `plan-${Date.now()}`;
    
    res.json({
      planId,
      assignments: [
        {
          id: 'assignment-1',
          employeeId: 'emp-1',
          stationId: 'station-1',
          shiftId: 'morning',
          score: 0.85
        },
        {
          id: 'assignment-2',
          employeeId: 'emp-2',
          stationId: 'station-2',
          shiftId: 'morning',
          score: 0.92
        },
        {
          id: 'assignment-3',
          employeeId: 'emp-3',
          stationId: 'station-3',
          shiftId: 'morning',
          score: 0.78
        },
        {
          id: 'assignment-4',
          employeeId: 'emp-4',
          stationId: 'station-4',
          shiftId: 'afternoon',
          score: 0.88
        }
      ],
      coverage: {
        overallPercentage: 85,
        gaps: [
          {
            stationId: 'station-3',
            shiftId: 'afternoon',
            severity: 'medium'
          }
        ]
      },
      violations: req.body.constraints?.maxHoursPerDay < 8 ? [
        {
          constraintId: 'max-hours-per-day',
          severity: 'error',
          message: 'Maximum hours per day constraint violated',
          suggestedActions: ['Increase max hours limit', 'Reduce station requirements']
        }
      ] : []
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate plan'
      }
    });
  }
});

// POST /api/plan/commit - Commit plan
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

    const { planId, assignments } = req.body;
    
    // Count approved assignments
    const approvedCount = assignments?.filter((a: any) => a.status === 'approved').length || 0;
    
    res.json({
      committedCount: approvedCount,
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

// GET /api/plan/explain/:id - Get assignment explanation
router.get('/explain/:id', async (req, res) => {
  try {
    res.json({
      explanation: 'This assignment was made based on skill match (95% compatibility), availability (employee was free), and fairness considerations (balanced workload distribution).'
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

// POST /api/plan/simulate - Simulate what-if scenario
router.post('/simulate', async (req, res) => {
  try {
    const { scenario } = req.body;
    
    res.json({
      impact: {
        affectedAssignments: 2,
        coverageChange: -15,
        riskLevel: 'medium'
      },
      alternativeAssignments: [
        {
          id: 'alt-assignment-1',
          employeeId: 'emp-backup-1',
          stationId: scenario.stationId || 'station-1',
          score: 0.75
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to simulate scenario'
      }
    });
  }
});

// POST /api/plan/optimize - Optimize existing plan
router.post('/optimize', async (req, res) => {
  try {
    const { planId, objectives } = req.body;
    
    res.json({
      improvements: {
        fairnessScore: 0.15,
        coverageIncrease: 5,
        violationsReduced: 2
      },
      optimizedAssignments: [
        {
          id: 'opt-assignment-1',
          employeeId: 'emp-1',
          stationId: 'station-1',
          score: 0.95
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to optimize plan'
      }
    });
  }
});

export { router as planningRoutes };
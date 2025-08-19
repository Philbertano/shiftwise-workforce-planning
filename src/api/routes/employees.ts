import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { employeeSchema } from '../schemas/employee';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/employees - List all employees
router.get('/', async (req, res) => {
  try {
    // Mock implementation for testing
    res.json({
      employees: [
        {
          id: 'emp-1',
          name: 'Test Employee',
          contractType: 'full-time',
          weeklyHours: 40,
          active: true
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch employees'
      }
    });
  }
});

// POST /api/employees - Create new employee
router.post('/', validateRequest(employeeSchema), async (req, res) => {
  try {
    // Mock implementation for testing
    const employee = {
      id: `emp-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create employee'
      }
    });
  }
});

// DELETE /api/employees/:id - Delete employee (admin only)
router.delete('/:id', async (req, res) => {
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
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete employee'
      }
    });
  }
});

// GET /api/employees/qualifications - Get employee qualifications
router.get('/qualifications', async (req, res) => {
  try {
    res.json({
      employees: [
        {
          id: 'emp-1',
          name: 'Test Employee',
          qualifications: [
            {
              skillId: 'skill-1',
              skillName: 'Welding',
              level: 3,
              validUntil: '2025-12-31'
            }
          ]
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch qualifications'
      }
    });
  }
});

// POST /api/employees/qualifications/bulk - Bulk update qualifications
router.post('/qualifications/bulk', async (req, res) => {
  try {
    const { updates } = req.body;
    
    res.json({
      updatedCount: updates?.length || 0,
      success: true
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update qualifications'
      }
    });
  }
});

export { router as employeeRoutes };
// Absences API routes

import { Router } from 'express';
import { AbsenceRepository } from '../../repositories/absence.repository';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { 
  absenceSchema, 
  absenceUpdateSchema, 
  absenceQuerySchema, 
  absenceParamsSchema,
  absenceApprovalSchema 
} from '../schemas/absence';
import { UserRole } from '../../types';

const router = Router();
const absenceRepo = new AbsenceRepository();

// Get all absences
router.get('/', 
  authenticateToken,
  validateQuery(absenceQuerySchema),
  async (req, res) => {
    try {
      const { employeeId, type, approved, dateStart, dateEnd, limit, offset } = req.query;
      
      let absences;
      if (employeeId) {
        absences = await absenceRepo.findByEmployee(employeeId as string);
      } else if (type) {
        absences = await absenceRepo.findByType(type as any);
      } else if (approved !== undefined) {
        absences = await absenceRepo.findByApprovalStatus(approved === 'true');
      } else if (dateStart && dateEnd) {
        absences = await absenceRepo.findByDateRange(
          new Date(dateStart as string),
          new Date(dateEnd as string)
        );
      } else {
        absences = await absenceRepo.findAll();
      }
      
      // Apply pagination if specified
      if (limit || offset) {
        const limitNum = limit ? parseInt(limit as string) : 50;
        const offsetNum = offset ? parseInt(offset as string) : 0;
        absences = absences.slice(offsetNum, offsetNum + limitNum);
      }
      
      res.json({
        success: true,
        data: absences,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch absences'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get absence by ID
router.get('/:id',
  authenticateToken,
  validateParams(absenceParamsSchema),
  async (req, res) => {
    try {
      const absence = await absenceRepo.findById(req.params.id);
      
      if (!absence) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Absence not found'
          },
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        data: absence,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch absence'
        },
        timestamp: new Date()
      });
    }
  }
);

// Create new absence
router.post('/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER, UserRole.EMPLOYEE]),
  validateRequest(absenceSchema),
  async (req, res) => {
    try {
      // Check for overlapping absences
      const overlapping = await absenceRepo.findOverlapping(
        req.body.employeeId,
        new Date(req.body.dateStart),
        new Date(req.body.dateEnd)
      );
      
      if (overlapping.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Absence overlaps with existing absence',
            details: { overlappingAbsences: overlapping }
          },
          timestamp: new Date()
        });
      }
      
      const absence = await absenceRepo.create(req.body);
      
      res.status(201).json({
        success: true,
        data: absence,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create absence'
        },
        timestamp: new Date()
      });
    }
  }
);

// Update absence
router.put('/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]),
  validateParams(absenceParamsSchema),
  validateRequest(absenceUpdateSchema),
  async (req, res) => {
    try {
      const absence = await absenceRepo.update(req.params.id, req.body);
      
      res.json({
        success: true,
        data: absence,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Absence not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update absence'
        },
        timestamp: new Date()
      });
    }
  }
);

// Approve/reject absence
router.patch('/:id/approval',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]),
  validateParams(absenceParamsSchema),
  validateRequest(absenceApprovalSchema),
  async (req, res) => {
    try {
      const { approved } = req.body;
      const approvedBy = req.auth?.user.id;
      
      const absence = await absenceRepo.updateApproval(req.params.id, approved, approvedBy);
      
      res.json({
        success: true,
        data: absence,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Absence not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update absence approval'
        },
        timestamp: new Date()
      });
    }
  }
);

// Delete absence
router.delete('/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]),
  validateParams(absenceParamsSchema),
  async (req, res) => {
    try {
      await absenceRepo.delete(req.params.id);
      
      res.json({
        success: true,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Absence not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete absence'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get pending absences for approval
router.get('/pending/approval',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]),
  async (req, res) => {
    try {
      const pendingAbsences = await absenceRepo.findByApprovalStatus(false);
      
      res.json({
        success: true,
        data: pendingAbsences,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pending absences'
        },
        timestamp: new Date()
      });
    }
  }
);

// Check absence conflicts
router.post('/check-conflicts',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER, UserRole.EMPLOYEE]),
  validateRequest(absenceSchema),
  async (req, res) => {
    try {
      const { employeeId, dateStart, dateEnd } = req.body;
      
      // Check for overlapping absences
      const overlappingAbsences = await absenceRepo.findConflicting(
        employeeId,
        new Date(dateStart),
        new Date(dateEnd)
      );
      
      // Check impact on existing assignments
      const impactAnalysis = await absenceRepo.checkAbsenceImpact(
        employeeId,
        new Date(dateStart),
        new Date(dateEnd)
      );
      
      const hasConflicts = overlappingAbsences.length > 0 || impactAnalysis.conflictingAssignments > 0;
      
      const conflicts = [];
      
      // Add absence conflicts
      if (overlappingAbsences.length > 0) {
        conflicts.push({
          type: 'absence_overlap',
          description: `Overlaps with ${overlappingAbsences.length} existing absence(s)`,
          severity: 'error',
          details: overlappingAbsences
        });
      }
      
      // Add assignment conflicts
      if (impactAnalysis.conflictingAssignments > 0) {
        conflicts.push({
          type: 'assignment_conflict',
          description: `Conflicts with ${impactAnalysis.conflictingAssignments} existing assignment(s)`,
          severity: impactAnalysis.impactLevel === 'critical' ? 'error' : 'warning',
          details: {
            conflictingAssignments: impactAnalysis.conflictingAssignments,
            affectedStations: impactAnalysis.affectedStations,
            impactLevel: impactAnalysis.impactLevel
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          hasConflicts,
          conflicts,
          impactAnalysis,
          canProceed: conflicts.every(c => c.severity !== 'error')
        },
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check absence conflicts'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get absence impact analysis
router.get('/:id/impact',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]),
  validateParams(absenceParamsSchema),
  async (req, res) => {
    try {
      const absence = await absenceRepo.findById(req.params.id);
      
      if (!absence) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Absence not found'
          },
          timestamp: new Date()
        });
      }
      
      const impactAnalysis = await absenceRepo.checkAbsenceImpact(
        absence.employeeId,
        absence.dateStart,
        absence.dateEnd
      );
      
      // Get alternative employees for affected stations
      const alternativeEmployees = await getAlternativeEmployees(
        impactAnalysis.affectedStations,
        absence.dateStart,
        absence.dateEnd
      );
      
      res.json({
        success: true,
        data: {
          absence,
          impactAnalysis,
          alternativeEmployees,
          recommendations: generateAbsenceRecommendations(impactAnalysis, alternativeEmployees)
        },
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to analyze absence impact'
        },
        timestamp: new Date()
      });
    }
  }
);

// Bulk approve absences
router.post('/bulk-approve',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]),
  async (req, res) => {
    try {
      const { absenceIds } = req.body;
      const approvedBy = req.auth?.user.id;
      
      if (!Array.isArray(absenceIds) || absenceIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'absenceIds must be a non-empty array'
          },
          timestamp: new Date()
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const absenceId of absenceIds) {
        try {
          const absence = await absenceRepo.approveAbsence(absenceId, approvedBy);
          results.push(absence);
        } catch (error) {
          errors.push({
            absenceId,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          approved: results,
          errors,
          summary: {
            total: absenceIds.length,
            approved: results.length,
            failed: errors.length
          }
        },
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to bulk approve absences'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get absence statistics
router.get('/stats/summary',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]),
  validateQuery(absenceQuerySchema),
  async (req, res) => {
    try {
      const { dateStart, dateEnd } = req.query;
      
      const startDate = dateStart ? new Date(dateStart as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateEnd ? new Date(dateEnd as string) : new Date();
      
      const stats = await absenceRepo.getAbsenceStats(startDate, endDate);
      
      res.json({
        success: true,
        data: {
          ...stats,
          dateRange: { start: startDate, end: endDate }
        },
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch absence statistics'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get upcoming absences
router.get('/upcoming/list',
  authenticateToken,
  async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const upcomingAbsences = await absenceRepo.getUpcomingAbsences(days);
      
      res.json({
        success: true,
        data: upcomingAbsences,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch upcoming absences'
        },
        timestamp: new Date()
      });
    }
  }
);

// Helper function to get alternative employees
async function getAlternativeEmployees(stationIds: string[], startDate: Date, endDate: Date) {
  // This would typically query the employee repository to find qualified alternatives
  // For now, return empty array as placeholder
  return [];
}

// Helper function to generate recommendations
function generateAbsenceRecommendations(impactAnalysis: any, alternativeEmployees: any[]) {
  const recommendations = [];
  
  if (impactAnalysis.impactLevel === 'critical') {
    recommendations.push('Consider rejecting this absence due to critical impact on operations');
    recommendations.push('Explore overtime options for remaining staff');
  } else if (impactAnalysis.impactLevel === 'high') {
    recommendations.push('Approve with caution - significant impact expected');
    recommendations.push('Identify backup employees for affected stations');
  } else if (impactAnalysis.impactLevel === 'medium') {
    recommendations.push('Moderate impact - ensure coverage plans are in place');
  } else {
    recommendations.push('Low impact - safe to approve');
  }
  
  if (alternativeEmployees.length > 0) {
    recommendations.push(`${alternativeEmployees.length} alternative employees available`);
  } else if (impactAnalysis.conflictingAssignments > 0) {
    recommendations.push('No immediate alternatives found - consider temporary staffing');
  }
  
  return recommendations;
}

export { router as absenceRoutes };
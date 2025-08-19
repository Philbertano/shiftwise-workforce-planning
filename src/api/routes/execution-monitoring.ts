// API routes for execution monitoring

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ExecutionMonitoringService } from '../../services/ExecutionMonitoringService.js';
import { ExecutionStatusRepository } from '../../repositories/execution-status.repository.js';
import { PlanRepository } from '../../repositories/plan.repository.js';
import { AssignmentRepository } from '../../repositories/assignment.repository.js';
import { AuditService } from '../../services/AuditService.js';
import { SqliteAuditRepository } from '../../repositories/audit.repository.js';
import { DatabaseManager } from '../../database/config.js';
import { validateRequest } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { ExecutionStatusType } from '../../types/plan.js';

const router = Router();

// Initialize services
const executionStatusRepository = new ExecutionStatusRepository();
const planRepository = new PlanRepository();
const assignmentRepository = new AssignmentRepository();
const dbManager = DatabaseManager.getInstance();
const auditRepository = new SqliteAuditRepository(dbManager.getDatabase());
const auditService = new AuditService(auditRepository);
const executionMonitoringService = new ExecutionMonitoringService(
  executionStatusRepository,
  planRepository,
  assignmentRepository,
  auditService
);

// Validation schemas
const updateStatusSchema = z.object({
  assignmentId: z.string().min(1),
  status: z.nativeEnum(ExecutionStatusType),
  notes: z.string().optional(),
  actualStartTime: z.string().datetime().optional(),
  actualEndTime: z.string().datetime().optional()
});

const lastMinuteChangeSchema = z.object({
  assignmentId: z.string().min(1),
  changeType: z.enum(['cancel', 'modify', 'replace']),
  reason: z.string().optional(),
  replacementEmployeeId: z.string().optional(),
  newStartTime: z.string().datetime().optional(),
  newEndTime: z.string().datetime().optional()
});

const replanningSchema = z.object({
  planId: z.string().min(1),
  gapDemandIds: z.array(z.string())
});

/**
 * PUT /api/execution-monitoring/status
 * Update the execution status of an assignment
 */
router.put('/status', requireAuth, validateRequest(updateStatusSchema), async (req: Request, res: Response) => {
  try {
    const { assignmentId, status, notes, actualStartTime, actualEndTime } = req.body;
    const updatedBy = req.user?.id || 'system';
    
    const executionStatus = await executionMonitoringService.updateAssignmentStatus(
      assignmentId,
      status,
      updatedBy,
      {
        notes,
        actualStartTime: actualStartTime ? new Date(actualStartTime) : undefined,
        actualEndTime: actualEndTime ? new Date(actualEndTime) : undefined
      }
    );
    
    res.json({
      success: true,
      data: executionStatus,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error updating assignment status:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'STATUS_UPDATE_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/execution-monitoring/plan/:planId/summary
 * Get execution summary for a plan
 */
router.get('/plan/:planId/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    const summary = await executionMonitoringService.getPlanExecutionSummary(planId);
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting plan execution summary:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_SUMMARY_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/execution-monitoring/assignment/:assignmentId/history
 * Get execution history for an assignment
 */
router.get('/assignment/:assignmentId/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    
    const history = await executionMonitoringService.getAssignmentExecutionHistory(assignmentId);
    
    res.json({
      success: true,
      data: history,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting assignment execution history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_HISTORY_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/execution-monitoring/plan/:planId/coverage
 * Get real-time coverage status for a plan
 */
router.get('/plan/:planId/coverage', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    const coverage = await executionMonitoringService.getRealTimeCoverage(planId);
    
    res.json({
      success: true,
      data: coverage,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting real-time coverage:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'COVERAGE_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/execution-monitoring/last-minute-change
 * Handle last-minute changes to assignments
 */
router.post('/last-minute-change', requireAuth, validateRequest(lastMinuteChangeSchema), async (req: Request, res: Response) => {
  try {
    const { assignmentId, changeType, reason, replacementEmployeeId, newStartTime, newEndTime } = req.body;
    const updatedBy = req.user?.id || 'system';
    
    const result = await executionMonitoringService.handleLastMinuteChange(
      assignmentId,
      changeType,
      updatedBy,
      {
        reason,
        replacementEmployeeId,
        newStartTime: newStartTime ? new Date(newStartTime) : undefined,
        newEndTime: newEndTime ? new Date(newEndTime) : undefined
      }
    );
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error handling last-minute change:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'LAST_MINUTE_CHANGE_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/execution-monitoring/plan/:planId/alerts
 * Get execution alerts for a plan
 */
router.get('/plan/:planId/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    const alerts = await executionMonitoringService.getExecutionAlerts(planId);
    
    res.json({
      success: true,
      data: alerts,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting execution alerts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_ALERTS_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/execution-monitoring/replanning
 * Trigger re-planning for coverage gaps
 */
router.post('/replanning', requireAuth, validateRequest(replanningSchema), async (req: Request, res: Response) => {
  try {
    const { planId, gapDemandIds } = req.body;
    const triggeredBy = req.user?.id || 'system';
    
    const result = await executionMonitoringService.triggerReplanningForGaps(
      planId,
      gapDemandIds,
      triggeredBy
    );
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error triggering re-planning:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'REPLANNING_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/execution-monitoring/stats
 * Get execution statistics for a date range
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'startDate and endDate are required'
        },
        timestamp: new Date()
      });
    }
    
    const stats = await executionStatusRepository.getExecutionStats(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting execution stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_STATS_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

export default router;
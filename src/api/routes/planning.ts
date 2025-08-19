// Planning API routes

import { Router } from 'express';
import { PlanningService } from '../../services/PlanningService';
import { ConstraintManager } from '../../constraints/ConstraintManager';
import { AssignmentRepository } from '../../repositories/assignment.repository';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { 
  planGenerationSchema, 
  planCommitSchema, 
  coverageQuerySchema,
  planParamsSchema 
} from '../schemas/planning';
import { UserRole } from '../../types';

const router = Router();
const constraintManager = new ConstraintManager();
const planningService = new PlanningService(constraintManager);
const assignmentRepo = new AssignmentRepository();

// Generate a new plan
router.post('/generate',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER, UserRole.HR_PLANNER]),
  validateRequest(planGenerationSchema),
  async (req, res) => {
    try {
      const userId = req.auth?.user.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found in authentication context'
          },
          timestamp: new Date()
        });
      }

      const planProposal = await planningService.generatePlan(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: planProposal,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Plan generation error:', error);
      
      if (error.message.includes('No employees found') || error.message.includes('No demands found')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: error.message
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate plan'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get plan by ID
router.get('/:id',
  authenticateToken,
  validateParams(planParamsSchema),
  async (req, res) => {
    try {
      const plan = await planningService.getPlan(req.params.id);
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Plan not found'
          },
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        data: plan,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan'
        },
        timestamp: new Date()
      });
    }
  }
);

// Commit a plan (approve and persist assignments)
router.post('/:id/commit',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateParams(planParamsSchema),
  validateRequest(planCommitSchema),
  async (req, res) => {
    try {
      const userId = req.auth?.user.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found in authentication context'
          },
          timestamp: new Date()
        });
      }

      const { assignmentIds } = req.body;
      const result = await planningService.commitPlan(req.params.id, assignmentIds, userId);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Plan commit error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Plan not found'
          },
          timestamp: new Date()
        });
      }
      
      if (error.message.includes('already committed')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Plan has already been committed'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to commit plan'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get coverage status and heatmap data
router.get('/coverage/status',
  authenticateToken,
  validateQuery(coverageQuerySchema),
  async (req, res) => {
    try {
      const { dateStart, dateEnd, stationIds } = req.query;
      
      const coverageData = await planningService.getCoverageStatus({
        dateStart: dateStart ? new Date(dateStart as string) : new Date(),
        dateEnd: dateEnd ? new Date(dateEnd as string) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to next 7 days
        stationIds: stationIds ? (stationIds as string).split(',') : undefined
      });
      
      res.json({
        success: true,
        data: coverageData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Coverage status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch coverage status'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get coverage heatmap for specific date range
router.get('/coverage/heatmap',
  authenticateToken,
  validateQuery(coverageQuerySchema),
  async (req, res) => {
    try {
      const { dateStart, dateEnd, stationIds } = req.query;
      
      if (!dateStart || !dateEnd) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'dateStart and dateEnd are required for heatmap data'
          },
          timestamp: new Date()
        });
      }
      
      const heatmapData = await planningService.getCoverageHeatmap({
        dateStart: new Date(dateStart as string),
        dateEnd: new Date(dateEnd as string),
        stationIds: stationIds ? (stationIds as string).split(',') : undefined
      });
      
      res.json({
        success: true,
        data: heatmapData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Coverage heatmap error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch coverage heatmap'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get all plans (with filtering)
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const { status, dateStart, dateEnd, createdBy, limit, offset } = req.query;
      
      const plans = await planningService.getPlans({
        status: status as any,
        dateStart: dateStart ? new Date(dateStart as string) : undefined,
        dateEnd: dateEnd ? new Date(dateEnd as string) : undefined,
        createdBy: createdBy as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      });
      
      res.json({
        success: true,
        data: plans,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plans'
        },
        timestamp: new Date()
      });
    }
  }
);

// Delete a plan (only if not committed)
router.delete('/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateParams(planParamsSchema),
  async (req, res) => {
    try {
      await planningService.deletePlan(req.params.id);
      
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
            message: 'Plan not found'
          },
          timestamp: new Date()
        });
      }
      
      if (error.message.includes('cannot be deleted')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Committed plans cannot be deleted'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete plan'
        },
        timestamp: new Date()
      });
    }
  }
);

export { router as planningRoutes };
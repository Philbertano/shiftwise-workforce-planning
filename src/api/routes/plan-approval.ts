// API routes for plan approval workflow

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PlanApprovalService } from '../../services/PlanApprovalService.js';
import { PlanRepository } from '../../repositories/plan.repository.js';
import { AssignmentRepository } from '../../repositories/assignment.repository.js';
import { AuditService } from '../../services/AuditService.js';
import { SqliteAuditRepository } from '../../repositories/audit.repository.js';
import { DatabaseManager } from '../../database/config.js';
import { validateRequest } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { PlanApprovalRequest, PlanCommitRequest } from '../../types/plan.js';

const router = Router();

// Initialize services
const planRepository = new PlanRepository();
const assignmentRepository = new AssignmentRepository();
const dbManager = DatabaseManager.getInstance();
const auditRepository = new SqliteAuditRepository(dbManager.getDatabase());
const auditService = new AuditService(auditRepository);
const planApprovalService = new PlanApprovalService(
  planRepository,
  assignmentRepository,
  auditService
);

// Validation schemas
const planApprovalSchema = z.object({
  planId: z.string().min(1),
  assignmentIds: z.array(z.string()).optional(),
  rejectedAssignmentIds: z.array(z.string()).optional(),
  comments: z.string().optional(),
  approvedBy: z.string().min(1)
});

const planCommitSchema = z.object({
  planId: z.string().min(1),
  assignmentIds: z.array(z.string()).optional(),
  committedBy: z.string().min(1),
  effectiveDate: z.string().datetime().optional()
});

const planRejectSchema = z.object({
  planId: z.string().min(1),
  rejectedBy: z.string().min(1),
  reason: z.string().optional()
});

/**
 * GET /api/plan-approval/:planId/review
 * Get plan review data including diff and impact analysis
 */
router.get('/:planId/review', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    const reviewData = await planApprovalService.reviewPlan(planId);
    
    res.json({
      success: true,
      data: reviewData,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting plan review data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PLAN_REVIEW_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/plan-approval/approve
 * Approve a plan (all or selected assignments)
 */
router.post('/approve', requireAuth, validateRequest(planApprovalSchema), async (req: Request, res: Response) => {
  try {
    const approvalRequest: PlanApprovalRequest = {
      ...req.body,
      approvedBy: req.user?.id || req.body.approvedBy
    };
    
    const approvedPlan = await planApprovalService.approvePlan(approvalRequest);
    
    res.json({
      success: true,
      data: approvedPlan,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error approving plan:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'PLAN_APPROVAL_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/plan-approval/commit
 * Commit approved plan assignments
 */
router.post('/commit', requireAuth, validateRequest(planCommitSchema), async (req: Request, res: Response) => {
  try {
    const commitRequest: PlanCommitRequest = {
      ...req.body,
      committedBy: req.user?.id || req.body.committedBy,
      effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined
    };
    
    const commitResult = await planApprovalService.commitPlan(commitRequest);
    
    res.json({
      success: true,
      data: commitResult,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error committing plan:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'PLAN_COMMIT_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/plan-approval/reject
 * Reject a plan
 */
router.post('/reject', requireAuth, validateRequest(planRejectSchema), async (req: Request, res: Response) => {
  try {
    const { planId, reason } = req.body;
    const rejectedBy = req.user?.id || req.body.rejectedBy;
    
    const rejectedPlan = await planApprovalService.rejectPlan(planId, rejectedBy, reason);
    
    res.json({
      success: true,
      data: rejectedPlan,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error rejecting plan:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'PLAN_REJECT_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/plan-approval/:planId/compare/:comparedPlanId?
 * Compare two plans and return differences
 */
router.get('/:planId/compare/:comparedPlanId?', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId, comparedPlanId } = req.params;
    
    const planDiff = await planApprovalService.comparePlans(planId, comparedPlanId);
    
    res.json({
      success: true,
      data: planDiff,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error comparing plans:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PLAN_COMPARE_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/plan-approval/:planId/history
 * Get plan history (versions/changes over time)
 */
router.get('/:planId/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    const planHistory = await planApprovalService.getPlanHistory(planId);
    
    res.json({
      success: true,
      data: planHistory,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting plan history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PLAN_HISTORY_ERROR',
        message: error.message
      },
      timestamp: new Date()
    });
  }
});

export default router;
// Integration tests for plan approval API

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import planApprovalRoutes from '../../api/routes/plan-approval.js';

// Mock the services
vi.mock('../../services/PlanApprovalService.js');
vi.mock('../../repositories/plan.repository.js');
vi.mock('../../repositories/assignment.repository.js');
vi.mock('../../services/AuditService.js');

const app = express();
app.use(express.json());
app.use('/api/plan-approval', planApprovalRoutes);

describe('Plan Approval API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/plan-approval/:planId/review', () => {
    it('should return plan review data', async () => {
      const mockReviewData = {
        plan: {
          id: 'plan-1',
          name: 'Test Plan',
          status: 'pending_approval',
          assignments: [],
          coverageStatus: { totalDemands: 0, filledDemands: 0, coveragePercentage: 0, gaps: [], riskLevel: 'low' },
          violations: [],
          dateRange: { start: new Date(), end: new Date() },
          createdAt: new Date(),
          createdBy: 'user-1',
          updatedAt: new Date()
        },
        impactAnalysis: {
          affectedEmployees: [],
          affectedStations: [],
          riskAssessment: 'Low',
          recommendations: []
        }
      };

      // Mock the service method
      const { PlanApprovalService } = await import('../../services/PlanApprovalService.js');
      vi.mocked(PlanApprovalService.prototype.reviewPlan).mockResolvedValue(mockReviewData);

      const response = await request(app)
        .get('/api/plan-approval/plan-1/review')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.id).toBe('plan-1');
    });

    it('should handle plan not found error', async () => {
      const { PlanApprovalService } = await import('../../services/PlanApprovalService.js');
      vi.mocked(PlanApprovalService.prototype.reviewPlan).mockRejectedValue(new Error('Plan plan-1 not found'));

      const response = await request(app)
        .get('/api/plan-approval/nonexistent/review')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Plan plan-1 not found');
    });
  });

  describe('POST /api/plan-approval/approve', () => {
    it('should approve plan successfully', async () => {
      const mockApprovedPlan = {
        id: 'plan-1',
        status: 'approved',
        assignments: [],
        coverageStatus: { totalDemands: 0, filledDemands: 0, coveragePercentage: 0, gaps: [], riskLevel: 'low' },
        violations: [],
        dateRange: { start: new Date(), end: new Date() },
        createdAt: new Date(),
        createdBy: 'user-1',
        updatedAt: new Date()
      };

      const { PlanApprovalService } = await import('../../services/PlanApprovalService.js');
      vi.mocked(PlanApprovalService.prototype.approvePlan).mockResolvedValue(mockApprovedPlan);

      const response = await request(app)
        .post('/api/plan-approval/approve')
        .send({
          planId: 'plan-1',
          assignmentIds: ['assignment-1'],
          approvedBy: 'manager-1',
          comments: 'Approved'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/plan-approval/approve')
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/plan-approval/commit', () => {
    it('should commit plan successfully', async () => {
      const mockCommitResult = {
        planId: 'plan-1',
        committedAssignments: [],
        skippedAssignments: [],
        errors: [],
        committedAt: new Date()
      };

      const { PlanApprovalService } = await import('../../services/PlanApprovalService.js');
      vi.mocked(PlanApprovalService.prototype.commitPlan).mockResolvedValue(mockCommitResult);

      const response = await request(app)
        .post('/api/plan-approval/commit')
        .send({
          planId: 'plan-1',
          committedBy: 'manager-1'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.planId).toBe('plan-1');
    });
  });

  describe('POST /api/plan-approval/reject', () => {
    it('should reject plan successfully', async () => {
      const mockRejectedPlan = {
        id: 'plan-1',
        status: 'rejected',
        assignments: [],
        coverageStatus: { totalDemands: 0, filledDemands: 0, coveragePercentage: 0, gaps: [], riskLevel: 'low' },
        violations: [],
        dateRange: { start: new Date(), end: new Date() },
        createdAt: new Date(),
        createdBy: 'user-1',
        updatedAt: new Date()
      };

      const { PlanApprovalService } = await import('../../services/PlanApprovalService.js');
      vi.mocked(PlanApprovalService.prototype.rejectPlan).mockResolvedValue(mockRejectedPlan);

      const response = await request(app)
        .post('/api/plan-approval/reject')
        .send({
          planId: 'plan-1',
          rejectedBy: 'manager-1',
          reason: 'Not suitable'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });
  });

  describe('GET /api/plan-approval/:planId/compare/:comparedPlanId?', () => {
    it('should compare plans successfully', async () => {
      const mockDiff = {
        planId: 'plan-1',
        comparedWith: 'plan-2',
        assignmentDiffs: [],
        coverageChanges: {
          totalDemands: { old: 0, new: 0 },
          filledDemands: { old: 0, new: 0 },
          coveragePercentage: { old: 0, new: 0 }
        },
        summary: {
          addedAssignments: 0,
          removedAssignments: 0,
          modifiedAssignments: 0
        }
      };

      const { PlanApprovalService } = await import('../../services/PlanApprovalService.js');
      vi.mocked(PlanApprovalService.prototype.comparePlans).mockResolvedValue(mockDiff);

      const response = await request(app)
        .get('/api/plan-approval/plan-1/compare/plan-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.planId).toBe('plan-1');
      expect(response.body.data.comparedWith).toBe('plan-2');
    });
  });
});
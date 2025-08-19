// Tests for PlanApprovalService

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanApprovalService } from '../../services/PlanApprovalService.js';
import { Plan, PlanStatus, PlanApprovalRequest, PlanCommitRequest } from '../../types/plan.js';
import { Assignment, AssignmentStatus } from '../../types/index.js';

// Mock dependencies
const mockPlanRepository = {
  findWithAssignments: vi.fn(),
  findByStatus: vi.fn(),
  updateStatus: vi.fn(),
  commitPlan: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn()
};

const mockAssignmentRepository = {
  update: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn()
};

const mockAuditService = {
  logAction: vi.fn()
};

describe('PlanApprovalService', () => {
  let planApprovalService: PlanApprovalService;
  let mockPlan: Plan;
  let mockAssignments: Assignment[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    planApprovalService = new PlanApprovalService(
      mockPlanRepository as any,
      mockAssignmentRepository as any,
      mockAuditService as any
    );

    // Create mock assignments
    mockAssignments = [
      {
        id: 'assignment-1',
        demandId: 'demand-1',
        employeeId: 'employee-1',
        status: AssignmentStatus.PROPOSED,
        score: 85,
        explanation: 'Good skill match',
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date()
      },
      {
        id: 'assignment-2',
        demandId: 'demand-2',
        employeeId: 'employee-2',
        status: AssignmentStatus.PROPOSED,
        score: 70,
        explanation: 'Adequate skill match',
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date()
      }
    ];

    // Create mock plan
    mockPlan = {
      id: 'plan-1',
      name: 'Test Plan',
      status: PlanStatus.PENDING_APPROVAL,
      assignments: mockAssignments,
      coverageStatus: {
        totalDemands: 2,
        filledDemands: 2,
        coveragePercentage: 100,
        gaps: [],
        riskLevel: 'low' as any
      },
      violations: [],
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-07')
      },
      createdAt: new Date(),
      createdBy: 'planner-1',
      updatedAt: new Date()
    };
  });

  describe('reviewPlan', () => {
    it('should return plan review data with impact analysis', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);
      mockPlanRepository.findByStatus.mockResolvedValue([]);

      const result = await planApprovalService.reviewPlan('plan-1');

      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('impactAnalysis');
      expect(result.plan.id).toBe('plan-1');
      expect(result.impactAnalysis).toHaveProperty('affectedEmployees');
      expect(result.impactAnalysis).toHaveProperty('riskAssessment');
      expect(result.impactAnalysis).toHaveProperty('recommendations');
    });

    it('should include diff when comparing with existing committed plan', async () => {
      const committedPlan = { ...mockPlan, id: 'committed-plan', status: PlanStatus.COMMITTED };
      
      mockPlanRepository.findWithAssignments
        .mockResolvedValueOnce(mockPlan)
        .mockResolvedValueOnce(committedPlan);
      mockPlanRepository.findByStatus.mockResolvedValue([committedPlan]);

      const result = await planApprovalService.reviewPlan('plan-1');

      expect(result.diff).toBeDefined();
      expect(result.diff?.planId).toBe('plan-1');
      expect(result.diff?.comparedWith).toBe('committed-plan');
    });

    it('should throw error when plan not found', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(null);

      await expect(planApprovalService.reviewPlan('nonexistent')).rejects.toThrow('Plan nonexistent not found');
    });
  });

  describe('approvePlan', () => {
    it('should approve all assignments when no specific assignments provided', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);
      mockPlanRepository.updateStatus.mockResolvedValue({ ...mockPlan, status: PlanStatus.APPROVED });
      mockAssignmentRepository.update.mockResolvedValue({});

      const request: PlanApprovalRequest = {
        planId: 'plan-1',
        approvedBy: 'manager-1',
        comments: 'Looks good'
      };

      const result = await planApprovalService.approvePlan(request);

      expect(result.status).toBe(PlanStatus.APPROVED);
      expect(mockAssignmentRepository.update).toHaveBeenCalledTimes(2);
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('should approve only selected assignments', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);
      mockPlanRepository.updateStatus.mockResolvedValue({ ...mockPlan, status: PlanStatus.PARTIALLY_APPROVED });
      mockAssignmentRepository.update.mockResolvedValue({});

      const request: PlanApprovalRequest = {
        planId: 'plan-1',
        assignmentIds: ['assignment-1'],
        approvedBy: 'manager-1'
      };

      const result = await planApprovalService.approvePlan(request);

      expect(result.status).toBe(PlanStatus.PARTIALLY_APPROVED);
      expect(mockAssignmentRepository.update).toHaveBeenCalledTimes(1);
      expect(mockAssignmentRepository.update).toHaveBeenCalledWith('assignment-1', {
        status: AssignmentStatus.CONFIRMED,
        updatedAt: expect.any(Date)
      });
    });

    it('should reject specified assignments', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);
      mockPlanRepository.updateStatus.mockResolvedValue({ ...mockPlan, status: PlanStatus.PARTIALLY_APPROVED });
      mockAssignmentRepository.update.mockResolvedValue({});

      const request: PlanApprovalRequest = {
        planId: 'plan-1',
        assignmentIds: ['assignment-1'],
        rejectedAssignmentIds: ['assignment-2'],
        approvedBy: 'manager-1'
      };

      await planApprovalService.approvePlan(request);

      expect(mockAssignmentRepository.update).toHaveBeenCalledWith('assignment-1', {
        status: AssignmentStatus.CONFIRMED,
        updatedAt: expect.any(Date)
      });
      expect(mockAssignmentRepository.update).toHaveBeenCalledWith('assignment-2', {
        status: AssignmentStatus.REJECTED,
        updatedAt: expect.any(Date)
      });
    });

    it('should set status to REJECTED when no assignments approved', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);
      mockPlanRepository.updateStatus.mockResolvedValue({ ...mockPlan, status: PlanStatus.REJECTED });
      mockAssignmentRepository.update.mockResolvedValue({});

      const request: PlanApprovalRequest = {
        planId: 'plan-1',
        assignmentIds: [],
        rejectedAssignmentIds: ['assignment-1', 'assignment-2'],
        approvedBy: 'manager-1'
      };

      const result = await planApprovalService.approvePlan(request);

      expect(result.status).toBe(PlanStatus.REJECTED);
    });

    it('should throw error when trying to approve committed plan', async () => {
      const committedPlan = { ...mockPlan, status: PlanStatus.COMMITTED };
      mockPlanRepository.findWithAssignments.mockResolvedValue(committedPlan);

      const request: PlanApprovalRequest = {
        planId: 'plan-1',
        approvedBy: 'manager-1'
      };

      await expect(planApprovalService.approvePlan(request)).rejects.toThrow('Cannot approve a committed plan');
    });
  });

  describe('commitPlan', () => {
    it('should commit approved assignments', async () => {
      const approvedPlan = {
        ...mockPlan,
        status: PlanStatus.APPROVED,
        assignments: mockAssignments.map(a => ({ ...a, status: AssignmentStatus.CONFIRMED }))
      };
      
      mockPlanRepository.findWithAssignments.mockResolvedValue(approvedPlan);
      mockPlanRepository.commitPlan.mockResolvedValue(approvedPlan);

      const request: PlanCommitRequest = {
        planId: 'plan-1',
        committedBy: 'manager-1'
      };

      const result = await planApprovalService.commitPlan(request);

      expect(result.planId).toBe('plan-1');
      expect(result.committedAssignments).toHaveLength(2);
      expect(result.skippedAssignments).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('should commit only selected assignments', async () => {
      const approvedPlan = {
        ...mockPlan,
        status: PlanStatus.APPROVED,
        assignments: mockAssignments.map(a => ({ ...a, status: AssignmentStatus.CONFIRMED }))
      };
      
      mockPlanRepository.findWithAssignments.mockResolvedValue(approvedPlan);
      mockPlanRepository.commitPlan.mockResolvedValue(approvedPlan);

      const request: PlanCommitRequest = {
        planId: 'plan-1',
        assignmentIds: ['assignment-1'],
        committedBy: 'manager-1'
      };

      const result = await planApprovalService.commitPlan(request);

      expect(result.committedAssignments).toHaveLength(1);
      expect(result.committedAssignments[0].id).toBe('assignment-1');
    });

    it('should throw error when trying to commit non-approved plan', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);

      const request: PlanCommitRequest = {
        planId: 'plan-1',
        committedBy: 'manager-1'
      };

      await expect(planApprovalService.commitPlan(request)).rejects.toThrow('Can only commit approved plans');
    });
  });

  describe('rejectPlan', () => {
    it('should reject plan and update all assignments', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);
      mockPlanRepository.updateStatus.mockResolvedValue({ ...mockPlan, status: PlanStatus.REJECTED });
      mockAssignmentRepository.update.mockResolvedValue({});

      const result = await planApprovalService.rejectPlan('plan-1', 'manager-1', 'Not suitable');

      expect(result.status).toBe(PlanStatus.REJECTED);
      expect(mockAssignmentRepository.update).toHaveBeenCalledTimes(2);
      expect(mockAuditService.logAction).toHaveBeenCalledWith({
        action: 'reject',
        entityType: 'plan',
        entityId: 'plan-1',
        userId: 'manager-1',
        changes: {
          status: { from: PlanStatus.PENDING_APPROVAL, to: PlanStatus.REJECTED },
          reason: 'Not suitable'
        }
      });
    });

    it('should throw error when trying to reject committed plan', async () => {
      const committedPlan = { ...mockPlan, status: PlanStatus.COMMITTED };
      mockPlanRepository.findWithAssignments.mockResolvedValue(committedPlan);

      await expect(planApprovalService.rejectPlan('plan-1', 'manager-1')).rejects.toThrow('Cannot reject a committed plan');
    });
  });

  describe('comparePlans', () => {
    it('should compare two plans and return differences', async () => {
      const plan2 = {
        ...mockPlan,
        id: 'plan-2',
        assignments: [mockAssignments[0]] // Only first assignment
      };

      mockPlanRepository.findWithAssignments
        .mockResolvedValueOnce(mockPlan)
        .mockResolvedValueOnce(plan2);

      const result = await planApprovalService.comparePlans('plan-1', 'plan-2');

      expect(result.planId).toBe('plan-1');
      expect(result.comparedWith).toBe('plan-2');
      expect(result.assignmentDiffs).toHaveLength(1);
      expect(result.assignmentDiffs[0].type).toBe('added');
      expect(result.summary.addedAssignments).toBe(1);
    });

    it('should compare plan with empty baseline when no second plan provided', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);

      const result = await planApprovalService.comparePlans('plan-1');

      expect(result.planId).toBe('plan-1');
      expect(result.comparedWith).toBeUndefined();
      expect(result.assignmentDiffs).toHaveLength(2);
      expect(result.assignmentDiffs.every(d => d.type === 'added')).toBe(true);
    });
  });

  describe('getPlanHistory', () => {
    it('should return plan history', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);

      const result = await planApprovalService.getPlanHistory('plan-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('plan-1');
    });

    it('should return empty array when plan not found', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(null);

      const result = await planApprovalService.getPlanHistory('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
// Tests for ExecutionMonitoringService

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionMonitoringService } from '../../services/ExecutionMonitoringService.js';
import { ExecutionStatus, ExecutionStatusType, PlanExecutionSummary } from '../../types/plan.js';
import { Assignment, AssignmentStatus } from '../../types/index.js';

// Mock dependencies
const mockExecutionStatusRepository = {
  updateAssignmentStatus: vi.fn(),
  getPlanExecutionSummary: vi.fn(),
  findByAssignment: vi.fn(),
  findByPlan: vi.fn(),
  getExecutionStats: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn()
};

const mockPlanRepository = {
  findById: vi.fn(),
  findWithAssignments: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn()
};

const mockAssignmentRepository = {
  findById: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn()
};

const mockAuditService = {
  logAction: vi.fn()
};

describe('ExecutionMonitoringService', () => {
  let executionMonitoringService: ExecutionMonitoringService;
  let mockAssignment: Assignment;
  let mockExecutionStatus: ExecutionStatus;
  let mockPlanSummary: PlanExecutionSummary;

  beforeEach(() => {
    vi.clearAllMocks();
    
    executionMonitoringService = new ExecutionMonitoringService(
      mockExecutionStatusRepository as any,
      mockPlanRepository as any,
      mockAssignmentRepository as any,
      mockAuditService as any
    );

    mockAssignment = {
      id: 'assignment-1',
      demandId: 'demand-1',
      employeeId: 'employee-1',
      status: AssignmentStatus.CONFIRMED,
      score: 85,
      explanation: 'Good skill match',
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date()
    };

    mockExecutionStatus = {
      planId: 'plan-1',
      assignmentId: 'assignment-1',
      status: ExecutionStatusType.SCHEDULED,
      updatedAt: new Date(),
      updatedBy: 'system'
    };

    mockPlanSummary = {
      planId: 'plan-1',
      totalAssignments: 10,
      completedAssignments: 7,
      inProgressAssignments: 2,
      cancelledAssignments: 1,
      noShowAssignments: 0,
      completionRate: 70,
      onTimeRate: 85,
      lastUpdated: new Date()
    };
  });

  describe('updateAssignmentStatus', () => {
    it('should update assignment status successfully', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);
      mockExecutionStatusRepository.updateAssignmentStatus.mockResolvedValue({
        ...mockExecutionStatus,
        status: ExecutionStatusType.IN_PROGRESS
      });

      const result = await executionMonitoringService.updateAssignmentStatus(
        'assignment-1',
        ExecutionStatusType.IN_PROGRESS,
        'supervisor-1',
        {
          notes: 'Started on time',
          actualStartTime: new Date()
        }
      );

      expect(result.status).toBe(ExecutionStatusType.IN_PROGRESS);
      expect(mockExecutionStatusRepository.updateAssignmentStatus).toHaveBeenCalledWith(
        'assignment-1',
        ExecutionStatusType.IN_PROGRESS,
        'supervisor-1',
        'Started on time',
        expect.any(Date),
        undefined
      );
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('should throw error when assignment not found', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(null);

      await expect(
        executionMonitoringService.updateAssignmentStatus(
          'nonexistent',
          ExecutionStatusType.IN_PROGRESS,
          'supervisor-1'
        )
      ).rejects.toThrow('Assignment nonexistent not found');
    });

    it('should throw error when assignment not confirmed', async () => {
      const proposedAssignment = { ...mockAssignment, status: AssignmentStatus.PROPOSED };
      mockAssignmentRepository.findById.mockResolvedValue(proposedAssignment);

      await expect(
        executionMonitoringService.updateAssignmentStatus(
          'assignment-1',
          ExecutionStatusType.IN_PROGRESS,
          'supervisor-1'
        )
      ).rejects.toThrow('Can only update execution status for confirmed assignments');
    });

    it('should require actual start time for in-progress status', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);

      await expect(
        executionMonitoringService.updateAssignmentStatus(
          'assignment-1',
          ExecutionStatusType.IN_PROGRESS,
          'supervisor-1'
        )
      ).rejects.toThrow('Actual start time required for in-progress status');
    });

    it('should require actual end time for completed status', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);

      await expect(
        executionMonitoringService.updateAssignmentStatus(
          'assignment-1',
          ExecutionStatusType.COMPLETED,
          'supervisor-1'
        )
      ).rejects.toThrow('Actual end time required for completed status');
    });

    it('should handle coverage gap for no-show status', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);
      mockExecutionStatusRepository.updateAssignmentStatus.mockResolvedValue({
        ...mockExecutionStatus,
        status: ExecutionStatusType.NO_SHOW
      });

      await executionMonitoringService.updateAssignmentStatus(
        'assignment-1',
        ExecutionStatusType.NO_SHOW,
        'supervisor-1',
        { notes: 'Employee did not show up' }
      );

      expect(mockAuditService.logAction).toHaveBeenCalledTimes(2); // Status update + coverage gap
    });
  });

  describe('getPlanExecutionSummary', () => {
    it('should return plan execution summary', async () => {
      mockPlanRepository.findById.mockResolvedValue({ id: 'plan-1' });
      mockExecutionStatusRepository.getPlanExecutionSummary.mockResolvedValue(mockPlanSummary);

      const result = await executionMonitoringService.getPlanExecutionSummary('plan-1');

      expect(result).toEqual(mockPlanSummary);
      expect(mockExecutionStatusRepository.getPlanExecutionSummary).toHaveBeenCalledWith('plan-1');
    });

    it('should throw error when plan not found', async () => {
      mockPlanRepository.findById.mockResolvedValue(null);

      await expect(
        executionMonitoringService.getPlanExecutionSummary('nonexistent')
      ).rejects.toThrow('Plan nonexistent not found');
    });
  });

  describe('getAssignmentExecutionHistory', () => {
    it('should return execution history for assignment', async () => {
      const mockHistory = [mockExecutionStatus];
      mockExecutionStatusRepository.findByAssignment.mockResolvedValue(mockHistory);

      const result = await executionMonitoringService.getAssignmentExecutionHistory('assignment-1');

      expect(result).toEqual(mockHistory);
      expect(mockExecutionStatusRepository.findByAssignment).toHaveBeenCalledWith('assignment-1');
    });
  });

  describe('getRealTimeCoverage', () => {
    it('should calculate real-time coverage based on execution status', async () => {
      const mockPlan = {
        id: 'plan-1',
        assignments: [mockAssignment, { ...mockAssignment, id: 'assignment-2' }]
      };
      const mockExecutionStatuses = [
        { ...mockExecutionStatus, status: ExecutionStatusType.COMPLETED },
        { ...mockExecutionStatus, assignmentId: 'assignment-2', status: ExecutionStatusType.NO_SHOW }
      ];

      mockPlanRepository.findWithAssignments.mockResolvedValue(mockPlan);
      mockExecutionStatusRepository.findByPlan.mockResolvedValue(mockExecutionStatuses);

      const result = await executionMonitoringService.getRealTimeCoverage('plan-1');

      expect(result.totalDemands).toBe(2);
      expect(result.filledDemands).toBe(1); // Only completed assignment counts
      expect(result.coveragePercentage).toBe(50);
      expect(result.gaps).toHaveLength(1);
    });

    it('should throw error when plan not found', async () => {
      mockPlanRepository.findWithAssignments.mockResolvedValue(null);

      await expect(
        executionMonitoringService.getRealTimeCoverage('nonexistent')
      ).rejects.toThrow('Plan nonexistent not found');
    });
  });

  describe('handleLastMinuteChange', () => {
    it('should handle assignment cancellation', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);
      mockExecutionStatusRepository.updateAssignmentStatus.mockResolvedValue({
        ...mockExecutionStatus,
        status: ExecutionStatusType.CANCELLED
      });

      const result = await executionMonitoringService.handleLastMinuteChange(
        'assignment-1',
        'cancel',
        'supervisor-1',
        { reason: 'Employee sick' }
      );

      expect(result.originalAssignment).toEqual(mockAssignment);
      expect(result.impactAnalysis).toHaveProperty('coverageImpact');
      expect(result.impactAnalysis).toHaveProperty('recommendedActions');
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('should handle assignment modification', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);
      mockAssignmentRepository.update.mockResolvedValue({ ...mockAssignment, updatedAt: new Date() });
      mockExecutionStatusRepository.updateAssignmentStatus.mockResolvedValue({
        ...mockExecutionStatus,
        status: ExecutionStatusType.MODIFIED
      });

      const result = await executionMonitoringService.handleLastMinuteChange(
        'assignment-1',
        'modify',
        'supervisor-1',
        { 
          reason: 'Shift time changed',
          newStartTime: new Date(),
          newEndTime: new Date()
        }
      );

      expect(result.updatedAssignment).toBeDefined();
      expect(mockAssignmentRepository.update).toHaveBeenCalled();
    });

    it('should handle assignment replacement', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);
      mockAssignmentRepository.create.mockResolvedValue({
        ...mockAssignment,
        id: 'replacement-assignment',
        employeeId: 'replacement-employee'
      });
      mockExecutionStatusRepository.updateAssignmentStatus.mockResolvedValue({
        ...mockExecutionStatus,
        status: ExecutionStatusType.CANCELLED
      });

      const result = await executionMonitoringService.handleLastMinuteChange(
        'assignment-1',
        'replace',
        'supervisor-1',
        { 
          reason: 'Employee unavailable',
          replacementEmployeeId: 'replacement-employee'
        }
      );

      expect(result.replacementAssignment).toBeDefined();
      expect(result.replacementAssignment?.employeeId).toBe('replacement-employee');
      expect(mockAssignmentRepository.create).toHaveBeenCalled();
    });

    it('should throw error when replacement employee not provided for replace operation', async () => {
      mockAssignmentRepository.findById.mockResolvedValue(mockAssignment);

      await expect(
        executionMonitoringService.handleLastMinuteChange(
          'assignment-1',
          'replace',
          'supervisor-1'
        )
      ).rejects.toThrow('Replacement employee ID required for replace operation');
    });
  });

  describe('getExecutionAlerts', () => {
    it('should return execution alerts for plan', async () => {
      const mockAlerts = {
        noShows: [{ ...mockExecutionStatus, status: ExecutionStatusType.NO_SHOW }],
        lateStarts: [],
        earlyEnds: [],
        coverageGaps: []
      };

      mockExecutionStatusRepository.findByPlan.mockResolvedValue([
        { ...mockExecutionStatus, status: ExecutionStatusType.NO_SHOW }
      ]);

      const result = await executionMonitoringService.getExecutionAlerts('plan-1');

      expect(result.noShows).toHaveLength(1);
      expect(result.noShows[0].status).toBe(ExecutionStatusType.NO_SHOW);
    });
  });

  describe('triggerReplanningForGaps', () => {
    it('should trigger re-planning for coverage gaps', async () => {
      const mockCoverage = {
        totalDemands: 5,
        filledDemands: 3,
        coveragePercentage: 60,
        gaps: [],
        riskLevel: 'high' as any
      };

      mockPlanRepository.findWithAssignments.mockResolvedValue({ id: 'plan-1', assignments: [] });
      mockExecutionStatusRepository.findByPlan.mockResolvedValue([]);

      const result = await executionMonitoringService.triggerReplanningForGaps(
        'plan-1',
        ['demand-1', 'demand-2'],
        'supervisor-1'
      );

      expect(result.newAssignments).toEqual([]);
      expect(result.updatedCoverage).toHaveProperty('coveragePercentage');
      expect(mockAuditService.logAction).toHaveBeenCalledWith({
        action: 'create',
        entityType: 'replanning',
        entityId: 'plan-1',
        userId: 'supervisor-1',
        changes: {
          gapDemandIds: ['demand-1', 'demand-2'],
          reason: 'Coverage gap detected'
        }
      });
    });
  });
});
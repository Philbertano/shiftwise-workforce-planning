import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService, AuditRepository, AuditQuery } from '../../services/AuditService.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AuditAction } from '../../types/index.js';

describe('AuditService', () => {
  let auditService: AuditService;
  let mockRepository: AuditRepository;

  beforeEach(() => {
    mockRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByQuery: vi.fn(),
      count: vi.fn(),
      deleteOlderThan: vi.fn()
    };

    auditService = new AuditService(mockRepository);
  });

  describe('logCreation', () => {
    it('should create and save creation audit log', async () => {
      const entityData = { id: 'assign-1', status: 'proposed' };
      const metadata = { planId: 'plan-1' };
      
      const mockAuditLog = AuditLog.forCreation(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        entityData,
        metadata
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      const result = await auditService.logCreation(
        'assignment',
        'assign-1',
        'user-1',
        entityData,
        metadata
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1'
        })
      );
      expect(result).toBe(mockAuditLog);
    });
  });

  describe('logUpdate', () => {
    it('should create and save update audit log', async () => {
      const oldData = { status: 'proposed', score: 80 };
      const newData = { status: 'confirmed', score: 85 };
      
      const mockAuditLog = AuditLog.forUpdate(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        { status: { old: 'proposed', new: 'confirmed' }, score: { old: 80, new: 85 } }
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      const result = await auditService.logUpdate(
        'assignment',
        'assign-1',
        'user-1',
        oldData,
        newData
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1'
        })
      );
      expect(result).toBe(mockAuditLog);
    });

    it('should throw error when no changes detected', async () => {
      const sameData = { status: 'proposed', score: 80 };

      await expect(
        auditService.logUpdate('assignment', 'assign-1', 'user-1', sameData, sameData)
      ).rejects.toThrow('No changes detected for update audit log');
    });

    it('should detect changes correctly', async () => {
      const oldData = { status: 'proposed', score: 80, metadata: { note: 'old' } };
      const newData = { status: 'confirmed', score: 80, metadata: { note: 'new' } };
      
      const mockAuditLog = AuditLog.forUpdate(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        { 
          status: { old: 'proposed', new: 'confirmed' },
          metadata: { old: { note: 'old' }, new: { note: 'new' } }
        }
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logUpdate('assignment', 'assign-1', 'user-1', oldData, newData);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.objectContaining({
            status: { old: 'proposed', new: 'confirmed' },
            metadata: { old: { note: 'old' }, new: { note: 'new' } }
          })
        })
      );
    });
  });

  describe('logDeletion', () => {
    it('should create and save deletion audit log', async () => {
      const entityData = { id: 'assign-1', status: 'confirmed' };
      
      const mockAuditLog = AuditLog.forDeletion(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        entityData
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      const result = await auditService.logDeletion(
        'assignment',
        'assign-1',
        'user-1',
        entityData
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DELETE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1'
        })
      );
      expect(result).toBe(mockAuditLog);
    });
  });

  describe('logApproval', () => {
    it('should create and save approval audit log', async () => {
      const metadata = { approvalNotes: 'Looks good' };
      
      const mockAuditLog = AuditLog.forApproval(
        'audit-1',
        'plan_proposal',
        'plan-1',
        'user-1',
        metadata
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      const result = await auditService.logApproval(
        'plan_proposal',
        'plan-1',
        'user-1',
        metadata
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.APPROVE,
          entityType: 'plan_proposal',
          entityId: 'plan-1',
          userId: 'user-1'
        })
      );
      expect(result).toBe(mockAuditLog);
    });
  });

  describe('logRejection', () => {
    it('should create and save rejection audit log', async () => {
      const reason = 'Insufficient coverage';
      
      const mockAuditLog = AuditLog.forRejection(
        'audit-1',
        'plan_proposal',
        'plan-1',
        'user-1',
        reason
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      const result = await auditService.logRejection(
        'plan_proposal',
        'plan-1',
        'user-1',
        reason
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.REJECT,
          entityType: 'plan_proposal',
          entityId: 'plan-1',
          userId: 'user-1'
        })
      );
      expect(result).toBe(mockAuditLog);
    });
  });

  describe('logCommit', () => {
    it('should create and save commit audit log', async () => {
      const commitData = { assignmentCount: 5, coveragePercentage: 95 };
      
      const mockAuditLog = AuditLog.forCommit(
        'audit-1',
        'plan_proposal',
        'plan-1',
        'user-1',
        commitData
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      const result = await auditService.logCommit(
        'plan_proposal',
        'plan-1',
        'user-1',
        commitData
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.COMMIT,
          entityType: 'plan_proposal',
          entityId: 'plan-1',
          userId: 'user-1'
        })
      );
      expect(result).toBe(mockAuditLog);
    });
  });

  describe('specialized logging methods', () => {
    it('should log assignment creation with context', async () => {
      const assignmentData = { id: 'assign-1', status: 'proposed' };
      const planningContext = {
        planId: 'plan-1',
        demandId: 'demand-1',
        employeeId: 'emp-1',
        score: 85,
        constraints: ['availability', 'skill_match']
      };

      const mockAuditLog = AuditLog.forCreation(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        assignmentData,
        expect.objectContaining({
          ...planningContext,
          category: 'planning',
          operation: 'assignment_creation'
        })
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logAssignmentCreation(
        'assign-1',
        'user-1',
        assignmentData,
        planningContext
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            planId: 'plan-1',
            category: 'planning',
            operation: 'assignment_creation'
          })
        })
      );
    });

    it('should log assignment modification with reason', async () => {
      const oldData = { status: 'proposed' };
      const newData = { status: 'confirmed' };
      const reason = 'Manager approval';

      const mockAuditLog = AuditLog.forUpdate(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        { status: { old: 'proposed', new: 'confirmed' } },
        expect.objectContaining({
          category: 'planning',
          operation: 'assignment_modification',
          reason
        })
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logAssignmentModification(
        'assign-1',
        'user-1',
        oldData,
        newData,
        reason
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'Manager approval'
          })
        })
      );
    });

    it('should log plan approval with assignment details', async () => {
      const assignmentIds = ['assign-1', 'assign-2', 'assign-3'];
      const approvalNotes = 'All assignments look good';

      const mockAuditLog = AuditLog.forApproval(
        'audit-1',
        'plan_proposal',
        'plan-1',
        'user-1',
        expect.objectContaining({
          category: 'planning',
          operation: 'plan_approval',
          assignmentIds,
          approvalNotes,
          assignmentCount: 3
        })
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logPlanApproval(
        'plan-1',
        'user-1',
        assignmentIds,
        approvalNotes
      );

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            assignmentIds,
            assignmentCount: 3
          })
        })
      );
    });
  });

  describe('query methods', () => {
    it('should get entity audit trail', async () => {
      const mockLogs = [
        createMockAuditLog('audit-1', AuditAction.CREATE),
        createMockAuditLog('audit-2', AuditAction.UPDATE)
      ];

      vi.mocked(mockRepository.findByQuery).mockResolvedValue(mockLogs);

      const result = await auditService.getEntityAuditTrail('assignment', 'assign-1');

      expect(mockRepository.findByQuery).toHaveBeenCalledWith({
        entityType: 'assignment',
        entityId: 'assign-1',
        limit: 100
      });
      expect(result).toEqual(mockLogs);
    });

    it('should get user activity', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };
      const mockLogs = [createMockAuditLog('audit-1', AuditAction.CREATE)];

      vi.mocked(mockRepository.findByQuery).mockResolvedValue(mockLogs);

      const result = await auditService.getUserActivity('user-1', dateRange, 50);

      expect(mockRepository.findByQuery).toHaveBeenCalledWith({
        userId: 'user-1',
        dateRange,
        limit: 50
      });
      expect(result).toEqual(mockLogs);
    });

    it('should get planning audit logs', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      // Mock multiple calls for different entity types
      vi.mocked(mockRepository.findByQuery)
        .mockResolvedValueOnce([createMockAuditLog('audit-1', AuditAction.CREATE, 'assignment', 'user-1', new Date('2024-01-01T10:00:00Z'))])
        .mockResolvedValueOnce([createMockAuditLog('audit-2', AuditAction.UPDATE, 'shift_demand', 'user-1', new Date('2024-01-01T11:00:00Z'))])
        .mockResolvedValueOnce([createMockAuditLog('audit-3', AuditAction.APPROVE, 'plan_proposal', 'user-1', new Date('2024-01-01T12:00:00Z'))]);

      const result = await auditService.getPlanningAuditLogs(dateRange, 100);

      expect(mockRepository.findByQuery).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result[0].entityType).toBe('plan_proposal'); // Most recent first
    });
  });

  describe('audit summary', () => {
    it('should generate comprehensive audit summary', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockLogs = [
        createMockAuditLog('audit-1', AuditAction.CREATE, 'assignment', 'user-1'),
        createMockAuditLog('audit-2', AuditAction.UPDATE, 'assignment', 'user-1'),
        createMockAuditLog('audit-3', AuditAction.CREATE, 'employee', 'user-2'),
        createMockAuditLog('audit-4', AuditAction.APPROVE, 'plan_proposal', 'user-2')
      ];

      vi.mocked(mockRepository.findByQuery).mockResolvedValue(mockLogs);

      const summary = await auditService.generateAuditSummary(dateRange);

      expect(summary.totalLogs).toBe(4);
      expect(summary.actionCounts[AuditAction.CREATE]).toBe(2);
      expect(summary.actionCounts[AuditAction.UPDATE]).toBe(1);
      expect(summary.actionCounts[AuditAction.APPROVE]).toBe(1);
      expect(summary.entityTypeCounts['assignment']).toBe(2);
      expect(summary.entityTypeCounts['employee']).toBe(1);
      expect(summary.userActivityCounts['user-1']).toBe(2);
      expect(summary.userActivityCounts['user-2']).toBe(2);
      expect(summary.dateRange).toEqual(dateRange);
    });

    it('should filter summary by entity type', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockLogs = [
        createMockAuditLog('audit-1', AuditAction.CREATE, 'assignment'),
        createMockAuditLog('audit-2', AuditAction.UPDATE, 'assignment')
      ];

      vi.mocked(mockRepository.findByQuery).mockResolvedValue(mockLogs);

      await auditService.generateAuditSummary(dateRange, 'assignment');

      expect(mockRepository.findByQuery).toHaveBeenCalledWith({
        dateRange,
        entityType: 'assignment'
      });
    });
  });

  describe('search functionality', () => {
    it('should search audit logs with pagination', async () => {
      const query: AuditQuery = {
        entityType: 'assignment',
        action: AuditAction.UPDATE,
        limit: 10,
        offset: 20
      };

      const mockLogs = [createMockAuditLog('audit-1', AuditAction.UPDATE)];
      vi.mocked(mockRepository.findByQuery).mockResolvedValue(mockLogs);
      vi.mocked(mockRepository.count).mockResolvedValue(50);

      const result = await auditService.searchAuditLogs(query);

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(50);
      expect(result.hasMore).toBe(true); // 20 + 1 < 50
    });

    it('should indicate no more results', async () => {
      const query: AuditQuery = {
        limit: 10,
        offset: 45
      };

      const mockLogs = [createMockAuditLog('audit-1', AuditAction.CREATE)];
      vi.mocked(mockRepository.findByQuery).mockResolvedValue(mockLogs);
      vi.mocked(mockRepository.count).mockResolvedValue(46);

      const result = await auditService.searchAuditLogs(query);

      expect(result.hasMore).toBe(false); // 45 + 1 >= 46
    });
  });

  describe('audit integrity validation', () => {
    it('should validate complete audit trail', async () => {
      const timeline = [
        createMockAuditLog('audit-3', AuditAction.APPROVE, 'assignment', 'user-2', new Date('2024-01-01T12:00:00Z')),
        createMockAuditLog('audit-2', AuditAction.UPDATE, 'assignment', 'user-1', new Date('2024-01-01T11:00:00Z')),
        createMockAuditLog('audit-1', AuditAction.CREATE, 'assignment', 'user-1', new Date('2024-01-01T10:00:00Z'))
      ];

      vi.mocked(mockRepository.findByQuery).mockResolvedValue(timeline);

      const result = await auditService.validateAuditIntegrity('assignment', 'assign-1');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.timeline).toEqual(timeline);
    });

    it('should detect missing creation log', async () => {
      const timeline = [
        createMockAuditLog('audit-1', AuditAction.UPDATE, 'assignment', 'user-1')
      ];

      vi.mocked(mockRepository.findByQuery).mockResolvedValue(timeline);

      const result = await auditService.validateAuditIntegrity('assignment', 'assign-1');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing creation audit log');
      expect(result.issues).toContain('Update logs exist without creation log');
    });

    it('should detect logs after deletion', async () => {
      const timeline = [
        createMockAuditLog('audit-1', AuditAction.CREATE, 'assignment', 'user-1', new Date('2024-01-01T10:00:00Z')),
        createMockAuditLog('audit-2', AuditAction.DELETE, 'assignment', 'user-1', new Date('2024-01-01T11:00:00Z')),
        createMockAuditLog('audit-3', AuditAction.UPDATE, 'assignment', 'user-1', new Date('2024-01-01T12:00:00Z'))
      ];

      vi.mocked(mockRepository.findByQuery).mockResolvedValue(timeline);

      const result = await auditService.validateAuditIntegrity('assignment', 'assign-1');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Logs exist after deletion');
    });
  });

  describe('cleanup operations', () => {
    it('should clean up old logs', async () => {
      vi.mocked(mockRepository.deleteOlderThan).mockResolvedValue(25);

      const result = await auditService.cleanupOldLogs(90);

      expect(mockRepository.deleteOlderThan).toHaveBeenCalledWith(90);
      expect(result).toBe(25);
    });
  });

  describe('change detection', () => {
    it('should detect primitive value changes', async () => {
      const oldData = { name: 'John', age: 30, active: true };
      const newData = { name: 'John Doe', age: 30, active: false };

      const mockAuditLog = AuditLog.forUpdate(
        'audit-1',
        'employee',
        'emp-1',
        'user-1',
        {
          name: { old: 'John', new: 'John Doe' },
          active: { old: true, new: false }
        }
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logUpdate('employee', 'emp-1', 'user-1', oldData, newData);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: {
            name: { old: 'John', new: 'John Doe' },
            active: { old: true, new: false }
          }
        })
      );
    });

    it('should detect date changes', async () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-02');
      const oldData = { startDate: oldDate };
      const newData = { startDate: newDate };

      const mockAuditLog = AuditLog.forUpdate(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        { startDate: { old: oldDate, new: newDate } }
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logUpdate('assignment', 'assign-1', 'user-1', oldData, newData);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: {
            startDate: { old: oldDate, new: newDate }
          }
        })
      );
    });

    it('should detect nested object changes', async () => {
      const oldData = { metadata: { priority: 'high', notes: 'urgent' } };
      const newData = { metadata: { priority: 'medium', notes: 'urgent' } };

      const mockAuditLog = AuditLog.forUpdate(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        { metadata: { old: oldData.metadata, new: newData.metadata } }
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logUpdate('assignment', 'assign-1', 'user-1', oldData, newData);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: {
            metadata: { old: oldData.metadata, new: newData.metadata }
          }
        })
      );
    });

    it('should detect removed fields', async () => {
      const oldData = { name: 'John', age: 30, notes: 'temporary' };
      const newData = { name: 'John', age: 31 };

      const mockAuditLog = AuditLog.forUpdate(
        'audit-1',
        'employee',
        'emp-1',
        'user-1',
        {
          age: { old: 30, new: 31 },
          notes: { old: 'temporary', new: undefined }
        }
      );

      vi.mocked(mockRepository.save).mockResolvedValue(mockAuditLog);

      await auditService.logUpdate('employee', 'emp-1', 'user-1', oldData, newData);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: {
            age: { old: 30, new: 31 },
            notes: { old: 'temporary', new: undefined }
          }
        })
      );
    });
  });
});

// Helper function to create mock audit logs
function createMockAuditLog(
  id: string,
  action: AuditAction,
  entityType: string = 'assignment',
  userId: string = 'user-1',
  timestamp: Date = new Date()
): AuditLog {
  return new AuditLog({
    id,
    action,
    entityType,
    entityId: 'entity-1',
    userId,
    timestamp,
    changes: { test: 'data' }
  });
}
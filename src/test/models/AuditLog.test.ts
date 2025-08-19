import { describe, it, expect } from 'vitest';
import { AuditLog } from '../../models/AuditLog.js';
import { AuditAction } from '../../types/index.js';

describe('AuditLog', () => {
  const baseAuditData = {
    id: 'audit-1',
    action: AuditAction.CREATE,
    entityType: 'assignment',
    entityId: 'assign-1',
    userId: 'user-1',
    changes: { created: { id: 'assign-1', status: 'proposed' } }
  };

  describe('constructor', () => {
    it('should create audit log with valid data', () => {
      const auditLog = new AuditLog(baseAuditData);

      expect(auditLog.id).toBe('audit-1');
      expect(auditLog.action).toBe(AuditAction.CREATE);
      expect(auditLog.entityType).toBe('assignment');
      expect(auditLog.entityId).toBe('assign-1');
      expect(auditLog.userId).toBe('user-1');
      expect(auditLog.changes).toEqual({ created: { id: 'assign-1', status: 'proposed' } });
      expect(auditLog.timestamp).toBeInstanceOf(Date);
    });

    it('should set timestamp if not provided', () => {
      const auditLog = new AuditLog(baseAuditData);
      const now = new Date();
      
      expect(auditLog.timestamp.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
    });

    it('should use provided timestamp', () => {
      const customTimestamp = new Date('2024-01-15T10:00:00Z');
      const auditLog = new AuditLog({
        ...baseAuditData,
        timestamp: customTimestamp
      });

      expect(auditLog.timestamp).toEqual(customTimestamp);
    });

    it('should include metadata if provided', () => {
      const metadata = { planId: 'plan-1', category: 'planning' };
      const auditLog = new AuditLog({
        ...baseAuditData,
        metadata
      });

      expect(auditLog.metadata).toEqual(metadata);
    });
  });

  describe('validation', () => {
    it('should throw error for empty ID', () => {
      expect(() => new AuditLog({
        ...baseAuditData,
        id: ''
      })).toThrow('Audit log ID is required');
    });

    it('should throw error for empty entity type', () => {
      expect(() => new AuditLog({
        ...baseAuditData,
        entityType: ''
      })).toThrow('Entity type is required');
    });

    it('should throw error for empty entity ID', () => {
      expect(() => new AuditLog({
        ...baseAuditData,
        entityId: ''
      })).toThrow('Entity ID is required');
    });

    it('should throw error for empty user ID', () => {
      expect(() => new AuditLog({
        ...baseAuditData,
        userId: ''
      })).toThrow('User ID is required');
    });

    it('should throw error for empty changes on UPDATE action', () => {
      expect(() => new AuditLog({
        ...baseAuditData,
        action: AuditAction.UPDATE,
        changes: {}
      })).toThrow('Changes object cannot be empty for UPDATE actions');
    });

    it('should throw error for future timestamp', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(() => new AuditLog({
        ...baseAuditData,
        timestamp: futureDate
      })).toThrow('Audit log timestamp cannot be in the future');
    });

    it('should throw error for invalid entity type format', () => {
      expect(() => new AuditLog({
        ...baseAuditData,
        entityType: 'InvalidType'
      })).toThrow('Entity type must be lowercase with underscores only');
    });
  });

  describe('action type checks', () => {
    it('should correctly identify creation action', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.CREATE
      });

      expect(auditLog.isCreation()).toBe(true);
      expect(auditLog.isUpdate()).toBe(false);
      expect(auditLog.isDeletion()).toBe(false);
    });

    it('should correctly identify update action', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.UPDATE,
        changes: { status: { old: 'proposed', new: 'confirmed' } }
      });

      expect(auditLog.isUpdate()).toBe(true);
      expect(auditLog.isCreation()).toBe(false);
      expect(auditLog.isDeletion()).toBe(false);
    });

    it('should correctly identify deletion action', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.DELETE
      });

      expect(auditLog.isDeletion()).toBe(true);
      expect(auditLog.isCreation()).toBe(false);
      expect(auditLog.isUpdate()).toBe(false);
    });

    it('should correctly identify approval action', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.APPROVE
      });

      expect(auditLog.isApproval()).toBe(true);
      expect(auditLog.isRejection()).toBe(false);
    });

    it('should correctly identify rejection action', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.REJECT
      });

      expect(auditLog.isRejection()).toBe(true);
      expect(auditLog.isApproval()).toBe(false);
    });

    it('should correctly identify commit action', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.COMMIT
      });

      expect(auditLog.isCommit()).toBe(true);
    });
  });

  describe('change tracking', () => {
    it('should get changed fields', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.UPDATE,
        changes: {
          status: { old: 'proposed', new: 'confirmed' },
          score: { old: 80, new: 85 }
        }
      });

      const changedFields = auditLog.getChangedFields();
      expect(changedFields).toEqual(['status', 'score']);
    });

    it('should get old and new values', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.UPDATE,
        changes: {
          status: { old: 'proposed', new: 'confirmed' }
        }
      });

      expect(auditLog.getOldValue('status')).toBe('proposed');
      expect(auditLog.getNewValue('status')).toBe('confirmed');
    });

    it('should check if field was changed', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.UPDATE,
        changes: {
          status: { old: 'proposed', new: 'confirmed' }
        }
      });

      expect(auditLog.wasFieldChanged('status')).toBe(true);
      expect(auditLog.wasFieldChanged('score')).toBe(false);
    });

    it('should get changes summary', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.UPDATE,
        changes: {
          status: { old: 'proposed', new: 'confirmed' },
          score: { old: 80, new: 85 }
        }
      });

      const summary = auditLog.getChangesSummary();
      expect(summary).toContain('status: proposed → confirmed');
      expect(summary).toContain('score: 80 → 85');
    });
  });

  describe('metadata handling', () => {
    it('should get metadata value', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        metadata: { planId: 'plan-1', category: 'planning' }
      });

      expect(auditLog.getMetadata('planId')).toBe('plan-1');
      expect(auditLog.getMetadata('category')).toBe('planning');
      expect(auditLog.getMetadata('nonexistent')).toBeUndefined();
    });

    it('should check if metadata exists', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        metadata: { planId: 'plan-1' }
      });

      expect(auditLog.hasMetadata('planId')).toBe(true);
      expect(auditLog.hasMetadata('nonexistent')).toBe(false);
    });

    it('should handle missing metadata', () => {
      const auditLog = new AuditLog(baseAuditData);

      expect(auditLog.getMetadata('anything')).toBeUndefined();
      expect(auditLog.hasMetadata('anything')).toBe(false);
    });
  });

  describe('description generation', () => {
    it('should generate description for creation', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.CREATE
      });

      const description = auditLog.getDescription();
      expect(description).toBe('created assignment assign-1');
    });

    it('should generate description for update with changed fields', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.UPDATE,
        changes: {
          status: { old: 'proposed', new: 'confirmed' },
          score: { old: 80, new: 85 }
        }
      });

      const description = auditLog.getDescription();
      expect(description).toBe('updated assignment assign-1 (changed: status, score)');
    });

    it('should generate description for deletion', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        action: AuditAction.DELETE
      });

      const description = auditLog.getDescription();
      expect(description).toBe('deleted assignment assign-1');
    });
  });

  describe('categorization', () => {
    it('should identify planning-related logs', () => {
      const assignmentLog = new AuditLog({
        ...baseAuditData,
        entityType: 'assignment'
      });

      const demandLog = new AuditLog({
        ...baseAuditData,
        entityType: 'shift_demand'
      });

      const employeeLog = new AuditLog({
        ...baseAuditData,
        entityType: 'employee'
      });

      expect(assignmentLog.isPlanningRelated()).toBe(true);
      expect(demandLog.isPlanningRelated()).toBe(true);
      expect(employeeLog.isPlanningRelated()).toBe(false);
    });

    it('should identify employee-related logs', () => {
      const employeeLog = new AuditLog({
        ...baseAuditData,
        entityType: 'employee'
      });

      const skillLog = new AuditLog({
        ...baseAuditData,
        entityType: 'employee_skill'
      });

      const assignmentLog = new AuditLog({
        ...baseAuditData,
        entityType: 'assignment'
      });

      expect(employeeLog.isEmployeeRelated()).toBe(true);
      expect(skillLog.isEmployeeRelated()).toBe(true);
      expect(assignmentLog.isEmployeeRelated()).toBe(false);
    });
  });

  describe('age calculations', () => {
    it('should calculate age correctly', () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2); // 2 hours ago

      const auditLog = new AuditLog({
        ...baseAuditData,
        timestamp: pastDate
      });

      const age = auditLog.getAge();
      expect(age).toBeGreaterThan(7000000); // More than 2 hours in milliseconds
      expect(age).toBeLessThan(7300000); // Less than 2 hours and 5 minutes
    });

    it('should check if older than specified days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const auditLog = new AuditLog({
        ...baseAuditData,
        timestamp: oldDate
      });

      expect(auditLog.isOlderThan(5)).toBe(true);
      expect(auditLog.isOlderThan(15)).toBe(false);
    });
  });

  describe('static factory methods', () => {
    it('should create creation audit log', () => {
      const auditLog = AuditLog.forCreation(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        { id: 'assign-1', status: 'proposed' },
        { planId: 'plan-1' }
      );

      expect(auditLog.action).toBe(AuditAction.CREATE);
      expect(auditLog.changes).toEqual({ created: { id: 'assign-1', status: 'proposed' } });
      expect(auditLog.metadata).toEqual({ planId: 'plan-1' });
    });

    it('should create update audit log', () => {
      const changes = { status: { old: 'proposed', new: 'confirmed' } };
      const auditLog = AuditLog.forUpdate(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        changes
      );

      expect(auditLog.action).toBe(AuditAction.UPDATE);
      expect(auditLog.changes).toEqual(changes);
    });

    it('should create deletion audit log', () => {
      const auditLog = AuditLog.forDeletion(
        'audit-1',
        'assignment',
        'assign-1',
        'user-1',
        { id: 'assign-1', status: 'confirmed' }
      );

      expect(auditLog.action).toBe(AuditAction.DELETE);
      expect(auditLog.changes).toEqual({ deleted: { id: 'assign-1', status: 'confirmed' } });
    });

    it('should create approval audit log', () => {
      const auditLog = AuditLog.forApproval(
        'audit-1',
        'plan_proposal',
        'plan-1',
        'user-1',
        { approvalNotes: 'Looks good' }
      );

      expect(auditLog.action).toBe(AuditAction.APPROVE);
      expect(auditLog.changes).toEqual({ approved: true });
      expect(auditLog.metadata).toEqual({ approvalNotes: 'Looks good' });
    });

    it('should create rejection audit log', () => {
      const auditLog = AuditLog.forRejection(
        'audit-1',
        'plan_proposal',
        'plan-1',
        'user-1',
        'Insufficient coverage'
      );

      expect(auditLog.action).toBe(AuditAction.REJECT);
      expect(auditLog.changes).toEqual({ rejected: true, reason: 'Insufficient coverage' });
    });

    it('should create commit audit log', () => {
      const commitData = { assignmentCount: 5, coveragePercentage: 95 };
      const auditLog = AuditLog.forCommit(
        'audit-1',
        'plan_proposal',
        'plan-1',
        'user-1',
        commitData
      );

      expect(auditLog.action).toBe(AuditAction.COMMIT);
      expect(auditLog.changes).toEqual({ committed: commitData });
    });
  });

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const auditLog = new AuditLog({
        ...baseAuditData,
        metadata: { planId: 'plan-1' }
      });

      const json = auditLog.toJSON();

      expect(json).toEqual({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        userId: auditLog.userId,
        timestamp: auditLog.timestamp,
        changes: auditLog.changes,
        metadata: auditLog.metadata
      });
    });
  });
});